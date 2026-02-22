package com.kleff.projectmanagementservice.presentationlayer.admin;

import com.kleff.projectmanagementservice.authorization.annotation.RequirePlatformAdmin;
import com.kleff.projectmanagementservice.buisnesslayer.project.ProjectService;
import com.kleff.projectmanagementservice.buisnesslayer.audit.AuditService;
import com.kleff.projectmanagementservice.datalayer.project.Project;
import com.kleff.projectmanagementservice.presentationlayer.project.ProjectActivityLogDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Admin-only endpoints for project management.
 * Requires platform_admin role (enforced by @RequirePlatformAdmin annotation).
 */
@RestController
@RequestMapping("/api/v1/admin/projects")
@RequiredArgsConstructor
public class AdminController {

    private final ProjectService projectService;
    private final AuditService auditService;

    // Whitelist of allowed sort columns to prevent SQL injection
    private static final Set<String> ALLOWED_SORT_FIELDS = new HashSet<>(Arrays.asList(
        "createdDate", "lastModifiedDate", "name", "status", "ownerId"
    ));

    /**
     * List all projects with pagination (admin view).
     */
    @GetMapping
    @RequirePlatformAdmin(action = "list_projects", description = "List all projects with pagination")
    public ResponseEntity<Map<String, Object>> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal Jwt jwt) {
        
        // Validate sortBy against whitelist to prevent SQL injection
        String validatedSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdDate";
        
        Sort sort = sortDir.equalsIgnoreCase("asc") 
            ? Sort.by(validatedSortBy).ascending() 
            : Sort.by(validatedSortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<Project> projectPage = projectService.getAllProjectsAdmin(pageable, search);
        
        Map<String, Object> response = new HashMap<>();
        response.put("projects", projectPage.getContent());
        response.put("total", projectPage.getTotalElements());
        response.put("page", projectPage.getNumber());
        response.put("pageSize", projectPage.getSize());
        response.put("totalPages", projectPage.getTotalPages());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get project details with resources (admin view).
     */
    @GetMapping("/{projectId}")
    @RequirePlatformAdmin(action = "view_project", description = "View project details as admin")
    public ResponseEntity<?> getProjectDetails(
            @PathVariable String projectId,
            @AuthenticationPrincipal Jwt jwt) {
        
        Project project = projectService.getProjectById(projectId);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Get activity logs for this project
        List<ProjectActivityLogDTO> activityLogs = auditService.getAuditLogsByProject(projectId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("project", project);
        response.put("activityLogs", activityLogs);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Force delete a project (admin operation).
     */
    @DeleteMapping("/{projectId}")
    @RequirePlatformAdmin(action = "force_delete_project", description = "Force delete a project")
    public ResponseEntity<?> forceDeleteProject(
            @PathVariable String projectId,
            @AuthenticationPrincipal Jwt jwt) {
        
        Project project = projectService.getProjectById(projectId);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }
        
        try {
            Project deletedProject = projectService.deleteProject(projectId);
            return ResponseEntity.ok(deletedProject);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to delete project: " + e.getMessage()));
        }
    }
}
