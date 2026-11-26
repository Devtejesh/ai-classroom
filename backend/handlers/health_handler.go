package handlers

import (
	"database/sql"
	"net/http"

	// "ai-classroom/backend/monitoring"

	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	DB *sql.DB
}

func NewHealthHandler(db *sql.DB) *HealthHandler {
	return &HealthHandler{DB: db}
}

func (h *HealthHandler) Check(c *gin.Context) {
	// monitoring.HttpRequestsTotal.Inc()
	if err := h.DB.PingContext(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":   "unhealthy",
			"database": "disconnected",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "success",
		"message":  "AI Classroom backend is running",
		"database": "connected",
	})
}
