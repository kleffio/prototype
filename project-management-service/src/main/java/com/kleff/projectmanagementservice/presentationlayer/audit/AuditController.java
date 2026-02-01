package com.kleff.projectmanagementservice.presentationlayer.audit;

import com.kleff.projectmanagementservice.authorization.domain.AuthorizationAuditLog;
import com.kleff.projectmanagementservice.authorization.domain.AuthorizationResult;
import com.kleff.projectmanagementservice.authorization.repository.AuthorizationAuditRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/projects/audit/internal")
@RequiredArgsConstructor
public class AuditController {

    private final AuthorizationAuditRepository auditRepository;

    @PostMapping
    public ResponseEntity<Void> createExternalAuditLog(@RequestBody ExternalAuditRequest request) {
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
        return ResponseEntity.ok().build();
    }

    @Data
    public static class ExternalAuditRequest {
        private String action;
        private String projectId;
        private String userId;
        private String resourceType;
        private String resourceId;
        private Map<String, Object> changes;
        private String ipAddress;
    }
}
