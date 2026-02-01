
package com.kleff.projectmanagementservice.presentationlayer.project;

import com.kleff.projectmanagementservice.authorization.annotation.RequirePermission;
import com.kleff.projectmanagementservice.buisnesslayer.project.ProjectService;
import com.kleff.projectmanagementservice.datalayer.collaborator.ProjectPermission;
import com.kleff.projectmanagementservice.datalayer.project.Project;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;

import com.kleff.projectmanagementservice.buisnesslayer.audit.AuditService;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<List<Project>> getAllOwnedProjects(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        List<Project> projects = projectService.getAllOwnedProjects(userId);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{projectId}")
    @RequirePermission(value = ProjectPermission.READ_PROJECT, projectIdExpression = "#projectId", action = "view_project")
    public ResponseEntity<Project> getProjectById(@PathVariable String projectId, @AuthenticationPrincipal Jwt jwt) {
        Project project = projectService.getProjectById(projectId);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(project);
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Project project, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        project.setOwnerId(userId);
        Date date = new Date();
        project.setCreatedDate(date);
        project.setUpdatedDate(date);
        Project createdProject = projectService.createProject(project);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdProject);
    }

    @PatchMapping("/{projectId}")
    @RequirePermission(value = ProjectPermission.WRITE_PROJECT, projectIdExpression = "#projectId", action = "update_project")
    public ResponseEntity<Project> patchProject(
            @PathVariable String projectId,
            @RequestBody Project updatedProject,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        Project projectAllowed = projectService.getProjectById(projectId);
        if (userId.equals(projectAllowed.getOwnerId()))
            try {
                Date date = new Date();
                updatedProject.setUpdatedDate(date);
                Project project = projectService.updateProject(projectId, updatedProject);
                return ResponseEntity.ok(project);
            } catch (RuntimeException e) {
                return ResponseEntity.notFound().build();
            }
        else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @DeleteMapping("/{projectId}")
    @RequirePermission(value = ProjectPermission.DELETE_PROJECT, projectIdExpression = "#projectId", action = "delete_project")
    public ResponseEntity<Project> deleteProject(@PathVariable String projectId, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        Project projectAllowed = projectService.getProjectById(projectId);
        if (userId.equals(projectAllowed.getOwnerId())) {
            try {
                Project deletedProject = projectService.deleteProject(projectId);
                return ResponseEntity.ok(deletedProject);
            } catch (Exception e) {
                return ResponseEntity.notFound().build();
            }
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @GetMapping("/listID")
    public List<String> getallProjectIds() {
        return projectService.getAllProjectIds();
    }

    @GetMapping("/{projectId}/activity")
    @RequirePermission(value = ProjectPermission.READ_PROJECT, projectIdExpression = "#projectId", action = "view_activity")
    public ResponseEntity<List<ProjectActivityLogDTO>> getActivityLogs(@PathVariable String projectId,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        Project project = projectService.getProjectById(projectId);

        // Strict ownership check as requested
        if (!currentUserId.equals(project.getOwnerId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<ProjectActivityLogDTO> logs = auditService.getAuditLogsByProject(projectId);
        return ResponseEntity.ok(logs);
    }
}
