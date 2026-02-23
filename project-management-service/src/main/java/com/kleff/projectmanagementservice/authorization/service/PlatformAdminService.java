package com.kleff.projectmanagementservice.authorization.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;

/**
 * Service to verify platform admin role by calling the user-service API.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformAdminService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${user-service.url:http://user-service:8080}")
    private String userServiceUrl;

    /**
     * Check if a user has the platform_admin role.
     *
     * @param userId The user ID to check
     * @param accessToken The JWT access token for authentication
     * @return true if the user is a platform admin
     */
    public boolean isPlatformAdmin(String userId, String accessToken) {
        try {
            String url = userServiceUrl + "/api/v1/users/me/platform-roles";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode roles = root.path("roles");
                
                if (roles.isArray()) {
                    for (JsonNode role : roles) {
                        if ("platform_admin".equals(role.asText())) {
                            return true;
                        }
                    }
                }
            }
            
            return false;
        } catch (Exception e) {
            log.error("Failed to verify platform admin status for user {}: {}", userId, e.getMessage());
            return false;
        }
    }
}