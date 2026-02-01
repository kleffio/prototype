package com.kleff.deployment.data.container;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ContainerResponseModelTest {

    @Test
    @DisplayName("Builder Pattern - Should create ContainerResponseModel correctly")
    void builderPattern_ShouldCreateContainerResponseModelCorrectly() {
        // Arrange
        String containerID = "test-container-id";
        String projectID = "test-project-id";
        String name = "test-container";
        String status = "Running";
        String image = "nginx:latest";
        int port = 8080;
        LocalDateTime createdAt = LocalDateTime.now();
        String repoUrl = "https://github.com/test/repo";
        String branch = "main";
        Map<String, String> envVariables = Map.of("KEY1", "value1", "KEY2", "value2");

        // Act
        ContainerResponseModel model = ContainerResponseModel.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name(name)
                .status(status)
                .image(image)
                .port(port)
                .createdAt(createdAt)
                .repoUrl(repoUrl)
                .branch(branch)
                .envVariables(envVariables)
                .build();

        // Assert
        assertThat(model).isNotNull();
        assertThat(model.getContainerID()).isEqualTo(containerID);
        assertThat(model.getProjectID()).isEqualTo(projectID);
        assertThat(model.getName()).isEqualTo(name);
        assertThat(model.getStatus()).isEqualTo(status);
        assertThat(model.getImage()).isEqualTo(image);
        assertThat(model.getPort()).isEqualTo(port);
        assertThat(model.getCreatedAt()).isEqualTo(createdAt);
        assertThat(model.getRepoUrl()).isEqualTo(repoUrl);
        assertThat(model.getBranch()).isEqualTo(branch);
        assertThat(model.getEnvVariables()).isEqualTo(envVariables);
    }

    @Test
    @DisplayName("NoArgsConstructor - Should create ContainerResponseModel with default values")
    void noArgsConstructor_ShouldCreateContainerResponseModelWithDefaultValues() {
        // Act
        ContainerResponseModel model = new ContainerResponseModel();

        // Assert
        assertThat(model).isNotNull();
        assertThat(model.getContainerID()).isNull();
        assertThat(model.getProjectID()).isNull();
        assertThat(model.getName()).isNull();
        assertThat(model.getStatus()).isNull();
        assertThat(model.getImage()).isNull();
        assertThat(model.getPort()).isEqualTo(0);
        assertThat(model.getCreatedAt()).isNull();
        assertThat(model.getRepoUrl()).isNull();
        assertThat(model.getBranch()).isNull();
        assertThat(model.getEnvVariables()).isNull();
    }

    @Test
    @DisplayName("AllArgsConstructor - Should create ContainerResponseModel with all fields")
    void allArgsConstructor_ShouldCreateContainerResponseModelWithAllFields() {
        // Arrange
        String containerID = "test-container-id";
        String projectID = "test-project-id";
        String name = "test-container";
        String status = "Running";
        String image = "nginx:latest";
        int port = 8080;
        LocalDateTime createdAt = LocalDateTime.now();
        String repoUrl = "https://github.com/test/repo";
        String branch = "main";
        Map<String, String> envVariables = Map.of("KEY1", "value1", "KEY2", "value2");

        // Act
        ContainerResponseModel model = new ContainerResponseModel(
                containerID, projectID, name, status, image, port, createdAt, repoUrl, branch, envVariables);

        // Assert
        assertThat(model).isNotNull();
        assertThat(model.getContainerID()).isEqualTo(containerID);
        assertThat(model.getProjectID()).isEqualTo(projectID);
        assertThat(model.getName()).isEqualTo(name);
        assertThat(model.getStatus()).isEqualTo(status);
        assertThat(model.getImage()).isEqualTo(image);
        assertThat(model.getPort()).isEqualTo(port);
        assertThat(model.getCreatedAt()).isEqualTo(createdAt);
        assertThat(model.getRepoUrl()).isEqualTo(repoUrl);
        assertThat(model.getBranch()).isEqualTo(branch);
        assertThat(model.getEnvVariables()).isEqualTo(envVariables);
    }

    @Test
    @DisplayName("Getters and Setters - Should work correctly")
    void gettersAndSetters_ShouldWorkCorrectly() {
        // Arrange
        ContainerResponseModel model = new ContainerResponseModel();
        String containerID = "test-container-id";
        String projectID = "test-project-id";
        String name = "test-container";
        String status = "Running";
        String image = "nginx:latest";
        int port = 8080;
        LocalDateTime createdAt = LocalDateTime.now();
        String repoUrl = "https://github.com/test/repo";
        String branch = "main";
        Map<String, String> envVariables = Map.of("KEY1", "value1", "KEY2", "value2");

        // Act
        model.setContainerID(containerID);
        model.setProjectID(projectID);
        model.setName(name);
        model.setStatus(status);
        model.setImage(image);
        model.setPort(port);
        model.setCreatedAt(createdAt);
        model.setRepoUrl(repoUrl);
        model.setBranch(branch);
        model.setEnvVariables(envVariables);

        // Assert
        assertThat(model.getContainerID()).isEqualTo(containerID);
        assertThat(model.getProjectID()).isEqualTo(projectID);
        assertThat(model.getName()).isEqualTo(name);
        assertThat(model.getStatus()).isEqualTo(status);
        assertThat(model.getImage()).isEqualTo(image);
        assertThat(model.getPort()).isEqualTo(port);
        assertThat(model.getCreatedAt()).isEqualTo(createdAt);
        assertThat(model.getRepoUrl()).isEqualTo(repoUrl);
        assertThat(model.getBranch()).isEqualTo(branch);
        assertThat(model.getEnvVariables()).isEqualTo(envVariables);
    }

    @Test
    @DisplayName("Equals and HashCode - Should work correctly")
    void equalsAndHashCode_ShouldWorkCorrectly() {
        // Arrange
        String containerID = "test-container-id";
        String projectID = "test-project-id";
        String name = "test-container";
        String status = "Running";
        String image = "nginx:latest";
        int port = 8080;
        LocalDateTime createdAt = LocalDateTime.now();
        String repoUrl = "https://github.com/test/repo";
        String branch = "main";
        Map<String, String> envVariables = Map.of("KEY1", "value1", "KEY2", "value2");

        ContainerResponseModel model1 = ContainerResponseModel.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name(name)
                .status(status)
                .image(image)
                .port(port)
                .createdAt(createdAt)
                .repoUrl(repoUrl)
                .branch(branch)
                .envVariables(envVariables)
                .build();

        ContainerResponseModel model2 = ContainerResponseModel.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name(name)
                .status(status)
                .image(image)
                .port(port)
                .createdAt(createdAt)
                .repoUrl(repoUrl)
                .branch(branch)
                .envVariables(envVariables)
                .build();

        ContainerResponseModel model3 = ContainerResponseModel.builder()
                .containerID("different-id")
                .projectID(projectID)
                .name(name)
                .status(status)
                .image(image)
                .port(port)
                .createdAt(createdAt)
                .repoUrl(repoUrl)
                .branch(branch)
                .envVariables(envVariables)
                .build();

        // Assert
        assertThat(model1).isEqualTo(model2);
        assertThat(model1).isNotEqualTo(model3);
        assertThat(model1.hashCode()).isEqualTo(model2.hashCode());
    }

    @Test
    @DisplayName("ToString - Should include all fields")
    void toString_ShouldIncludeAllFields() {
        // Arrange
        String containerID = "test-container-id";
        String projectID = "test-project-id";
        String name = "test-container";
        String status = "Running";
        String image = "nginx:latest";
        int port = 8080;
        LocalDateTime createdAt = LocalDateTime.now();
        String repoUrl = "https://github.com/test/repo";
        String branch = "main";
        Map<String, String> envVariables = Map.of("KEY1", "value1", "KEY2", "value2");

        ContainerResponseModel model = ContainerResponseModel.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name(name)
                .status(status)
                .image(image)
                .port(port)
                .createdAt(createdAt)
                .repoUrl(repoUrl)
                .branch(branch)
                .envVariables(envVariables)
                .build();

        // Act
        String toString = model.toString();

        // Assert
        assertThat(toString).contains("ContainerResponseModel");
        assertThat(toString).contains("containerID=" + containerID);
        assertThat(toString).contains("projectID=" + projectID);
        assertThat(toString).contains("name=" + name);
        assertThat(toString).contains("status=" + status);
        assertThat(toString).contains("image=" + image);
        assertThat(toString).contains("port=" + port);
        assertThat(toString).contains("createdAt=" + createdAt);
        assertThat(toString).contains("repoUrl=" + repoUrl);
        assertThat(toString).contains("branch=" + branch);
        assertThat(toString).contains("envVariables=" + envVariables);
    }

    @Test
    @DisplayName("Null Values - Should handle null values correctly")
    void nullValues_ShouldHandleNullValuesCorrectly() {
        // Act
        ContainerResponseModel model = ContainerResponseModel.builder()
                .containerID(null)
                .projectID(null)
                .name(null)
                .status(null)
                .image(null)
                .port(0)
                .createdAt(null)
                .repoUrl(null)
                .branch(null)
                .envVariables(null)
                .build();

        // Assert
        assertThat(model.getContainerID()).isNull();
        assertThat(model.getProjectID()).isNull();
        assertThat(model.getName()).isNull();
        assertThat(model.getStatus()).isNull();
        assertThat(model.getImage()).isNull();
        assertThat(model.getPort()).isEqualTo(0);
        assertThat(model.getCreatedAt()).isNull();
        assertThat(model.getRepoUrl()).isNull();
        assertThat(model.getBranch()).isNull();
        assertThat(model.getEnvVariables()).isNull();
    }

    @Test
    @DisplayName("Empty Map - Should handle empty envVariables map")
    void emptyMap_ShouldHandleEmptyEnvVariablesMap() {
        // Act
        ContainerResponseModel model = ContainerResponseModel.builder()
                .envVariables(Map.of())
                .build();

        // Assert
        assertThat(model.getEnvVariables()).isNotNull();
        assertThat(model.getEnvVariables()).isEmpty();
    }
}