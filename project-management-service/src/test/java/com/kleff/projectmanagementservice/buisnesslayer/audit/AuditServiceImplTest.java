package com.kleff.projectmanagementservice.buisnesslayer.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kleff.projectmanagementservice.authorization.domain.AuthorizationAuditLog;
import com.kleff.projectmanagementservice.authorization.domain.AuthorizationResult;
import com.kleff.projectmanagementservice.authorization.repository.AuthorizationAuditRepository;
import com.kleff.projectmanagementservice.presentationlayer.audit.AuditController.ExternalAuditRequest;
import com.kleff.projectmanagementservice.presentationlayer.project.ProjectActivityLogDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceImplTest {

    @Mock
    private AuthorizationAuditRepository auditRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AuditServiceImpl auditService;

    private String testProjectId;
    private String testUserId;
    private Date testDate;

    @BeforeEach
    void setUp() {
        testProjectId = "project-123";
        testUserId = "user-456";
        testDate = new Date();
    }

    // ============ createAuditLog Tests ============

    @Test
    void createAuditLog_WithValidRequest_SavesAuditLog() {
        // Arrange
        ExternalAuditRequest request = new ExternalAuditRequest();
        request.setAction("CONTAINER_CREATED");
        request.setProjectId(testProjectId);
        request.setUserId(testUserId);
        request.setResourceType("container");
        request.setResourceId("container-789");
        request.setIpAddress("192.168.1.1");

        Map<String, Object> changes = new HashMap<>();
        changes.put("name", "my-container");
        request.setChanges(changes);

        // Act
        auditService.createAuditLog(request);

        // Assert
        ArgumentCaptor<AuthorizationAuditLog> logCaptor = ArgumentCaptor.forClass(AuthorizationAuditLog.class);
        verify(auditRepository).save(logCaptor.capture());

        AuthorizationAuditLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getAction()).isEqualTo("CONTAINER_CREATED");
        assertThat(savedLog.getProjectId()).isEqualTo(testProjectId);
        assertThat(savedLog.getUserId()).isEqualTo(testUserId);
        assertThat(savedLog.getResourceType()).isEqualTo("container");
        assertThat(savedLog.getResourceId()).isEqualTo("container-789");
        assertThat(savedLog.getChanges()).isEqualTo(changes);
        assertThat(savedLog.getAuthorizationResult()).isEqualTo(AuthorizationResult.ALLOW);
        assertThat(savedLog.getIpAddress()).isEqualTo("192.168.1.1");
        assertThat(savedLog.getPermissionChecked()).isEqualTo("external_permission");
        assertThat(savedLog.getCreatedAt()).isNotNull();
    }

    @Test
    void createAuditLog_WithNullChanges_SavesAuditLogWithNullChanges() {
        // Arrange
        ExternalAuditRequest request = new ExternalAuditRequest();
        request.setAction("CONTAINER_DELETED");
        request.setProjectId(testProjectId);
        request.setUserId(testUserId);
        request.setResourceType("container");
        request.setResourceId("container-789");
        request.setChanges(null);

        // Act
        auditService.createAuditLog(request);

        // Assert
        ArgumentCaptor<AuthorizationAuditLog> logCaptor = ArgumentCaptor.forClass(AuthorizationAuditLog.class);
        verify(auditRepository).save(logCaptor.capture());

        AuthorizationAuditLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getChanges()).isNull();
    }

    @Test
    void createAuditLog_WithCollaboratorAction_SavesCorrectly() {
        // Arrange
        ExternalAuditRequest request = new ExternalAuditRequest();
        request.setAction("COLLABORATOR_ADDED");
        request.setProjectId(testProjectId);
        request.setUserId(testUserId);
        request.setResourceType("collaborator");
        request.setResourceId("collab-123");

        Map<String, Object> changes = new HashMap<>();
        changes.put("target_user_id", "user-789");
        changes.put("role", "DEVELOPER");
        request.setChanges(changes);

        // Act
        auditService.createAuditLog(request);

        // Assert
        ArgumentCaptor<AuthorizationAuditLog> logCaptor = ArgumentCaptor.forClass(AuthorizationAuditLog.class);
        verify(auditRepository).save(logCaptor.capture());

        AuthorizationAuditLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getAction()).isEqualTo("COLLABORATOR_ADDED");
        assertThat(savedLog.getResourceType()).isEqualTo("collaborator");
        assertThat(savedLog.getChanges()).containsEntry("target_user_id", "user-789");
        assertThat(savedLog.getChanges()).containsEntry("role", "DEVELOPER");
    }

    // ============ getAuditLogsByProject Tests ============

    @Test
    void getAuditLogsByProject_WithValidProjectId_ReturnsFilteredLogs() throws Exception {
        // Arrange
        AuthorizationAuditLog log1 = createTestLog(1L, "CONTAINER_CREATED", "container", "container-1");
        AuthorizationAuditLog log2 = createTestLog(2L, "CONTAINER_UPDATED", "container", "container-1");
        AuthorizationAuditLog log3 = createTestLog(3L, "CONTAINER_VIEW", "container", "container-1"); // Should be
                                                                                                      // filtered

        when(auditRepository.findByProjectIdOrderByCreatedAtDesc(testProjectId))
                .thenReturn(Arrays.asList(log1, log2, log3));
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"name\":\"test\"}");

        // Act
        List<ProjectActivityLogDTO> result = auditService.getAuditLogsByProject(testProjectId);

        // Assert
        assertThat(result).hasSize(2); // log3 should be filtered out (read-only action)
        assertThat(result.get(0).getAction()).isEqualTo("CONTAINER_CREATED");
        assertThat(result.get(1).getAction()).isEqualTo("CONTAINER_UPDATED");
        verify(auditRepository).findByProjectIdOrderByCreatedAtDesc(testProjectId);
    }

    @Test
    void getAuditLogsByProject_FiltersReadOnlyActions() throws Exception {
        // Arrange
        AuthorizationAuditLog viewLog = createTestLog(1L, "CONTAINER_VIEW", "container", "container-1");
        AuthorizationAuditLog readLog = createTestLog(2L, "READ_CONTAINER", "container", "container-1");
        AuthorizationAuditLog getLog = createTestLog(3L, "GET_CONTAINER", "container", "container-1");
        AuthorizationAuditLog listLog = createTestLog(4L, "LIST_CONTAINERS", "container", "container-1");
        AuthorizationAuditLog createLog = createTestLog(5L, "CONTAINER_CREATED", "container", "container-1");

        when(auditRepository.findByProjectIdOrderByCreatedAtDesc(testProjectId))
                .thenReturn(Arrays.asList(viewLog, readLog, getLog, listLog, createLog));
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"name\":\"test\"}");

        // Act
        List<ProjectActivityLogDTO> result = auditService.getAuditLogsByProject(testProjectId);

        // Assert
        assertThat(result).hasSize(1); // Only createLog should pass through
        assertThat(result.get(0).getAction()).isEqualTo("CONTAINER_CREATED");
    }

    @Test
    void getAuditLogsByProject_WithEmptyResults_ReturnsEmptyList() {
        // Arrange
        when(auditRepository.findByProjectIdOrderByCreatedAtDesc(testProjectId))
                .thenReturn(Collections.emptyList());

        // Act
        List<ProjectActivityLogDTO> result = auditService.getAuditLogsByProject(testProjectId);

        // Assert
        assertThat(result).isEmpty();
        verify(auditRepository).findByProjectIdOrderByCreatedAtDesc(testProjectId);
    }

    @Test
    void getAuditLogsByProject_MapsFieldsCorrectly() throws Exception {
        // Arrange
        Map<String, Object> changes = new HashMap<>();
        changes.put("name", "my-container");
        changes.put("image", "nginx:latest");

        AuthorizationAuditLog log = AuthorizationAuditLog.builder()
                .id(1L)
                .action("CONTAINER_CREATED")
                .projectId(testProjectId)
                .userId(testUserId)
                .resourceType("container")
                .resourceId("container-123")
                .changes(changes)
                .authorizationResult(AuthorizationResult.ALLOW)
                .createdAt(testDate)
                .build();

        when(auditRepository.findByProjectIdOrderByCreatedAtDesc(testProjectId))
                .thenReturn(Collections.singletonList(log));
        when(objectMapper.writeValueAsString(changes))
                .thenReturn("{\"name\":\"my-container\",\"image\":\"nginx:latest\"}");

        // Act
        List<ProjectActivityLogDTO> result = auditService.getAuditLogsByProject(testProjectId);

        // Assert
        assertThat(result).hasSize(1);
        ProjectActivityLogDTO dto = result.get(0);
        assertThat(dto.getId()).isEqualTo("1");
        assertThat(dto.getAction()).isEqualTo("CONTAINER_CREATED");
        assertThat(dto.getCollaborator()).isEqualTo(testUserId);
        assertThat(dto.getResourceType()).isEqualTo("container");
        assertThat(dto.getTimestamp()).isEqualTo(testDate);
        assertThat(dto.getDetails()).isEqualTo("{\"name\":\"my-container\",\"image\":\"nginx:latest\"}");
    }

    @Test
    void getAuditLogsByProject_WhenJsonSerializationFails_UsesToString() throws Exception {
        // Arrange
        Map<String, Object> changes = new HashMap<>();
        changes.put("name", "my-container");

        AuthorizationAuditLog log = createTestLog(1L, "CONTAINER_CREATED", "container", "container-123");
        log.setChanges(changes);

        when(auditRepository.findByProjectIdOrderByCreatedAtDesc(testProjectId))
                .thenReturn(Collections.singletonList(log));
        when(objectMapper.writeValueAsString(changes)).thenThrow(new RuntimeException("JSON error"));

        // Act
        List<ProjectActivityLogDTO> result = auditService.getAuditLogsByProject(testProjectId);

        // Assert
        assertThat(result).hasSize(1);
        ProjectActivityLogDTO dto = result.get(0);
        assertThat(dto.getDetails()).isEqualTo(changes.toString());
    }

    @Test
    void getAuditLogsByProject_WithNullChanges_UsesFallbackDetails() throws Exception {
        // Arrange
        AuthorizationAuditLog log = createTestLog(1L, "CONTAINER_DELETED", "container", "container-123");
        log.setChanges(null);

        when(auditRepository.findByProjectIdOrderByCreatedAtDesc(testProjectId))
                .thenReturn(Collections.singletonList(log));

        // Act
        List<ProjectActivityLogDTO> result = auditService.getAuditLogsByProject(testProjectId);

        // Assert
        assertThat(result).hasSize(1);
        ProjectActivityLogDTO dto = result.get(0);
        assertThat(dto.getDetails()).isEqualTo("container container-123");
    }

    @Test
    void getAuditLogsByProject_WithCollaboratorActions_IncludesTargetUser() throws Exception {
        // Arrange
        Map<String, Object> changes = new HashMap<>();
        changes.put("target_user_id", "user-999");
        changes.put("old_role", "DEVELOPER");
        changes.put("new_role", "ADMIN");

        AuthorizationAuditLog log = createTestLog(1L, "COLLABORATOR_ROLE_UPDATED", "collaborator", "collab-123");
        log.setChanges(changes);

        when(auditRepository.findByProjectIdOrderByCreatedAtDesc(testProjectId))
                .thenReturn(Collections.singletonList(log));
        when(objectMapper.writeValueAsString(changes))
                .thenReturn("{\"target_user_id\":\"user-999\",\"old_role\":\"DEVELOPER\",\"new_role\":\"ADMIN\"}");

        // Act
        List<ProjectActivityLogDTO> result = auditService.getAuditLogsByProject(testProjectId);

        // Assert
        assertThat(result).hasSize(1);
        ProjectActivityLogDTO dto = result.get(0);
        assertThat(dto.getAction()).isEqualTo("COLLABORATOR_ROLE_UPDATED");
        assertThat(dto.getDetails()).contains("user-999");
        assertThat(dto.getDetails()).contains("DEVELOPER");
        assertThat(dto.getDetails()).contains("ADMIN");
    }

    @Test
    void getAuditLogsByProject_WithEnvironmentVariableChanges_FormatsCorrectly() throws Exception {
        // Arrange
        Map<String, Object> changes = new HashMap<>();
        changes.put("added_vars", Arrays.asList("API_KEY", "DATABASE_URL"));
        changes.put("deleted_vars", Arrays.asList("OLD_VAR"));
        changes.put("updated_vars", Arrays.asList("PORT"));

        AuthorizationAuditLog log = createTestLog(1L, "ENVIRONMENT_VARIABLES_UPDATED", "container", "container-123");
        log.setChanges(changes);

        when(auditRepository.findByProjectIdOrderByCreatedAtDesc(testProjectId))
                .thenReturn(Collections.singletonList(log));
        when(objectMapper.writeValueAsString(changes))
                .thenReturn(
                        "{\"added_vars\":[\"API_KEY\",\"DATABASE_URL\"],\"deleted_vars\":[\"OLD_VAR\"],\"updated_vars\":[\"PORT\"]}");

        // Act
        List<ProjectActivityLogDTO> result = auditService.getAuditLogsByProject(testProjectId);

        // Assert
        assertThat(result).hasSize(1);
        ProjectActivityLogDTO dto = result.get(0);
        assertThat(dto.getDetails()).contains("API_KEY");
        assertThat(dto.getDetails()).contains("DATABASE_URL");
        assertThat(dto.getDetails()).contains("OLD_VAR");
        assertThat(dto.getDetails()).contains("PORT");
    }

    @Test
    void getAuditLogsByProject_CaseInsensitiveReadOnlyFiltering() throws Exception {
        // Arrange
        AuthorizationAuditLog viewLog = createTestLog(1L, "VIEW_CONTAINER", "container", "container-1");
        AuthorizationAuditLog readLog = createTestLog(2L, "Read_Project", "project", "project-1");
        AuthorizationAuditLog getLog = createTestLog(3L, "get_collaborators", "collaborator", "collab-1");
        AuthorizationAuditLog listLog = createTestLog(4L, "LIST_ALL", "container", "container-1");
        AuthorizationAuditLog createLog = createTestLog(5L, "CREATE_CONTAINER", "container", "container-1");

        when(auditRepository.findByProjectIdOrderByCreatedAtDesc(testProjectId))
                .thenReturn(Arrays.asList(viewLog, readLog, getLog, listLog, createLog));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        // Act
        List<ProjectActivityLogDTO> result = auditService.getAuditLogsByProject(testProjectId);

        // Assert
        assertThat(result).hasSize(1); // Only createLog should pass through
        assertThat(result.get(0).getAction()).isEqualTo("CREATE_CONTAINER");
    }

    @Test
    void getAuditLogsByProject_WithNullAction_DoesNotFilterOut() throws Exception {
        // Arrange
        AuthorizationAuditLog log = createTestLog(1L, null, "container", "container-1");

        when(auditRepository.findByProjectIdOrderByCreatedAtDesc(testProjectId))
                .thenReturn(Collections.singletonList(log));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        // Act
        List<ProjectActivityLogDTO> result = auditService.getAuditLogsByProject(testProjectId);

        // Assert
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAction()).isNull();
    }

    // ============ Helper Methods ============

    private AuthorizationAuditLog createTestLog(Long id, String action, String resourceType, String resourceId) {
        Map<String, Object> changes = new HashMap<>();
        changes.put("name", "test-resource");

        return AuthorizationAuditLog.builder()
                .id(id)
                .action(action)
                .projectId(testProjectId)
                .userId(testUserId)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .changes(changes)
                .authorizationResult(AuthorizationResult.ALLOW)
                .createdAt(testDate)
                .permissionChecked("test_permission")
                .build();
    }
}
