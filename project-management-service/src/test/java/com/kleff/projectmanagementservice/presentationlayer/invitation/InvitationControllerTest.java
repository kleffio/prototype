package com.kleff.projectmanagementservice.presentationlayer.invitation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kleff.projectmanagementservice.buisnesslayer.invitation.InvitationService;
import com.kleff.projectmanagementservice.datalayer.collaborator.CollaboratorRole;
import com.kleff.projectmanagementservice.datalayer.collaborator.ProjectPermission;
import com.kleff.projectmanagementservice.datalayer.invitation.InviteStatus;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InvitationController.class)
class InvitationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InvitationService invitationService;

    @MockBean
    private UserStatusService userStatusService;

    @MockBean
    private RestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser
    void createInvitation_ReturnsCreated() throws Exception {
        // Mock UserStatusService to return true for active users
        when(userStatusService.isUserActive(anyString())).thenReturn(true);
        
        // Arrange
        InvitationRequestModel request = InvitationRequestModel.builder()
                .inviteeEmail("user@example.com")
                .role(CollaboratorRole.DEVELOPER)
                .permissions(Set.of(ProjectPermission.READ_PROJECT))
                .build();

        InvitationResponseModel response = InvitationResponseModel.builder()
                .id(1)
                .projectId("project-123")
                .inviteeEmail("user@example.com")
                .role(CollaboratorRole.DEVELOPER)
                .status(InviteStatus.PENDING)
                .build();

        when(invitationService.createInvitation(any(), anyString())).thenReturn(response);

        // Act & Assert
        mockMvc.perform(post("/api/v1/projects/project-123/invitations")
                        .with(jwt().jwt(jwt -> jwt.subject("admin-789")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.projectId").value("project-123"))
                .andExpect(jsonPath("$.inviteeEmail").value("user@example.com"))
                .andExpect(jsonPath("$.status").value("PENDING"));

        verify(invitationService).createInvitation(any(), eq("admin-789"));
    }

    @Test
    @WithMockUser
    void getProjectInvitations_ReturnsInvitationsList() throws Exception {
        // Mock UserStatusService to return true for active users
        when(userStatusService.isUserActive(anyString())).thenReturn(true);
        // Arrange
        InvitationResponseModel inv1 = InvitationResponseModel.builder()
                .id(1)
                .inviteeEmail("user1@example.com")
                .projectId("project-123")
                .status(InviteStatus.PENDING)
                .build();

        InvitationResponseModel inv2 = InvitationResponseModel.builder()
                .id(2)
                .inviteeEmail("user2@example.com")
                .projectId("project-123")
                .status(InviteStatus.PENDING)
                .build();

        when(invitationService.getPendingInvitationsForProject("project-123"))
                .thenReturn(Arrays.asList(inv1, inv2));

        // Act & Assert
        mockMvc.perform(get("/api/v1/projects/project-123/invitations")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].inviteeEmail").value("user1@example.com"))
                .andExpect(jsonPath("$[1].inviteeEmail").value("user2@example.com"));
    }

    @Test
    @WithMockUser
    void getPendingInvitationsForCurrentUser_ReturnsUserInvitations() throws Exception {
        // Mock UserStatusService to return true for active users
        when(userStatusService.isUserActive(anyString())).thenReturn(true);
        // Arrange
        InvitationResponseModel inv1 = InvitationResponseModel.builder()
                .id(1)
                .inviteeEmail("currentuser@example.com")
                .projectId("project-123")
                .status(InviteStatus.PENDING)
                .build();

        when(invitationService.getPendingInvitationsForEmail("currentuser@example.com"))
                .thenReturn(Arrays.asList(inv1));

        // Act & Assert
        mockMvc.perform(get("/api/v1/users/me/invitations")
                        .with(jwt().jwt(jwt -> jwt.claim("email", "currentuser@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].inviteeEmail").value("currentuser@example.com"));

        verify(invitationService).getPendingInvitationsForEmail("currentuser@example.com");
    }

    @Test
    @WithMockUser
    void acceptInvitation_ReturnsAcceptedInvitation() throws Exception {
        // Mock UserStatusService to return true for active users
        when(userStatusService.isUserActive(anyString())).thenReturn(true);
        // Arrange
        InvitationResponseModel response = InvitationResponseModel.builder()
                .id(1)
                .inviteeEmail("user@example.com")
                .status(InviteStatus.ACCEPTED)
                .build();

        when(invitationService.acceptInvitation(eq(1), anyString(), anyString()))
                .thenReturn(response);

        // Act & Assert
        mockMvc.perform(post("/api/v1/invitations/1/accept")
                        .with(jwt().jwt(jwt -> {
                            jwt.subject("user-123");
                            jwt.claim("email", "user@example.com");
                        })))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        verify(invitationService).acceptInvitation(eq(1), eq("user-123"), eq("user@example.com"));
    }

    @Test
    @WithMockUser
    void rejectInvitation_ReturnsRejectedInvitation() throws Exception {
        // Mock UserStatusService to return true for active users
        when(userStatusService.isUserActive(anyString())).thenReturn(true);
        // Arrange
        InvitationResponseModel response = InvitationResponseModel.builder()
                .id(1)
                .inviteeEmail("user@example.com")
                .status(InviteStatus.REFUSED)
                .build();

        when(invitationService.rejectInvitation(eq(1), anyString()))
                .thenReturn(response);

        // Act & Assert
        mockMvc.perform(post("/api/v1/invitations/1/reject")
                        .with(jwt().jwt(jwt -> jwt.claim("email", "user@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REFUSED"));

        verify(invitationService).rejectInvitation(eq(1), eq("user@example.com"));
    }

    @Test
    @WithMockUser
    void cancelInvitation_ReturnsNoContent() throws Exception {
        // Mock UserStatusService to return true for active users
        when(userStatusService.isUserActive(anyString())).thenReturn(true);
        // Act & Assert
        mockMvc.perform(delete("/api/v1/invitations/1")
                        .with(jwt().jwt(jwt -> jwt.subject("admin-789"))))
                .andExpect(status().isNoContent());

        verify(invitationService).cancelInvitation(1, "admin-789");
    }
}
