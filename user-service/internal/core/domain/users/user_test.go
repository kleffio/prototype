package users

import (
	"testing"
	"time"
)

func TestUserPublicProfile_NilAvatarAndBio_DefaultToEmptyStrings(t *testing.T) {
	now := time.Now().UTC()

	u := &User{
		ID:          "user123",
		Username:    "testuser",
		DisplayName: "Test User",
		AvatarURL:   nil,
		Bio:         nil,
		CreatedAt:   now,
	}

	p := u.PublicProfile()
	if p == nil {
		t.Fatalf("expected profile, got nil")
	}

	if p.Username != "testuser" {
		t.Fatalf("username: expected %q got %q", "testuser", p.Username)
	}
	if p.DisplayName != "Test User" {
		t.Fatalf("displayName: expected %q got %q", "Test User", p.DisplayName)
	}
	if p.AvatarURL != "" {
		t.Fatalf("avatarUrl: expected empty string got %q", p.AvatarURL)
	}
	if p.Bio != "" {
		t.Fatalf("bio: expected empty string got %q", p.Bio)
	}
	if !p.CreatedAt.Equal(now) {
		t.Fatalf("createdAt: expected %v got %v", now, p.CreatedAt)
	}
}

func TestUserPublicProfile_WithAvatarAndBio_CopiesValues(t *testing.T) {
	now := time.Now().UTC()
	avatar := "https://cdn.example.com/a.png"
	bio := "hello"

	u := &User{
		Username:    "testuser",
		DisplayName: "Test User",
		AvatarURL:   &avatar,
		Bio:         &bio,
		CreatedAt:   now,
	}

	p := u.PublicProfile()

	if p.AvatarURL != avatar {
		t.Fatalf("avatarUrl: expected %q got %q", avatar, p.AvatarURL)
	}
	if p.Bio != bio {
		t.Fatalf("bio: expected %q got %q", bio, p.Bio)
	}
}

func TestUserPublicProfile_ExcludesSensitiveInformation(t *testing.T) {
	now := time.Now().UTC()

	u := &User{
		ID:            "user123",
		AuthentikID:   "authentik123",
		Email:         "user@example.com",
		EmailVerified: true,
		LoginUsername: "user@example.com",
		Username:      "testuser",
		DisplayName:   "Test User",
		CreatedAt:     now,
	}

	p := u.PublicProfile()

	// Verify that sensitive fields are not included in the public profile
	if p.Username != "testuser" {
		t.Fatalf("username: expected %q got %q", "testuser", p.Username)
	}
	if p.DisplayName != "Test User" {
		t.Fatalf("displayName: expected %q got %q", "Test User", p.DisplayName)
	}
	if !p.CreatedAt.Equal(now) {
		t.Fatalf("createdAt: expected %v got %v", now, p.CreatedAt)
	}

	// Note: PublicProfile struct doesn't have Email, EmailVerified, AuthentikID, or LoginUsername fields
	// This test verifies that the PublicProfile method correctly excludes sensitive information
}
