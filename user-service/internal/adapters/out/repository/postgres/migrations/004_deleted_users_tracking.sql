-- Migration: Add deleted_users tracking table
-- This table tracks users who have been permanently deleted
-- to prevent them from being recreated when they try to access the system with valid JWTs

CREATE TABLE IF NOT EXISTS deleted_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_deleted_users_email ON deleted_users(email);
CREATE INDEX IF NOT EXISTS idx_deleted_users_deleted_at ON deleted_users(deleted_at);