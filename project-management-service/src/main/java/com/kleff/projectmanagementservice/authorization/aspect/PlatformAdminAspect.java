package com.kleff.projectmanagementservice.authorization.aspect;

import com.kleff.projectmanagementservice.authorization.annotation.RequirePlatformAdmin;
import com.kleff.projectmanagementservice.authorization.service.PlatformAdminService;
import com.kleff.projectmanagementservice.buisnesslayer.audit.AuditService;
import com.kleff.projectmanagementservice.presentationlayer.audit.AuditController.ExternalAuditRequest;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Aspect to enforce platform admin role verification for annotated methods.
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class PlatformAdminAspect {

    private final PlatformAdminService platformAdminService;
    private final AuditService auditService;

    @Around("@annotation(requirePlatformAdmin)")
    public Object enforcePlatformAdmin(ProceedingJoinPoint joinPoint, RequirePlatformAdmin requirePlatformAdmin) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Object[] args = joinPoint.getArgs();
        
        // Extract JWT from method parameters
        Jwt jwt = extractJwt(method, args);
        if (jwt == null) {
            log.warn("No JWT found in method parameters for @RequirePlatformAdmin method: {}", method.getName());
            throw new AccessDeniedException("Authentication required");
        }
        
        String userId = jwt.getSubject();
        String accessToken = jwt.getTokenValue();
        
        // Verify platform admin role
        if (!platformAdminService.isPlatformAdmin(userId, accessToken)) {
            log.warn("User {} attempted to access admin endpoint {} without platform_admin role", userId, method.getName());
            throw new AccessDeniedException("Platform admin access required");
        }
        
        // Get request details for audit
        HttpServletRequest request = getHttpServletRequest();
        String ipAddress = request != null ? getClientIpAddress(request) : null;
        
        // Execute the method
        Object result;
        try {
            result = joinPoint.proceed();
            
            // Log successful admin action
            logAdminAction(requirePlatformAdmin, method, userId, ipAddress, null, true);
            
            return result;
        } catch (Exception e) {
            // Log failed admin action
            logAdminAction(requirePlatformAdmin, method, userId, ipAddress, e.getMessage(), false);
            throw e;
        }
    }
    
    private Jwt extractJwt(Method method, Object[] args) {
        Parameter[] parameters = method.getParameters();
        for (int i = 0; i < parameters.length; i++) {
            if (parameters[i].isAnnotationPresent(AuthenticationPrincipal.class)) {
                if (args[i] instanceof Jwt) {
                    return (Jwt) args[i];
                }
            }
            // Also check by type if no annotation
            if (args[i] instanceof Jwt) {
                return (Jwt) args[i];
            }
        }
        return null;
    }
    
    private HttpServletRequest getHttpServletRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
    
    private void logAdminAction(RequirePlatformAdmin annotation, Method method, String userId, 
                                  String ipAddress, String errorMessage, boolean success) {
        try {
            String action = annotation.action().isEmpty() ? method.getName() : annotation.action();
            
            Map<String, Object> changes = new HashMap<>();
            changes.put("adminAction", action);
            changes.put("description", annotation.description());
            changes.put("success", success);
            if (errorMessage != null) {
                changes.put("error", errorMessage);
            }
            
            ExternalAuditRequest auditRequest = new ExternalAuditRequest();
            auditRequest.setAction("ADMIN_" + action.toUpperCase());
            auditRequest.setUserId(userId);
            auditRequest.setResourceType("ADMIN_OPERATION");
            auditRequest.setResourceId(method.getName());
            auditRequest.setChanges(changes);
            auditRequest.setIpAddress(ipAddress);
            
            auditService.createAuditLog(auditRequest);
        } catch (Exception e) {
            log.error("Failed to create admin audit log: {}", e.getMessage());
        }
    }
}