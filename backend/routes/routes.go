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

	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	healthHandler := handlers.NewHealthHandler(db)

	userRepository := repositories.NewUserRepository(db)
	userService := services.NewUserService(userRepository)

	authHandler := handlers.NewAuthHandler(
		userService,
		jwtService,
		otpService,
	)

	learningRepository := repositories.NewLearningRepository(db)
	learningService := services.NewLearningService(learningRepository)
	learningHandler := handlers.NewLearningHandler(learningService)

	// New AI Job Handler
	aiJobHandler := handlers.NewAIJobHandler(db)

	api := router.Group("/api")

	{
		api.GET("/health", healthHandler.Check)

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

		learning := api.Group("/learning")

		learning.Use(
			middleware.AuthMiddleware(jwtService),
		)

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

			// New background AI job routes

			learning.POST(
				"/ai-jobs",
				aiJobHandler.Create,
			)

			learning.GET(
				"/ai-jobs",
				aiJobHandler.List,
			)

			learning.GET(
				"/ai-jobs/:id",
				aiJobHandler.Get,
			)
		}
	}
}
