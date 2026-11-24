package models

import "time"

type LearningSession struct {
	ID         int64     `json:"id"`
	UserID     int64     `json:"user_id"`
	VideoID    string    `json:"video_id"`
	VideoTitle string    `json:"video_title"`
	StartedAt  time.Time `json:"started_at"`
}

type SavedNote struct {
	ID         int64      `json:"id"`
	UserID     int64      `json:"user_id"`
	SessionID  int64      `json:"session_id"`
	Title      string     `json:"title"`
	Content    string     `json:"content"`
	IsShared   bool       `json:"is_shared"`
	ShareToken *string    `json:"share_token,omitempty"`
	SharedAt   *time.Time `json:"shared_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}
type SavedQuestion struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	SessionID int64     `json:"session_id"`
	Question  string    `json:"question"`
	Answer    string    `json:"answer"`
	CreatedAt time.Time `json:"created_at"`
}
