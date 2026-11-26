package middleware

import (
	"strconv"
	"time"

	"ai-classroom/backend/monitoring"

	"github.com/gin-gonic/gin"
)

func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		if c.Request.URL.Path == "/metrics" {
			c.Next()
			return
		}

		start := time.Now()

		monitoring.ActiveRequests.Inc()
		defer monitoring.ActiveRequests.Dec()

		c.Next()

		duration := time.Since(start).Seconds()

		method := c.Request.Method
		path := c.FullPath()
		status := strconv.Itoa(c.Writer.Status())

		if path == "" {
			path = "unmatched"
		}

		monitoring.HttpRequestsTotal1.WithLabelValues(
			method, path, status,
		).Inc()

		monitoring.HTTPRequestDuration.WithLabelValues(
			method, path, status,
		).Observe(duration)
	}
}
