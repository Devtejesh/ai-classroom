package services

import (
	"context"
	"errors"
	"strings"

	"ai-classroom/backend/models"
	"ai-classroom/backend/repositories"
)

var ErrInvalidUserData = errors.New("invalid user data")

type UserService struct {
	UserRepo *repositories.UserRepository
}

func NewUserService(repo *repositories.UserRepository) *UserService {
	return &UserService{
		UserRepo: repo,
	}
}

func (s *UserService) CreateUser(
	ctx context.Context,
	user *models.User,
) error {
	user.Name = strings.TrimSpace(user.Name)
	user.Email = strings.ToLower(strings.TrimSpace(user.Email))

	if user.Name == "" || user.Email == "" || user.PasswordHash == "" {
		return ErrInvalidUserData
	}

	if user.Role == "" {
		user.Role = "customer"
	}

	return s.UserRepo.Create(ctx, user)
}

func (s *UserService) GetUserByEmail(
	ctx context.Context,
	email string,
) (*models.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	if email == "" {
		return nil, ErrInvalidUserData
	}

	return s.UserRepo.GetByEmail(ctx, email)
}

func (s *UserService) GetUserByID(
	ctx context.Context,
	id int64,
) (*models.User, error) {
	if id <= 0 {
		return nil, ErrInvalidUserData
	}

	return s.UserRepo.GetByID(ctx, id)
}
