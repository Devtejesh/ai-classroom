package services

import (
	"context"
	"errors"
	"log"
	"strings"

	"ai-classroom/backend/models"
	"ai-classroom/backend/repositories"

	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidUserData = errors.New("invalid user data")
var ErrInvalidCredentials = errors.New("invalid email or password")
var ErrEmailAlreadyExists = repositories.ErrEmailAlreadyExists
var ErrUserNotVerified = errors.New("user email is not verified")

type UserService struct {
	UserRepo *repositories.UserRepository
}

func NewUserService(repo *repositories.UserRepository) *UserService {
	return &UserService{
		UserRepo: repo,
	}
}

func (s *UserService) Register(
	ctx context.Context,
	req models.RegisterRequest,
) (*models.User, error) {

	name := strings.TrimSpace(req.Name)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	password := strings.TrimSpace(req.Password)

	if name == "" || email == "" || password == "" {
		return nil, ErrInvalidUserData
	}

	if len(password) < 8 {
		return nil, errors.New("password must be at least 8 characters")
	}

	passwordHash, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	user := &models.User{
		Name:         name,
		Email:        email,
		PasswordHash: string(passwordHash),
		Role:         "customer",
		IsVerified:   false,
	}

	if err := s.UserRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) Login(
	ctx context.Context,
	req models.LoginRequest,
) (*models.User, error) {

	email := strings.ToLower(strings.TrimSpace(req.Email))
	password := strings.TrimSpace(req.Password)

	if email == "" || req.Password == "" {
		return nil, ErrInvalidCredentials
	}

	user, err := s.UserRepo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}

		return nil, err
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(password),
	)

	// if err != nil {
	// 	return nil, ErrInvalidCredentials
	// }
	if err != nil {
		log.Println("Password does not match stored hash")
		return nil, ErrInvalidCredentials
	}

	log.Println("Password matches stored hash")

	if !user.IsVerified {
		return nil, ErrUserNotVerified
	}

	return user, nil
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

func (s *UserService) UpdatePassword(
	ctx context.Context,
	userID int64,
	newPassword string,
) error {
	newPassword = strings.TrimSpace(newPassword)

	if userID <= 0 || len(newPassword) < 8 {
		return ErrInvalidUserData
	}

	passwordHash, err := bcrypt.GenerateFromPassword(
		[]byte(newPassword),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return errors.New("failed to hash new password")
	}

	return s.UserRepo.UpdatePassword(
		ctx,
		userID,
		string(passwordHash),
	)
}
