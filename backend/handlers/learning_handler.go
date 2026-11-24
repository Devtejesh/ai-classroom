package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"ai-classroom/backend/models"
	"ai-classroom/backend/services"

	"github.com/gin-gonic/gin"
)

type LearningHandler struct {
	LearningService *services.LearningService
}

func NewLearningHandler(
	learningService *services.LearningService,
) *LearningHandler {
	return &LearningHandler{
		LearningService: learningService,
	}
}

func getLearningUserID(c *gin.Context) (int64, bool) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}

	userID, ok := userIDValue.(int64)
	return userID, ok
}

// ShareNote enables sharing for a note owned by the logged-in user.
func (h *LearningHandler) ShareNote(c *gin.Context) {
	userID, ok := getLearningUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "unauthorized",
		})
		return
	}

	noteID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || noteID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid note ID",
		})
		return
	}

	shareToken, err := h.LearningService.ShareNote(
		c.Request.Context(),
		userID,
		noteID,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "note not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to share note",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "note shared successfully",
		"share_token": shareToken,
	})
}

// StopSharingNote revokes sharing for the owner's note.
func (h *LearningHandler) StopSharingNote(c *gin.Context) {
	userID, ok := getLearningUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "unauthorized",
		})
		return
	}

	noteID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || noteID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid note ID",
		})
		return
	}

	err = h.LearningService.StopSharingNote(
		c.Request.Context(),
		userID,
		noteID,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "note not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to stop sharing note",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "note sharing stopped successfully",
	})
}

// GetSharedNote allows a logged-in user to view an actively shared note.
func (h *LearningHandler) GetSharedNote(c *gin.Context) {
	_, ok := getLearningUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "unauthorized",
		})
		return
	}

	shareToken := c.Param("token")
	if shareToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "share token is required",
		})
		return
	}

	note, err := h.LearningService.GetSharedNote(
		c.Request.Context(),
		shareToken,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "shared note not found or sharing has been stopped",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to retrieve shared note",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"note": gin.H{
			"id":         note.ID,
			"title":      note.Title,
			"content":    note.Content,
			"created_at": note.CreatedAt,
			"updated_at": note.UpdatedAt,
		},
	})
}

// CreateSession creates a new learning session for the logged-in user.
func (h *LearningHandler) CreateSession(c *gin.Context) {
	userID, ok := getLearningUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var request struct {
		VideoID    string `json:"video_id" binding:"required"`
		VideoTitle string `json:"video_title" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "video_id and video_title are required"})
		return
	}

	session := models.LearningSession{
		UserID:     userID,
		VideoID:    request.VideoID,
		VideoTitle: request.VideoTitle,
	}

	if err := h.LearningService.CreateSession(
		c.Request.Context(),
		&session,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create learning session"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"session": session})
}

// CreateNote saves a note in the user's learning session.
func (h *LearningHandler) CreateNote(c *gin.Context) {
	userID, ok := getLearningUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var request struct {
		SessionID int64  `json:"session_id" binding:"required"`
		Title     string `json:"title" binding:"required"`
		Content   string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id, title and content are required"})
		return
	}

	if request.SessionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session ID"})
		return
	}

	note := models.SavedNote{
		UserID:    userID,
		SessionID: request.SessionID,
		Title:     request.Title,
		Content:   request.Content,
	}

	if err := h.LearningService.CreateNote(
		c.Request.Context(),
		&note,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "learning session not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save note"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"note": note})
}

// GetNotes retrieves saved notes belonging to the logged-in user.
func (h *LearningHandler) GetNotes(c *gin.Context) {
	userID, ok := getLearningUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	notes, err := h.LearningService.GetNotesByUser(
		c.Request.Context(),
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve notes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"notes": notes})
}
