package com.kleff.projectmanagementservice.presentationlayer.collaborator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kleff.projectmanagementservice.buisnesslayer.collaborator.CollaboratorService;
import com.kleff.projectmanagementservice.datalayer.collaborator.CollaboratorRole;
import com.kleff.projectmanagementservice.datalayer.collaborator.CollaboratorStatus;
import com.kleff.projectmanagementservice.datalayer.collaborator.ProjectPermission;
import com.kleff.projectmanagementservice.service.UserStatusService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CollaboratorController.class)
class CollaboratorControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

        @MockBean
        private CollaboratorService collaboratorService;

        @MockBean
        private UserStatusService userStatusService;

        @MockBean
        private RestTemplate restTemplate;

        @Test
        @WithMockUser
        void addCollaborator_ReturnsCreated() throws Exception {
                // Mock UserStatusService to return true for active users
                when(userStatusService.isUserActive(anyString())).thenReturn(true);
                // Arrange
                CollaboratorRequestModel request = CollaboratorRequestModel.builder()
                                .userId("user-456")
                                .role(CollaboratorRole.DEVELOPER)
                                .permissions(Set.of(ProjectPermission.READ_PROJECT))
                                .build();

                CollaboratorResponseModel response = CollaboratorResponseModel.builder()
                                .id(1)
                                .projectId("project-123")
                                .userId("user-456")
                                .role(CollaboratorRole.DEVELOPER)
                                .status(CollaboratorStatus.ACCEPTED)
                                .build();

                when(collaboratorService.addCollaborator(any(), anyString())).thenReturn(response);

                // Act & Assert
                mockMvc.perform(post("/api/v1/projects/project-123/collaborators")
                                .with(jwt().jwt(jwt -> jwt.subject("admin-789")))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.id").value(1))
                                .andExpect(jsonPath("$.projectId").value("project-123"))
                                .andExpect(jsonPath("$.userId").value("user-456"));

                verify(collaboratorService).addCollaborator(any(), eq("admin-789"));
        }

        @Test
        @WithMockUser
        void getProjectCollaborators_ReturnsCollaboratorsList() throws Exception {
                // Mock UserStatusService to return true for active users
                when(userStatusService.isUserActive(anyString())).thenReturn(true);
                // Arrange
                CollaboratorResponseModel collab1 = CollaboratorResponseModel.builder()
                                .id(1)
                                .userId("user-1")
                                .projectId("project-123")
                                .role(CollaboratorRole.OWNER)
                                .build();

                CollaboratorResponseModel collab2 = CollaboratorResponseModel.builder()
                                .id(2)
                                .userId("user-2")
                                .projectId("project-123")
                                .role(CollaboratorRole.DEVELOPER)
                                .build();

                when(collaboratorService.getProjectCollaborators("project-123"))
                                .thenReturn(Arrays.asList(collab1, collab2));

                // Act & Assert
                mockMvc.perform(get("/api/v1/projects/project-123/collaborators")
                                .with(jwt()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$").isArray())
                                .andExpect(jsonPath("$.length()").value(2))
                                .andExpect(jsonPath("$[0].userId").value("user-1"))
                                .andExpect(jsonPath("$[1].userId").value("user-2"));
        }

        @Test
        @WithMockUser
        void updateCollaborator_ReturnsUpdatedCollaborator() throws Exception {
                // Mock UserStatusService to return true for active users
                when(userStatusService.isUserActive(anyString())).thenReturn(true);
                // Arrange
                CollaboratorRequestModel request = CollaboratorRequestModel.builder()
                                .role(CollaboratorRole.ADMIN)
                                .permissions(Set.of(ProjectPermission.MANAGE_COLLABORATORS))
                                .build();

                CollaboratorResponseModel response = CollaboratorResponseModel.builder()
                                .id(1)
                                .projectId("project-123")
                                .userId("user-456")
                                .role(CollaboratorRole.ADMIN)
                                .build();

                when(collaboratorService.updateCollaborator(anyString(), anyString(), any(), anyString()))
                                .thenReturn(response);

                // Act & Assert
                mockMvc.perform(put("/api/v1/projects/project-123/collaborators/user-456")
                                .with(jwt().jwt(jwt -> jwt.subject("admin-789")))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.role").value("ADMIN"));

                verify(collaboratorService).updateCollaborator(eq("project-123"), eq("user-456"), any(),
                                eq("admin-789"));
        }

        @Test
        @WithMockUser
        void removeCollaborator_ReturnsNoContent() throws Exception {
                // Mock UserStatusService to return true for active users
                when(userStatusService.isUserActive(anyString())).thenReturn(true);
                // Act & Assert
                mockMvc.perform(delete("/api/v1/projects/project-123/collaborators/user-456")
                                .with(jwt().jwt(jwt -> jwt.subject("admin-789"))))
                                .andExpect(status().isNoContent());

                verify(collaboratorService).removeCollaborator("project-123", "user-456", "admin-789");
        }
}
