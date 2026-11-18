package main

import (
	"log"

	"ai-classroom/backend/config"
	"ai-classroom/backend/database"
	"ai-classroom/backend/routes"

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

	router := gin.Default()
	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("Database migration failed: %v", err)
	}

	log.Println("Database migrations completed successfully!")

	routes.SetupRoutes(router, db)

	log.Printf("Server starting on port %s", cfg.ServerPort)

	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}
