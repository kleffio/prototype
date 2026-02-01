package com.kleff.deployment.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kleff.deployment.business.ContainerServiceImpl;
import com.kleff.deployment.data.container.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public class BatchDeleteControllerTest {

    @Mock
    private ContainerServiceImpl containerService;

    @InjectMocks
    private ContainerController containerController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(containerController).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    void batchDeleteContainers_ShouldReturnSuccessForValidRequest() throws Exception {
        // Arrange
        BatchDeleteRequest.Target target1 = BatchDeleteRequest.Target.builder()
                .projectID("project-alpha")
                .containerID("550e8400-e29b-41d4-a716-446655440000")
                .build();

        BatchDeleteRequest.Target target2 = BatchDeleteRequest.Target.builder()
                .projectID("project-beta")
                .containerID("792f3311-d38c-52e5-b827-557766551111")
                .build();

        BatchDeleteRequest request = BatchDeleteRequest.builder()
                .targets(List.of(target1, target2))
                .build();

        BatchDeleteResponse response = BatchDeleteResponse.builder()
                .deleted(List.of("550e8400-e29b-41d4-a716-446655440000", "792f3311-d38c-52e5-b827-557766551111"))
                .failed(List.of())
                .build();

        when(containerService.batchDeleteContainers(any(BatchDeleteRequest.class))).thenReturn(response);

        // Act & Assert
        mockMvc.perform(post("/api/v1/containers/batch-delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").isArray())
                .andExpect(jsonPath("$.deleted[0]").value("550e8400-e29b-41d4-a716-446655440000"))
                .andExpect(jsonPath("$.deleted[1]").value("792f3311-d38c-52e5-b827-557766551111"))
                .andExpect(jsonPath("$.failed").isEmpty());
    }

    @Test
    void batchDeleteContainers_ShouldReturnPartialSuccessForMixedResults() throws Exception {
        // Arrange
        BatchDeleteRequest.Target target1 = BatchDeleteRequest.Target.builder()
                .projectID("project-alpha")
                .containerID("550e8400-e29b-41d4-a716-446655440000")
                .build();

        BatchDeleteRequest.Target target2 = BatchDeleteRequest.Target.builder()
                .projectID("project-beta")
                .containerID("792f3311-d38c-52e5-b827-557766551111")
                .build();

        BatchDeleteRequest request = BatchDeleteRequest.builder()
                .targets(List.of(target1, target2))
                .build();

        BatchDeleteResponse.FailedItem failedItem = BatchDeleteResponse.FailedItem.builder()
                .containerID("792f3311-d38c-52e5-b827-557766551111")
                .reason("Invalid Namespace: project-beta does not exist")
                .build();

        BatchDeleteResponse response = BatchDeleteResponse.builder()
                .deleted(List.of("550e8400-e29b-41d4-a716-446655440000"))
                .failed(List.of(failedItem))
                .build();

        when(containerService.batchDeleteContainers(any(BatchDeleteRequest.class))).thenReturn(response);

        // Act & Assert
        mockMvc.perform(post("/api/v1/containers/batch-delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").isArray())
                .andExpect(jsonPath("$.deleted[0]").value("550e8400-e29b-41d4-a716-446655440000"))
                .andExpect(jsonPath("$.failed").isArray())
                .andExpect(jsonPath("$.failed[0].containerID").value("792f3311-d38c-52e5-b827-557766551111"))
                .andExpect(jsonPath("$.failed[0].reason").value("Invalid Namespace: project-beta does not exist"));
    }

    @Test
    void batchDeleteContainers_ShouldHandleEmptyTargets() throws Exception {
        // Arrange
        BatchDeleteRequest request = BatchDeleteRequest.builder()
                .targets(List.of())
                .build();

        when(containerService.batchDeleteContainers(any(BatchDeleteRequest.class)))
                .thenThrow(new RuntimeException("Targets list cannot be null or empty"));

        // Act & Assert
        mockMvc.perform(post("/api/v1/containers/batch-delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }
}