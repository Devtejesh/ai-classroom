package routes

import (
	"database/sql"

	"ai-classroom/backend/handlers"
	"ai-classroom/backend/middleware"
	"ai-classroom/backend/repositories"
	"ai-classroom/backend/services"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func SetupRoutes(
	router *gin.Engine,
	db *sql.DB,
	jwtService *services.JWTService,
	otpService *services.OTPService,
) {

	//Prometheus Metrics Endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))
	// Health Handler
	healthHandler := handlers.NewHealthHandler(db)

	// User Repository and Service
	userRepository := repositories.NewUserRepository(db)
	userService := services.NewUserService(userRepository)

	// Authentication Handler
	authHandler := handlers.NewAuthHandler(
		userService,
		jwtService,
		otpService,
	)

	// Learning Repository, Service and Handler
	learningRepository := repositories.NewLearningRepository(db)
	learningService := services.NewLearningService(learningRepository)
	learningHandler := handlers.NewLearningHandler(learningService)

	api := router.Group("/api")
	{
		api.GET("/health", healthHandler.Check)

		// Authentication Routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/send-otp", authHandler.SendOTP)
			auth.POST("/verify-otp", authHandler.VerifyOTP)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)

			auth.GET(
				"/profile",
				middleware.AuthMiddleware(jwtService),
				authHandler.GetProfile,
			)
		}

		// Protected Learning Routes
		learning := api.Group("/learning")
		learning.Use(middleware.AuthMiddleware(jwtService))
		{
			learning.POST(
				"/notes/:id/share",
				learningHandler.ShareNote,
			)

			learning.DELETE(
				"/notes/:id/share",
				learningHandler.StopSharingNote,
			)

			learning.GET(
				"/shared-notes/:token",
				learningHandler.GetSharedNote,
			)
			learning.POST(
				"/sessions",
				learningHandler.CreateSession,
			)

			learning.POST(
				"/notes",
				learningHandler.CreateNote,
			)

			learning.GET(
				"/notes",
				learningHandler.GetNotes,
			)
		}
	}
}
