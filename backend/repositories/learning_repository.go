package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"ai-classroom/backend/models"
)

type LearningRepository struct {
	DB *sql.DB
}

func NewLearningRepository(db *sql.DB) *LearningRepository {
	return &LearningRepository{
		DB: db,
	}
}

func (r *LearningRepository) CreateSession(
	ctx context.Context,
	session *models.LearningSession,
) error {
	query := `
		INSERT INTO learning_sessions (
			user_id,
			video_id,
			video_title
		)
		VALUES ($1, $2, $3)
		RETURNING id, started_at
	`

	err := r.DB.QueryRowContext(
		ctx,
		query,
		session.UserID,
		session.VideoID,
		session.VideoTitle,
	).Scan(
		&session.ID,
		&session.StartedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create learning session: %w", err)
	}

	return nil
}

func (r *LearningRepository) CreateNote(
	ctx context.Context,
	note *models.SavedNote,
) error {
	query := `
		INSERT INTO saved_notes (
			user_id,
			session_id,
			title,
			content
		)
		SELECT
			s.user_id,
			s.id,
			$3,
			$4
		FROM learning_sessions s
		WHERE s.id = $2
		  AND s.user_id = $1
		RETURNING id, created_at, updated_at
	`

	err := r.DB.QueryRowContext(
		ctx,
		query,
		note.UserID,
		note.SessionID,
		note.Title,
		note.Content,
	).Scan(
		&note.ID,
		&note.CreatedAt,
		&note.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return sql.ErrNoRows
		}

		return fmt.Errorf("failed to create note: %w", err)
	}

	return nil
}

func (r *LearningRepository) GetNotesByUser(
	ctx context.Context,
	userID int64,
) ([]models.SavedNote, error) {
	query := `
		SELECT
			n.id,
			n.user_id,
			n.session_id,
			n.title,
			n.content,
			n.is_shared,
			n.share_token,
			n.shared_at,
			n.created_at,
			n.updated_at
		FROM saved_notes n
		INNER JOIN learning_sessions s
			ON s.id = n.session_id
		WHERE n.user_id = $1
		ORDER BY
			s.video_id,
			s.started_at ASC,
			n.created_at ASC
	`

	rows, err := r.DB.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get saved notes: %w", err)
	}
	defer rows.Close()

	var notes []models.SavedNote

	for rows.Next() {
		var note models.SavedNote

		if err := rows.Scan(
			&note.ID,
			&note.UserID,
			&note.SessionID,
			&note.Title,
			&note.Content,
			&note.IsShared,
			&note.ShareToken,
			&note.SharedAt,
			&note.CreatedAt,
			&note.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan saved note: %w", err)
		}

		notes = append(notes, note)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading saved notes: %w", err)
	}

	return notes, nil
}

