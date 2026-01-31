package com.kleff.projectmanagementservice.filter;

import com.kleff.projectmanagementservice.service.UserStatusService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
public class DeactivationCheckFilter extends OncePerRequestFilter {

    private final UserStatusService userStatusService;
    
    // Skip deactivation checks for these endpoints to reduce API calls
    private final List<String> skipPaths = Arrays.asList(
        "/actuator",
        "/api/v1/health",
        "/api/v1/projects/*/logs",  // Log streaming
        "/api/v1/projects/*/status"  // Status polling
    );
    
    private static final String SESSION_USER_ACTIVE_KEY = "user_active_checked";
    private static final long SESSION_CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutes

    public DeactivationCheckFilter(UserStatusService userStatusService) {
        this.userStatusService = userStatusService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String requestPath = request.getRequestURI();
        
        // Skip filter for certain endpoints
        if (skipPaths.stream().anyMatch(path -> requestPath.startsWith(path))) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getSubject();
            
            if (userId != null) {
                // Check session cache first to avoid repeated API calls
                HttpSession session = request.getSession(false);
                if (session != null) {
                    Long lastCheck = (Long) session.getAttribute(SESSION_USER_ACTIVE_KEY + "_" + userId);
                    if (lastCheck != null && (System.currentTimeMillis() - lastCheck) < SESSION_CACHE_DURATION_MS) {
                        // User was active recently, skip check
                        filterChain.doFilter(request, response);
                        return;
                    }
                }
                
                if (!userStatusService.isUserActive(userId)) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"Account has been deactivated\"}");
                    return;
                }
                
                // Cache the successful check in session
                if (session != null) {
                    session.setAttribute(SESSION_USER_ACTIVE_KEY + "_" + userId, System.currentTimeMillis());
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}