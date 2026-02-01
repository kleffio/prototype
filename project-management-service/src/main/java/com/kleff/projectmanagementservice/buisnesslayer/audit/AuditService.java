package com.kleff.projectmanagementservice.buisnesslayer.audit;

import com.kleff.projectmanagementservice.presentationlayer.audit.AuditController.ExternalAuditRequest;
import com.kleff.projectmanagementservice.presentationlayer.project.ProjectActivityLogDTO;

import java.util.List;

public interface AuditService {
    void createAuditLog(ExternalAuditRequest request);

    List<ProjectActivityLogDTO> getAuditLogsByProject(String projectId);
}
