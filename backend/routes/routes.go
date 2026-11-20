package routes

import (
	"database/sql"

	"ai-classroom/backend/handlers"
	"ai-classroom/backend/middleware"
	"ai-classroom/backend/repositories"
	"ai-classroom/backend/services"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(
	router *gin.Engine,
	db *sql.DB,
	jwtService *services.JWTService,
	otpService *services.OTPService,
) {
	healthHandler := handlers.NewHealthHandler(db)

	userRepository := repositories.NewUserRepository(db)
	userService := services.NewUserService(userRepository)

	authHandler := handlers.NewAuthHandler(
		userService,
		jwtService,
		otpService,
	)

	api := router.Group("/api")
	{
		api.GET("/health", healthHandler.Check)

		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/send-otp", authHandler.SendOTP)
			auth.POST("/verify-otp", authHandler.VerifyOTP)

			auth.GET(
				"/profile",
				middleware.AuthMiddleware(jwtService),
				authHandler.GetProfile,
			)
		}
	}
}
