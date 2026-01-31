-- Platform roles table
CREATE TABLE IF NOT EXISTS platform_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    granted_by VARCHAR(255),
    granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT platform_roles_role_check
        CHECK (role IN ('platform_admin', 'platform_support', 'platform_user')),
    CONSTRAINT platform_roles_user_role_unique
        UNIQUE(user_id, role),
    CONSTRAINT platform_roles_revoked_check
        CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_roles_user
    ON platform_roles(user_id)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_platform_roles_active
    ON platform_roles(role)
    WHERE revoked_at IS NULL;

-- Comments for documentation
COMMENT ON TABLE platform_roles IS 'System-wide administrative roles for platform management';
COMMENT ON COLUMN platform_roles.user_id IS 'Reference to users.id';
COMMENT ON COLUMN platform_roles.role IS 'Platform role: platform_admin, platform_support, or platform_user';
COMMENT ON COLUMN platform_roles.granted_by IS 'User ID who granted this role';
COMMENT ON COLUMN platform_roles.revoked_at IS 'When role was revoked (NULL if active)';
