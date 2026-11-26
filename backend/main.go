package main

import (
	"log"

	"ai-classroom/backend/config"
	"ai-classroom/backend/database"
	"ai-classroom/backend/middleware"
	"ai-classroom/backend/repositories"
	"ai-classroom/backend/routes"
	"ai-classroom/backend/services"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	db, err := database.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("Database connection error: %v", err)
	}
	defer db.Close()

	log.Println("PostgreSQL connected successfully!")

	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("Database migration failed: %v", err)
	}

	log.Println("Database migrations completed successfully!")

	jwtService := services.NewJWTService(cfg.JWTSecret)

	userRepository := repositories.NewUserRepository(db)

	emailService := services.NewEmailService(
		cfg.ResendAPIKey,
		cfg.EmailFrom,
	)

	otpService := services.NewOTPService(
		userRepository,
		emailService,
		cfg.OTPHMACSecret,
	)

	router := gin.Default()
	router.Use(middleware.MetricsMiddleware())
	router.SetTrustedProxies(nil)
	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		allowedOrigins := map[string]bool{
			"http://localhost:5174": true,
			"http://127.0.0.1:5174": true,
		}

		if allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Vary", "Origin")
		}

		c.Writer.Header().Set(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, PATCH, DELETE, OPTIONS",
		)

		c.Writer.Header().Set(
			"Access-Control-Allow-Headers",
			"Origin, Content-Type, Accept, Authorization",
		)

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	routes.SetupRoutes(
		router,
		db,
		jwtService,
		otpService,
	)

	log.Printf("Server starting on port %s", cfg.ServerPort)

	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}
