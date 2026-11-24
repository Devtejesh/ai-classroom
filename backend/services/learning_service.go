package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"

	"ai-classroom/backend/models"
	"ai-classroom/backend/repositories"
)

type LearningService struct {
	LearningRepository *repositories.LearningRepository
}

func NewLearningService(
	learningRepository *repositories.LearningRepository,
) *LearningService {
	return &LearningService{
		LearningRepository: learningRepository,
	}
}

func generateShareToken() (string, error) {
	tokenBytes := make([]byte, 32)

	_, err := rand.Read(tokenBytes)
	if err != nil {
		return "", fmt.Errorf("failed to generate share token: %w", err)
	}

	return base64.RawURLEncoding.EncodeToString(tokenBytes), nil
}

// CreateSession creates a new learning session.
func (s *LearningService) CreateSession(
	ctx context.Context,
	session *models.LearningSession,
) error {
	return s.LearningRepository.CreateSession(ctx, session)
}

// CreateNote saves a note in a learning session.
func (s *LearningService) CreateNote(
	ctx context.Context,
	note *models.SavedNote,
) error {
	return s.LearningRepository.CreateNote(ctx, note)
}

// GetNotesByUser retrieves notes belonging to a user.
func (s *LearningService) GetNotesByUser(
	ctx context.Context,
	userID int64,
) ([]models.SavedNote, error) {
	return s.LearningRepository.GetNotesByUser(ctx, userID)
}

// ShareNote enables sharing for a user's note.
func (s *LearningService) ShareNote(
	ctx context.Context,
	userID int64,
	noteID int64,
) (string, error) {
	shareToken, err := generateShareToken()
	if err != nil {
		return "", err
	}

	err = s.LearningRepository.ShareNote(
		ctx,
		userID,
		noteID,
		shareToken,
	)

	if err != nil {
		return "", err
	}

	return shareToken, nil
}

// StopSharingNote revokes sharing.
func (s *LearningService) StopSharingNote(
	ctx context.Context,
	userID int64,
	noteID int64,
) error {
	return s.LearningRepository.StopSharingNote(
		ctx,
		userID,
		noteID,
	)
}

// GetSharedNote retrieves an actively shared note.
func (s *LearningService) GetSharedNote(
	ctx context.Context,
	shareToken string,
) (*models.SavedNote, error) {
	return s.LearningRepository.GetSharedNoteByToken(
		ctx,
		shareToken,
	)
}
