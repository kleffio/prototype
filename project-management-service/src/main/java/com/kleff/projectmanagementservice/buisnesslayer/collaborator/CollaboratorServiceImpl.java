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
import com.kleff.projectmanagementservice.authorization.repository.AuthorizationAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CollaboratorServiceImpl implements CollaboratorService {

    private final collaboratorRepository collaboratorRepo;
    private final CustomRoleRepository customRoleRepo;
    private final AuthorizationAuditRepository auditRepository;
    private final CollaboratorRequestMapper requestMapper;
    private final CollaboratorResponseMapper responseMapper;

    @Override
    public CollaboratorResponseModel addCollaborator(CollaboratorRequestModel request, String invitedBy) {
        Collaborator collaborator = requestMapper.requestToEntity(request);
        collaborator.setCollaboratorStatus(CollaboratorStatus.ACCEPTED);
        collaborator.setInvitedBy(invitedBy);
        collaborator.setInvitedAt(new Date());
        collaborator.setAcceptedAt(new Date());

        Collaborator saved = collaboratorRepo.save(collaborator);
        return responseMapper.toResponseModel(saved);
    }

    @Override
    public CollaboratorResponseModel updateCollaborator(String projectId, String userId,
            CollaboratorRequestModel request, String actorId) {
        Collaborator collaborator = collaboratorRepo.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new RuntimeException("Collaborator not found"));

        CollaboratorRole oldRole = collaborator.getRole();

        if (request.getCustomRoleId() != null) {
            collaborator.setCustomRoleId(request.getCustomRoleId());
            collaborator.setRole(CollaboratorRole.VIEWER); // Set a base role
            collaborator.setPermissions(null); // Clear permissions to use custom role's permissions
        } else {
            collaborator.setCustomRoleId(null);
            collaborator.setRole(request.getRole());
            collaborator.setPermissions(request.getPermissions());
        }

        Collaborator updated = collaboratorRepo.save(collaborator);

        try {
            com.kleff.projectmanagementservice.authorization.domain.AuthorizationAuditLog log = com.kleff.projectmanagementservice.authorization.domain.AuthorizationAuditLog
                    .builder()
                    .action("update_collaborator_role")
                    .projectId(projectId)
                    .userId(actorId)
                    .resourceType("COLLABORATOR")
                    .resourceId(userId)
                    .changes(java.util.Map.of(
                            "target_user_id", userId,
                            "old_role", oldRole != null ? oldRole.name() : "NONE",
                            "new_role", request.getRole() != null ? request.getRole().name() : "NONE",
                            "custom_role_id",
                            request.getCustomRoleId() != null ? request.getCustomRoleId().toString() : "NONE"))
                    .authorizationResult(
                            com.kleff.projectmanagementservice.authorization.domain.AuthorizationResult.ALLOW)
                    .createdAt(new Date())
                    .permissionChecked("MANAGE_COLLABORATORS")
                    .build();
            auditRepository.save(log);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return responseMapper.toResponseModel(updated);
    }

    @Override
    public List<CollaboratorResponseModel> getProjectCollaborators(String projectId) {
        List<Collaborator> collaborators = collaboratorRepo.findByProjectId(projectId);

        collaborators.forEach(collab -> {
            if (collab.getCustomRoleId() != null
                    && (collab.getPermissions() == null || collab.getPermissions().isEmpty())) {
                customRoleRepo.findById(collab.getCustomRoleId())
                        .ifPresent(customRole -> collab.setPermissions(customRole.getPermissions()));
            }
        });

        List<CollaboratorResponseModel> responses = responseMapper.entityListToResponseList(collaborators);

        responses.forEach(response -> {
            if (response.getCustomRoleId() != null) {
                customRoleRepo.findById(response.getCustomRoleId())
                        .ifPresent(customRole -> response.setCustomRoleName(customRole.getName()));
            }
        });

        return responses;
    }

    @Override
    public void removeCollaborator(String projectId, String userId, String actorId) {
        collaboratorRepo.findByProjectIdAndUserId(projectId, userId)
                .ifPresent(collab -> {
                    collaboratorRepo.delete(collab);

                    // Audit Log for removal
                    try {
                        com.kleff.projectmanagementservice.authorization.domain.AuthorizationAuditLog log = com.kleff.projectmanagementservice.authorization.domain.AuthorizationAuditLog
                                .builder()
                                .action("remove_collaborator")
                                .projectId(projectId)
                                .userId(actorId)
                                .resourceType("COLLABORATOR")
                                .resourceId(userId)
                                .changes(java.util.Map.of("target_user_id", userId))
                                .authorizationResult(
                                        com.kleff.projectmanagementservice.authorization.domain.AuthorizationResult.ALLOW)
                                .createdAt(new Date())
                                .permissionChecked("MANAGE_COLLABORATORS")
                                .build();
                        auditRepository.save(log);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });
    }

    @Override
    public List<String> getUserPermissions(String projectId, String userId) {
        return collaboratorRepo.findByProjectIdAndUserId(projectId, userId)
                .map(collaborator -> {
                    Set<ProjectPermission> permissions = collaborator.getPermissions();

                    if (permissions == null || permissions.isEmpty()) {
                        if (collaborator.getCustomRoleId() != null) {
                            return customRoleRepo.findById(collaborator.getCustomRoleId())
                                    .map(customRole -> customRole.getPermissions().stream()
                                            .map(Enum::name)
                                            .toList())
                                    .orElse(getRoleBasedPermissions(collaborator.getRole()));
                        }
                        return getRoleBasedPermissions(collaborator.getRole());
                    }

                    return permissions.stream()
                            .map(Enum::name)
                            .toList();
                })
                .orElse(List.<String>of());
    }

    private List<String> getRoleBasedPermissions(CollaboratorRole role) {
        return switch (role) {
            case OWNER -> List.of(
                    "OWNER",
                    "READ_PROJECT",
                    "WRITE_PROJECT",
                    "DEPLOY",
                    "MANAGE_ENV_VARS",
                    "VIEW_LOGS",
                    "VIEW_METRICS",
                    "MANAGE_COLLABORATORS",
                    "DELETE_PROJECT",
                    "MANAGE_BILLING");
            case ADMIN -> List.of(
                    "ADMIN",
                    "READ_PROJECT",
                    "WRITE_PROJECT",
                    "DEPLOY",
                    "MANAGE_ENV_VARS",
                    "VIEW_LOGS",
                    "VIEW_METRICS",
                    "MANAGE_COLLABORATORS");
            case DEVELOPER -> List.of(
                    "DEVELOPER",
                    "READ_PROJECT",
                    "WRITE_PROJECT",
                    "DEPLOY",
                    "VIEW_LOGS",
                    "VIEW_METRICS");
            case VIEWER -> List.of(
                    "VIEWER",
                    "READ_PROJECT",
                    "VIEW_LOGS",
                    "VIEW_METRICS");
        };
    }
}
