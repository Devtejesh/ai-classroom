package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"ai-classroom/backend/models"
)

var ErrUserNotFound = errors.New("user not found")
var ErrEmailAlreadyExists = errors.New("email already exists")

type UserRepository struct {
	DB *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{
		DB: db,
	}
}

func (r *UserRepository) Create(
	ctx context.Context,
	user *models.User,
) error {
	query := `
		INSERT INTO users (
			name,
			email,
			password_hash,
			role,
			is_verified
		)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`

	err := r.DB.QueryRowContext(
		ctx,
		query,
		user.Name,
		user.Email,
		user.PasswordHash,
		user.Role,
		user.IsVerified,
	).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"` {
			return ErrEmailAlreadyExists
		}

		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

func (r *UserRepository) GetByEmail(
	ctx context.Context,
	email string,
) (*models.User, error) {
	query := `
		SELECT
			id,
			name,
			email,
			password_hash,
			role,
			is_verified,
			created_at,
			updated_at
		FROM users
		WHERE email = $1
	`

	var user models.User

	err := r.DB.QueryRowContext(
		ctx,
		query,
		email,
	).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.IsVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}

		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	return &user, nil
}

func (r *UserRepository) GetByID(
	ctx context.Context,
	id int64,
) (*models.User, error) {
	query := `
		SELECT
			id,
			name,
			email,
			password_hash,
			role,
			is_verified,
			created_at,
			updated_at
		FROM users
		WHERE id = $1
	`

	var user models.User

	err := r.DB.QueryRowContext(
		ctx,
		query,
		id,
	).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.IsVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}

		return nil, fmt.Errorf("failed to get user by id: %w", err)
	}

	return &user, nil
}

func (r *UserRepository) UpdatePassword(
	ctx context.Context,
	userID int64,
	passwordHash string,
) error {
	result, err := r.DB.ExecContext(
		ctx,
		`UPDATE users
                 SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
		passwordHash,
		userID,
	)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check password update: %w", err)
	}
	if rows == 0 {
		return ErrUserNotFound
	}

	return nil
}
