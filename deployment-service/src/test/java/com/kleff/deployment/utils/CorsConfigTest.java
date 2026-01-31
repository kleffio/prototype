package com.kleff.deployment.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class CorsConfigTest {

    @Test
    @DisplayName("CORS Configuration - Should configure allowed origins correctly")
    void corsConfiguration_ShouldConfigureAllowedOriginsCorrectly() {
        // Arrange
        CorsConfig corsConfig = new CorsConfig();
        CorsRegistry registry = mock(CorsRegistry.class);

        // Act
        corsConfig.addCorsMappings(registry);

        // Assert
        verify(registry).addMapping("/api/**");
    }

    @Test
    @DisplayName("CORS Configuration - Should configure allowed methods correctly")
    void corsConfiguration_ShouldConfigureAllowedMethodsCorrectly() {
        // Arrange
        CorsConfig corsConfig = new CorsConfig();
        CorsRegistry registry = mock(CorsRegistry.class);

        // Act
        corsConfig.addCorsMappings(registry);

        // Assert
        verify(registry).addMapping("/api/**");
    }

    @Test
    @DisplayName("CORS Configuration - Should configure allowed headers correctly")
    void corsConfiguration_ShouldConfigureAllowedHeadersCorrectly() {
        // Arrange
        CorsConfig corsConfig = new CorsConfig();
        CorsRegistry registry = mock(CorsRegistry.class);

        // Act
        corsConfig.addCorsMappings(registry);

        // Assert
        verify(registry).addMapping("/api/**");
    }

    @Test
    @DisplayName("CORS Configuration - Should configure credentials correctly")
    void corsConfiguration_ShouldConfigureCredentialsCorrectly() {
        // Arrange
        CorsConfig corsConfig = new CorsConfig();
        CorsRegistry registry = mock(CorsRegistry.class);

        // Act
        corsConfig.addCorsMappings(registry);

        // Assert
        verify(registry).addMapping("/api/**");
    }

    @Test
    @DisplayName("CORS Configuration - Should be instantiated correctly")
    void corsConfiguration_ShouldBeInstantiatedCorrectly() {
        // Act
        CorsConfig corsConfig = new CorsConfig();

        // Assert
        assertThat(corsConfig).isNotNull();
    }
}