package handlers

import (
	"errors"
	"log"
	"net/http"

	"ai-classroom/backend/models"
	"ai-classroom/backend/repositories"
	"ai-classroom/backend/services"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	UserService *services.UserService
	JWTService  *services.JWTService
	OTPService  *services.OTPService
}

func NewAuthHandler(
	userService *services.UserService,
	jwtService *services.JWTService,
	otpService *services.OTPService,
) *AuthHandler {
	return &AuthHandler{
		UserService: userService,
		JWTService:  jwtService,
		OTPService:  otpService,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, err := h.UserService.Register(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidUserData):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrEmailAlreadyExists):
			c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		default:
			log.Printf("registration error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to register user"})
		}
		return
	}

	if err := h.OTPService.SendOTP(
		c.Request.Context(),
		user.ID,
		user.Email,
	); err != nil {
		log.Printf("OTP delivery error: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{
			"message": "Account created, but verification email could not be sent. Please request another OTP.",
		})
		return
	}

	c.JSON(http.StatusCreated, models.RegisterResponse{
		Message: "Registration successful. Verification OTP sent to your email.",
		User: models.UserResponse{
			ID:         user.ID,
			Name:       user.Name,
			Email:      user.Email,
			Role:       user.Role,
			IsVerified: user.IsVerified,
		},
	})
}

type SendOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
}

func (h *AuthHandler) SendOTP(c *gin.Context) {
	var req SendOTPRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid email is required"})
		return
	}

	user, err := h.UserService.GetUserByEmail(
		c.Request.Context(),
		req.Email,
	)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		log.Printf("user lookup error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process request"})
		return
	}

	if user.IsVerified {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email is already verified"})
		return
	}

	if err := h.OTPService.SendOTP(
		c.Request.Context(),
		user.ID,
		user.Email,
	); err != nil {
		log.Printf("OTP resend error: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to send verification email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Verification OTP sent successfully",
	})
}

type VerifyOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
	OTP   string `json:"otp" binding:"required,len=6"`
}

func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var req VerifyOTPRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid email and six-digit OTP are required"})
		return
	}

	user, err := h.UserService.GetUserByEmail(
		c.Request.Context(),
		req.Email,
	)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		log.Printf("user lookup error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process request"})
		return
	}

	if user.IsVerified {
		c.JSON(http.StatusOK, gin.H{"message": "email is already verified"})
		return
	}

	err = h.OTPService.VerifyOTP(
		c.Request.Context(),
		user.ID,
		req.OTP,
	)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrOTPExpired):
			c.JSON(http.StatusBadRequest, gin.H{"error": "OTP has expired. Request a new OTP."})
		case errors.Is(err, services.ErrOTPMaxAttempts):
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "maximum OTP attempts exceeded. Request a new OTP."})
		case errors.Is(err, services.ErrInvalidOTP):
			c.JSON(http.StatusBadRequest, gin.H{"error": "incorrect OTP"})
		case errors.Is(err, repositories.ErrOTPNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": "OTP not found. Request a new OTP."})
		default:
			log.Printf("OTP verification error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "verification failed"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Email verified successfully. You can now log in.",
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, err := h.UserService.Login(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidCredentials):
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		case errors.Is(err, services.ErrUserNotVerified):
			c.JSON(http.StatusForbidden, gin.H{"error": "email is not verified"})
		default:
			log.Printf("login error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
		}
		return
	}

	token, err := h.JWTService.GenerateToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, models.LoginResponse{
		Message: "Login successful",
		Token:   token,
		User: models.UserResponse{
			ID:         user.ID,
			Name:       user.Name,
			Email:      user.Email,
			Role:       user.Role,
			IsVerified: user.IsVerified,
		},
	})
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	userID, ok := userIDValue.(int64)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user identity"})
		return
	}

	user, err := h.UserService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		log.Printf("profile error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch profile"})
		return
	}

	c.JSON(http.StatusOK, models.UserResponse{
		ID:         user.ID,
		Name:       user.Name,
		Email:      user.Email,
		Role:       user.Role,
		IsVerified: user.IsVerified,
	})
}
