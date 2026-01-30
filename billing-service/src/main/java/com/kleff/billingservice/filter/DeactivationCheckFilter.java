package com.kleff.billingservice.filter;

import com.kleff.billingservice.service.UserStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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

        // Skip health checks
        if (request.getRequestURI().contains("/actuator/health")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Check if user is authenticated
        if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            String userId = jwt.getSubject();

            // Check if user is active
            if (!userStatusService.isUserActive(userId)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Account has been deactivated\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}