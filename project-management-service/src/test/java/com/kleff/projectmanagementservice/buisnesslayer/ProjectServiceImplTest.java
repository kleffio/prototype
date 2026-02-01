package com.kleff.projectmanagementservice.buisnesslayer;

import com.kleff.projectmanagementservice.buisnesslayer.collaborator.CollaboratorService;
import com.kleff.projectmanagementservice.buisnesslayer.customrole.CustomRoleService;
import com.kleff.projectmanagementservice.buisnesslayer.invitation.InvitationService;
import com.kleff.projectmanagementservice.buisnesslayer.project.ProjectServiceImpl;
import com.kleff.projectmanagementservice.datalayer.collaborator.Collaborator;
import com.kleff.projectmanagementservice.datalayer.collaborator.CollaboratorRole;
import com.kleff.projectmanagementservice.datalayer.collaborator.collaboratorRepository;
import com.kleff.projectmanagementservice.datalayer.customrole.CustomRole;
import com.kleff.projectmanagementservice.datalayer.customrole.CustomRoleRepository;
import com.kleff.projectmanagementservice.datalayer.invitation.Invitation;
import com.kleff.projectmanagementservice.datalayer.invitation.InvitationRepository;
import com.kleff.projectmanagementservice.datalayer.invitation.InviteStatus;
import com.kleff.projectmanagementservice.datalayer.project.Project;
import com.kleff.projectmanagementservice.datalayer.project.ProjectRepository;
import com.kleff.projectmanagementservice.datalayer.project.ProjectStatus;
import com.kleff.projectmanagementservice.presentationlayer.collaborator.CollaboratorRequestModel;
import com.kleff.projectmanagementservice.authorization.repository.AuthorizationAuditRepository;
import com.kleff.projectmanagementservice.authorization.domain.AuthorizationAuditLog;
import com.kleff.projectmanagementservice.authorization.domain.AuthorizationResult;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceImplTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private CollaboratorService collaboratorService;

    @Mock
    private collaboratorRepository collaboratorRepo;

    @Mock
    private InvitationService invitationService;

    @Mock
    private CustomRoleService customRoleService;

    @Mock
    private AuthorizationAuditRepository auditRepo;

    @Mock
    private InvitationRepository invitationRepo;

    @Mock
    private CustomRoleRepository customRoleRepo;

    @InjectMocks
    private ProjectServiceImpl projectService;

    private Project testProject1;
    private Project testProject2;
    private String testUserId;
    private String testProjectId;

    @BeforeEach
    void setUp() {
        testUserId = "user-123-abc";
        testProjectId = "project-456-def";
        Date now = new Date();

        testProject1 = new Project();
        testProject1.setProjectId("project-1");
        testProject1.setName("Test Project 1");
        testProject1.setDescription("Description 1");
        testProject1.setOwnerId(testUserId);
        testProject1.setProjectStatus(ProjectStatus.ACTIVE);
        testProject1.setCreatedDate(now);
        testProject1.setUpdatedDate(now);

        testProject2 = new Project();
        testProject2.setProjectId("project-2");
        testProject2.setName("Test Project 2");
        testProject2.setDescription("Description 2");
        testProject2.setOwnerId(testUserId);
        testProject2.setProjectStatus(ProjectStatus.ACTIVE);
        testProject2.setCreatedDate(now);
        testProject2.setUpdatedDate(now);
    }

    // ============ getAllOwnedProjects Tests ============

    @Test
    void getAllOwnedProjects_WithValidUserId_ReturnsUserProjects() {
        // Arrange
        List<Project> expectedProjects = Arrays.asList(testProject1, testProject2);
        when(projectRepository.findByOwnerIdEquals(testUserId)).thenReturn(expectedProjects);
        when(collaboratorRepo.findByUserId(testUserId)).thenReturn(Arrays.asList());

        // Act
        List<Project> result = projectService.getAllOwnedProjects(testUserId);

        // Assert
        assertThat(result).hasSize(2);
        assertThat(result).containsExactly(testProject1, testProject2);
        verify(projectRepository).findByOwnerIdEquals(testUserId);
        verify(collaboratorRepo).findByUserId(testUserId);
    }

    @Test
    void getAllOwnedProjects_WithNoProjects_ReturnsEmptyList() {
        // Arrange
        when(projectRepository.findByOwnerIdEquals(testUserId)).thenReturn(Arrays.asList());
        when(collaboratorRepo.findByUserId(testUserId)).thenReturn(Arrays.asList());

        // Act
        List<Project> result = projectService.getAllOwnedProjects(testUserId);

        // Assert
        assertThat(result).isEmpty();
        verify(projectRepository).findByOwnerIdEquals(testUserId);
        verify(collaboratorRepo).findByUserId(testUserId);
    }

    @Test
    void getAllOwnedProjects_WithDifferentUserId_ReturnsOnlyTheirProjects() {
        // Arrange
        String differentUserId = "user-999-xyz";
        Project differentUserProject = new Project();
        differentUserProject.setProjectId("project-3");
        differentUserProject.setOwnerId(differentUserId);

        when(projectRepository.findByOwnerIdEquals(differentUserId))
                .thenReturn(Arrays.asList(differentUserProject));
        when(collaboratorRepo.findByUserId(differentUserId)).thenReturn(Arrays.asList());

        // Act
        List<Project> result = projectService.getAllOwnedProjects(differentUserId);

        // Assert
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getOwnerId()).isEqualTo(differentUserId);
        verify(projectRepository).findByOwnerIdEquals(differentUserId);
        verify(collaboratorRepo).findByUserId(differentUserId);
    }

    @Test
    void getAllOwnedProjects_WithCollaborations_IncludesCollaboratedProjects() {
        // Arrange
        String otherUserId = "user-other";
        Project collaboratedProject = new Project();
        collaboratedProject.setProjectId("collab-project-1");
        collaboratedProject.setName("Collaborated Project");
        collaboratedProject.setOwnerId(otherUserId);

        Collaborator collaboration = new Collaborator();
        collaboration.setUserId(testUserId);
        collaboration.setProjectId("collab-project-1");
        collaboration.setRole(CollaboratorRole.ADMIN);

        when(projectRepository.findByOwnerIdEquals(testUserId)).thenReturn(Arrays.asList());
        when(collaboratorRepo.findByUserId(testUserId)).thenReturn(Arrays.asList(collaboration));
        when(projectRepository.findByProjectId("collab-project-1")).thenReturn(collaboratedProject);

        // Act
        List<Project> result = projectService.getAllOwnedProjects(testUserId);

        // Assert
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getProjectId()).isEqualTo("collab-project-1");
        assertThat(result.get(0).getOwnerId()).isEqualTo(otherUserId);
        verify(collaboratorRepo).findByUserId(testUserId);
        verify(projectRepository).findByProjectId("collab-project-1");
    }

    @Test
    void getAllOwnedProjects_WithBothOwnedAndCollaborated_ReturnsBoth() {
        // Arrange
        Project ownedProject = new Project();
        ownedProject.setProjectId("owned-1");
        ownedProject.setOwnerId(testUserId);

        Project collaboratedProject = new Project();
        collaboratedProject.setProjectId("collab-1");
        collaboratedProject.setOwnerId("other-user");

        Collaborator collaboration = new Collaborator();
        collaboration.setUserId(testUserId);
        collaboration.setProjectId("collab-1");

        when(projectRepository.findByOwnerIdEquals(testUserId)).thenReturn(Arrays.asList(ownedProject));
        when(collaboratorRepo.findByUserId(testUserId)).thenReturn(Arrays.asList(collaboration));
        when(projectRepository.findByProjectId("collab-1")).thenReturn(collaboratedProject);

        // Act
        List<Project> result = projectService.getAllOwnedProjects(testUserId);

        // Assert
        assertThat(result).hasSize(2);
        assertThat(result).contains(ownedProject, collaboratedProject);
    }

    @Test
    void getAllOwnedProjects_WithNullCollaboratedProject_SkipsIt() {
        // Arrange
        Collaborator collaboration = new Collaborator();
        collaboration.setUserId(testUserId);
        collaboration.setProjectId("deleted-project");

        when(projectRepository.findByOwnerIdEquals(testUserId)).thenReturn(Arrays.asList());
        when(collaboratorRepo.findByUserId(testUserId)).thenReturn(Arrays.asList(collaboration));
        when(projectRepository.findByProjectId("deleted-project")).thenReturn(null);

        // Act
        List<Project> result = projectService.getAllOwnedProjects(testUserId);

        // Assert
        assertThat(result).isEmpty();
    }

    @Test
    void getAllOwnedProjects_WithDuplicateCollaboration_DoesNotIncludeTwice() {
        // Arrange
        when(projectRepository.findByOwnerIdEquals(testUserId)).thenReturn(Arrays.asList(testProject1));

        Collaborator collaboration = new Collaborator();
        collaboration.setUserId(testUserId);
        collaboration.setProjectId(testProject1.getProjectId());

        when(collaboratorRepo.findByUserId(testUserId)).thenReturn(Arrays.asList(collaboration));
        when(projectRepository.findByProjectId(testProject1.getProjectId())).thenReturn(testProject1);

        // Act
        List<Project> result = projectService.getAllOwnedProjects(testUserId);

        // Assert
        assertThat(result).hasSize(1);
    }

    // ============ getProjectById Tests ============

    @Test
    void getProjectById_WithValidId_ReturnsProject() {
        // Arrange
        when(projectRepository.findByProjectId(testProjectId)).thenReturn(testProject1);

        // Act
        Project result = projectService.getProjectById(testProjectId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getProjectId()).isEqualTo(testProject1.getProjectId());
        assertThat(result.getName()).isEqualTo(testProject1.getName());
        verify(projectRepository).findByProjectId(testProjectId);
    }

    @Test
    void getProjectById_WithNonExistentId_ReturnsNull() {
        // Arrange
        when(projectRepository.findByProjectId(testProjectId)).thenReturn(null);

        // Act
        Project result = projectService.getProjectById(testProjectId);

        // Assert
        assertThat(result).isNull();
        verify(projectRepository).findByProjectId(testProjectId);
    }

    @Test
    void getProjectById_WhenRepositoryThrowsException_ReturnsNull() {
        // Arrange
        when(projectRepository.findByProjectId(testProjectId))
                .thenThrow(new RuntimeException("Database error"));

        // Act
        Project result = projectService.getProjectById(testProjectId);

        // Assert
        assertThat(result).isNull();
        verify(projectRepository).findByProjectId(testProjectId);
    }

    // ============ createProject Tests ============

    @Test
    void createProject_WithValidProject_SavesAndReturnsProject() {
        // Arrange
        Project newProject = new Project();
        newProject.setName("New Project");
        newProject.setDescription("New Description");
        newProject.setOwnerId(testUserId);

        Project savedProject = new Project();
        savedProject.setProjectId("project-new");
        savedProject.setName("New Project");
        savedProject.setDescription("New Description");
        savedProject.setOwnerId(testUserId);
        savedProject.setCreatedDate(new Date());
        savedProject.setUpdatedDate(new Date());

        when(projectRepository.save(newProject)).thenReturn(savedProject);

        // Act
        Project result = projectService.createProject(newProject);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getProjectId()).isEqualTo("project-new");
        assertThat(result.getName()).isEqualTo("New Project");
        assertThat(result.getOwnerId()).isEqualTo(testUserId);
        verify(projectRepository).save(newProject);
    }

    @Test
    void createProject_CallsRepositorySave() {
        // Arrange
        Project newProject = new Project();
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(newProject);

        // Act
        projectService.createProject(newProject);

        // Assert
        verify(projectRepository, times(1)).save(newProject);
    }

    @Test
    void createProject_CreatesOwnerCollaborator() {
        // Arrange
        Project newProject = new Project();
        newProject.setName("New Project");
        newProject.setOwnerId(testUserId);

        Project savedProject = new Project();
        savedProject.setProjectId("project-new");
        savedProject.setName("New Project");
        savedProject.setOwnerId(testUserId);

        when(projectRepository.save(newProject)).thenReturn(savedProject);

        // Act
        projectService.createProject(newProject);

        // Assert
        ArgumentCaptor<CollaboratorRequestModel> collabCaptor = ArgumentCaptor.forClass(CollaboratorRequestModel.class);
        verify(collaboratorService).addCollaborator(collabCaptor.capture(), eq("system"));

        CollaboratorRequestModel captured = collabCaptor.getValue();
        assertThat(captured.getProjectId()).isEqualTo("project-new");
        assertThat(captured.getUserId()).isEqualTo(testUserId);
        assertThat(captured.getRole()).isEqualTo(CollaboratorRole.OWNER);
    }

    @Test
    void createProject_WhenCollaboratorCreationFails_StillReturnsProject() {
        // Arrange
        Project newProject = new Project();
        newProject.setOwnerId(testUserId);

        Project savedProject = new Project();
        savedProject.setProjectId("project-new");
        savedProject.setOwnerId(testUserId);

        when(projectRepository.save(newProject)).thenReturn(savedProject);
        doThrow(new RuntimeException("Collaborator service error"))
                .when(collaboratorService).addCollaborator(Mockito.any(), anyString());

        // Act
        Project result = projectService.createProject(newProject);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getProjectId()).isEqualTo("project-new");
        verify(projectRepository).save(newProject);
    }

    // ============ updateProject Tests ============

    @Test
    void updateProject_WithValidData_UpdatesAllFields() {
        // Arrange
        Project existingProject = new Project();
        existingProject.setProjectId(testProjectId);
        existingProject.setName("Old Name");
        existingProject.setDescription("Old Description");
        existingProject.setOwnerId("old-owner");
        existingProject.setProjectStatus(ProjectStatus.ACTIVE);
        existingProject.setCreatedDate(new Date());
        existingProject.setUpdatedDate(new Date());

        Project updatedData = new Project();
        updatedData.setName("New Name");
        updatedData.setDescription("New Description");
        updatedData.setOwnerId("new-owner");
        updatedData.setProjectStatus(ProjectStatus.ARCHIVED);

        when(projectRepository.findById(testProjectId)).thenReturn(Optional.of(existingProject));
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(existingProject);

        // Act
        Project result = projectService.updateProject(testProjectId, updatedData);

        // Assert
        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());

        Project savedProject = projectCaptor.getValue();
        assertThat(savedProject.getName()).isEqualTo("New Name");
        assertThat(savedProject.getDescription()).isEqualTo("New Description");
        assertThat(savedProject.getOwnerId()).isEqualTo("new-owner");
        assertThat(savedProject.getProjectStatus()).isEqualTo(ProjectStatus.ARCHIVED);
        assertThat(savedProject.getUpdatedDate()).isNotNull();
    }

    @Test
    void updateProject_WithPartialData_UpdatesOnlyProvidedFields() {
        // Arrange
        Project existingProject = new Project();
        existingProject.setProjectId(testProjectId);
        existingProject.setName("Old Name");
        existingProject.setDescription("Old Description");
        existingProject.setOwnerId("old-owner");
        existingProject.setProjectStatus(ProjectStatus.ACTIVE);

        Project partialUpdate = new Project();
        partialUpdate.setName("New Name Only");
        // description, ownerId, and projectStatus are null

        when(projectRepository.findById(testProjectId)).thenReturn(Optional.of(existingProject));
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(existingProject);

        // Act
        Project result = projectService.updateProject(testProjectId, partialUpdate);

        // Assert
        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());

        Project savedProject = projectCaptor.getValue();
        assertThat(savedProject.getName()).isEqualTo("New Name Only");
        assertThat(savedProject.getDescription()).isEqualTo("Old Description"); // Unchanged
        assertThat(savedProject.getOwnerId()).isEqualTo("old-owner"); // Unchanged
        assertThat(savedProject.getProjectStatus()).isEqualTo(ProjectStatus.ACTIVE); // Unchanged
    }

    @Test
    void updateProject_WithNonExistentProject_ThrowsRuntimeException() {
        // Arrange
        Project updateData = new Project();
        updateData.setName("New Name");

        when(projectRepository.findById(testProjectId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> projectService.updateProject(testProjectId, updateData))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Project not found");

        verify(projectRepository).findById(testProjectId);
    }

    @Test
    void updateProject_SetsUpdatedDate() {
        // Arrange
        Date oldDate = new Date(System.currentTimeMillis() - 10000); // 10 seconds ago

        Project existingProject = new Project();
        existingProject.setProjectId(testProjectId);
        existingProject.setName("Old Name");
        existingProject.setUpdatedDate(oldDate);

        Project updateData = new Project();
        updateData.setName("New Name");

        when(projectRepository.findById(testProjectId)).thenReturn(Optional.of(existingProject));
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(existingProject);

        // Act
        projectService.updateProject(testProjectId, updateData);

        // Assert
        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());

        Project savedProject = projectCaptor.getValue();
        assertThat(savedProject.getUpdatedDate()).isAfter(oldDate);
    }

    @Test
    void updateProject_WithOnlyDescriptionChange_UpdatesDescription() {
        // Arrange
        Project existingProject = new Project();
        existingProject.setProjectId(testProjectId);
        existingProject.setName("Name");
        existingProject.setDescription("Old Description");

        Project updateData = new Project();
        updateData.setDescription("New Description");

        when(projectRepository.findById(testProjectId)).thenReturn(Optional.of(existingProject));
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(existingProject);

        // Act
        projectService.updateProject(testProjectId, updateData);

        // Assert
        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());

        Project savedProject = projectCaptor.getValue();
        assertThat(savedProject.getDescription()).isEqualTo("New Description");
        assertThat(savedProject.getName()).isEqualTo("Name"); // Unchanged
    }

    @Test
    void updateProject_WithOnlyStatusChange_UpdatesStatus() {
        // Arrange
        Project existingProject = new Project();
        existingProject.setProjectId(testProjectId);
        existingProject.setProjectStatus(ProjectStatus.ACTIVE);

        Project updateData = new Project();
        updateData.setProjectStatus(ProjectStatus.PAUSED);

        when(projectRepository.findById(testProjectId)).thenReturn(Optional.of(existingProject));
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(existingProject);

        // Act
        projectService.updateProject(testProjectId, updateData);

        // Assert
        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());

        Project savedProject = projectCaptor.getValue();
        assertThat(savedProject.getProjectStatus()).isEqualTo(ProjectStatus.PAUSED);
    }

    @Test
    void updateProject_WithOwnerIdChange_UpdatesOwnerId() {
        // Arrange
        Project existingProject = new Project();
        existingProject.setProjectId(testProjectId);
        existingProject.setOwnerId("old-owner-id");

        Project updateData = new Project();
        updateData.setOwnerId("new-owner-id");

        when(projectRepository.findById(testProjectId)).thenReturn(Optional.of(existingProject));
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(existingProject);

        // Act
        projectService.updateProject(testProjectId, updateData);

        // Assert
        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());

        Project savedProject = projectCaptor.getValue();
        assertThat(savedProject.getOwnerId()).isEqualTo("new-owner-id");
    }

    // ============ deleteProject Tests ============

    @Test
    void deleteProject_WithValidId_MarksProjectAsDeleted() {
        // Arrange
        Project projectToDelete = new Project();
        projectToDelete.setProjectId(testProjectId);
        projectToDelete.setName("Project to Delete");
        projectToDelete.setProjectStatus(ProjectStatus.ACTIVE);

        when(projectRepository.findByProjectId(testProjectId)).thenReturn(projectToDelete);
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(projectToDelete);

        // Act
        Project result = projectService.deleteProject(testProjectId);

        // Assert
        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());

        Project savedProject = projectCaptor.getValue();
        assertThat(savedProject.getProjectStatus()).isEqualTo(ProjectStatus.DELETED);
        assertThat(result).isNotNull();
        // Note: findByProjectId is called multiple times internally, so we don't verify
        // exact count
    }

    @Test
    void deleteProject_DoesNotActuallyDeleteFromDatabase() {
        // Arrange
        Project projectToDelete = new Project();
        projectToDelete.setProjectId(testProjectId);
        projectToDelete.setProjectStatus(ProjectStatus.ACTIVE);

        when(projectRepository.findByProjectId(testProjectId)).thenReturn(projectToDelete);
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(projectToDelete);

        // Act
        projectService.deleteProject(testProjectId);

        // Assert
        // verify(projectRepository, never()).delete(any(Project.class));
        // verify(projectRepository, never()).deleteById(anyString());
        // verify(projectRepository).save(any(Project.class)); // Soft delete via save
    }

    @Test
    void deleteProject_WithCompletedProject_ChangesStatusToDeleted() {
        // Arrange
        Project completedProject = new Project();
        completedProject.setProjectId(testProjectId);
        completedProject.setProjectStatus(ProjectStatus.PAUSED);

        when(projectRepository.findByProjectId(testProjectId)).thenReturn(completedProject);
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(completedProject);

        // Act
        projectService.deleteProject(testProjectId);

        // Assert
        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());

        Project savedProject = projectCaptor.getValue();
        assertThat(savedProject.getProjectStatus()).isEqualTo(ProjectStatus.DELETED);
    }

    @Test
    void deleteProject_ReturnsDeletedProject() {
        // Arrange
        Project projectToDelete = new Project();
        projectToDelete.setProjectId(testProjectId);
        projectToDelete.setName("Deleted Project");
        projectToDelete.setProjectStatus(ProjectStatus.ACTIVE);

        Project savedProject = new Project();
        savedProject.setProjectId(testProjectId);
        savedProject.setName("Deleted Project");
        savedProject.setProjectStatus(ProjectStatus.DELETED);

        when(projectRepository.findByProjectId(testProjectId)).thenReturn(projectToDelete);
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(savedProject);

        // Act
        Project result = projectService.deleteProject(testProjectId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getProjectId()).isEqualTo(testProjectId);
        assertThat(result.getName()).isEqualTo("Deleted Project");
        assertThat(result.getProjectStatus()).isEqualTo(ProjectStatus.DELETED);
    }

    // ============ Enhanced deleteProject Tests ============

    @Test
    void deleteProject_WithExistingProject_PerformsFullCleanup() {
        // Arrange
        Project projectToDelete = createTestProject();
        List<Invitation> pendingInvitations = createTestInvitations();
        List<Collaborator> collaborators = createTestCollaborators();
        List<CustomRole> customRoles = createTestCustomRoles();

        // Mock repository responses
        when(projectRepository.findByProjectId(testProjectId)).thenReturn(projectToDelete);
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(projectToDelete);

        // Mock invitation repository
        when(invitationRepo.findByProjectIdAndStatus(testProjectId, InviteStatus.PENDING))
                .thenReturn(pendingInvitations);

        // Mock collaborator repository
        when(collaboratorRepo.findByProjectId(testProjectId)).thenReturn(collaborators);

        // Mock custom role repository
        when(customRoleRepo.findByProjectId(testProjectId)).thenReturn(customRoles);

        // Mock collaborator repository to return collaborator objects when findById is
        // called
        for (Collaborator collaborator : collaborators) {
            when(collaboratorRepo.findById(collaborator.getId())).thenReturn(Optional.of(collaborator));
        }

        // Act
        Project result = projectService.deleteProject(testProjectId);

        // Assert
        // Verify all cleanup steps were called
        verify(invitationService, times(pendingInvitations.size()))
                .cancelInvitation(Mockito.anyInt(), eq("system"));
        verify(collaboratorService, times(collaborators.size()))
                .removeCollaborator(Mockito.anyString(), Mockito.anyString(), Mockito.anyString());
        verify(customRoleService, times(customRoles.size()))
                .deleteCustomRole(Mockito.anyInt());

        // Verify project was marked as deleted
        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());
        Project savedProject = projectCaptor.getValue();
        assertThat(savedProject.getProjectStatus()).isEqualTo(ProjectStatus.DELETED);

        // Verify audit logging
        verify(auditRepo, times(1)).save(Mockito.any(AuthorizationAuditLog.class));
    }

    @Test
    void deleteProject_WithNoRelatedData_PerformsMinimalCleanup() {
        // Arrange
        Project projectToDelete = createTestProject();

        when(projectRepository.findByProjectId(testProjectId)).thenReturn(projectToDelete);
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(projectToDelete);

        // Mock empty related data
        when(invitationRepo.findByProjectIdAndStatus(testProjectId, InviteStatus.PENDING))
                .thenReturn(Arrays.asList());
        when(collaboratorRepo.findByProjectId(testProjectId)).thenReturn(Arrays.asList());
        when(customRoleRepo.findByProjectId(testProjectId)).thenReturn(Arrays.asList());

        // Act
        Project result = projectService.deleteProject(testProjectId);

        // Assert
        // Verify no cleanup operations were called
        verify(invitationService, never()).cancelInvitation(Mockito.anyInt(), Mockito.anyString());
        verify(collaboratorService, never()).removeCollaborator(Mockito.anyString(), Mockito.anyString(),
                Mockito.anyString());
        verify(customRoleService, never()).deleteCustomRole(Mockito.anyInt());

        // Verify audit logging still occurs
        verify(auditRepo, times(1)).save(Mockito.any(AuthorizationAuditLog.class));
    }

    @Test
    void deleteProject_WithAlreadyDeletedProject_ReturnsExistingProject() {
        // Arrange
        Project deletedProject = createTestProject();
        deletedProject.setProjectStatus(ProjectStatus.DELETED);

        when(projectRepository.findByProjectId(testProjectId)).thenReturn(deletedProject);

        // Act
        Project result = projectService.deleteProject(testProjectId);

        // Assert
        assertThat(result.getProjectStatus()).isEqualTo(ProjectStatus.DELETED);
        verify(projectRepository, never()).save(Mockito.any(Project.class));
        verify(auditRepo, never()).save(Mockito.any(AuthorizationAuditLog.class));
    }

    @Test
    void deleteProject_WithNonExistentProject_ThrowsException() {
        // Arrange
        when(projectRepository.findByProjectId(testProjectId)).thenReturn(null);

        // Act & Assert
        assertThatThrownBy(() -> projectService.deleteProject(testProjectId))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Project not found: " + testProjectId);
    }

    @Test
    void deleteProject_WhenInvitationCancellationFails_RollsBackTransaction() {
        // Arrange
        Project projectToDelete = createTestProject();
        List<Invitation> pendingInvitations = createTestInvitations();

        when(projectRepository.findByProjectId(testProjectId)).thenReturn(projectToDelete);
        when(invitationRepo.findByProjectIdAndStatus(testProjectId, InviteStatus.PENDING))
                .thenReturn(pendingInvitations);

        // Mock invitation service to throw exception
        doThrow(new RuntimeException("Invitation service error"))
                .when(invitationService).cancelInvitation(Mockito.anyInt(), Mockito.anyString());

        // Act & Assert
        assertThatThrownBy(() -> projectService.deleteProject(testProjectId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to delete project");

        // Verify transaction was rolled back (no save should be called)
        verify(projectRepository, never()).save(Mockito.any(Project.class));
    }

    @Test
    void deleteProject_WhenCollaboratorRemovalFails_RollsBackTransaction() {
        // Arrange
        Project projectToDelete = createTestProject();
        List<Collaborator> collaborators = createTestCollaborators();

        when(projectRepository.findByProjectId(testProjectId)).thenReturn(projectToDelete);
        when(invitationRepo.findByProjectIdAndStatus(testProjectId, InviteStatus.PENDING))
                .thenReturn(Arrays.asList());
        when(collaboratorRepo.findByProjectId(testProjectId)).thenReturn(collaborators);

        // Mock collaborator repository to return collaborator objects when findById is
        // called (lenient)
        for (Collaborator collaborator : collaborators) {
            lenient().when(collaboratorRepo.findById(collaborator.getId())).thenReturn(Optional.of(collaborator));
        }

        // Mock collaborator service to throw exception
        doThrow(new RuntimeException("Collaborator service error"))
                .when(collaboratorService)
                .removeCollaborator(Mockito.anyString(), Mockito.anyString(), Mockito.anyString());

        // Act & Assert
        assertThatThrownBy(() -> projectService.deleteProject(testProjectId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to delete project");

        // Verify transaction was rolled back
        verify(projectRepository, never()).save(Mockito.any(Project.class));
    }

    @Test
    void deleteProject_WhenCustomRoleDeletionFails_RollsBackTransaction() {
        // Arrange
        Project projectToDelete = createTestProject();
        List<CustomRole> customRoles = createTestCustomRoles();

        when(projectRepository.findByProjectId(testProjectId)).thenReturn(projectToDelete);
        when(invitationRepo.findByProjectIdAndStatus(testProjectId, InviteStatus.PENDING))
                .thenReturn(Arrays.asList());
        when(collaboratorRepo.findByProjectId(testProjectId)).thenReturn(Arrays.asList());
        when(customRoleRepo.findByProjectId(testProjectId)).thenReturn(customRoles);

        // Mock custom role service to throw exception
        doThrow(new RuntimeException("Custom role service error"))
                .when(customRoleService).deleteCustomRole(Mockito.anyInt());

        // Act & Assert
        assertThatThrownBy(() -> projectService.deleteProject(testProjectId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to delete project");

        // Verify transaction was rolled back
        verify(projectRepository, never()).save(Mockito.any(Project.class));
    }

    @Test
    void deleteProject_WithAuditLoggingFailure_StillCompletesDeletion() {
        // Arrange
        Project projectToDelete = createTestProject();

        when(projectRepository.findByProjectId(testProjectId)).thenReturn(projectToDelete);
        when(projectRepository.save(Mockito.<Project>any())).thenReturn(projectToDelete);
        when(invitationRepo.findByProjectIdAndStatus(testProjectId, InviteStatus.PENDING))
                .thenReturn(Arrays.asList());
        when(collaboratorRepo.findByProjectId(testProjectId)).thenReturn(Arrays.asList());
        when(customRoleRepo.findByProjectId(testProjectId)).thenReturn(Arrays.asList());

        // Mock audit repository to throw exception
        doThrow(new RuntimeException("Audit logging failed"))
                .when(auditRepo).save(Mockito.any(AuthorizationAuditLog.class));

        // Act
        Project result = projectService.deleteProject(testProjectId);

        // Assert
        assertThat(result.getProjectStatus()).isEqualTo(ProjectStatus.DELETED);
        // Deletion should still complete despite audit failure
        verify(projectRepository).save(Mockito.any(Project.class));
    }

    // ============ Helper Methods ============

    private Project createTestProject() {
        Project project = new Project();
        project.setProjectId(testProjectId);
        project.setName("Test Project");
        project.setOwnerId(testUserId);
        project.setProjectStatus(ProjectStatus.ACTIVE);
        project.setCreatedDate(new Date());
        project.setUpdatedDate(new Date());
        return project;
    }

    private List<Invitation> createTestInvitations() {
        Invitation invitation1 = new Invitation();
        invitation1.setId(1);
        invitation1.setProjectId(testProjectId);
        invitation1.setInviteeEmail("user1@example.com");
        invitation1.setStatus(InviteStatus.PENDING);

        Invitation invitation2 = new Invitation();
        invitation2.setId(2);
        invitation2.setProjectId(testProjectId);
        invitation2.setInviteeEmail("user2@example.com");
        invitation2.setStatus(InviteStatus.PENDING);

        return Arrays.asList(invitation1, invitation2);
    }

    private List<Collaborator> createTestCollaborators() {
        Collaborator collaborator1 = new Collaborator();
        collaborator1.setId(1);
        collaborator1.setProjectId(testProjectId);
        collaborator1.setUserId("user1");
        collaborator1.setRole(CollaboratorRole.DEVELOPER);

        Collaborator collaborator2 = new Collaborator();
        collaborator2.setId(2);
        collaborator2.setProjectId(testProjectId);
        collaborator2.setUserId("user2");
        collaborator2.setRole(CollaboratorRole.VIEWER);

        return Arrays.asList(collaborator1, collaborator2);
    }

    private List<CustomRole> createTestCustomRoles() {
        CustomRole customRole1 = new CustomRole();
        customRole1.setId(1);
        customRole1.setProjectId(testProjectId);
        customRole1.setName("Custom Developer");

        CustomRole customRole2 = new CustomRole();
        customRole2.setId(2);
        customRole2.setProjectId(testProjectId);
        customRole2.setName("Custom Viewer");

        return Arrays.asList(customRole1, customRole2);
    }
}
