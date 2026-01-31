package com.kleff.projectmanagementservice.authorization.service;

import com.kleff.projectmanagementservice.authorization.domain.AuthorizationDecision;
import com.kleff.projectmanagementservice.datalayer.collaborator.ProjectPermission;

import java.util.Set;

/**
 * Service for handling authorization checks and permission management.
<<<<<<< HEAD
 * Supports shadow mode for safe deployment without breaking existing
 * functionality.
=======
 * Supports shadow mode for safe deployment without breaking existing functionality.
>>>>>>> a17a6a212845b575fd219125a99105c33476c0f2
 */
public interface AuthorizationService {

    /**
     * Check if a user has a specific permission on a project.
     * Returns a detailed authorization decision with reason.
     *
<<<<<<< HEAD
     * @param projectId  The project ID being accessed
     * @param userId     The user requesting access
=======
     * @param projectId The project ID being accessed
     * @param userId The user requesting access
>>>>>>> a17a6a212845b575fd219125a99105c33476c0f2
     * @param permission The permission required
     * @return Authorization decision with result and reason
     */
    AuthorizationDecision checkPermission(String projectId, String userId, ProjectPermission permission);

    /**
     * Simple boolean check if user has permission.
     *
<<<<<<< HEAD
     * @param projectId  The project ID being accessed
     * @param userId     The user requesting access
=======
     * @param projectId The project ID being accessed
     * @param userId The user requesting access
>>>>>>> a17a6a212845b575fd219125a99105c33476c0f2
     * @param permission The permission required
     * @return true if user has permission (or shadow mode is active)
     */
    boolean hasPermission(String projectId, String userId, ProjectPermission permission);

    /**
     * Check if user has ANY of the specified permissions (OR logic).
     *
<<<<<<< HEAD
     * @param projectId   The project ID being accessed
     * @param userId      The user requesting access
=======
     * @param projectId The project ID being accessed
     * @param userId The user requesting access
>>>>>>> a17a6a212845b575fd219125a99105c33476c0f2
     * @param permissions Variable number of permissions to check
     * @return true if user has at least one of the permissions
     */
    boolean hasAnyPermission(String projectId, String userId, ProjectPermission... permissions);

    /**
     * Check if user has ALL of the specified permissions (AND logic).
     *
<<<<<<< HEAD
     * @param projectId   The project ID being accessed
     * @param userId      The user requesting access
=======
     * @param projectId The project ID being accessed
     * @param userId The user requesting access
>>>>>>> a17a6a212845b575fd219125a99105c33476c0f2
     * @param permissions Set of permissions required
     * @return true if user has all specified permissions
     */
    boolean hasAllPermissions(String projectId, String userId, Set<ProjectPermission> permissions);

    /**
     * Get all effective permissions for a user on a project.
     * Resolves permissions from explicit grants, custom roles, or default roles.
     *
     * @param projectId The project ID
<<<<<<< HEAD
     * @param userId    The user ID
=======
     * @param userId The user ID
>>>>>>> a17a6a212845b575fd219125a99105c33476c0f2
     * @return Set of all permissions the user has
     */
    Set<ProjectPermission> getUserPermissions(String projectId, String userId);

    /**
     * Require that a user has a specific permission.
     * In shadow mode: logs but doesn't throw exception.
     * In enforce mode: throws ForbiddenException if permission denied.
     *
     * @param projectId  The project ID being accessed
     * @param userId     The user requesting access
     * @param permission The permission required
     * @param action     Action name for audit logging
     * @param resourceType Resource type for audit logging
     * @throws ForbiddenException if permission denied and enforce mode is active
     */
    void requirePermission(String projectId, String userId, ProjectPermission permission, String action, String resourceType);

    /**
     * Check if shadow mode is currently enabled.
     * In shadow mode, authorization checks log but don't block requests.
     *
     * @return true if shadow mode is enabled
     */
    boolean isShadowModeEnabled();

    /**
     * Check if enforce mode is currently enabled.
     * In enforce mode, authorization checks actively block unauthorized requests.
     *
     * @return true if enforce mode is enabled
     */
    boolean isEnforceModeEnabled();
}