func (r *LearningRepository) UpdateNote(
	ctx context.Context,
	userID int64,
	noteID int64,
	title string,
	content string,
) error {
	query := `
		UPDATE saved_notes
		SET
			title = $1,
			content = $2,
			updated_at = NOW()
		WHERE id = $3
		  AND user_id = $4
	`

	result, err := r.DB.ExecContext(
		ctx,
		query,
		title,
		content,
		noteID,
		userID,
	)

	if err != nil {
		return fmt.Errorf("failed to update note: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check updated note: %w", err)
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *LearningRepository) DeleteNote(
	ctx context.Context,
	userID int64,
	noteID int64,
) error {
	query := `
		DELETE FROM saved_notes
		WHERE id = $1
		  AND user_id = $2
	`

	result, err := r.DB.ExecContext(
		ctx,
		query,
		noteID,
		userID,
	)

	if err != nil {
		return fmt.Errorf("failed to delete note: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check deleted note: %w", err)
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *LearningRepository) CreateQuestion(
	ctx context.Context,
	question *models.SavedQuestion,
) error {
	query := `
		INSERT INTO saved_questions (
			user_id,
			session_id,
			question,
			answer
		)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`

	err := r.DB.QueryRowContext(
		ctx,
		query,
		question.UserID,
		question.SessionID,
		question.Question,
		question.Answer,
	).Scan(
		&question.ID,
		&question.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create saved question: %w", err)
	}

	return nil
}

func (r *LearningRepository) GetQuestionsByUser(
	ctx context.Context,
	userID int64,
) ([]models.SavedQuestion, error) {
	query := `
		SELECT
			q.id,
			q.user_id,
			q.session_id,
			q.question,
			q.answer,
			q.created_at
		FROM saved_questions q
		INNER JOIN learning_sessions s
			ON s.id = q.session_id
		WHERE q.user_id = $1
		ORDER BY
			s.video_id,
			s.started_at ASC,
			q.created_at ASC
	`

	rows, err := r.DB.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get saved questions: %w", err)
	}
	defer rows.Close()

	var questions []models.SavedQuestion

	for rows.Next() {
		var question models.SavedQuestion

		if err := rows.Scan(
			&question.ID,
			&question.UserID,
			&question.SessionID,
			&question.Question,
			&question.Answer,
			&question.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan saved question: %w", err)
		}

		questions = append(questions, question)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading saved questions: %w", err)
	}

	return questions, nil
}

func (r *LearningRepository) DeleteQuestion(
	ctx context.Context,
	userID int64,
	questionID int64,
) error {
	query := `
		DELETE FROM saved_questions
		WHERE id = $1
		  AND user_id = $2
	`

	result, err := r.DB.ExecContext(
		ctx,
		query,
		questionID,
		userID,
	)

	if err != nil {
		return fmt.Errorf("failed to delete saved question: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check deleted question: %w", err)
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// ShareNote enables sharing for a note owned by the user.
func (r *LearningRepository) ShareNote(
	ctx context.Context,
	userID int64,
	noteID int64,
	shareToken string,
) error {
	query := `
		UPDATE saved_notes
		SET
			is_shared = TRUE,
			share_token = $1,
			shared_at = NOW(),
			updated_at = NOW()
		WHERE id = $2
		  AND user_id = $3
	`

	result, err := r.DB.ExecContext(
		ctx,
		query,
		shareToken,
		noteID,
		userID,
	)

	if err != nil {
		return fmt.Errorf("failed to share note: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check shared note: %w", err)
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// StopSharingNote revokes sharing and invalidates the old token.
func (r *LearningRepository) StopSharingNote(
	ctx context.Context,
	userID int64,
	noteID int64,
) error {
	query := `
		UPDATE saved_notes
		SET
			is_shared = FALSE,
			share_token = NULL,
			shared_at = NULL,
			updated_at = NOW()
		WHERE id = $1
		  AND user_id = $2
	`

	result, err := r.DB.ExecContext(
		ctx,
		query,
		noteID,
		userID,
	)

	if err != nil {
		return fmt.Errorf("failed to stop sharing note: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check stopped sharing note: %w", err)
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// GetSharedNoteByToken retrieves a note only when sharing is active.
func (r *LearningRepository) GetSharedNoteByToken(
	ctx context.Context,
	shareToken string,
) (*models.SavedNote, error) {
	query := `
		SELECT
			id,
			user_id,
			session_id,
			title,
			content,
			is_shared,
			share_token,
			shared_at,
			created_at,
			updated_at
		FROM saved_notes
		WHERE share_token = $1
		  AND is_shared = TRUE
	`

	var note models.SavedNote

	err := r.DB.QueryRowContext(
		ctx,
		query,
		shareToken,
	).Scan(
		&note.ID,
		&note.UserID,
		&note.SessionID,
		&note.Title,
		&note.Content,
		&note.IsShared,
		&note.ShareToken,
		&note.SharedAt,
		&note.CreatedAt,
		&note.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, sql.ErrNoRows
		}

		return nil, fmt.Errorf("failed to get shared note: %w", err)
	}

	return &note, nil
}
