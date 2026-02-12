//go:build !test
// +build !test

package authentik

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	port "github.com/kleffio/www/user-service/internal/core/ports/users"
)

type TokenValidator struct {
	baseURL string
	http    *http.Client
}

var _ port.TokenValidator = (*TokenValidator)(nil)

func NewTokenValidator(baseURL string) *TokenValidator {
	return &TokenValidator{
		baseURL: baseURL,
		http: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

type userInfoResponse struct {
	Sub               string `json:"sub"`
	Email             string `json:"email"`
	EmailVerified     bool   `json:"email_verified"`
	PreferredUsername string `json:"preferred_username"`
}

func (v *TokenValidator) ValidateToken(ctx context.Context, bearerToken string) (*port.TokenClaims, error) {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/application/o/userinfo/", v.baseURL),
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+bearerToken)

	resp, err := v.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return nil, fmt.Errorf("invalid or expired token")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("userinfo returned status %d", resp.StatusCode)
	}

	var ui userInfoResponse
	if err := json.NewDecoder(resp.Body).Decode(&ui); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if ui.Sub == "" {
		return nil, fmt.Errorf("missing sub claim")
	}

	return &port.TokenClaims{
		Sub:               ui.Sub,
		Email:             ui.Email,
		EmailVerified:     ui.EmailVerified,
		PreferredUsername: ui.PreferredUsername,
	}, nil
}
