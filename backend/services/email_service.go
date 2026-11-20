package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type EmailService struct {
	Client *http.Client
	APIKey string
	From   string
}

func NewEmailService(apiKey, from string) *EmailService {
	return &EmailService{
		Client: &http.Client{
			Timeout: 15 * time.Second,
		},
		APIKey: apiKey,
		From:   from,
	}
}

func (s *EmailService) SendOTP(
	ctx context.Context,
	to string,
	otp string,
) error {

	if strings.TrimSpace(s.APIKey) == "" {
		return fmt.Errorf("Resend API key is missing")
	}

	if strings.TrimSpace(s.From) == "" {
		return fmt.Errorf("email sender is missing")
	}

	payload := map[string]interface{}{
		"from":    s.From,
		"to":      []string{to},
		"subject": "AI Classroom - Email Verification",
		"html": fmt.Sprintf(
			"<h2>AI Classroom Email Verification</h2>"+
				"<p>Your verification OTP is: <strong>%s</strong></p>"+
				"<p>This OTP expires in 5 minutes.</p>",
			otp,
		),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to create email payload: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		"https://api.resend.com/emails",
		bytes.NewBuffer(body),
	)
	if err != nil {
		return fmt.Errorf("failed to create email request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf(
			"Resend API error: status %d: %s",
			resp.StatusCode,
			string(responseBody),
		)
	}

	return nil
}
