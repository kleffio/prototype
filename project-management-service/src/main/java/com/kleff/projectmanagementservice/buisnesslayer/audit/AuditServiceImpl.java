package com.kleff.projectmanagementservice.buisnesslayer.audit;

import com.kleff.projectmanagementservice.authorization.domain.AuthorizationAuditLog;
import com.kleff.projectmanagementservice.authorization.domain.AuthorizationResult;
import com.kleff.projectmanagementservice.authorization.repository.AuthorizationAuditRepository;
import com.kleff.projectmanagementservice.presentationlayer.audit.AuditController.ExternalAuditRequest;
import com.kleff.projectmanagementservice.presentationlayer.project.ProjectActivityLogDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

    private final AuthorizationAuditRepository auditRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void createAuditLog(ExternalAuditRequest request) {
        AuthorizationAuditLog log = AuthorizationAuditLog.builder()
                .action(request.getAction())
                .projectId(request.getProjectId())
                .userId(request.getUserId())
                .resourceType(request.getResourceType())
                .resourceId(request.getResourceId())
                .changes(request.getChanges())
                .authorizationResult(AuthorizationResult.ALLOW) // External services enforce their own auth
                .createdAt(new Date())
                .ipAddress(request.getIpAddress())
                .permissionChecked("external_permission")
                .build();

        auditRepository.save(log);
    }

    @Override
    public List<ProjectActivityLogDTO> getAuditLogsByProject(String projectId) {
        List<AuthorizationAuditLog> logs = auditRepository.findByProjectIdOrderByCreatedAtDesc(projectId);

        return logs.stream()
                .filter(log -> !isReadOnlyAction(log.getAction()))
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private boolean isReadOnlyAction(String action) {
        if (action == null)
            return false;
        String lower = action.toLowerCase();
        return lower.contains("view") || lower.contains("read") || lower.contains("get") || lower.contains("list");
    }

    private ProjectActivityLogDTO mapToDTO(AuthorizationAuditLog log) {
        String details;
        try {
            details = log.getChanges() != null ? objectMapper.writeValueAsString(log.getChanges())
                    : log.getResourceType() + " " + log.getResourceId();
        } catch (Exception e) {
            details = log.getChanges() != null ? log.getChanges().toString() : "-";
        }

        return ProjectActivityLogDTO.builder()
                .id(String.valueOf(log.getId()))
                .action(log.getAction())
                .resourceType(log.getResourceType())
                .collaborator(log.getUserId())
                .timestamp(log.getCreatedAt())
                .details(details)
                .build();
    }
}
