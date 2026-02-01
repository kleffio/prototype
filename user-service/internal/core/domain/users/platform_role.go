package users

import "time"

// PlatformRole represents system-wide administrative roles
type PlatformRole string

const (
	PlatformAdmin   PlatformRole = "platform_admin"
	PlatformSupport PlatformRole = "platform_support"
	PlatformUser    PlatformRole = "platform_user"
)

// PlatformRoleAssignment represents a user's platform role assignment
type PlatformRoleAssignment struct {
	ID        string       `json:"id"`
	UserID    string       `json:"userId"`
	Role      PlatformRole `json:"role"`
	GrantedBy *string      `json:"grantedBy,omitempty"`
	GrantedAt time.Time    `json:"grantedAt"`
	RevokedAt *time.Time   `json:"revokedAt,omitempty"`
	CreatedAt time.Time    `json:"createdAt"`
}

// IsActive returns true if the role assignment is currently active (not revoked)
func (p *PlatformRoleAssignment) IsActive() bool {
	return p.RevokedAt == nil
}

// IsValid checks if the role value is valid
func (r PlatformRole) IsValid() bool {
	switch r {
	case PlatformAdmin, PlatformSupport, PlatformUser:
		return true
	default:
		return false
	}
}
