package com.kleff.projectmanagementservice.buisnesslayer.project;

import com.kleff.projectmanagementservice.buisnesslayer.collaborator.CollaboratorService;
import com.kleff.projectmanagementservice.buisnesslayer.customrole.CustomRoleService;
import com.kleff.projectmanagementservice.buisnesslayer.invitation.InvitationService;
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
import com.kleff.projectmanagementservice.presentationlayer.customrole.CustomRoleRequestModel;
import com.kleff.projectmanagementservice.presentationlayer.invitation.InvitationRequestModel;
import com.kleff.projectmanagementservice.authorization.domain.AuthorizationAuditLog;
import com.kleff.projectmanagementservice.authorization.domain.AuthorizationResult;
import com.kleff.projectmanagementservice.authorization.repository.AuthorizationAuditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final CollaboratorService collaboratorService;
    private final collaboratorRepository collaboratorRepo;
    private final InvitationService invitationService;
    private final InvitationRepository invitationRepo;
    private final CustomRoleService customRoleService;
    private final CustomRoleRepository customRoleRepo;
    private final AuthorizationAuditRepository auditRepo;

    @Override
    public List<Project> getAllOwnedProjects(String userId) {
        List<Project> ownedProjects = projectRepository.findByOwnerIdEquals(userId);

        List<Collaborator> collaborations = collaboratorRepo.findByUserId(userId);
        List<String> collaboratedProjectIds = collaborations.stream()
                .map(Collaborator::getProjectId)
                .collect(Collectors.toList());

        List<Project> collaboratedProjects = new ArrayList<>();
        for (String projectId : collaboratedProjectIds) {
            Project project = projectRepository.findByProjectId(projectId);
            if (project != null && !ownedProjects.contains(project)) {
                collaboratedProjects.add(project);
            }
        }

        List<Project> allProjects = new ArrayList<>(ownedProjects);
        allProjects.addAll(collaboratedProjects);

        return allProjects;
    }

    @Override
    public Project getProjectById(String projectId) {
        try {
            return projectRepository.findByProjectId(projectId);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public Page<Project> getAllProjectsAdmin(Pageable pageable, String search) {
        return projectRepository.findAllWithSearch(search, pageable);
    }

    @Override
    public Project createProject(Project project) {
        Project saved = projectRepository.save(project);

        try {
            CollaboratorRequestModel ownerCollab = CollaboratorRequestModel.builder()
                    .projectId(saved.getProjectId())
                    .userId(saved.getOwnerId())
                    .role(CollaboratorRole.OWNER)
                    .permissions(null)
                    .build();

            collaboratorService.addCollaborator(ownerCollab, "system");
        } catch (Exception e) {
            System.err.println("Failed to create owner collaborator: " + e.getMessage());
        }

        return saved;
    }

    @Override
    public Project updateProject(String projectId, Project updatedProject) {
        Project existing = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        if (updatedProject.getName() != null) {
            existing.setName(updatedProject.getName());
        }
        if (updatedProject.getDescription() != null) {
            existing.setDescription(updatedProject.getDescription());
        }
        if (updatedProject.getOwnerId() != null) {
            existing.setOwnerId(updatedProject.getOwnerId());
        }
        if (updatedProject.getProjectStatus() != null) {
            existing.setProjectStatus(updatedProject.getProjectStatus());
        }
        existing.setUpdatedDate(new Date());
        return projectRepository.save(existing);

    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Project deleteProject(String projectId) {
        log.info("Starting deletion process for project: {}", projectId);

        // Verify project exists and get deletion data
        ProjectDeletionData deletionData = getProjectDeletionData(projectId);
        Project project = deletionData.getProject();

        if (project == null) {
            throw new RuntimeException("Project not found: " + projectId);
        }

        if (project.getProjectStatus() == ProjectStatus.DELETED) {
            log.warn("Project {} is already deleted", projectId);
            return project;
        }

        try {
            // Step 1: Cancel pending invitations
            cancelProjectInvitations(deletionData.getInvitationIds());

            // Step 2: Remove collaborators
            removeProjectCollaborators(deletionData.getCollaboratorIds());

            // Step 3: Delete custom roles
            deleteProjectCustomRoles(deletionData.getCustomRoleIds());

            // Step 4: Mark project as deleted
            project.setProjectStatus(ProjectStatus.DELETED);
            project.setUpdatedDate(new Date());

            Project deletedProject = projectRepository.save(project);

            // Log audit trail for project deletion
            logProjectDeletionAudit(projectId, project.getOwnerId());

            log.info("Successfully deleted project: {} with transaction status: {}",
                    projectId,
                    TransactionSynchronizationManager.isActualTransactionActive() ? "COMMITTED" : "NO_TRANSACTION");

            return deletedProject;

        } catch (Exception e) {
            log.error("Failed to delete project: {}. Rolling back transaction.", projectId, e);
            throw new RuntimeException("Failed to delete project: " + projectId, e);
        }
    }

    @Override
    public List<String> getAllProjectIds() {
        return projectRepository.findAll().stream()
                .map(Project::getProjectId)
                .collect(Collectors.toList());
    }

    @Override
    public ProjectDeletionData getProjectDeletionData(String projectId) {
        // Get the project
        Project project = projectRepository.findByProjectId(projectId);
        if (project == null) {
            throw new RuntimeException("Project not found: " + projectId);
        }

        // Get pending invitations for this project
        List<String> invitationIds = invitationRepo.findByProjectIdAndStatus(projectId, InviteStatus.PENDING)
                .stream()
                .map(invitation -> String.valueOf(invitation.getId()))
                .collect(Collectors.toList());

        // Get all collaborators for this project
        List<Integer> collaboratorIds = collaboratorRepo.findByProjectId(projectId)
                .stream()
                .map(Collaborator::getId)
                .collect(Collectors.toList());

        // Get custom roles for this project
        List<Integer> customRoleIds = customRoleRepo.findByProjectId(projectId)
                .stream()
                .map(CustomRole::getId)
                .collect(Collectors.toList());

        log.debug("Project deletion data for {}: invitations={}, collaborators={}, customRoles={}",
                projectId, invitationIds.size(), collaboratorIds.size(), customRoleIds.size());

        return new ProjectDeletionData(project, invitationIds, collaboratorIds, customRoleIds);
    }

    /**
     * Cancel all pending invitations for a project
     */
    private void cancelProjectInvitations(List<String> invitationIds) {
        if (invitationIds.isEmpty()) {
            log.debug("No invitations to cancel for project");
            return;
        }

        log.info("Cancelling {} pending invitations", invitationIds.size());

        for (String invitationId : invitationIds) {
            try {
                int id = Integer.parseInt(invitationId);
                invitationService.cancelInvitation(id, "system");
                log.debug("Cancelled invitation: {}", invitationId);
            } catch (NumberFormatException e) {
                log.warn("Invalid invitation ID format: {}", invitationId);
            } catch (Exception e) {
                log.error("Failed to cancel invitation: {}", invitationId, e);
                throw new RuntimeException("Failed to cancel invitation: " + invitationId, e);
            }
        }
    }

    /**
     * Remove all collaborators from a project
     */
    private void removeProjectCollaborators(List<Integer> collaboratorIds) {
        if (collaboratorIds.isEmpty()) {
            log.debug("No collaborators to remove for project");
            return;
        }

        log.info("Removing {} collaborators", collaboratorIds.size());

        for (Integer collaboratorId : collaboratorIds) {
            try {
                // Find the collaborator to get projectId and userId
                Collaborator collaborator = collaboratorRepo.findById(collaboratorId)
                        .orElseThrow(() -> new RuntimeException("Collaborator not found: " + collaboratorId));

                collaboratorService.removeCollaborator(collaborator.getProjectId(), collaborator.getUserId(), "system");
                log.debug("Removed collaborator: {} from project: {}",
                        collaborator.getUserId(), collaborator.getProjectId());
            } catch (Exception e) {
                log.error("Failed to remove collaborator: {}", collaboratorId, e);
                throw new RuntimeException("Failed to remove collaborator: " + collaboratorId, e);
            }
        }
    }

    /**
     * Delete all custom roles for a project
     */
    private void deleteProjectCustomRoles(List<Integer> customRoleIds) {
        if (customRoleIds.isEmpty()) {
            log.debug("No custom roles to delete for project");
            return;
        }

        log.info("Deleting {} custom roles", customRoleIds.size());

        for (Integer roleId : customRoleIds) {
            try {
                customRoleService.deleteCustomRole(roleId);
                log.debug("Deleted custom role: {}", roleId);
            } catch (Exception e) {
                log.error("Failed to delete custom role: {}", roleId, e);
                throw new RuntimeException("Failed to delete custom role: " + roleId, e);
            }
        }
    }

    /**
     * Log project deletion audit trail
     */
    private void logProjectDeletionAudit(String projectId, String ownerId) {
        try {
            String projectName = getProjectName(projectId);
            String reason = "Project deletion initiated by owner";
            String cleanupSteps = "invitations_cancelled,collaborators_removed,custom_roles_deleted";

            // Create a safe map without null values
            java.util.Map<String, Object> changes = new java.util.HashMap<>();
            changes.put("reason", reason);
            changes.put("projectName", projectName != null ? projectName : "Unknown");
            changes.put("cleanupSteps", cleanupSteps);

            AuthorizationAuditLog auditLog = AuthorizationAuditLog.builder()
                    .userId(ownerId)
                    .projectId(projectId)
                    .action("delete_project")
                    .permissionChecked("DELETE_PROJECT")
                    .authorizationResult(AuthorizationResult.ALLOW)
                    .shadowMode(false)
                    .changes(changes)
                    .build();

            auditRepo.save(auditLog);
            log.debug("Logged project deletion audit for project: {}", projectId);
        } catch (Exception e) {
            log.error("Failed to log project deletion audit for project: {}", projectId, e);
            // Don't throw - audit logging failure shouldn't break deletion
        }
    }

    /**
     * Get project name for audit logging (safe method)
     */
    private String getProjectName(String projectId) {
        try {
            Project project = projectRepository.findByProjectId(projectId);
            return project != null ? project.getName() : "Unknown";
        } catch (Exception e) {
            log.warn("Failed to get project name for audit logging: {}", projectId);
            return "Unknown";
        }
    }
}
