package com.kleff.deployment.business;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kleff.deployment.data.container.Container;
import com.kleff.deployment.data.container.ContainerMapper;
import com.kleff.deployment.data.container.ContainerRepository;
import com.kleff.deployment.data.container.ContainerRequestModel;
import com.kleff.deployment.data.container.ContainerResponseModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(MockitoExtension.class)
class ContainerServiceImplTest {

    // 1. Standard Mocks for Data Access and Mapping
    @Mock
    private ContainerRepository containerRepository;

    @Mock
    private ContainerMapper containerMapper;

    // 2. We mock the Builder, but we need a REAL RestTemplate to bind the Server to
    @Mock
    private RestTemplateBuilder restTemplateBuilder;

    private ContainerServiceImpl containerService;
    private MockRestServiceServer mockServer;
    private ObjectMapper objectMapper; // Helper for JSON matching

    @BeforeEach
    void setUp() {
        // "Web Services" Course Methodology:
        // Create a real RestTemplate so we can bind MockRestServiceServer to it.
        RestTemplate restTemplate = new RestTemplate();

        // Configure the mock builder to return our real template
        when(restTemplateBuilder.build()).thenReturn(restTemplate);

        // Bind the server to the template
        mockServer = MockRestServiceServer.createServer(restTemplate);

        // Manual constructor injection to ensure our Setup is used
        containerService = new ContainerServiceImpl(containerRepository, containerMapper, restTemplateBuilder);

        objectMapper = new ObjectMapper();
    }

    // --- Happy Path Tests ---

    @Test
    @DisplayName("getAllContainers: Should return list of response models")
    void whenGetAllContainers_thenReturnList() {
        // Arrange
        Container container = Container.builder().containerID("uuid-1").name("test-app").build();
        ContainerResponseModel response = ContainerResponseModel.builder().containerID("uuid-1").name("test-app").build();

        when(containerRepository.findAll()).thenReturn(List.of(container));
        when(containerMapper.containerToContainerResponseModel(anyList())).thenReturn(List.of(response));

        // Act
        List<ContainerResponseModel> result = containerService.getAllContainers();

        // Assert
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getContainerID()).isEqualTo("uuid-1");
        verify(containerRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("getContainerByContainerId: Should return container when found")
    void whenGetContainerFound_thenReturnContainer() {
        // Arrange
        String id = "uuid-1";
        Container container = Container.builder().containerID(id).build();
        when(containerRepository.findContainerByContainerID(id)).thenReturn(container);

        // Act
        Container result = containerService.getContainerByContainerId(id);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContainerID()).isEqualTo(id);
    }

