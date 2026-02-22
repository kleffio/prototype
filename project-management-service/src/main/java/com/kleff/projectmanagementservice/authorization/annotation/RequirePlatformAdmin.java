package com.kleff.projectmanagementservice.authorization.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark methods that require platform admin role.
 * Used with PlatformAdminAspect to automatically verify admin role before method execution.
 *
 * The platform_admin role is a system-wide role stored in the user-service.
 * This annotation extracts the user ID from the JWT and verifies the role
 * via the user-service API.
 *
 * Example usage:
 * <pre>
 * {@code
 * @GetMapping("/admin/projects")
 * @RequirePlatformAdmin
 * public ResponseEntity<List<Project>> getAllProjects(@AuthenticationPrincipal Jwt jwt) {
 *     return ResponseEntity.ok(projectService.getAllProjectsAdmin());
 * }
 * }
 * </pre>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePlatformAdmin {

    /**
     * Action name for audit logging.
     * If empty, uses the method name.
     */
    String action() default "";

    /**
     * Description of the admin action for audit logging.
     */
    String description() default "";
}