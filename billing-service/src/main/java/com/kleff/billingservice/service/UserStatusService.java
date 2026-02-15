package com.kleff.billingservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class UserStatusService {

    private final RestTemplate restTemplate;
    private final String userServiceUrl;

    public UserStatusService(RestTemplate restTemplate, @Value("${user.service.url:http://user-service:8080}") String userServiceUrl) {
        this.restTemplate = restTemplate;
        this.userServiceUrl = userServiceUrl;
    }

    public boolean isUserActive(String userId) {
        try {
            String url = userServiceUrl + "/api/v1/users/status/" + userId;
            ResponseEntity<UserStatusResponse> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(new HttpHeaders()),
                UserStatusResponse.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody().isActive();
            }
            return false;
        } catch (Exception e) {
            // If user service is unavailable, fail secure by blocking access
            System.err.println("Failed to check user status: " + e.getMessage());
            return false;
        }
    }

    public static class UserStatusResponse {
        private String userId;
        private boolean isDeactivated;
        private boolean active;

        public UserStatusResponse() {}

        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public boolean isDeactivated() {
            return isDeactivated;
        }

        public void setDeactivated(boolean deactivated) {
            isDeactivated = deactivated;
        }

        public boolean isActive() {
            return active;
        }

        public void setActive(boolean active) {
            this.active = active;
        }
    }
}