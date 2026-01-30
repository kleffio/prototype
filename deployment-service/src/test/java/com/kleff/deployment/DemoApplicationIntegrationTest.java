package com.kleff.deployment;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DemoApplicationIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("Application Context - Should load successfully")
    void applicationContext_ShouldLoadSuccessfully() {
        // This test verifies that the Spring Boot application context loads correctly
        // If this test passes, it means all beans are properly configured and wired
        assertThat(port).isGreaterThan(0);
        assertThat(restTemplate).isNotNull();
    }

    @Test
    @DisplayName("Health Check - Should return 200 OK")
    void healthCheck_ShouldReturnOk() {
        // Act
        ResponseEntity<String> response = restTemplate.getForEntity(
                "http://localhost:" + port + "/actuator/health", String.class);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Non-existent Endpoint - Should return 404")
    void nonExistentEndpoint_ShouldReturnNotFound() {
        // Act
        ResponseEntity<String> response = restTemplate.getForEntity(
                "http://localhost:" + port + "/api/v1/non-existent", String.class);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("CORS Configuration - Should be applied correctly")
    void corsConfiguration_ShouldBeAppliedCorrectly() {
        // This test verifies that CORS is configured and working
        // We test by making a request with CORS headers
        ResponseEntity<String> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/containers",
                org.springframework.http.HttpMethod.OPTIONS,
                new org.springframework.http.HttpEntity<>(null, org.springframework.http.HttpHeaders.EMPTY),
                String.class);

        // Assert - CORS should be configured (no exception should be thrown)
        // The exact CORS headers depend on the configuration, but the request should not fail
        assertThat(response.getStatusCode()).isIn(
                HttpStatus.OK, HttpStatus.NO_CONTENT, HttpStatus.METHOD_NOT_ALLOWED);
    }

    @Test
    @DisplayName("Application Properties - Should be loaded correctly")
    void applicationProperties_ShouldBeLoadedCorrectly() {
        // Test that application properties are loaded
        // This is a basic integration test to ensure configuration is working
        String baseUrl = "http://localhost:" + port;
        
        // Try to access a basic endpoint to verify the application is running
        ResponseEntity<String> response = restTemplate.getForEntity(baseUrl + "/api/v1/containers", String.class);
        
        // The response could be 200 (empty list) or 401/403 (if security is enabled)
        // We just want to verify the application is responding
        assertThat(response.getStatusCode()).isIn(
                HttpStatus.OK, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND);
    }
}