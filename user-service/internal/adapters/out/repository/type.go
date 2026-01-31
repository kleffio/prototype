//go:build !test
// +build !test

package repository

import (
	port "github.com/kleffio/www/user-service/internal/core/ports/users"
)

type UserRepository = port.UserRepository
type AuditRepository = port.AuditRepository
type PlatformRoleRepository = port.PlatformRoleRepository
type TokenValidator = port.TokenValidator
type TokenClaims = port.TokenClaims

type Repository = port.UserRepository
