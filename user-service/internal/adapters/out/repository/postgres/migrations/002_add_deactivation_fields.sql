-- Add deactivation fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP NULL;

-- Create index for deactivated users
CREATE INDEX IF NOT EXISTS idx_users_deactivated ON users(is_deactivated);