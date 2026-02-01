
DROP TABLE IF EXISTS projects CASCADE;


CREATE TABLE projects (
                          project_id UUID PRIMARY KEY DEFAULT,
                          name VARCHAR(255) NOT NULL,
                          description TEXT,
                          owner_id VARCHAR(255) NOT NULL,
                          environment_variables JSONB,
                          project_status VARCHAR(50) NOT NULL,
                          created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS invitations;
CREATE TABLE IF NOT EXISTS invitations
(
    id                  int AUTO_INCREMENT PRIMARY KEY,
    project_id          varchar(45) not null,
    inviter_id          varchar(45) not null,
    invitee_email       varchar(45) not null,
    role                enum ('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
    status              enum ('PENDING', 'ACCEPTED', 'EXPIRED'),
    expires_at          timestamp,
    created_at          timestamp,
    updated_at          timestamp
);

DROP TABLE IF EXISTS collaborators;
CREATE TABLE IF NOT EXISTS collaborators
(
    id                  int AUTO_INCREMENT PRIMARY KEY,
    project_id          varchar(45) not null,
    user_id             varchar(45) not null,
    role                enum ('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER') not null,
    status              enum ('PENDING', 'ACCEPTED', 'REFUSED', 'EXPIRED') not null,
    invited_by          varchar(45) not null,
    invited_at          timestamp not null,
    accepted_at         timestamp,
    expires_at          timestamp,
    last_accessed_at    timestamp,
    created_at          timestamp not null,
    updated_at          timestamp not null,
    unique key unique_project_user (project_id, user_id)
);

-- ============================================================================
-- AUTHORIZATION SYSTEM - Phase 1
-- ============================================================================

-- Feature flags for controlling authorization behavior
DROP TABLE IF EXISTS feature_flags;
CREATE TABLE IF NOT EXISTS feature_flags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flag_key VARCHAR(100) NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default feature flags (enforce mode enabled for production)
INSERT INTO feature_flags (flag_key, enabled, description) VALUES
    ('authorization.shadow_mode', FALSE, 'When true, authorization logs but does not block requests'),
    ('authorization.enforce_mode', TRUE, 'When true, authorization actively blocks unauthorized requests');

-- Authorization audit logs for tracking all authorization decisions
DROP TABLE IF EXISTS authorization_audit_logs;
CREATE TABLE IF NOT EXISTS authorization_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    permission_checked VARCHAR(100),
    authorization_result ENUM('ALLOW', 'DENY', 'SHADOW_ALLOW', 'SHADOW_DENY'),
    shadow_mode BOOLEAN DEFAULT TRUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(100),
    changes JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, action, created_at DESC),
    INDEX idx_project (project_id, created_at DESC),
    INDEX idx_shadow (shadow_mode, created_at DESC),
    INDEX idx_result (authorization_result, created_at DESC)
);