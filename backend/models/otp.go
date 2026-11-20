package models

import "time"

type EmailOTP struct {
	ID        int64
	UserID    int64
	OTPHash   string
	ExpiresAt time.Time
	Attempts  int
	CreatedAt time.Time
}
