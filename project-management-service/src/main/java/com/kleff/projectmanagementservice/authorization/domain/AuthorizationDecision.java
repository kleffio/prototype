package com.kleff.projectmanagementservice.authorization.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents the result of an authorization decision.
 * Contains details about who, what, and why for audit purposes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorizationDecision {

    /**
     * Result of the authorization check
     */
    private AuthorizationResult result;

    /**
     * User ID who requested access
     */
    private String userId;

    /**
     * Project ID being accessed
     */
    private String projectId;

    /**
     * Permission that was checked
     */
    private String permission;

    /**
     * Human-readable reason for the decision
     */
    private String reason;

    /**
     * Whether this decision was made in shadow mode
     */
    private boolean shadowMode;

    /**
     * Check if access was granted (either ALLOW or SHADOW_ALLOW)
     */
    public boolean isAllowed() {
        return result == AuthorizationResult.ALLOW || result == AuthorizationResult.SHADOW_ALLOW;
    }

    /**
     * Check if access was denied (either DENY or SHADOW_DENY)
     */
    public boolean isDenied() {
        return result == AuthorizationResult.DENY || result == AuthorizationResult.SHADOW_DENY;
    }
}
