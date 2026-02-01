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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthorizationServiceImpl Tests")
class AuthorizationServiceImplTest {

    @Mock
    private collaboratorRepository collaboratorRepo;

    @Mock
    private CustomRoleRepository customRoleRepo;

    @Mock
    private FeatureFlagRepository featureFlagRepo;

    @Mock
    private AuthorizationAuditRepository auditRepo;

    @InjectMocks
    private AuthorizationServiceImpl authorizationService;

    private String testProjectId;
    private String testUserId;
    private Date currentDate;

    @BeforeEach
    void setUp() {
        testProjectId = "project-123";
        testUserId = "user-456";
        currentDate = new Date();
    }

    // ==================== Helper Methods ====================

    private Collaborator createCollaborator(CollaboratorRole role, CollaboratorStatus status) {
        return Collaborator.builder()
                .id(1)
                .projectId(testProjectId)
                .userId(testUserId)
                .role(role)
                .collaboratorStatus(status)
                .invitedBy("owner-123")
                .invitedAt(currentDate)
                .acceptedAt(status == CollaboratorStatus.ACCEPTED ? currentDate : null)
                .expiresAt(null)
                .build();
    }

    private Collaborator createCollaboratorWithPermissions(Set<ProjectPermission> permissions) {
        Collaborator collaborator = createCollaborator(CollaboratorRole.VIEWER, CollaboratorStatus.ACCEPTED);
        collaborator.setPermissions(permissions);
        return collaborator;
    }

    private Collaborator createCollaboratorWithCustomRole(Integer customRoleId) {
        Collaborator collaborator = createCollaborator(CollaboratorRole.DEVELOPER, CollaboratorStatus.ACCEPTED);
        collaborator.setCustomRoleId(customRoleId);
        return collaborator;
    }

    private FeatureFlag createFeatureFlag(String key, boolean enabled) {
        FeatureFlag flag = new FeatureFlag();
        flag.setFlagKey(key);
        flag.setEnabled(enabled);
        return flag;
    }

    // ==================== Default Role Permissions Tests ====================

    @Nested
    @DisplayName("Default Role Permission Tests")
    class DefaultRolePermissionTests {

