package services

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
)

func GenerateOTP() (string, error) {
	const max = 1000000

	n, err := rand.Int(rand.Reader, big.NewInt(max))
	if err != nil {
		return "", fmt.Errorf("failed to generate OTP: %w", err)
	}

	return fmt.Sprintf("%06d", n.Int64()), nil
}

func HashOTP(secret string, userID int64, otp string) (string, error) {
	if strings.TrimSpace(secret) == "" {
		return "", errors.New("OTP HMAC secret is missing")
	}

	mac := hmac.New(sha256.New, []byte(secret))

	message := fmt.Sprintf("%d:%s", userID, otp)

	mac.Write([]byte(message))

	return hex.EncodeToString(mac.Sum(nil)), nil
}

func CompareOTPHash(
	secret string,
	userID int64,
	otp string,
	storedHash string,
) (bool, error) {

	calculatedHash, err := HashOTP(secret, userID, otp)
	if err != nil {
		return false, err
	}

	expectedHash, err := hex.DecodeString(storedHash)
	if err != nil {
		return false, errors.New("invalid stored OTP hash")
	}

	actualHash, err := hex.DecodeString(calculatedHash)
	if err != nil {
		return false, errors.New("invalid calculated OTP hash")
	}

	return hmac.Equal(actualHash, expectedHash), nil
}
