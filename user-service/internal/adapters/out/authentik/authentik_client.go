//go:build !test
// +build !test

package authentik

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	port "github.com/kleffio/www/user-service/internal/core/ports/users"
)

type AuthentikManager struct {
	baseURL  string
	apiToken string
	http     *http.Client
}

var _ port.AuthentikUserManager = (*AuthentikManager)(nil)

func NewAuthentikManager(baseURL string) *AuthentikManager {
	return &AuthentikManager{
		baseURL:  strings.TrimRight(baseURL, "/"),
		apiToken: os.Getenv("AUTHENTIK_API_TOKEN"),
		http: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type updateUsernameRequest struct {
	Username string `json:"username"`
}

type authentikUserList struct {
	Results []struct {
		PK    int    `json:"pk"`
		Email string `json:"email"`
	} `json:"results"`
}

func (m *AuthentikManager) ResolveUserID(ctx context.Context, email string) (string, error) {
	if m.apiToken == "" {
		return "", fmt.Errorf("AUTHENTIK_API_TOKEN not configured")
	}
	email = strings.TrimSpace(email)
	if email == "" {
		return "", fmt.Errorf("email is empty")
	}

	listURL := fmt.Sprintf(
		"%s/api/v3/core/users/?email=%s",
		m.baseURL,
		url.QueryEscape(email),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, listURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create authentik lookup request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+m.apiToken)

	resp, err := m.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("authentik lookup request failed: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode == http.StatusNotFound {
		return "", fmt.Errorf("user not found in authentik")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("authentik lookup returned status %d", resp.StatusCode)
	}

	var list authentikUserList
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		return "", fmt.Errorf("failed to decode authentik user list: %w", err)
	}
	if len(list.Results) == 0 {
		return "", fmt.Errorf("user not found in authentik")
	}

	return fmt.Sprintf("%d", list.Results[0].PK), nil
}

// UpdateUsername updates a user's username in Authentik
func (m *AuthentikManager) UpdateUsername(ctx context.Context, userID string, username string) error {
	if m.apiToken == "" {
		return fmt.Errorf("AUTHENTIK_API_TOKEN not configured")
	}

	reqBody := updateUsernameRequest{
		Username: username,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/api/v3/core/users/%s/", m.baseURL, userID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+m.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := m.http.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode == http.StatusNotFound {
		return fmt.Errorf("user not found in Authentik")
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("authentik API returned status %d", resp.StatusCode)
	}

	return nil
}
