package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	JWTSecret string

	OTPHMACSecret string
	ResendAPIKey  string
	EmailFrom     string
}

func LoadConfig() (*Config, error) {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("failed to load environment file: %w", err)
	}

	cfg := &Config{
		ServerPort: getEnv("SERVER_PORT", "8081"),

		DBHost:     os.Getenv("DB_HOST"),
		DBPort:     os.Getenv("DB_PORT"),
		DBUser:     os.Getenv("DB_USER"),
		DBPassword: os.Getenv("DB_PASSWORD"),
		DBName:     os.Getenv("DB_NAME"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		JWTSecret: os.Getenv("JWT_SECRET"),

		OTPHMACSecret: os.Getenv("OTP_HMAC_SECRET"),
		ResendAPIKey:  os.Getenv("RESEND_API_KEY"),
		EmailFrom:     os.Getenv("EMAIL_FROM"),
	}

	if cfg.DBHost == "" ||
		cfg.DBPort == "" ||
		cfg.DBUser == "" ||
		cfg.DBPassword == "" ||
		cfg.DBName == "" {
		return nil, fmt.Errorf("required database environment variables are missing")
	}

	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is missing")
	}

	if cfg.OTPHMACSecret == "" ||
		cfg.ResendAPIKey == "" ||
		cfg.EmailFrom == "" {
		return nil, fmt.Errorf("required OTP environment variables are missing")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)

	if value == "" {
		return fallback
	}

	return value
}
