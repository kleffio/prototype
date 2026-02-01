package com.kleff.deployment.data.container;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class UpdateEnvVariablesRequestTest {

    @Test
    @DisplayName("Builder Pattern - Should create UpdateEnvVariablesRequest correctly")
    void builderPattern_ShouldCreateUpdateEnvVariablesRequestCorrectly() {
        // Arrange
        Map<String, String> envVariables = Map.of("DB_HOST", "localhost", "DB_PORT", "5432", "DB_NAME", "mydb");

        // Act
        UpdateEnvVariablesRequest request = UpdateEnvVariablesRequest.builder()
                .envVariables(envVariables)
                .build();

        // Assert
        assertThat(request).isNotNull();
        assertThat(request.getEnvVariables()).isEqualTo(envVariables);
    }

    @Test
    @DisplayName("NoArgsConstructor - Should create UpdateEnvVariablesRequest with default values")
    void noArgsConstructor_ShouldCreateUpdateEnvVariablesRequestWithDefaultValues() {
        // Act
        UpdateEnvVariablesRequest request = new UpdateEnvVariablesRequest();

        // Assert
        assertThat(request).isNotNull();
        assertThat(request.getEnvVariables()).isNull();
    }

    @Test
    @DisplayName("AllArgsConstructor - Should create UpdateEnvVariablesRequest with all fields")
    void allArgsConstructor_ShouldCreateUpdateEnvVariablesRequestWithAllFields() {
        // Arrange
        Map<String, String> envVariables = Map.of("DB_HOST", "localhost", "DB_PORT", "5432", "DB_NAME", "mydb");

        // Act
        UpdateEnvVariablesRequest request = new UpdateEnvVariablesRequest(envVariables);

        // Assert
        assertThat(request).isNotNull();
        assertThat(request.getEnvVariables()).isEqualTo(envVariables);
    }

    @Test
    @DisplayName("Getters and Setters - Should work correctly")
    void gettersAndSetters_ShouldWorkCorrectly() {
        // Arrange
        UpdateEnvVariablesRequest request = new UpdateEnvVariablesRequest();
        Map<String, String> envVariables = Map.of("KEY1", "value1", "KEY2", "value2");

        // Act
        request.setEnvVariables(envVariables);

        // Assert
        assertThat(request.getEnvVariables()).isEqualTo(envVariables);
    }

    @Test
    @DisplayName("Equals and HashCode - Should work correctly")
    void equalsAndHashCode_ShouldWorkCorrectly() {
        // Arrange
        Map<String, String> envVariables1 = Map.of("KEY1", "value1", "KEY2", "value2");
        Map<String, String> envVariables2 = Map.of("KEY1", "value1", "KEY2", "value2");
        Map<String, String> envVariables3 = Map.of("KEY1", "value1", "KEY3", "value3");

        UpdateEnvVariablesRequest request1 = UpdateEnvVariablesRequest.builder()
                .envVariables(envVariables1)
                .build();

        UpdateEnvVariablesRequest request2 = UpdateEnvVariablesRequest.builder()
                .envVariables(envVariables2)
                .build();

        UpdateEnvVariablesRequest request3 = UpdateEnvVariablesRequest.builder()
                .envVariables(envVariables3)
                .build();

        // Assert
        assertThat(request1).isEqualTo(request2);
        assertThat(request1).isNotEqualTo(request3);
        assertThat(request1.hashCode()).isEqualTo(request2.hashCode());
    }

    @Test
    @DisplayName("ToString - Should include all fields")
    void toString_ShouldIncludeAllFields() {
        // Arrange
        Map<String, String> envVariables = Map.of("DB_HOST", "localhost", "DB_PORT", "5432");
        UpdateEnvVariablesRequest request = UpdateEnvVariablesRequest.builder()
                .envVariables(envVariables)
                .build();

        // Act
        String toString = request.toString();

        // Assert
        assertThat(toString).contains("UpdateEnvVariablesRequest");
        assertThat(toString).contains("envVariables=" + envVariables);
    }

    @Test
    @DisplayName("Null Values - Should handle null envVariables correctly")
    void nullValues_ShouldHandleNullEnvVariablesCorrectly() {
        // Act
        UpdateEnvVariablesRequest request = UpdateEnvVariablesRequest.builder()
                .envVariables(null)
                .build();

        // Assert
        assertThat(request.getEnvVariables()).isNull();
    }

    @Test
    @DisplayName("Empty Map - Should handle empty envVariables map")
    void emptyMap_ShouldHandleEmptyEnvVariablesMap() {
        // Act
        UpdateEnvVariablesRequest request = UpdateEnvVariablesRequest.builder()
                .envVariables(Map.of())
                .build();

        // Assert
        assertThat(request.getEnvVariables()).isNotNull();
        assertThat(request.getEnvVariables()).isEmpty();
    }

    @Test
    @DisplayName("Single Entry Map - Should handle single entry correctly")
    void singleEntryMap_ShouldHandleSingleEntryCorrectly() {
        // Arrange
        Map<String, String> singleEntry = Map.of("SINGLE_KEY", "SINGLE_VALUE");

        // Act
        UpdateEnvVariablesRequest request = UpdateEnvVariablesRequest.builder()
                .envVariables(singleEntry)
                .build();

        // Assert
        assertThat(request.getEnvVariables()).hasSize(1);
        assertThat(request.getEnvVariables()).containsEntry("SINGLE_KEY", "SINGLE_VALUE");
    }

    @Test
    @DisplayName("Large Map - Should handle large number of entries")
    void largeMap_ShouldHandleLargeNumberOfEntries() {
        // Arrange
        Map<String, String> largeMap = Map.of(
                "KEY1", "VALUE1",
                "KEY2", "VALUE2",
                "KEY3", "VALUE3",
                "KEY4", "VALUE4",
                "KEY5", "VALUE5"
        );

        // Act
        UpdateEnvVariablesRequest request = UpdateEnvVariablesRequest.builder()
                .envVariables(largeMap)
                .build();

        // Assert
        assertThat(request.getEnvVariables()).hasSize(5);
        assertThat(request.getEnvVariables()).containsEntry("KEY1", "VALUE1");
        assertThat(request.getEnvVariables()).containsEntry("KEY5", "VALUE5");
    }
}