    @Test
    @DisplayName("createContainer: Should save entity and trigger build with correct JSON")
    void whenCreateContainer_thenSaveAndTriggerBuild() throws JsonProcessingException {
        // Arrange
        ContainerRequestModel request = ContainerRequestModel.builder()
                .name("microservice-a")
                .projectID("p-1")
                .repoUrl("https://github.com/kleff/repo")
                .branch("develop")
                .port(8080)
                .build();

        Container mappedContainer = new Container();
        Container savedContainer = new Container();
        savedContainer.setContainerID("generated-id");
        savedContainer.setName("microservice-a");

        ContainerResponseModel expectedResponse = new ContainerResponseModel();
        expectedResponse.setContainerID("generated-id");

        when(containerMapper.containerRequestModelToContainer(request)).thenReturn(mappedContainer);
        when(containerRepository.save(any(Container.class))).thenReturn(savedContainer);
        when(containerMapper.containerToContainerResponseModel(savedContainer)).thenReturn(expectedResponse);

        // FIX 1: URL must match Service logic (build/create)
        // FIX 2: Fields must match GoBuildRequest class (camelCase)
        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/build/create"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.repoUrl").value("https://github.com/kleff/repo"))
                .andExpect(jsonPath("$.containerID").value("generated-id"))
                .andRespond(withSuccess("Build Started", MediaType.TEXT_PLAIN));

        // Act
        ContainerResponseModel actualResponse = containerService.createContainer(request);

        // Assert
        mockServer.verify();
        assertThat(actualResponse.getContainerID()).isEqualTo("generated-id");
    }


    // --- Edge Cases / Exception Handling ---

    @Test
    @DisplayName("getContainerByContainerId: Should return null on exception/not found")
    void whenGetContainerException_thenReturnNull() {
        // Arrange
        when(containerRepository.findContainerByContainerID(anyString())).thenThrow(new RuntimeException("DB Error"));

        // Act
        Container result = containerService.getContainerByContainerId("invalid-id");

        // Assert
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("createContainer: Should still return created container if External Build API fails")
    void whenExternalBuildFails_thenStillReturnSavedContainer() {
        // The service consumes the exception from the RestTemplate.
        // We need to ensure the DB transaction isn't rolled back and the user still gets a response.

        // Arrange
        ContainerRequestModel request = ContainerRequestModel.builder().name("app").build();
        Container mapped = Container.builder().name("app").build();
        Container saved = Container.builder().containerID("123").name("app").build();
        ContainerResponseModel response = ContainerResponseModel.builder().containerID("123").build();

        when(containerMapper.containerRequestModelToContainer(request)).thenReturn(mapped);
        when(containerRepository.save(any(Container.class))).thenReturn(saved);
        when(containerMapper.containerToContainerResponseModel(saved)).thenReturn(response);

        // EXPECTATION: External API Fails with 500
        mockServer.expect(ExpectedCount.once(), requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/build/create"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        // Act
        ContainerResponseModel result = containerService.createContainer(request);

        // Assert
        mockServer.verify();
        verify(containerRepository).save(any(Container.class)); // DB save still happened
        assertThat(result).isNotNull(); // User still got a response
    }


    @Test
    @DisplayName("updateContainerEnvVariables: Should update DB and trigger PATCH request to WebApp service")
    void whenUpdateEnvVariables_thenSaveAndTriggerPatch() throws JsonProcessingException {
        // Arrange
        String containerID = "cont-123";
        Map<String, String> newEnv = new HashMap<>();
        newEnv.put("DB_URL", "jdbc:mysql://localhost");
        newEnv.put("PORT", "3000");
        String jsonEnv = "{\"DB_URL\":\"...\"}";

        Container existingContainer = Container.builder()
                .containerID(containerID)
                .projectID("proj-456")
                .name("my-web-app")
                .build();

        ContainerResponseModel responseModel = ContainerResponseModel.builder()
                .containerID(containerID)
                .build();

        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(existingContainer);
        when(containerMapper.mapToJson(newEnv)).thenReturn(jsonEnv);
        when(containerRepository.save(any(Container.class))).thenReturn(existingContainer);
        when(containerMapper.containerToContainerResponseModel(existingContainer)).thenReturn(responseModel);

        // Mock the PATCH request inside triggerWebAppUpdate
        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/update"))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(jsonPath("$.projectID").value("proj-456"))
                .andExpect(jsonPath("$.name").value("my-web-app"))
                .andExpect(jsonPath("$.envVariables.DB_URL").value("jdbc:mysql://localhost"))
                .andRespond(withSuccess("Updated", MediaType.APPLICATION_JSON));

        // Act
        ContainerResponseModel result = containerService.updateContainerEnvVariables(containerID, newEnv);

        // Assert
        assertThat(result).isNotNull();
        verify(containerRepository, times(1)).save(existingContainer);
        mockServer.verify(); // Ensures PATCH request was sent
    }


    @Test
    @DisplayName("updateContainerEnvVariables: Should still return response even if PATCH request fails")
    void whenWebAppUpdateFails_thenStillReturnResponse() {
        // Arrange
        String id = "cont-123";
        Map<String, String> env = Map.of("K", "V");
        Container container = Container.builder().containerID(id).projectID("p1").name("n1").build();
        ContainerResponseModel response = ContainerResponseModel.builder().containerID(id).build();

        when(containerRepository.findContainerByContainerID(id)).thenReturn(container);
        when(containerRepository.save(any())).thenReturn(container);
        when(containerMapper.containerToContainerResponseModel(container)).thenReturn(response);

        // Mock RestTemplate failure (500 Internal Server Error)
        mockServer.expect(ExpectedCount.once(), requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/update"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        // Act
        ContainerResponseModel result = containerService.updateContainerEnvVariables(id, env);

        // Assert
        assertThat(result).isNotNull();
        mockServer.verify();
        // Logic check: The catch block in triggerWebAppUpdate prevents the whole method from failing
        verify(containerRepository).save(any());
    }

    @Test
    @DisplayName("getContainersByProjectID: Should return list of containers")
    void whenGetByProjectId_thenReturnList() {
        // Arrange
        String projectId = "proj-1";
        List<Container> containers = List.of(new Container(), new Container());
        when(containerRepository.findContainersByProjectID(projectId)).thenReturn(containers);

        // Act
        List<Container> result = containerService.getContainersByProjectID(projectId);

        // Assert
        assertThat(result).hasSize(2);
        verify(containerRepository).findContainersByProjectID(projectId);
    }

    @Test
    @DisplayName("toResponseModel: Should delegate to mapper")
    void whenToResponseModel_thenDelegateToMapper() {
        // Arrange
        Container container = Container.builder().containerID("test-id").build();
        ContainerResponseModel expectedResponse = ContainerResponseModel.builder().containerID("test-id").build();
        when(containerMapper.containerToContainerResponseModel(container)).thenReturn(expectedResponse);

        // Act
        ContainerResponseModel result = containerService.toResponseModel(container);

        // Assert
        assertThat(result).isEqualTo(expectedResponse);
        verify(containerMapper).containerToContainerResponseModel(container);
    }


    @Test
    @DisplayName("updateContainer: Should update DB and trigger build")
    void whenUpdateContainer_thenSaveAndTriggerBuild() throws JsonProcessingException {
        // Arrange
        String id = "uuid-123";
        ContainerRequestModel request = ContainerRequestModel.builder()
                .name("updated-name")
                .repoUrl("https://github.com/new-repo")
                .port(9000)
                .build();

        Container existing = Container.builder().containerID(id).name("old-name").build();
        Container saved = Container.builder().containerID(id).name("updated-name").build();
        ContainerResponseModel response = ContainerResponseModel.builder().containerID(id).name("updated-name").build();

        when(containerRepository.findContainerByContainerID(id)).thenReturn(existing);
        when(containerRepository.save(any(Container.class))).thenReturn(saved);
        when(containerMapper.containerToContainerResponseModel(saved)).thenReturn(response);

        // Expectation for the external build API
        mockServer.expect(ExpectedCount.once(), requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/build/create"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.name").value("updated-name"))
                .andExpect(jsonPath("$.containerID").value(id))
                .andRespond(withSuccess("Updated", MediaType.APPLICATION_JSON));

        // Act
        ContainerResponseModel result = containerService.updateContainer(id, request);

        // Assert
        assertThat(result.getName()).isEqualTo("updated-name");
        mockServer.verify();
        verify(containerRepository).save(any(Container.class));
    }

    @Test
    @DisplayName("updateContainer: Should update envVariables when provided")
    void whenUpdateContainerWithEnvVariables_thenUpdateAndTriggerBuild() throws JsonProcessingException {
        // Arrange
        String id = "uuid-123";
        Map<String, String> envVars = Map.of("KEY", "VALUE");
        String jsonEnv = "{\"KEY\":\"VALUE\"}";

        ContainerRequestModel request = ContainerRequestModel.builder()
                .name("updated-name")
                .repoUrl("https://github.com/new-repo")
                .port(9000)
                .envVariables(envVars)
                .build();

        Container existing = Container.builder().containerID(id).name("old-name").build();
        Container saved = Container.builder().containerID(id).name("updated-name").build();
        ContainerResponseModel response = ContainerResponseModel.builder().containerID(id).name("updated-name").build();

        when(containerRepository.findContainerByContainerID(id)).thenReturn(existing);
        when(containerMapper.mapToJson(envVars)).thenReturn(jsonEnv);
        when(containerRepository.save(any(Container.class))).thenReturn(saved);
        when(containerMapper.containerToContainerResponseModel(saved)).thenReturn(response);

        // Expectation for the external build API
        mockServer.expect(ExpectedCount.once(), requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/build/create"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.name").value("updated-name"))
                .andExpect(jsonPath("$.containerID").value(id))
                .andExpect(jsonPath("$.envVariables.KEY").value("VALUE"))
                .andRespond(withSuccess("Updated", MediaType.APPLICATION_JSON));

        // Act
        ContainerResponseModel result = containerService.updateContainer(id, request);

        // Assert
        assertThat(result.getName()).isEqualTo("updated-name");
        mockServer.verify();
        verify(containerRepository).save(any(Container.class));
        verify(containerMapper).mapToJson(envVars);
    }

    @Test
    @DisplayName("updateContainer: Should throw exception if container not found")
    void whenUpdateContainerNotFound_thenThrowException() {
        // Arrange
        when(containerRepository.findContainerByContainerID("none")).thenReturn(null);
        ContainerRequestModel request = ContainerRequestModel.builder().build();

        // Act & Assert
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            containerService.updateContainer("none", request);
        });

        verify(containerRepository, never()).save(any());
    }

    @Test
    @DisplayName("deleteContainer: Should handle database constraint violations")
    void whenDeleteContainerWithConstraintViolation_thenThrowException() {
        // Arrange
        String containerID = "c-123";
        Container container = Container.builder().containerID(containerID).projectID("p1").name("n1").build();
        
        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(container);
        doThrow(new RuntimeException("Foreign key constraint violation"))
                .when(containerRepository).delete(container);

        // Act & Assert
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            containerService.deleteContainer(containerID);
        });

        verify(containerRepository).findContainerByContainerID(containerID);
        verify(containerRepository).delete(container);
    }

    @Test
    @DisplayName("createContainer: Should handle database save failure")
    void whenCreateContainerDatabaseSaveFails_thenThrowException() {
        // Arrange
        ContainerRequestModel request = ContainerRequestModel.builder()
                .name("test-app")
                .projectID("p1")
                .build();

        Container mappedContainer = Container.builder().name("test-app").build();
        
        when(containerMapper.containerRequestModelToContainer(request)).thenReturn(mappedContainer);
        when(containerRepository.save(any(Container.class)))
                .thenThrow(new RuntimeException("Database save failed"));

        // Act & Assert
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            containerService.createContainer(request);
        });

        verify(containerRepository).save(any(Container.class));
        verify(containerMapper, never()).containerToContainerResponseModel(any(Container.class));
    }

    @Test
    @DisplayName("getContainerByContainerId: Should handle unexpected repository exceptions")
    void whenGetContainerByContainerIdUnexpectedException_thenReturnNull() {
        // Arrange
        String containerID = "c-123";
        when(containerRepository.findContainerByContainerID(containerID))
                .thenThrow(new RuntimeException("Unexpected database error"));

        // Act
        Container result = containerService.getContainerByContainerId(containerID);

        // Assert
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("updateContainerEnvVariables: Should handle database save failure")
    void whenUpdateContainerEnvVariablesDatabaseSaveFails_thenThrowException() {
        // Arrange
        String containerID = "c-123";
        Map<String, String> envVariables = Map.of("KEY", "VALUE");
        String jsonEnv = "{\"KEY\":\"VALUE\"}";
        
        Container existingContainer = Container.builder().containerID(containerID).projectID("p1").name("n1").build();
        
        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(existingContainer);
        when(containerMapper.mapToJson(envVariables)).thenReturn(jsonEnv);
        when(containerRepository.save(any(Container.class)))
                .thenThrow(new RuntimeException("Database save failed"));

        // Act & Assert
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            containerService.updateContainerEnvVariables(containerID, envVariables);
        });

        verify(containerRepository).findContainerByContainerID(containerID);
        verify(containerRepository).save(any(Container.class));
    }

    @Test
    @DisplayName("createContainer: Should handle null envVariables in request")
    void whenCreateContainerWithNullEnvVariables_thenHandleCorrectly() {
        // Arrange
        ContainerRequestModel request = ContainerRequestModel.builder()
                .name("test-app")
                .projectID("p1")
                .envVariables(null)
                .build();

        Container mappedContainer = Container.builder().name("test-app").build();
        Container savedContainer = Container.builder().containerID("generated-id").name("test-app").build();
        ContainerResponseModel response = ContainerResponseModel.builder().containerID("generated-id").build();

        when(containerMapper.containerRequestModelToContainer(request)).thenReturn(mappedContainer);
        when(containerRepository.save(any(Container.class))).thenReturn(savedContainer);
        when(containerMapper.containerToContainerResponseModel(savedContainer)).thenReturn(response);

        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/build/create"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.envVariables").doesNotExist())
                .andRespond(withSuccess("Build Started", MediaType.TEXT_PLAIN));

        // Act
        ContainerResponseModel result = containerService.createContainer(request);

        // Assert
        assertThat(result).isNotNull();
        mockServer.verify();
    }

    @Test
    @DisplayName("updateContainer: Should handle empty envVariables map")
    void whenUpdateContainerWithEmptyEnvVariables_thenHandleCorrectly() {
        // Arrange
        String containerID = "c-123";
        ContainerRequestModel request = ContainerRequestModel.builder()
                .name("test-app")
                .projectID("p1")
                .envVariables(Map.of())
                .build();

        Container existingContainer = Container.builder().containerID(containerID).name("old-name").build();
        Container savedContainer = Container.builder().containerID(containerID).name("test-app").build();
        ContainerResponseModel response = ContainerResponseModel.builder().containerID(containerID).name("test-app").build();

        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(existingContainer);
        when(containerRepository.save(any(Container.class))).thenReturn(savedContainer);
        when(containerMapper.containerToContainerResponseModel(savedContainer)).thenReturn(response);

        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/build/create"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.envVariables").doesNotExist())
                .andRespond(withSuccess("Updated", MediaType.APPLICATION_JSON));

        // Act
        ContainerResponseModel result = containerService.updateContainer(containerID, request);

        // Assert
        assertThat(result.getName()).isEqualTo("test-app");
        mockServer.verify();
    }

    @Test
    @DisplayName("updateContainerEnvVariables: Should handle empty envVariables map")
    void whenUpdateContainerEnvVariablesWithEmptyMap_thenHandleCorrectly() {
        // Arrange
        String containerID = "c-123";
        Map<String, String> envVariables = Map.of();
        String jsonEnv = "{}";

        Container existingContainer = Container.builder()
                .containerID(containerID)
                .projectID("proj-456")
                .name("my-web-app")
                .build();

        ContainerResponseModel responseModel = ContainerResponseModel.builder()
                .containerID(containerID)
                .build();

        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(existingContainer);
        when(containerMapper.mapToJson(envVariables)).thenReturn(jsonEnv);
        when(containerRepository.save(any(Container.class))).thenReturn(existingContainer);
        when(containerMapper.containerToContainerResponseModel(existingContainer)).thenReturn(responseModel);

        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/update"))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(jsonPath("$.envVariables").doesNotExist())
                .andRespond(withSuccess("Updated", MediaType.APPLICATION_JSON));

        // Act
        ContainerResponseModel result = containerService.updateContainerEnvVariables(containerID, envVariables);

        // Assert
        assertThat(result).isNotNull();
        mockServer.verify();
        verify(containerRepository, times(1)).save(existingContainer);
    }

    @Test
    @DisplayName("createContainer: Should handle branch null or empty")
    void whenCreateContainerWithNullOrEmptyBranch_thenUseDefaultBranch() {
        // Arrange
        ContainerRequestModel requestWithNullBranch = ContainerRequestModel.builder()
                .name("test-app")
                .projectID("p1")
                .branch(null)
                .build();

        ContainerRequestModel requestWithEmptyBranch = ContainerRequestModel.builder()
                .name("test-app")
                .projectID("p1")
                .branch("")
                .build();

        Container mappedContainer = Container.builder().name("test-app").build();
        Container savedContainer = Container.builder().containerID("generated-id").name("test-app").build();
        ContainerResponseModel response = ContainerResponseModel.builder().containerID("generated-id").build();

        when(containerMapper.containerRequestModelToContainer(any())).thenReturn(mappedContainer);
        when(containerRepository.save(any(Container.class))).thenReturn(savedContainer);
        when(containerMapper.containerToContainerResponseModel(savedContainer)).thenReturn(response);

        // Test with null branch
        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/build/create"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.branch").value("main"))
                .andRespond(withSuccess("Build Started", MediaType.TEXT_PLAIN));

        // Act
        containerService.createContainer(requestWithNullBranch);

        // Assert
        mockServer.verify();

        // Reset for second test
        mockServer.reset();
        
        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/build/create"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.branch").value("main"))
                .andRespond(withSuccess("Build Started", MediaType.TEXT_PLAIN));

        // Act
        containerService.createContainer(requestWithEmptyBranch);

        // Assert
        mockServer.verify();
    }

    @Test
    @DisplayName("deleteContainer: Should handle external service failure gracefully")
    void whenDeleteContainerExternalServiceFails_thenStillDeleteFromDatabase() {
        // Arrange
        String containerID = "c-123";
        String projectID = "p1";
        Container container = Container.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name("test-app")
                .build();

        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(container);
        doThrow(new RuntimeException("Kubernetes API unavailable"))
                .when(containerRepository).delete(container);

        // Act & Assert
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            containerService.deleteContainer(containerID);
        });

        // Verify database delete was attempted
        verify(containerRepository).delete(container);
    }

    @Test
    @DisplayName("deleteContainer: Should successfully delete container and trigger web app deletion")
    void whenDeleteContainerSuccess_thenDeleteFromDatabaseAndTriggerWebAppDeletion() {
        // Arrange
        String containerID = "c-123";
        String projectID = "p1";
        Container container = Container.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name("test-app")
                .build();

        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(container);

        // Mock the DELETE request to web app service
        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/p1/c-123"))
                .andExpect(method(HttpMethod.DELETE))
                .andRespond(withSuccess("WebApp deleted", MediaType.TEXT_PLAIN));

        // Act
        containerService.deleteContainer(containerID);

        // Assert
        mockServer.verify();
        verify(containerRepository).findContainerByContainerID(containerID);
        verify(containerRepository).delete(container);
    }

    @Test
    @DisplayName("deleteContainer: Should throw exception when container not found")
    void whenDeleteContainerNotFound_thenThrowException() {
        // Arrange
        String containerID = "non-existent-id";
        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(null);

        // Act & Assert
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            containerService.deleteContainer(containerID);
        });

        verify(containerRepository).findContainerByContainerID(containerID);
        verify(containerRepository, never()).delete(any(Container.class));
    }

    @Test
    @DisplayName("deleteContainer: Should handle database deletion success but external service failure")
    void whenDeleteContainerDatabaseSuccessButExternalFails_thenThrowException() {
        // Arrange
        String containerID = "c-123";
        String projectID = "p1";
        Container container = Container.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name("test-app")
                .build();

        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(container);

        // Mock the DELETE request to fail
        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/p1/c-123"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        // Act & Assert
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            containerService.deleteContainer(containerID);
        });

        mockServer.verify();
        verify(containerRepository).findContainerByContainerID(containerID);
        verify(containerRepository).delete(container);
    }

    @Test
    @DisplayName("deleteContainer: Should handle null containerID parameter")
    void whenDeleteContainerWithNullContainerID_thenThrowException() {
        // Act & Assert
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            containerService.deleteContainer(null);
        });

        verify(containerRepository, never()).findContainerByContainerID(anyString());
        verify(containerRepository, never()).delete(any(Container.class));
    }

    @Test
    @DisplayName("deleteContainer: Should handle empty containerID parameter")
    void whenDeleteContainerWithEmptyContainerID_thenThrowException() {
        // Act & Assert
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            containerService.deleteContainer("");
        });

        verify(containerRepository, never()).findContainerByContainerID(anyString());
        verify(containerRepository, never()).delete(any(Container.class));
    }

    @Test
    @DisplayName("triggerWebAppDeletion: Should successfully delete web app")
    void whenTriggerWebAppDeletionSuccess_thenDeleteWebApp() {
        // Arrange
        String containerID = "c-123";
        String projectID = "p1";
        Container container = Container.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name("test-app")
                .build();

        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(container);

        // Mock the DELETE request to web app service
        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/p1/c-123"))
                .andExpect(method(HttpMethod.DELETE))
                .andRespond(withSuccess("WebApp deleted", MediaType.TEXT_PLAIN));

        // Act
        containerService.deleteContainer(containerID); // This will call triggerWebAppDeletion internally

        // Assert
        mockServer.verify();
        verify(containerRepository).delete(container);
    }

    @Test
    @DisplayName("triggerWebAppDeletion: Should handle 404 Not Found error")
    void whenTriggerWebAppDeletionServiceReturns404_thenThrowException() {
        // Arrange
        String containerID = "c-123";
        String projectID = "p1";
        Container container = Container.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name("test-app")
                .build();

        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(container);

        // Mock the DELETE request to return 404
        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/p1/c-123"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        // Act & Assert
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            containerService.deleteContainer(containerID);
        });

        mockServer.verify();
        verify(containerRepository).delete(container);
    }

    @Test
    @DisplayName("triggerWebAppDeletion: Should handle 500 Internal Server Error")
    void whenTriggerWebAppDeletionServiceReturns500_thenThrowException() {
        // Arrange
        String containerID = "c-123";
        String projectID = "p1";
        Container container = Container.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name("test-app")
                .build();

        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(container);

        // Mock the DELETE request to return 500
        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/p1/c-123"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        // Act & Assert
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            containerService.deleteContainer(containerID);
        });

        mockServer.verify();
        verify(containerRepository).delete(container);
    }

    @Test
    @DisplayName("deleteContainer: Should handle malformed projectID")
    void whenDeleteContainerWithMalformedProjectID_thenHandleGracefully() {
        // Arrange
        String containerID = "c-123";
        String projectID = "p1/with/slashes"; // This might cause URL issues
        Container container = Container.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name("test-app")
                .build();

        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(container);

        // Mock the DELETE request - RestTemplate will handle URL encoding automatically
        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/p1/with/slashes/c-123"))
                .andRespond(withSuccess("WebApp deleted", MediaType.TEXT_PLAIN));

        // Act
        containerService.deleteContainer(containerID);

        // Assert
        mockServer.verify();
        verify(containerRepository).delete(container);
    }

    @Test
    @DisplayName("deleteContainer: Should handle very long containerID")
    void whenDeleteContainerWithVeryLongContainerID_thenHandleGracefully() {
        // Arrange
        String containerID = "very-long-container-id-that-might-cause-issues-with-url-length-or-database-constraints-1234567890";
        String projectID = "p1";
        Container container = Container.builder()
                .containerID(containerID)
                .projectID(projectID)
                .name("test-app")
                .build();

        when(containerRepository.findContainerByContainerID(containerID)).thenReturn(container);

        // Mock the DELETE request
        mockServer.expect(ExpectedCount.once(),
                        requestTo("http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/p1/very-long-container-id-that-might-cause-issues-with-url-length-or-database-constraints-1234567890"))
                .andRespond(withSuccess("WebApp deleted", MediaType.TEXT_PLAIN));

        // Act
        containerService.deleteContainer(containerID);

        // Assert
        mockServer.verify();
        verify(containerRepository).delete(container);
    }

}
