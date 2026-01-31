package com.kleff.projectmanagementservice.presentationlayer.collaborator;

import com.kleff.projectmanagementservice.buisnesslayer.collaborator.CollaboratorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.kleff.projectmanagementservice.authorization.annotation.RequirePermission;
import com.kleff.projectmanagementservice.datalayer.collaborator.ProjectPermission;

@RestController
@RequestMapping("/api/v1")
public class CollaboratorController {

    private final CollaboratorService collaboratorService;

    public CollaboratorController(CollaboratorService collaboratorService) {
        this.collaboratorService = collaboratorService;
    }

    @PostMapping("/projects/{projectId}/collaborators")
    @RequirePermission(value = ProjectPermission.MANAGE_COLLABORATORS, action = "add_collaborator", resourceType = "COLLABORATOR")
    public ResponseEntity<CollaboratorResponseModel> addCollaborator(@PathVariable String projectId,
            @RequestBody CollaboratorRequestModel request,
            @AuthenticationPrincipal Jwt jwt) {
        String invitedBy = jwt.getSubject();
        request.setProjectId(projectId);
        CollaboratorResponseModel response = collaboratorService.addCollaborator(request, invitedBy);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/projects/{projectId}/collaborators")
    @RequirePermission(value = ProjectPermission.READ_PROJECT, action = "view_collaborators", resourceType = "COLLABORATOR")
    public ResponseEntity<List<CollaboratorResponseModel>> getProjectCollaborators(@PathVariable String projectId) {
        List<CollaboratorResponseModel> collaborators = collaboratorService.getProjectCollaborators(projectId);
        return ResponseEntity.ok(collaborators);
    }

    public ResponseEntity<CollaboratorResponseModel> updateCollaborator(@PathVariable String projectId,
            @PathVariable String userId,
            @RequestBody CollaboratorRequestModel request,
            @AuthenticationPrincipal Jwt jwt) {
        String actorId = jwt.getSubject();
        CollaboratorResponseModel response = collaboratorService.updateCollaborator(projectId, userId, request,
                actorId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/projects/{projectId}/collaborators/{userId}")
    @RequirePermission(value = ProjectPermission.MANAGE_COLLABORATORS, action = "remove_collaborator", resourceType = "COLLABORATOR")
    public ResponseEntity<Void> removeCollaborator(
            @PathVariable String projectId,
            @PathVariable String userId,
            @AuthenticationPrincipal Jwt jwt) {
        String actorId = jwt.getSubject();
        collaboratorService.removeCollaborator(projectId, userId, actorId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping("/collaborators/{projectId}/user/{userId}/permissions")
    public ResponseEntity<List<String>> getUserPermissions(
            @PathVariable String projectId,
            @PathVariable String userId,
            @AuthenticationPrincipal Jwt jwt) {
        List<String> permissions = collaboratorService.getUserPermissions(projectId, userId);
        return ResponseEntity.ok(permissions);
    }
}
