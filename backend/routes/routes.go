package routes

import (
	"database/sql"

	"ai-classroom/backend/handlers"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, db *sql.DB) {
	healthHandler := handlers.NewHealthHandler(db)

	api := router.Group("/api")
	{
		api.GET("/health", healthHandler.Check)
	}
}
