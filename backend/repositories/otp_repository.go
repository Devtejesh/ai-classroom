package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ai-classroom/backend/models"
)

var (
	ErrOTPNotFound = errors.New("OTP not found")
	ErrOTPInvalid  = errors.New("OTP is invalid or expired")
)

func (r *UserRepository) SaveEmailOTP(
	ctx context.Context,
	userID int64,
	otpHash string,
	expiresAt time.Time,
) error {

	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin OTP transaction: %w", err)
	}
	defer tx.Rollback()

	// Invalidate previous unused OTPs.
	_, err = tx.ExecContext(
		ctx,
		`DELETE FROM email_otps WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("failed to invalidate previous OTP: %w", err)
	}

	_, err = tx.ExecContext(
		ctx,
		`INSERT INTO email_otps
			(user_id, otp_hash, expires_at)
		 VALUES ($1, $2, $3)`,
		userID,
		otpHash,
		expiresAt,
	)
	if err != nil {
		return fmt.Errorf("failed to save OTP: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit OTP: %w", err)
	}

	return nil
}

func (r *UserRepository) GetEmailOTP(
	ctx context.Context,
	userID int64,
) (*models.EmailOTP, error) {

	var otp models.EmailOTP

	err := r.DB.QueryRowContext(
		ctx,
		`SELECT id, user_id, otp_hash, expires_at, attempts, created_at
		 FROM email_otps
		 WHERE user_id = $1 AND used_at IS NULL
		 ORDER BY created_at DESC
		 LIMIT 1`,
		userID,
	).Scan(
		&otp.ID,
		&otp.UserID,
		&otp.OTPHash,
		&otp.ExpiresAt,
		&otp.Attempts,
		&otp.CreatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrOTPNotFound
	}

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve OTP: %w", err)
	}

	return &otp, nil
}

func (r *UserRepository) IncrementOTPAttempts(
	ctx context.Context,
	otpID int64,
) error {

	result, err := r.DB.ExecContext(
		ctx,
		`UPDATE email_otps
		 SET attempts = attempts + 1
		 WHERE id = $1
		   AND used_at IS NULL
		   AND attempts < 5`,
		otpID,
	)
	if err != nil {
		return fmt.Errorf("failed to increment OTP attempts: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check OTP update: %w", err)
	}

	if rows == 0 {
		return ErrOTPInvalid
	}

	return nil
}

func (r *UserRepository) ConsumeEmailOTP(
	ctx context.Context,
	userID int64,
	otpID int64,
) error {

	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin verification transaction: %w", err)
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(
		ctx,
		`UPDATE email_otps
		 SET used_at = NOW()
		 WHERE id = $1
		   AND user_id = $2
		   AND used_at IS NULL
		   AND expires_at > NOW()
		   AND attempts < 5`,
		otpID,
		userID,
	)
	if err != nil {
		return fmt.Errorf("failed to consume OTP: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check OTP consumption: %w", err)
	}

	if rows == 0 {
		return ErrOTPInvalid
	}

	_, err = tx.ExecContext(
		ctx,
		`UPDATE users
		 SET is_verified = TRUE,
		     updated_at = NOW()
		 WHERE id = $1`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("failed to verify user: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit verification: %w", err)
	}

	return nil
}
