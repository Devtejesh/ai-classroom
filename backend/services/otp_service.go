package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ai-classroom/backend/models"
	"ai-classroom/backend/repositories"
)

var (
	ErrOTPExpired     = errors.New("OTP has expired")
	ErrOTPMaxAttempts = errors.New("maximum OTP attempts exceeded")
	ErrInvalidOTP     = errors.New("invalid OTP")
)

type OTPRepository interface {
	SaveEmailOTP(ctx context.Context, userID int64, otpHash string, expiresAt time.Time) error
	GetEmailOTP(ctx context.Context, userID int64) (*models.EmailOTP, error)
	IncrementOTPAttempts(ctx context.Context, otpID int64) error
	ConsumeEmailOTP(ctx context.Context, userID, otpID int64) error
}

type OTPService struct {
	Repo       OTPRepository
	Email      *EmailService
	HMACSecret string
}

func NewOTPService(
	repo OTPRepository,
	email *EmailService,
	hmacSecret string,
) *OTPService {
	return &OTPService{
		Repo:       repo,
		Email:      email,
		HMACSecret: hmacSecret,
	}
}

// SendOTP generates, hashes, stores and emails an OTP.
func (s *OTPService) SendOTP(
	ctx context.Context,
	userID int64,
	email string,
) error {

	if s.Repo == nil || s.Email == nil {
		return errors.New("OTP service dependencies are missing")
	}

	if strings.TrimSpace(email) == "" {
		return errors.New("email address is required")
	}

	otp, err := GenerateOTP()
	if err != nil {
		return fmt.Errorf("OTP generation failed: %w", err)
	}

	otpHash, err := HashOTP(s.HMACSecret, userID, otp)
	if err != nil {
		return fmt.Errorf("OTP hashing failed: %w", err)
	}

	expiresAt := time.Now().Add(5 * time.Minute)

	if err := s.Repo.SaveEmailOTP(
		ctx,
		userID,
		otpHash,
		expiresAt,
	); err != nil {
		return fmt.Errorf("OTP storage failed: %w", err)
	}

	if err := s.Email.SendOTP(ctx, email, otp); err != nil {
		return fmt.Errorf("OTP email delivery failed: %w", err)
	}

	return nil
}

// VerifyOTP checks the OTP and activates the user account.
func (s *OTPService) VerifyOTP(
	ctx context.Context,
	userID int64,
	inputOTP string,
) error {

	if s.Repo == nil {
		return errors.New("OTP repository is missing")
	}

	if len(inputOTP) != 6 {
		return ErrInvalidOTP
	}

	for _, char := range inputOTP {
		if char < '0' || char > '9' {
			return ErrInvalidOTP
		}
	}

	otp, err := s.Repo.GetEmailOTP(ctx, userID)
	if err != nil {
		return err
	}

	if otp.Attempts >= 5 {
		return ErrOTPMaxAttempts
	}

	if time.Now().After(otp.ExpiresAt) {
		return ErrOTPExpired
	}

	matches, err := CompareOTPHash(
		s.HMACSecret,
		userID,
		inputOTP,
		otp.OTPHash,
	)
	if err != nil {
		return fmt.Errorf("OTP comparison failed: %w", err)
	}

	if !matches {
		err := s.Repo.IncrementOTPAttempts(ctx, otp.ID)
		if errors.Is(err, repositories.ErrOTPInvalid) {
			return ErrOTPMaxAttempts
		}
		if err != nil {
			return fmt.Errorf("failed to record OTP attempt: %w", err)
		}

		if otp.Attempts+1 >= 5 {
			return ErrOTPMaxAttempts
		}

		return ErrInvalidOTP
	}

	if err := s.Repo.ConsumeEmailOTP(
		ctx,
		userID,
		otp.ID,
	); err != nil {
		if errors.Is(err, repositories.ErrOTPInvalid) {
			return ErrOTPExpired
		}
		return fmt.Errorf("OTP verification failed: %w", err)
	}

	return nil
}
