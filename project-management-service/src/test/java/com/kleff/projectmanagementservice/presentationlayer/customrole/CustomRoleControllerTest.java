package com.kleff.projectmanagementservice.presentationlayer.customrole;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kleff.projectmanagementservice.buisnesslayer.customrole.CustomRoleService;
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

@WebMvcTest(CustomRoleController.class)
class CustomRoleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CustomRoleService customRoleService;

    @MockBean
    private UserStatusService userStatusService;

    @MockBean
    private RestTemplate restTemplate;

    @Test
    @WithMockUser
    void createCustomRole_ReturnsCreated() throws Exception {
        // Mock UserStatusService to return true for active users
        when(userStatusService.isUserActive(anyString())).thenReturn(true);
        
        // Arrange
        CustomRoleRequestModel request = CustomRoleRequestModel.builder()
                .name("Custom Developer")
                .description("Custom developer role")
                .permissions(Set.of(ProjectPermission.READ_PROJECT, ProjectPermission.DEPLOY))
                .build();

        CustomRoleResponseModel response = CustomRoleResponseModel.builder()
                .id(1)
                .projectId("project-123")
                .name("Custom Developer")
                .description("Custom developer role")
                .permissions(Set.of(ProjectPermission.READ_PROJECT, ProjectPermission.DEPLOY))
                .build();

        when(customRoleService.createCustomRole(any(), anyString())).thenReturn(response);

        // Act & Assert
        mockMvc.perform(post("/api/v1/projects/project-123/custom-roles")
                        .with(jwt().jwt(jwt -> jwt.subject("admin-789")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.projectId").value("project-123"))
                .andExpect(jsonPath("$.name").value("Custom Developer"));

        verify(customRoleService).createCustomRole(any(), eq("admin-789"));
    }

    @Test
    @WithMockUser
    void getProjectCustomRoles_ReturnsRolesList() throws Exception {
        // Mock UserStatusService to return true for active users
        when(userStatusService.isUserActive(anyString())).thenReturn(true);
        // Arrange
        CustomRoleResponseModel role1 = CustomRoleResponseModel.builder()
                .id(1)
                .name("Role 1")
                .projectId("project-123")
                .build();

        CustomRoleResponseModel role2 = CustomRoleResponseModel.builder()
                .id(2)
                .name("Role 2")
                .projectId("project-123")
                .build();

        when(customRoleService.getProjectCustomRoles("project-123"))
                .thenReturn(Arrays.asList(role1, role2));

        // Act & Assert
        mockMvc.perform(get("/api/v1/projects/project-123/custom-roles")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Role 1"))
                .andExpect(jsonPath("$[1].name").value("Role 2"));
    }

    @Test
    @WithMockUser
    void updateCustomRole_ReturnsUpdatedRole() throws Exception {
        // Mock UserStatusService to return true for active users
        when(userStatusService.isUserActive(anyString())).thenReturn(true);
        // Arrange
        CustomRoleRequestModel request = CustomRoleRequestModel.builder()
                .name("Updated Role")
                .description("Updated description")
                .permissions(Set.of(ProjectPermission.WRITE_PROJECT))
                .build();

        CustomRoleResponseModel response = CustomRoleResponseModel.builder()
                .id(1)
                .name("Updated Role")
                .description("Updated description")
                .build();

        when(customRoleService.updateCustomRole(eq(1), any())).thenReturn(response);

        // Act & Assert
        mockMvc.perform(put("/api/v1/custom-roles/1")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Role"));

        verify(customRoleService).updateCustomRole(eq(1), any());
    }

    @Test
    @WithMockUser
    void deleteCustomRole_ReturnsNoContent() throws Exception {
        // Mock UserStatusService to return true for active users
        when(userStatusService.isUserActive(anyString())).thenReturn(true);
        // Act & Assert
        mockMvc.perform(delete("/api/v1/custom-roles/1")
                        .with(jwt()))
                .andExpect(status().isNoContent());

        verify(customRoleService).deleteCustomRole(1);
    }
}
