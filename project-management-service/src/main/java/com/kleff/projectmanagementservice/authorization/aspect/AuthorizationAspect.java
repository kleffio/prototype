package com.kleff.projectmanagementservice.authorization.aspect;

import com.kleff.projectmanagementservice.authorization.annotation.RequirePermission;
import com.kleff.projectmanagementservice.authorization.service.AuthorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;

/**
 * AOP Aspect that intercepts methods annotated with @RequirePermission.
 * Performs authorization checks before method execution.
 * In shadow mode: logs decisions but allows execution.
 * In enforce mode: throws exception on denied access.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuthorizationAspect {

    private final AuthorizationService authorizationService;
    private final ExpressionParser parser = new SpelExpressionParser();

    /**
     * Intercept methods annotated with @RequirePermission.
     * Extract user ID and project ID, check permission, then proceed with
     * execution.
     */
    @Around("@annotation(requirePermission)")
    public Object checkPermission(
            ProceedingJoinPoint joinPoint,
            RequirePermission requirePermission) throws Throwable {

        // Extract user ID from JWT parameter
        String userId = extractUserId(joinPoint);
        if (userId == null) {
            log.warn("No authenticated user found for permission check on method: {}",
                    joinPoint.getSignature().getName());
            // In shadow mode, this will be logged but allowed
            // In future: could enforce authentication requirement
            return joinPoint.proceed();
        }

        // Extract project ID using SpEL expression
        String projectId = extractProjectId(joinPoint, requirePermission.projectIdExpression());
        if (projectId == null) {
            log.warn("No projectId found for permission check on method: {} with expression: {}",
                    joinPoint.getSignature().getName(), requirePermission.projectIdExpression());
            return joinPoint.proceed();
        }

        // Determine action name (use annotation value or method name)
        String action = requirePermission.action().isEmpty()
                ? joinPoint.getSignature().getName()
                : requirePermission.action();

        // Check permission (shadow mode: logs but doesn't throw)
        authorizationService.requirePermission(
                projectId,
                userId,
                requirePermission.value(),
                action,
                requirePermission.resourceType());

        // Proceed with method execution
        return joinPoint.proceed();
    }

    /**
     * Extract user ID from JWT parameter annotated with @AuthenticationPrincipal.
     */
    private String extractUserId(ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Parameter[] parameters = method.getParameters();
        Object[] args = joinPoint.getArgs();

        for (int i = 0; i < parameters.length; i++) {
            if (parameters[i].isAnnotationPresent(AuthenticationPrincipal.class)) {
                if (args[i] instanceof Jwt jwt) {
                    return jwt.getSubject();
                }
            }
        }

        return null;
    }

    /**
     * Extract project ID using SpEL expression.
     * Supports expressions like "#projectId", "#request.projectId", etc.
     */
    private String extractProjectId(ProceedingJoinPoint joinPoint, String expression) {
        try {
            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            String[] paramNames = signature.getParameterNames();
            Object[] args = joinPoint.getArgs();

            // Create SpEL evaluation context
            StandardEvaluationContext context = new StandardEvaluationContext();
            for (int i = 0; i < paramNames.length; i++) {
                context.setVariable(paramNames[i], args[i]);
            }

            // Evaluate expression
            Object result = parser.parseExpression(expression).getValue(context);
            return result != null ? result.toString() : null;

        } catch (Exception e) {
            log.error("Error extracting projectId from expression '{}': {}",
                    expression, e.getMessage());
            return null;
        }
    }
}
