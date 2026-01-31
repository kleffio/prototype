package com.kleff.projectmanagementservice.authorization.domain;

/**
 * Result of an authorization check.
 *
 * ALLOW - Permission granted (enforce mode)
 * DENY - Permission denied (enforce mode)
 * SHADOW_ALLOW - Would allow in enforce mode (shadow mode)
 * SHADOW_DENY - Would deny in enforce mode (shadow mode)
 */
public enum AuthorizationResult {
    ALLOW,
    DENY,
    SHADOW_ALLOW,
    SHADOW_DENY
}
