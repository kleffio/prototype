package com.kleff.deployment.business;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.kleff.deployment.data.container.Container;
import com.kleff.deployment.data.container.ContainerRequestModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class AsyncDeploymentService {

    private static final Logger log = LoggerFactory.getLogger(AsyncDeploymentService.class);
    private static final String BASE_URL = "http://deployment-backend-service.kleff-deployment.svc.cluster.local";

    private final RestTemplate restTemplate;

    @Value("${audit.service.url:http://project-management-service.kleff-deployment.svc.cluster.local:8080/api/v1/projects/audit/internal}")
    private String auditServiceUrl;

    public AsyncDeploymentService(RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder.build();
    }

    @Async("taskExecutor")
    public void triggerBuildDeployment(ContainerRequestModel request, String containerID) {
        String deploymentServiceUrl = BASE_URL + "/api/v1/build/create";

        GoBuildRequest buildRequest = new GoBuildRequest(
                containerID,
                request.getProjectID(),
                request.getRepoUrl(),
                request.getBranch(),
                request.getPort(),
                request.getName(),
                request.getEnvVariables(),
                request.isEnableDatabase(),
                request.getStorageSizeGB());

        try {
            restTemplate.postForObject(deploymentServiceUrl, buildRequest, String.class);
            log.info("Update/Build triggered successfully for: {}", request.getName());
        } catch (Exception e) {
            log.error("Failed to trigger build service for {}: {}", request.getName(), e.getMessage());
        }
    }

    @Async("taskExecutor")
    public void triggerWebAppUpdate(Container container, Map<String, String> envVariables) {
        String updateServiceUrl = BASE_URL + "/api/v1/webapp/update";

        Map<String, Object> updateRequest = Map.of(
                "projectID", container.getProjectID(),
                "containerID", container.getContainerID(),
                "name", container.getName(),
                "envVariables", envVariables);

        try {
            restTemplate.patchForObject(updateServiceUrl, updateRequest, String.class);
            log.info("WebApp update triggered successfully for: {}", container.getName());
        } catch (Exception e) {
            log.error("Failed to trigger WebApp update: {}", e.getMessage());
        }
    }

    @Async("taskExecutor")
    public void triggerWebAppDeletion(String projectID, String containerID) {
        String deleteServiceUrl = BASE_URL + "/api/v1/webapp/" + projectID + "/" + containerID;

        try {
            restTemplate.delete(deleteServiceUrl);
            log.info("WebApp deletion triggered successfully for project: {}, container: {}", projectID, containerID);
        } catch (Exception e) {
            log.error("Failed to trigger WebApp deletion for project: {}, container: {}: {}",
                    projectID, containerID, e.getMessage());
        }
    }

    @Async("taskExecutor")
    public void sendAuditLog(String action, String projectId, String containerId, String userId,
                              Map<String, Object> changes) {
        try {
            ExternalAuditRequest request = new ExternalAuditRequest();
            request.setAction(action);
            request.setProjectId(projectId);
            request.setUserId(userId != null ? userId : "system");
            request.setResourceType("CONTAINER");
            request.setResourceId(containerId);
            request.setChanges(changes);

            restTemplate.postForObject(auditServiceUrl, request, Void.class);
            log.info("Audit log sent for action: {}", action);
        } catch (Exception e) {
            log.error("Failed to send audit log: {}", e.getMessage());
        }
    }

    // Inner DTO for Audit Request
    private static class ExternalAuditRequest {
        @JsonProperty("action")
        private String action;
        @JsonProperty("projectId")
        private String projectId;
        @JsonProperty("userId")
        private String userId;
        @JsonProperty("resourceType")
        private String resourceType;
        @JsonProperty("resourceId")
        private String resourceId;
        @JsonProperty("changes")
        private Map<String, Object> changes;
        @JsonProperty("ipAddress")
        private String ipAddress;

        public void setAction(String action) {
            this.action = action;
        }

        public void setProjectId(String projectId) {
            this.projectId = projectId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public void setResourceType(String resourceType) {
            this.resourceType = resourceType;
        }

        public void setResourceId(String resourceId) {
            this.resourceId = resourceId;
        }

        public void setChanges(Map<String, Object> changes) {
            this.changes = changes;
        }

        public void setIpAddress(String ipAddress) {
            this.ipAddress = ipAddress;
        }
    }

    // Static Inner DTO
    private static class GoBuildRequest {
        @JsonProperty("containerID")
        private String containerID;
        @JsonProperty("projectID")
        private String projectID;
        @JsonProperty("repoUrl")
        private String repoUrl;
        @JsonProperty("branch")
        private String branch;
        @JsonProperty("port")
        private int port;
        @JsonProperty("name")
        private String name;
        @JsonProperty("envVariables")
        private Map<String, String> envVariables;
        @JsonProperty("enableDatabase")
        private boolean enableDatabase;
        @JsonProperty("storageSizeGB")
        private Integer storageSizeGB;

        public GoBuildRequest(String containerID, String projectID, String repoUrl, String branch, int port,
                             String name, Map<String, String> envVariables, boolean enableDatabase, Integer storageSizeGB) {
            this.containerID = containerID;
            this.projectID = projectID;
            this.repoUrl = repoUrl;
            this.branch = (branch == null || branch.isEmpty()) ? "main" : branch;
            this.port = port;
            this.name = name;
            this.envVariables = envVariables;
            this.enableDatabase = enableDatabase;
            this.storageSizeGB = storageSizeGB;
        }
    }
}