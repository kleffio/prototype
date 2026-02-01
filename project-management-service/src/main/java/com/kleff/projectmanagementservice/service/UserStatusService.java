package com.kleff.projectmanagementservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class UserStatusService {

    private final RestTemplate restTemplate;
    private final String userServiceUrl;
    
    // Cache to store user status for 5 minutes to reduce API calls
    private final ConcurrentHashMap<String, CacheEntry> statusCache = new ConcurrentHashMap<>(); 
    private static final long CACHE_DURATION_MS = TimeUnit.MINUTES.toMillis(5);
    
    private static class CacheEntry {
        final boolean isActive;
        final long timestamp;
        
        CacheEntry(boolean isActive) {
            this.isActive = isActive;
            this.timestamp = System.currentTimeMillis();
        }
        
        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > CACHE_DURATION_MS;
        }
    }

    public UserStatusService(RestTemplate restTemplate, @Value("${user.service.url:http://user-service:8080}") String userServiceUrl) {
        this.restTemplate = restTemplate;
        this.userServiceUrl = userServiceUrl;
    }

    public boolean isUserActive(String userId) {
        // Check cache first
        CacheEntry cached = statusCache.get(userId);
        if (cached != null && !cached.isExpired()) {
            return cached.isActive;
        }
        try {
            String url = userServiceUrl + "/api/v1/users/status/" + userId;
            ResponseEntity<UserStatusResponse> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(new HttpHeaders()),
                UserStatusResponse.class
            );
            
            boolean isActive = response.getStatusCode() == HttpStatus.OK && 
                             response.getBody() != null && 
                             response.getBody().isActive();
            
            // Cache the result
            statusCache.put(userId, new CacheEntry(isActive));
            
            return isActive;
        } catch (Exception e) {
            // If user service is unavailable, remove from cache and fail secure
            statusCache.remove(userId);
            System.err.println("Failed to check user status: " + e.getMessage());
            return false;
        }
    }
    
    // Method to clear cache entry when user is deactivated
    public void invalidateUserCache(String userId) {
        statusCache.remove(userId);
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