        @Test
        @DisplayName("OWNER role should have all permissions")
        void ownerRoleHasAllPermissions() {
            // Arrange
            Collaborator owner = createCollaborator(CollaboratorRole.OWNER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(owner));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act & Assert - Test all permissions
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.READ_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.WRITE_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DEPLOY)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_ENV_VARS)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.VIEW_LOGS)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.VIEW_METRICS)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_COLLABORATORS)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DELETE_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_BILLING)).isTrue();
        }

        @Test
        @DisplayName("ADMIN role should have most permissions except MANAGE_BILLING and DELETE_PROJECT")
        void adminRoleHasMostPermissions() {
            // Arrange
            Collaborator admin = createCollaborator(CollaboratorRole.ADMIN, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(admin));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act & Assert - Test allowed permissions
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.READ_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.WRITE_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DEPLOY)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_ENV_VARS)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.VIEW_LOGS)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.VIEW_METRICS)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_COLLABORATORS)).isTrue();

            // Assert - Test denied permissions
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DELETE_PROJECT)).isFalse();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_BILLING)).isFalse();
        }

        @Test
        @DisplayName("DEVELOPER role should have read, write, deploy permissions")
        void developerRoleHasLimitedPermissions() {
            // Arrange
            Collaborator developer = createCollaborator(CollaboratorRole.DEVELOPER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(developer));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act & Assert - Test allowed permissions
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.READ_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.WRITE_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DEPLOY)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.VIEW_LOGS)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.VIEW_METRICS)).isTrue();

            // Assert - Test denied permissions
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_ENV_VARS)).isFalse();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_COLLABORATORS)).isFalse();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DELETE_PROJECT)).isFalse();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_BILLING)).isFalse();
        }

        @Test
        @DisplayName("VIEWER role should have only read permissions")
        void viewerRoleHasOnlyReadPermissions() {
            // Arrange
            Collaborator viewer = createCollaborator(CollaboratorRole.VIEWER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(viewer));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act & Assert - Test allowed permissions
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.READ_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.VIEW_LOGS)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.VIEW_METRICS)).isTrue();

            // Assert - Test denied permissions
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.WRITE_PROJECT)).isFalse();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DEPLOY)).isFalse();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_ENV_VARS)).isFalse();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_COLLABORATORS)).isFalse();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DELETE_PROJECT)).isFalse();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_BILLING)).isFalse();
        }
    }

    // ==================== Shadow Mode Behavior Tests ====================

    @Nested
    @DisplayName("Shadow Mode Behavior Tests")
    class ShadowModeBehaviorTests {

        @Test
        @DisplayName("Shadow mode ON should return SHADOW_DENY when permission is denied")
        void shadowModeOn_ReturnsShadowDenyWhenDenied() {
            // Arrange
            Collaborator viewer = createCollaborator(CollaboratorRole.VIEWER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(viewer));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.shadow_mode", true)));

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.DELETE_PROJECT);

            // Assert
            assertThat(decision).isNotNull();
            assertThat(decision.getResult()).isEqualTo(AuthorizationResult.SHADOW_DENY);
            assertThat(decision.isDenied()).isTrue(); // Shadow deny is still a denial
            assertThat(decision.isAllowed()).isFalse(); // But marked as shadow
            assertThat(decision.isShadowMode()).isTrue();
            assertThat(decision.getReason()).contains("lacks permission");
        }

        @Test
        @DisplayName("Shadow mode OFF and enforce mode ON should throw ForbiddenException on deny")
        void shadowModeOffEnforceModeOn_ThrowsExceptionOnDeny() {
            // Arrange
            Collaborator viewer = createCollaborator(CollaboratorRole.VIEWER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(viewer));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.shadow_mode", false)));
            when(featureFlagRepo.findByFlagKey("authorization.enforce_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.enforce_mode", true)));
            when(auditRepo.save(any(AuthorizationAuditLog.class)))
                    .thenReturn(null);

            // Act & Assert
            assertThatThrownBy(() -> authorizationService.requirePermission(
                    testProjectId, testUserId, ProjectPermission.DELETE_PROJECT, "delete-project"))
                    .isInstanceOf(AuthorizationServiceImpl.ForbiddenException.class)
                    .hasMessageContaining("Permission denied");

            verify(auditRepo, times(1)).save(any(AuthorizationAuditLog.class));
        }

        @Test
        @DisplayName("Shadow mode ON with allowed permission should return SHADOW_ALLOW")
        void shadowModeOn_WithAllowedPermission_ReturnsShadowAllow() {
            // Arrange
            Collaborator owner = createCollaborator(CollaboratorRole.OWNER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(owner));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.shadow_mode", true)));

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.DELETE_PROJECT);

            // Assert
            assertThat(decision.getResult()).isEqualTo(AuthorizationResult.SHADOW_ALLOW);
            assertThat(decision.isAllowed()).isTrue();
            assertThat(decision.isShadowMode()).isTrue();
        }

        @Test
        @DisplayName("Enforce mode ON with allowed permission should return ALLOW")
        void enforceModeOn_WithAllowedPermission_ReturnsAllow() {
            // Arrange
            Collaborator owner = createCollaborator(CollaboratorRole.OWNER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(owner));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.shadow_mode", false)));

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.DELETE_PROJECT);

            // Assert
            assertThat(decision.getResult()).isEqualTo(AuthorizationResult.ALLOW);
            assertThat(decision.isAllowed()).isTrue();
            assertThat(decision.isShadowMode()).isFalse();
        }

        @Test
        @DisplayName("requirePermission in shadow mode should not throw exception")
        void requirePermission_InShadowMode_DoesNotThrowException() {
            // Arrange
            Collaborator viewer = createCollaborator(CollaboratorRole.VIEWER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(viewer));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.shadow_mode", true)));
            when(featureFlagRepo.findByFlagKey("authorization.enforce_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.enforce_mode", false)));
            when(auditRepo.save(any(AuthorizationAuditLog.class)))
                    .thenReturn(null);

            // Act - Should not throw
            authorizationService.requirePermission(
                    testProjectId, testUserId, ProjectPermission.DELETE_PROJECT, "delete-project");

            // Assert
            verify(auditRepo, times(1)).save(any(AuthorizationAuditLog.class));
        }
    }

    // ==================== Permission Resolution Hierarchy Tests ====================

    @Nested
    @DisplayName("Permission Resolution Hierarchy Tests")
    class PermissionResolutionHierarchyTests {

        @Test
        @DisplayName("Explicit permissions on collaborator should override default role permissions")
        void explicitPermissions_OverrideDefaultRolePermissions() {
            // Arrange - VIEWER role normally can't WRITE, but explicit permission allows it
            Set<ProjectPermission> explicitPermissions = new HashSet<>(Arrays.asList(
                    ProjectPermission.READ_PROJECT,
                    ProjectPermission.WRITE_PROJECT,
                    ProjectPermission.DEPLOY
            ));
            Collaborator collaborator = createCollaboratorWithPermissions(explicitPermissions);

            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(collaborator));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.READ_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.WRITE_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DEPLOY)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DELETE_PROJECT)).isFalse();
        }

        @Test
        @DisplayName("Custom role permissions should override default role permissions")
        void customRolePermissions_OverrideDefaultRolePermissions() {
            // Arrange
            Integer customRoleId = 100;
            Set<ProjectPermission> customPermissions = new HashSet<>(Arrays.asList(
                    ProjectPermission.READ_PROJECT,
                    ProjectPermission.WRITE_PROJECT,
                    ProjectPermission.MANAGE_BILLING
            ));

            CustomRole customRole = CustomRole.builder()
                    .id(customRoleId)
                    .projectId(testProjectId)
                    .name("Custom Role")
                    .permissions(customPermissions)
                    .build();

            Collaborator collaborator = createCollaboratorWithCustomRole(customRoleId);

            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(collaborator));
            when(customRoleRepo.findById(customRoleId))
                    .thenReturn(Optional.of(customRole));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.READ_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.WRITE_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_BILLING)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DEPLOY)).isFalse();
        }

        @Test
        @DisplayName("Explicit permissions should take priority over custom role")
        void explicitPermissions_TakePriorityOverCustomRole() {
            // Arrange
            Integer customRoleId = 100;
            Set<ProjectPermission> explicitPermissions = new HashSet<>(Arrays.asList(
                    ProjectPermission.DEPLOY,
                    ProjectPermission.MANAGE_BILLING
            ));

            Collaborator collaborator = createCollaboratorWithCustomRole(customRoleId);
            collaborator.setPermissions(explicitPermissions);

            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(collaborator));
            // Note: customRoleRepo is not stubbed because explicit permissions take priority
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act & Assert - Explicit permissions should be used, not custom role
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DEPLOY)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_BILLING)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.READ_PROJECT)).isFalse();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.WRITE_PROJECT)).isFalse();
        }

        @Test
        @DisplayName("Should fall back to default role permissions when custom role not found")
        void fallbackToDefaultRole_WhenCustomRoleNotFound() {
            // Arrange
            Integer customRoleId = 999;
            Collaborator collaborator = createCollaboratorWithCustomRole(customRoleId);
            collaborator.setRole(CollaboratorRole.DEVELOPER);

            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(collaborator));
            when(customRoleRepo.findById(customRoleId))
                    .thenReturn(Optional.empty()); // Custom role not found
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act & Assert - Should use DEVELOPER default permissions
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.READ_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.WRITE_PROJECT)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.DEPLOY)).isTrue();
            assertThat(authorizationService.hasPermission(testProjectId, testUserId, ProjectPermission.MANAGE_COLLABORATORS)).isFalse();
        }
    }

    // ==================== Edge Cases Tests ====================

    @Nested
    @DisplayName("Edge Cases Tests")
    class EdgeCasesTests {

        @Test
        @DisplayName("User not a collaborator should be denied")
        void userNotCollaborator_ShouldBeDenied() {
            // Arrange
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.empty());
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.READ_PROJECT);

            // Assert
            assertThat(decision.getResult()).isEqualTo(AuthorizationResult.DENY);
            assertThat(decision.isAllowed()).isFalse();
            assertThat(decision.getReason()).contains("not an active collaborator");
        }

        @Test
        @DisplayName("Collaborator with PENDING status should be denied")
        void pendingCollaborator_ShouldBeDenied() {
            // Arrange
            Collaborator pendingCollaborator = createCollaborator(CollaboratorRole.DEVELOPER, CollaboratorStatus.PENDING);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(pendingCollaborator));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.READ_PROJECT);

            // Assert
            assertThat(decision.getResult()).isEqualTo(AuthorizationResult.DENY);
            assertThat(decision.isAllowed()).isFalse();
            assertThat(decision.getReason()).contains("not an active collaborator");
        }

        @Test
        @DisplayName("Collaborator with REFUSED status should be denied")
        void refusedCollaborator_ShouldBeDenied() {
            // Arrange
            Collaborator refusedCollaborator = createCollaborator(CollaboratorRole.DEVELOPER, CollaboratorStatus.REFUSED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(refusedCollaborator));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.READ_PROJECT);

            // Assert
            assertThat(decision.getResult()).isEqualTo(AuthorizationResult.DENY);
            assertThat(decision.isAllowed()).isFalse();
        }

        @Test
        @DisplayName("Expired collaborator should be denied")
        void expiredCollaborator_ShouldBeDenied() {
            // Arrange
            Date pastDate = new Date(System.currentTimeMillis() - 86400000); // Yesterday
            Collaborator expiredCollaborator = createCollaborator(CollaboratorRole.DEVELOPER, CollaboratorStatus.ACCEPTED);
            expiredCollaborator.setExpiresAt(pastDate);

            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(expiredCollaborator));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.READ_PROJECT);

            // Assert
            assertThat(decision.getResult()).isEqualTo(AuthorizationResult.DENY);
            assertThat(decision.isAllowed()).isFalse();
            assertThat(decision.getReason()).contains("not an active collaborator");
        }

        @Test
        @DisplayName("Collaborator with future expiry date should be allowed")
        void futureExpiryCollaborator_ShouldBeAllowed() {
            // Arrange
            Date futureDate = new Date(System.currentTimeMillis() + 86400000); // Tomorrow
            Collaborator collaborator = createCollaborator(CollaboratorRole.OWNER, CollaboratorStatus.ACCEPTED);
            collaborator.setExpiresAt(futureDate);

            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(collaborator));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.READ_PROJECT);

            // Assert
            assertThat(decision.getResult()).isEqualTo(AuthorizationResult.ALLOW);
            assertThat(decision.isAllowed()).isTrue();
        }

        @Test
        @DisplayName("Repository exception should return DENY")
        void repositoryException_ShouldReturnDeny() {
            // Arrange
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenThrow(new RuntimeException("Database connection error"));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.READ_PROJECT);

            // Assert
            assertThat(decision.getResult()).isEqualTo(AuthorizationResult.DENY);
            assertThat(decision.isAllowed()).isFalse();
            assertThat(decision.getReason()).contains("Error checking permission");
        }

        @Test
        @DisplayName("Audit logging failure should not break authorization")
        void auditLoggingFailure_ShouldNotBreakAuthorization() {
            // Arrange
            Collaborator owner = createCollaborator(CollaboratorRole.OWNER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(owner));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());
            when(featureFlagRepo.findByFlagKey("authorization.enforce_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.enforce_mode", true)));
            when(auditRepo.save(any(AuthorizationAuditLog.class)))
                    .thenThrow(new RuntimeException("Audit save failed"));

            // Act - Should not throw despite audit failure
            authorizationService.requirePermission(
                    testProjectId, testUserId, ProjectPermission.READ_PROJECT, "read-project");

            // Assert - Verify audit was attempted
            verify(auditRepo, times(1)).save(any(AuthorizationAuditLog.class));
        }
    }

    // ==================== Batch Permission Checks Tests ====================

    @Nested
    @DisplayName("Batch Permission Checks Tests")
    class BatchPermissionChecksTests {

        @Test
        @DisplayName("hasAnyPermission should return true if user has at least one permission")
        void hasAnyPermission_WithOneMatch_ReturnsTrue() {
            // Arrange
            Collaborator developer = createCollaborator(CollaboratorRole.DEVELOPER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(developer));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            boolean hasAny = authorizationService.hasAnyPermission(
                    testProjectId,
                    testUserId,
                    ProjectPermission.MANAGE_BILLING,
                    ProjectPermission.DELETE_PROJECT,
                    ProjectPermission.DEPLOY // Developer has this
            );

            // Assert
            assertThat(hasAny).isTrue();
        }

        @Test
        @DisplayName("hasAnyPermission should return false if user has none of the permissions")
        void hasAnyPermission_WithNoMatch_ReturnsFalse() {
            // Arrange
            Collaborator viewer = createCollaborator(CollaboratorRole.VIEWER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(viewer));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            boolean hasAny = authorizationService.hasAnyPermission(
                    testProjectId,
                    testUserId,
                    ProjectPermission.WRITE_PROJECT,
                    ProjectPermission.DEPLOY,
                    ProjectPermission.DELETE_PROJECT
            );

            // Assert
            assertThat(hasAny).isFalse();
        }

        @Test
        @DisplayName("hasAllPermissions should return true if user has all permissions")
        void hasAllPermissions_WithAllMatches_ReturnsTrue() {
            // Arrange
            Collaborator developer = createCollaborator(CollaboratorRole.DEVELOPER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(developer));

            Set<ProjectPermission> requiredPermissions = new HashSet<>(Arrays.asList(
                    ProjectPermission.READ_PROJECT,
                    ProjectPermission.WRITE_PROJECT,
                    ProjectPermission.DEPLOY
            ));

            // Act
            boolean hasAll = authorizationService.hasAllPermissions(
                    testProjectId,
                    testUserId,
                    requiredPermissions
            );

            // Assert
            assertThat(hasAll).isTrue();
        }

        @Test
        @DisplayName("hasAllPermissions should return false if user lacks any permission")
        void hasAllPermissions_MissingOne_ReturnsFalse() {
            // Arrange
            Collaborator developer = createCollaborator(CollaboratorRole.DEVELOPER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(developer));

            Set<ProjectPermission> requiredPermissions = new HashSet<>(Arrays.asList(
                    ProjectPermission.READ_PROJECT,
                    ProjectPermission.WRITE_PROJECT,
                    ProjectPermission.DELETE_PROJECT // Developer doesn't have this
            ));

            // Act
            boolean hasAll = authorizationService.hasAllPermissions(
                    testProjectId,
                    testUserId,
                    requiredPermissions
            );

            // Assert
            assertThat(hasAll).isFalse();
        }

        @Test
        @DisplayName("getUserPermissions should return all effective permissions for user")
        void getUserPermissions_ReturnsAllEffectivePermissions() {
            // Arrange
            Collaborator admin = createCollaborator(CollaboratorRole.ADMIN, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(admin));

            // Act
            Set<ProjectPermission> permissions = authorizationService.getUserPermissions(testProjectId, testUserId);

            // Assert
            assertThat(permissions).containsExactlyInAnyOrder(
                    ProjectPermission.READ_PROJECT,
                    ProjectPermission.WRITE_PROJECT,
                    ProjectPermission.DEPLOY,
                    ProjectPermission.MANAGE_ENV_VARS,
                    ProjectPermission.VIEW_LOGS,
                    ProjectPermission.VIEW_METRICS,
                    ProjectPermission.MANAGE_COLLABORATORS
            );
        }

        @Test
        @DisplayName("getUserPermissions should return empty set for non-collaborator")
        void getUserPermissions_NonCollaborator_ReturnsEmptySet() {
            // Arrange
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.empty());

            // Act
            Set<ProjectPermission> permissions = authorizationService.getUserPermissions(testProjectId, testUserId);

            // Assert
            assertThat(permissions).isEmpty();
        }

        @Test
        @DisplayName("getUserPermissions should return explicit permissions when set")
        void getUserPermissions_WithExplicitPermissions_ReturnsExplicitPermissions() {
            // Arrange
            Set<ProjectPermission> explicitPermissions = new HashSet<>(Arrays.asList(
                    ProjectPermission.READ_PROJECT,
                    ProjectPermission.MANAGE_BILLING
            ));
            Collaborator collaborator = createCollaboratorWithPermissions(explicitPermissions);

            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(collaborator));

            // Act
            Set<ProjectPermission> permissions = authorizationService.getUserPermissions(testProjectId, testUserId);

            // Assert
            assertThat(permissions).containsExactlyInAnyOrder(
                    ProjectPermission.READ_PROJECT,
                    ProjectPermission.MANAGE_BILLING
            );
        }
    }

    // ==================== Feature Flags Tests ====================

    @Nested
    @DisplayName("Feature Flags Tests")
    class FeatureFlagsTests {

        @Test
        @DisplayName("isShadowModeEnabled should return true when flag is enabled")
        void isShadowModeEnabled_FlagEnabled_ReturnsTrue() {
            // Arrange
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.shadow_mode", true)));

            // Act
            boolean enabled = authorizationService.isShadowModeEnabled();

            // Assert
            assertThat(enabled).isTrue();
        }

        @Test
        @DisplayName("isShadowModeEnabled should return false when flag is disabled")
        void isShadowModeEnabled_FlagDisabled_ReturnsFalse() {
            // Arrange
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.shadow_mode", false)));

            // Act
            boolean enabled = authorizationService.isShadowModeEnabled();

            // Assert
            assertThat(enabled).isFalse();
        }

        @Test
        @DisplayName("isShadowModeEnabled should return false when flag not found")
        void isShadowModeEnabled_FlagNotFound_ReturnsFalse() {
            // Arrange
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            boolean enabled = authorizationService.isShadowModeEnabled();

            // Assert
            assertThat(enabled).isFalse();
        }

        @Test
        @DisplayName("isEnforceModeEnabled should return true when flag is enabled")
        void isEnforceModeEnabled_FlagEnabled_ReturnsTrue() {
            // Arrange
            when(featureFlagRepo.findByFlagKey("authorization.enforce_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.enforce_mode", true)));

            // Act
            boolean enabled = authorizationService.isEnforceModeEnabled();

            // Assert
            assertThat(enabled).isTrue();
        }

        @Test
        @DisplayName("isEnforceModeEnabled should return false when flag is disabled")
        void isEnforceModeEnabled_FlagDisabled_ReturnsFalse() {
            // Arrange
            when(featureFlagRepo.findByFlagKey("authorization.enforce_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.enforce_mode", false)));

            // Act
            boolean enabled = authorizationService.isEnforceModeEnabled();

            // Assert
            assertThat(enabled).isFalse();
        }

        @Test
        @DisplayName("isEnforceModeEnabled should return true when flag not found (default to enforce)")
        void isEnforceModeEnabled_FlagNotFound_ReturnsTrue() {
            // Arrange
            when(featureFlagRepo.findByFlagKey("authorization.enforce_mode"))
                    .thenReturn(Optional.empty());

            // Act
            boolean enabled = authorizationService.isEnforceModeEnabled();

            // Assert
            assertThat(enabled).isTrue();
        }
    }

    // ==================== Authorization Decision Tests ====================

    @Nested
    @DisplayName("Authorization Decision Tests")
    class AuthorizationDecisionTests {

        @Test
        @DisplayName("checkPermission should populate decision with correct metadata")
        void checkPermission_PopulatesDecisionMetadata() {
            // Arrange
            Collaborator owner = createCollaborator(CollaboratorRole.OWNER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(owner));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.DELETE_PROJECT);

            // Assert
            assertThat(decision.getUserId()).isEqualTo(testUserId);
            assertThat(decision.getProjectId()).isEqualTo(testProjectId);
            assertThat(decision.getPermission()).isEqualTo(ProjectPermission.DELETE_PROJECT.name());
            assertThat(decision.getReason()).isNotBlank();
        }

        @Test
        @DisplayName("requirePermission should log audit decision")
        void requirePermission_LogsAuditDecision() {
            // Arrange
            Collaborator owner = createCollaborator(CollaboratorRole.OWNER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(owner));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());
            when(featureFlagRepo.findByFlagKey("authorization.enforce_mode"))
                    .thenReturn(Optional.of(createFeatureFlag("authorization.enforce_mode", true)));

            ArgumentCaptor<AuthorizationAuditLog> auditCaptor = ArgumentCaptor.forClass(AuthorizationAuditLog.class);
            when(auditRepo.save(auditCaptor.capture())).thenReturn(null);

            // Act
            authorizationService.requirePermission(
                    testProjectId, testUserId, ProjectPermission.DELETE_PROJECT, "delete-project-action");

            // Assert
            verify(auditRepo, times(1)).save(any(AuthorizationAuditLog.class));

            AuthorizationAuditLog auditLog = auditCaptor.getValue();
            assertThat(auditLog.getUserId()).isEqualTo(testUserId);
            assertThat(auditLog.getProjectId()).isEqualTo(testProjectId);
            assertThat(auditLog.getAction()).isEqualTo("delete-project-action");
            assertThat(auditLog.getPermissionChecked()).isEqualTo(ProjectPermission.DELETE_PROJECT.name());
            assertThat(auditLog.getAuthorizationResult()).isEqualTo(AuthorizationResult.ALLOW);
        }

        @Test
        @DisplayName("hasPermission should delegate to checkPermission")
        void hasPermission_DelegatesToCheckPermission() {
            // Arrange
            Collaborator owner = createCollaborator(CollaboratorRole.OWNER, CollaboratorStatus.ACCEPTED);
            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(owner));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            boolean hasPermission = authorizationService.hasPermission(
                    testProjectId, testUserId, ProjectPermission.DELETE_PROJECT);

            // Assert
            assertThat(hasPermission).isTrue();
            verify(collaboratorRepo, times(1)).findByProjectIdAndUserId(testProjectId, testUserId);
        }
    }

    // ==================== Additional Edge Cases Tests ====================

    @Nested
    @DisplayName("Additional Edge Cases")
    class AdditionalEdgeCasesTests {

        @Test
        @DisplayName("Should handle collaborator with null permissions list")
        void nullPermissionsList_UsesDefaultRolePermissions() {
            // Arrange
            Collaborator collaborator = createCollaborator(CollaboratorRole.DEVELOPER, CollaboratorStatus.ACCEPTED);
            collaborator.setPermissions(null); // Explicitly null

            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(collaborator));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.READ_PROJECT);

            // Assert - Should use DEVELOPER default permissions
            assertThat(decision.getResult()).isEqualTo(AuthorizationResult.ALLOW);
            assertThat(decision.getReason()).contains("DEVELOPER");
        }

        @Test
        @DisplayName("Should filter out expired collaborators even if ACCEPTED")
        void multipleCollaborators_FiltersExpired() {
            // Arrange
            Date pastDate = new Date(System.currentTimeMillis() - 86400000);
            Collaborator expired = createCollaborator(CollaboratorRole.OWNER, CollaboratorStatus.ACCEPTED);
            expired.setExpiresAt(pastDate);

            when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                    .thenReturn(Optional.of(expired));
            when(featureFlagRepo.findByFlagKey("authorization.shadow_mode"))
                    .thenReturn(Optional.empty());

            // Act
            AuthorizationDecision decision = authorizationService.checkPermission(
                    testProjectId, testUserId, ProjectPermission.READ_PROJECT);

            // Assert
            assertThat(decision.getResult()).isEqualTo(AuthorizationResult.DENY);
            assertThat(decision.getReason()).contains("not an active collaborator");
        }
    }
}
