package com.kleff.projectmanagementservice.authorization.service;

import com.kleff.projectmanagementservice.authorization.domain.AuthorizationAuditLog;
import com.kleff.projectmanagementservice.authorization.domain.AuthorizationDecision;
import com.kleff.projectmanagementservice.authorization.domain.AuthorizationResult;
import com.kleff.projectmanagementservice.authorization.domain.FeatureFlag;
import com.kleff.projectmanagementservice.authorization.repository.AuthorizationAuditRepository;
import com.kleff.projectmanagementservice.authorization.repository.FeatureFlagRepository;
import com.kleff.projectmanagementservice.datalayer.collaborator.Collaborator;
import com.kleff.projectmanagementservice.datalayer.collaborator.CollaboratorRole;
import com.kleff.projectmanagementservice.datalayer.collaborator.CollaboratorStatus;
import com.kleff.projectmanagementservice.datalayer.collaborator.ProjectPermission;
import com.kleff.projectmanagementservice.datalayer.collaborator.collaboratorRepository;
import com.kleff.projectmanagementservice.datalayer.customrole.CustomRole;
import com.kleff.projectmanagementservice.datalayer.customrole.CustomRoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Implementation of authorization service with shadow mode support.
 * Shadow mode: logs authorization decisions but doesn't block requests.
 * Enforce mode: actively blocks unauthorized requests.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthorizationServiceImpl implements AuthorizationService {

    private final collaboratorRepository collaboratorRepo;
    private final CustomRoleRepository customRoleRepo;
    private final FeatureFlagRepository featureFlagRepo;
    private final AuthorizationAuditRepository auditRepo;

    // Default permissions for built-in roles
    private static final Map<CollaboratorRole, Set<ProjectPermission>> DEFAULT_ROLE_PERMISSIONS = Map.of(
            CollaboratorRole.OWNER, EnumSet.of(
                    ProjectPermission.READ_PROJECT,
                    ProjectPermission.WRITE_PROJECT,
                    ProjectPermission.DEPLOY,
                    ProjectPermission.MANAGE_ENV_VARS,
                    ProjectPermission.VIEW_LOGS,
                    ProjectPermission.VIEW_METRICS,
                    ProjectPermission.MANAGE_COLLABORATORS,
                    ProjectPermission.DELETE_PROJECT,
                    ProjectPermission.MANAGE_BILLING),
            CollaboratorRole.ADMIN, EnumSet.of(
                    ProjectPermission.READ_PROJECT,
                    ProjectPermission.WRITE_PROJECT,
                    ProjectPermission.DEPLOY,
                    ProjectPermission.MANAGE_ENV_VARS,
                    ProjectPermission.VIEW_LOGS,
                    ProjectPermission.VIEW_METRICS,
                    ProjectPermission.MANAGE_COLLABORATORS),
            CollaboratorRole.DEVELOPER, EnumSet.of(
                    ProjectPermission.READ_PROJECT,
                    ProjectPermission.WRITE_PROJECT,
                    ProjectPermission.DEPLOY,
                    ProjectPermission.VIEW_LOGS,
                    ProjectPermission.VIEW_METRICS),
            CollaboratorRole.VIEWER, EnumSet.of(
                    ProjectPermission.READ_PROJECT,
                    ProjectPermission.VIEW_LOGS,
                    ProjectPermission.VIEW_METRICS));

    @Override
    @Transactional(readOnly = true)
    public AuthorizationDecision checkPermission(String projectId, String userId, ProjectPermission permission) {
        boolean shadowMode = isShadowModeEnabled();

        try {
            // Find active collaborator for this user-project combination
            Optional<Collaborator> collaboratorOpt = collaboratorRepo
                    .findByProjectIdAndUserId(projectId, userId)
                    .stream()
                    .filter(c -> c.getCollaboratorStatus() == CollaboratorStatus.ACCEPTED)
                    .filter(c -> c.getExpiresAt() == null || c.getExpiresAt().after(new Date()))
                    .findFirst();

            if (collaboratorOpt.isEmpty()) {
                return buildDecision(
                        shadowMode ? AuthorizationResult.SHADOW_DENY : AuthorizationResult.DENY,
                        userId,
                        projectId,
                        permission.name(),
                        "User is not an active collaborator on this project",
                        shadowMode);
            }

            Collaborator collaborator = collaboratorOpt.get();
            Set<ProjectPermission> effectivePermissions = getEffectivePermissions(collaborator);

            boolean hasPermission = effectivePermissions.contains(permission);

            AuthorizationResult result = determineResult(hasPermission, shadowMode);

            String reason = hasPermission
                    ? String.format("User has permission via role %s", collaborator.getRole())
                    : String.format("User lacks permission %s (role: %s)", permission.name(), collaborator.getRole());

            return buildDecision(result, userId, projectId, permission.name(), reason, shadowMode);

        } catch (Exception e) {
            log.error("Error checking permission for user={}, project={}, permission={}",
                    userId, projectId, permission, e);
            return buildDecision(
                    shadowMode ? AuthorizationResult.SHADOW_DENY : AuthorizationResult.DENY,
                    userId,
                    projectId,
                    permission.name(),
                    "Error checking permission: " + e.getMessage(),
                    shadowMode);
        }
    }

    @Override
    public boolean hasPermission(String projectId, String userId, ProjectPermission permission) {
        AuthorizationDecision decision = checkPermission(projectId, userId, permission);
        return decision.isAllowed();
    }

    @Override
    public boolean hasAnyPermission(String projectId, String userId, ProjectPermission... permissions) {
        for (ProjectPermission permission : permissions) {
            if (hasPermission(projectId, userId, permission)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public boolean hasAllPermissions(String projectId, String userId, Set<ProjectPermission> permissions) {
        Set<ProjectPermission> userPermissions = getUserPermissions(projectId, userId);
        return userPermissions.containsAll(permissions);
    }

    @Override
    public Set<ProjectPermission> getUserPermissions(String projectId, String userId) {
        Optional<Collaborator> collaboratorOpt = collaboratorRepo
                .findByProjectIdAndUserId(projectId, userId)
                .stream()
                .filter(c -> c.getCollaboratorStatus() == CollaboratorStatus.ACCEPTED)
                .filter(c -> c.getExpiresAt() == null || c.getExpiresAt().after(new Date()))
                .findFirst();

        if (collaboratorOpt.isEmpty()) {
            return Collections.emptySet();
        }

        return getEffectivePermissions(collaboratorOpt.get());
    }

    @Override
    @Transactional
    public void requirePermission(String projectId, String userId, ProjectPermission permission, String action,
            String resourceType) {
        AuthorizationDecision decision = checkPermission(projectId, userId, permission);

        // Log to audit
        logAuditDecision(decision, action, resourceType);

        boolean shadowMode = isShadowModeEnabled();
        boolean enforceMode = isEnforceModeEnabled();

        // In shadow mode, log but don't throw
        if (shadowMode && !enforceMode) {
            if (decision.isDenied()) {
                log.warn("[SHADOW MODE] Would deny: user={}, project={}, permission={}, action={}, reason={}",
                        userId, projectId, permission, action, decision.getReason());
            } else {
                log.info("[SHADOW MODE] Would allow: user={}, project={}, permission={}, action={}",
                        userId, projectId, permission, action);
            }
            return;
        }

        // In enforce mode, throw exception on deny
        if (enforceMode && decision.getResult() == AuthorizationResult.DENY) {
            log.warn("Permission denied: user={}, project={}, permission={}, action={}, reason={}",
                    userId, projectId, permission, action, decision.getReason());
            throw new ForbiddenException(
                    String.format("Permission denied: %s", decision.getReason()));
        }
    }

    @Override
    public boolean isShadowModeEnabled() {
        return featureFlagRepo.findByFlagKey("authorization.shadow_mode")
                .map(FeatureFlag::getEnabled)
                .orElse(false); // Default to NOT shadow mode - enforce by default
    }

    @Override
    public boolean isEnforceModeEnabled() {
        return featureFlagRepo.findByFlagKey("authorization.enforce_mode")
                .map(FeatureFlag::getEnabled)
                .orElse(true); // Default to enforcing for security
    }

    // ==================== Private Helper Methods ====================

    /**
     * Get effective permissions for a collaborator.
     * Resolution hierarchy:
     * 1. Explicit permissions on collaborator (highest priority)
     * 2. Custom role permissions (if custom role assigned)
     * 3. Default role permissions (fallback)
     */
    private Set<ProjectPermission> getEffectivePermissions(Collaborator collaborator) {
        // Priority 1: Explicit permissions on collaborator
        if (collaborator.getPermissions() != null && !collaborator.getPermissions().isEmpty()) {
            return new HashSet<>(collaborator.getPermissions());
        }

        // Priority 2: Custom role permissions
        if (collaborator.getCustomRoleId() != null) {
            Optional<CustomRole> customRoleOpt = customRoleRepo.findById(collaborator.getCustomRoleId());
            if (customRoleOpt.isPresent()) {
                return new HashSet<>(customRoleOpt.get().getPermissions());
            }
        }

        // Priority 3: Default role permissions
        return DEFAULT_ROLE_PERMISSIONS.getOrDefault(collaborator.getRole(), Collections.emptySet());
    }

    /**
     * Determine authorization result based on permission check and mode.
     */
    private AuthorizationResult determineResult(boolean hasPermission, boolean shadowMode) {
        if (shadowMode) {
            return hasPermission ? AuthorizationResult.SHADOW_ALLOW : AuthorizationResult.SHADOW_DENY;
        } else {
            return hasPermission ? AuthorizationResult.ALLOW : AuthorizationResult.DENY;
        }
    }

    /**
     * Build an authorization decision object.
     */
    private AuthorizationDecision buildDecision(
            AuthorizationResult result,
            String userId,
            String projectId,
            String permission,
            String reason,
            boolean shadowMode) {
        return AuthorizationDecision.builder()
                .result(result)
                .userId(userId)
                .projectId(projectId)
                .permission(permission)
                .reason(reason)
                .shadowMode(shadowMode)
                .build();
    }

    /**
     * Log authorization decision to audit table.
     */
    private void logAuditDecision(AuthorizationDecision decision, String action, String resourceType) {
        try {
            AuthorizationAuditLog auditLog = AuthorizationAuditLog.builder()
                    .userId(decision.getUserId())
                    .projectId(decision.getProjectId())
                    .action(action)
                    .resourceType(resourceType)
                    .permissionChecked(decision.getPermission())
                    .authorizationResult(decision.getResult())
                    .shadowMode(decision.isShadowMode())
                    .changes(Map.of("reason", decision.getReason()))
                    .build();

            auditRepo.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to log audit decision", e);
            // Don't throw - audit logging failure shouldn't break authorization
        }
    }

    /**
     * Exception thrown when authorization is denied in enforce mode.
     */
    public static class ForbiddenException extends RuntimeException {
        public ForbiddenException(String message) {
            super(message);
        }
    }
}
