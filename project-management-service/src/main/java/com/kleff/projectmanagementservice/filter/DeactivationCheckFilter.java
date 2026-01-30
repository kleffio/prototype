package com.kleff.projectmanagementservice.filter;

import com.kleff.projectmanagementservice.service.UserStatusService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class DeactivationCheckFilter extends OncePerRequestFilter {

    private final UserStatusService userStatusService;

    public DeactivationCheckFilter(UserStatusService userStatusService) {
        this.userStatusService = userStatusService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // Skip filter for health check endpoints
        String requestPath = request.getRequestURI();
        if (requestPath.startsWith("/actuator/health")) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getSubject();
            
            if (userId != null && !userStatusService.isUserActive(userId)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Account has been deactivated\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}