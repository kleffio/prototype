package com.kleff.projectmanagementservice.authorization.annotation;

import com.kleff.projectmanagementservice.datalayer.collaborator.ProjectPermission;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark methods that require specific project permissions.
 * Used with AuthorizationAspect to automatically check permissions before
 * method execution.
 *
 * Example usage:
 * 
 * <pre>
 * {@code
 * &#64;GetMapping("/{projectId}")
 * @RequirePermission(value = ProjectPermission.READ_PROJECT, projectIdExpression = "#projectId")
 * public ResponseEntity<Project> getProject(@PathVariable String projectId, @AuthenticationPrincipal Jwt jwt) {
 *     return ResponseEntity.ok(projectService.getProjectById(projectId));
 * }
 * }
 * </pre>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermission {

    /**
     * The permission required to execute this method.
     */
    ProjectPermission value();

    /**
     * SpEL expression to extract the project ID from method parameters.
     * Default is "#projectId" which looks for a parameter named "projectId".
     *
     * Examples:
     * - "#projectId" - parameter named projectId
     * - "#request.projectId" - field projectId on request object
     * - "#projectIdentifier" - parameter named projectIdentifier
     */
    String projectIdExpression() default "#projectId";

    /**
     * Action name for audit logging.
     * If empty, uses the method name.
     */
    String action() default "";

    /**
     * Resource type for audit logging.
     * Default is "PROJECT".
     */
    String resourceType() default "PROJECT";
}
