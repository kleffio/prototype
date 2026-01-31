package users

import "time"

type ID string

type User struct {
	ID            ID     `json:"id"`
	AuthentikID   string `json:"-"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"emailVerified"`

	LoginUsername string `json:"-"`

	Username    string  `json:"username"`
	DisplayName string  `json:"displayName"`
	AvatarURL   *string `json:"avatarUrl"`
	Bio         *string `json:"bio"`

	IsDeactivated bool       `json:"isDeactivated"`
	DeactivatedAt *time.Time `json:"deactivatedAt"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (u *User) PublicProfile() *PublicProfile {
	avatarURL := ""
	if u.AvatarURL != nil {
		avatarURL = *u.AvatarURL
	}
	bio := ""
	if u.Bio != nil {
		bio = *u.Bio
	}

	return &PublicProfile{
		Username:    u.Username,
		DisplayName: u.DisplayName,
		AvatarURL:   avatarURL,
		Bio:         bio,
		CreatedAt:   u.CreatedAt,
	}
}

type PublicProfile struct {
	Username    string    `json:"username"`
	DisplayName string    `json:"displayName"`
	AvatarURL   string    `json:"avatarUrl"`
	Bio         string    `json:"bio"`
	CreatedAt   time.Time `json:"createdAt"`
}

type ProfileUpdate struct {
	Username    *string `json:"username,omitempty"`
	DisplayName *string `json:"displayName,omitempty"`
	AvatarURL   *string `json:"avatarUrl,omitempty"`
	Bio         *string `json:"bio,omitempty"`
}
