package com.kleff.projectmanagementservice.buisnesslayer.collaborator;

import com.kleff.projectmanagementservice.datalayer.collaborator.Collaborator;
import com.kleff.projectmanagementservice.datalayer.collaborator.CollaboratorRole;
import com.kleff.projectmanagementservice.datalayer.collaborator.CollaboratorStatus;
import com.kleff.projectmanagementservice.datalayer.collaborator.ProjectPermission;
import com.kleff.projectmanagementservice.datalayer.collaborator.collaboratorRepository;
import com.kleff.projectmanagementservice.datalayer.customrole.CustomRole;
import com.kleff.projectmanagementservice.datalayer.customrole.CustomRoleRepository;
import com.kleff.projectmanagementservice.mappinglayer.collaborator.CollaboratorRequestMapper;
import com.kleff.projectmanagementservice.mappinglayer.collaborator.CollaboratorResponseMapper;
import com.kleff.projectmanagementservice.presentationlayer.collaborator.CollaboratorRequestModel;
import com.kleff.projectmanagementservice.presentationlayer.collaborator.CollaboratorResponseModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CollaboratorServiceImplTest {

    @Mock
    private collaboratorRepository collaboratorRepo;

    @Mock
    private CustomRoleRepository customRoleRepo;

    @Mock
    private CollaboratorRequestMapper requestMapper;

    @Mock
    private CollaboratorResponseMapper responseMapper;

    @InjectMocks
    private CollaboratorServiceImpl collaboratorService;

    private String testProjectId;
    private String testUserId;
    private String invitedBy;
    private CollaboratorRequestModel testRequest;
    private Collaborator testCollaborator;
    private CollaboratorResponseModel testResponse;

    @BeforeEach
    void setUp() {
        testProjectId = "project-123";
        testUserId = "user-456";
        invitedBy = "admin-789";

        testRequest = CollaboratorRequestModel.builder()
                .projectId(testProjectId)
                .userId(testUserId)
                .role(CollaboratorRole.DEVELOPER)
                .permissions(Set.of(ProjectPermission.READ_PROJECT, ProjectPermission.DEPLOY))
                .build();

        testCollaborator = new Collaborator();
        testCollaborator.setProjectId(testProjectId);
        testCollaborator.setUserId(testUserId);
        testCollaborator.setRole(CollaboratorRole.DEVELOPER);
        testCollaborator.setPermissions(Set.of(ProjectPermission.READ_PROJECT, ProjectPermission.DEPLOY));

        testResponse = CollaboratorResponseModel.builder()
                .projectId(testProjectId)
                .userId(testUserId)
                .role(CollaboratorRole.DEVELOPER)
                .permissions(Set.of(ProjectPermission.READ_PROJECT, ProjectPermission.DEPLOY))
                .build();
    }

    // ============ addCollaborator Tests ============

    @Test
    void addCollaborator_WithValidRequest_SavesAndReturnsCollaborator() {
        // Arrange
        when(requestMapper.requestToEntity(testRequest)).thenReturn(testCollaborator);
        when(collaboratorRepo.save(any(Collaborator.class))).thenReturn(testCollaborator);
        when(responseMapper.toResponseModel(testCollaborator)).thenReturn(testResponse);

        // Act
        CollaboratorResponseModel result = collaboratorService.addCollaborator(testRequest, invitedBy);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getProjectId()).isEqualTo(testProjectId);
        assertThat(result.getUserId()).isEqualTo(testUserId);
        verify(collaboratorRepo).save(any(Collaborator.class));
    }

    @Test
    void addCollaborator_SetsStatusToAccepted() {
        // Arrange
        when(requestMapper.requestToEntity(testRequest)).thenReturn(testCollaborator);
        when(collaboratorRepo.save(any(Collaborator.class))).thenReturn(testCollaborator);
        when(responseMapper.toResponseModel(any(Collaborator.class))).thenReturn(testResponse);

        // Act
        collaboratorService.addCollaborator(testRequest, invitedBy);

        // Assert
        ArgumentCaptor<Collaborator> captor = ArgumentCaptor.forClass(Collaborator.class);
        verify(collaboratorRepo).save(captor.capture());
        assertThat(captor.getValue().getCollaboratorStatus()).isEqualTo(CollaboratorStatus.ACCEPTED);
    }

    @Test
    void addCollaborator_SetsInvitedBy() {
        // Arrange
        when(requestMapper.requestToEntity(testRequest)).thenReturn(testCollaborator);
        when(collaboratorRepo.save(any(Collaborator.class))).thenReturn(testCollaborator);
        when(responseMapper.toResponseModel(any(Collaborator.class))).thenReturn(testResponse);

        // Act
        collaboratorService.addCollaborator(testRequest, invitedBy);

        // Assert
        ArgumentCaptor<Collaborator> captor = ArgumentCaptor.forClass(Collaborator.class);
        verify(collaboratorRepo).save(captor.capture());
        assertThat(captor.getValue().getInvitedBy()).isEqualTo(invitedBy);
    }

    @Test
    void addCollaborator_SetsInvitedAtAndAcceptedAt() {
        // Arrange
        when(requestMapper.requestToEntity(testRequest)).thenReturn(testCollaborator);
        when(collaboratorRepo.save(any(Collaborator.class))).thenReturn(testCollaborator);
        when(responseMapper.toResponseModel(any(Collaborator.class))).thenReturn(testResponse);

        // Act
        collaboratorService.addCollaborator(testRequest, invitedBy);

        // Assert
        ArgumentCaptor<Collaborator> captor = ArgumentCaptor.forClass(Collaborator.class);
        verify(collaboratorRepo).save(captor.capture());
        assertThat(captor.getValue().getInvitedAt()).isNotNull();
        assertThat(captor.getValue().getAcceptedAt()).isNotNull();
    }

    // ============ updateCollaborator Tests ============

    @Test
    void updateCollaborator_WithValidData_UpdatesAndReturns() {
        // Arrange
        CollaboratorRequestModel updateRequest = CollaboratorRequestModel.builder()
                .role(CollaboratorRole.ADMIN)
                .permissions(Set.of(ProjectPermission.READ_PROJECT, ProjectPermission.MANAGE_COLLABORATORS))
                .build();

        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.of(testCollaborator));
        when(collaboratorRepo.save(any(Collaborator.class))).thenReturn(testCollaborator);
        when(responseMapper.toResponseModel(testCollaborator)).thenReturn(testResponse);

        // Act
        CollaboratorResponseModel result = collaboratorService.updateCollaborator(testProjectId, testUserId, updateRequest);

        // Assert
        assertThat(result).isNotNull();
        verify(collaboratorRepo).save(any(Collaborator.class));
    }

    @Test
    void updateCollaborator_UpdatesRoleAndPermissions() {
        // Arrange
        CollaboratorRequestModel updateRequest = CollaboratorRequestModel.builder()
                .role(CollaboratorRole.ADMIN)
                .permissions(Set.of(ProjectPermission.MANAGE_COLLABORATORS))
                .build();

        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.of(testCollaborator));
        when(collaboratorRepo.save(any(Collaborator.class))).thenReturn(testCollaborator);
        when(responseMapper.toResponseModel(any(Collaborator.class))).thenReturn(testResponse);

        // Act
        collaboratorService.updateCollaborator(testProjectId, testUserId, updateRequest);

        // Assert
        ArgumentCaptor<Collaborator> captor = ArgumentCaptor.forClass(Collaborator.class);
        verify(collaboratorRepo).save(captor.capture());
        assertThat(captor.getValue().getRole()).isEqualTo(CollaboratorRole.ADMIN);
        assertThat(captor.getValue().getPermissions()).containsExactly(ProjectPermission.MANAGE_COLLABORATORS);
    }

    @Test
    void updateCollaborator_WhenNotFound_ThrowsException() {
        // Arrange
        CollaboratorRequestModel updateRequest = CollaboratorRequestModel.builder()
                .role(CollaboratorRole.ADMIN)
                .build();

        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> collaboratorService.updateCollaborator(testProjectId, testUserId, updateRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Collaborator not found");
    }

    // ============ getProjectCollaborators Tests ============

    @Test
    void getProjectCollaborators_ReturnsListOfCollaborators() {
        // Arrange
        Collaborator collab1 = new Collaborator();
        collab1.setProjectId(testProjectId);
        collab1.setUserId("user-1");

        Collaborator collab2 = new Collaborator();
        collab2.setProjectId(testProjectId);
        collab2.setUserId("user-2");

        List<Collaborator> collaborators = Arrays.asList(collab1, collab2);

        CollaboratorResponseModel response1 = CollaboratorResponseModel.builder()
                .userId("user-1").build();
        CollaboratorResponseModel response2 = CollaboratorResponseModel.builder()
                .userId("user-2").build();

        when(collaboratorRepo.findByProjectId(testProjectId)).thenReturn(collaborators);
        when(responseMapper.entityListToResponseList(collaborators))
                .thenReturn(Arrays.asList(response1, response2));

        // Act
        List<CollaboratorResponseModel> result = collaboratorService.getProjectCollaborators(testProjectId);

        // Assert
        assertThat(result).hasSize(2);
        verify(collaboratorRepo).findByProjectId(testProjectId);
    }

    @Test
    void getProjectCollaborators_WithCustomRole_LoadsPermissions() {
        // Arrange
        Collaborator collabWithCustomRole = new Collaborator();
        collabWithCustomRole.setProjectId(testProjectId);
        collabWithCustomRole.setUserId("user-1");
        collabWithCustomRole.setCustomRoleId(1);
        collabWithCustomRole.setPermissions(null);

        CustomRole customRole = new CustomRole();
        customRole.setId(1);
        customRole.setPermissions(Set.of(ProjectPermission.VIEW_LOGS));

        when(collaboratorRepo.findByProjectId(testProjectId))
                .thenReturn(Arrays.asList(collabWithCustomRole));
        when(customRoleRepo.findById(1)).thenReturn(Optional.of(customRole));
        when(responseMapper.entityListToResponseList(any())).thenReturn(Arrays.asList(testResponse));

        // Act
        collaboratorService.getProjectCollaborators(testProjectId);

        // Assert
        verify(customRoleRepo, atLeastOnce()).findById(1);
        assertThat(collabWithCustomRole.getPermissions()).containsExactly(ProjectPermission.VIEW_LOGS);
    }

    @Test
    void getProjectCollaborators_WithCustomRole_SetsCustomRoleName() {
        // Arrange
        Collaborator collabWithCustomRole = new Collaborator();
        collabWithCustomRole.setCustomRoleId(1);

        CustomRole customRole = new CustomRole();
        customRole.setId(1);
        customRole.setName("Custom Developer");

        CollaboratorResponseModel response = CollaboratorResponseModel.builder()
                .customRoleId(1)
                .build();

        when(collaboratorRepo.findByProjectId(testProjectId))
                .thenReturn(Arrays.asList(collabWithCustomRole));
        when(customRoleRepo.findById(1)).thenReturn(Optional.of(customRole));
        when(responseMapper.entityListToResponseList(any())).thenReturn(Arrays.asList(response));

        // Act
        List<CollaboratorResponseModel> result = collaboratorService.getProjectCollaborators(testProjectId);

        // Assert
        assertThat(result.get(0).getCustomRoleName()).isEqualTo("Custom Developer");
    }

    @Test
    void getProjectCollaborators_WithEmptyList_ReturnsEmptyList() {
        // Arrange
        when(collaboratorRepo.findByProjectId(testProjectId)).thenReturn(Arrays.asList());
        when(responseMapper.entityListToResponseList(any())).thenReturn(Arrays.asList());

        // Act
        List<CollaboratorResponseModel> result = collaboratorService.getProjectCollaborators(testProjectId);

        // Assert
        assertThat(result).isEmpty();
    }

    // ============ removeCollaborator Tests ============

    @Test
    void removeCollaborator_WhenExists_DeletesCollaborator() {
        // Arrange
        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.of(testCollaborator));

        // Act
        collaboratorService.removeCollaborator(testProjectId, testUserId);

        // Assert
        verify(collaboratorRepo).delete(testCollaborator);
    }

    @Test
    void removeCollaborator_WhenNotExists_DoesNothing() {
        // Arrange
        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.empty());

        // Act
        collaboratorService.removeCollaborator(testProjectId, testUserId);

        // Assert
        verify(collaboratorRepo, never()).delete(any());
    }

    // ============ getUserPermissions Tests ============

    @Test
    void getUserPermissions_WithOwnerRole_ReturnsOwnerPermission() {
        // Arrange
        Collaborator ownerCollaborator = new Collaborator();
        ownerCollaborator.setProjectId(testProjectId);
        ownerCollaborator.setUserId(testUserId);
        ownerCollaborator.setRole(CollaboratorRole.OWNER);
        ownerCollaborator.setPermissions(null);
        ownerCollaborator.setCustomRoleId(null);

        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.of(ownerCollaborator));

        // Act
        List<String> permissions = collaboratorService.getUserPermissions(testProjectId, testUserId);

        // Assert
        assertThat(permissions).contains("OWNER");
        assertThat(permissions).contains("READ_PROJECT");
        assertThat(permissions).contains("MANAGE_BILLING");
        assertThat(permissions).contains("DELETE_PROJECT");
    }

    @Test
    void getUserPermissions_WithAdminRole_ReturnsAdminPermission() {
        // Arrange
        Collaborator adminCollaborator = new Collaborator();
        adminCollaborator.setProjectId(testProjectId);
        adminCollaborator.setUserId(testUserId);
        adminCollaborator.setRole(CollaboratorRole.ADMIN);
        adminCollaborator.setPermissions(null);
        adminCollaborator.setCustomRoleId(null);

        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.of(adminCollaborator));

        // Act
        List<String> permissions = collaboratorService.getUserPermissions(testProjectId, testUserId);

        // Assert
        assertThat(permissions).contains("ADMIN");
        assertThat(permissions).contains("READ_PROJECT");
        assertThat(permissions).contains("MANAGE_COLLABORATORS");
        assertThat(permissions).doesNotContain("OWNER");
    }

    @Test
    void getUserPermissions_WithDeveloperRole_ReturnsDeveloperPermission() {
        // Arrange
        Collaborator developerCollaborator = new Collaborator();
        developerCollaborator.setProjectId(testProjectId);
        developerCollaborator.setUserId(testUserId);
        developerCollaborator.setRole(CollaboratorRole.DEVELOPER);
        developerCollaborator.setPermissions(null);
        developerCollaborator.setCustomRoleId(null);

        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.of(developerCollaborator));

        // Act
        List<String> permissions = collaboratorService.getUserPermissions(testProjectId, testUserId);

        // Assert
        assertThat(permissions).contains("DEVELOPER");
        assertThat(permissions).contains("READ_PROJECT");
        assertThat(permissions).contains("DEPLOY");
        assertThat(permissions).doesNotContain("OWNER");
        assertThat(permissions).doesNotContain("ADMIN");
    }

    @Test
    void getUserPermissions_WithViewerRole_ReturnsViewerPermission() {
        // Arrange
        Collaborator viewerCollaborator = new Collaborator();
        viewerCollaborator.setProjectId(testProjectId);
        viewerCollaborator.setUserId(testUserId);
        viewerCollaborator.setRole(CollaboratorRole.VIEWER);
        viewerCollaborator.setPermissions(null);
        viewerCollaborator.setCustomRoleId(null);

        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.of(viewerCollaborator));

        // Act
        List<String> permissions = collaboratorService.getUserPermissions(testProjectId, testUserId);

        // Assert
        assertThat(permissions).contains("VIEWER");
        assertThat(permissions).contains("READ_PROJECT");
        assertThat(permissions).contains("VIEW_LOGS");
        assertThat(permissions).doesNotContain("OWNER");
        assertThat(permissions).doesNotContain("ADMIN");
        assertThat(permissions).doesNotContain("DEVELOPER");
    }

    @Test
    void getUserPermissions_WithExplicitPermissions_ReturnsExplicitPermissions() {
        // Arrange
        Set<ProjectPermission> explicitPermissions = Set.of(
            ProjectPermission.READ_PROJECT,
            ProjectPermission.VIEW_LOGS
        );

        Collaborator explicitCollaborator = new Collaborator();
        explicitCollaborator.setProjectId(testProjectId);
        explicitCollaborator.setUserId(testUserId);
        explicitCollaborator.setRole(CollaboratorRole.VIEWER);
        explicitCollaborator.setPermissions(explicitPermissions);
        explicitCollaborator.setCustomRoleId(null);

        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.of(explicitCollaborator));

        // Act
        List<String> permissions = collaboratorService.getUserPermissions(testProjectId, testUserId);

        // Assert
        assertThat(permissions).contains("READ_PROJECT");
        assertThat(permissions).contains("VIEW_LOGS");
        assertThat(permissions).doesNotContain("VIEWER");
        assertThat(permissions).doesNotContain("OWNER");
    }

    @Test
    void getUserPermissions_WithCustomRole_ReturnsCustomRolePermissions() {
        // Arrange
        CustomRole customRole = new CustomRole();
        customRole.setId(1);
        customRole.setPermissions(Set.of(ProjectPermission.READ_PROJECT, ProjectPermission.VIEW_METRICS));

        Collaborator customRoleCollaborator = new Collaborator();
        customRoleCollaborator.setProjectId(testProjectId);
        customRoleCollaborator.setUserId(testUserId);
        customRoleCollaborator.setRole(CollaboratorRole.VIEWER);
        customRoleCollaborator.setPermissions(null);
        customRoleCollaborator.setCustomRoleId(1);

        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.of(customRoleCollaborator));
        when(customRoleRepo.findById(1)).thenReturn(Optional.of(customRole));

        // Act
        List<String> permissions = collaboratorService.getUserPermissions(testProjectId, testUserId);

        // Assert
        assertThat(permissions).contains("READ_PROJECT");
        assertThat(permissions).contains("VIEW_METRICS");
        assertThat(permissions).doesNotContain("VIEWER");
        assertThat(permissions).doesNotContain("OWNER");
    }

    @Test
    void getUserPermissions_WhenUserNotFound_ReturnsEmptyList() {
        // Arrange
        when(collaboratorRepo.findByProjectIdAndUserId(testProjectId, testUserId))
                .thenReturn(Optional.empty());

        // Act
        List<String> permissions = collaboratorService.getUserPermissions(testProjectId, testUserId);

        // Assert
        assertThat(permissions).isEmpty();
    }
}
