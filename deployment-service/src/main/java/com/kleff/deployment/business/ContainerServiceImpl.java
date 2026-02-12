package com.kleff.deployment.business;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.kleff.deployment.data.container.*;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.concurrent.CompletableFuture;

@Service
public class ContainerServiceImpl {

    private static final Logger log = LoggerFactory.getLogger(ContainerServiceImpl.class);
    private static final String BASE_URL = "http://deployment-backend-service.kleff-deployment.svc.cluster.local";

    private final ContainerRepository containerRepository;
    private final ContainerMapper containerMapper;
    private final RestTemplate restTemplate;

    public ContainerServiceImpl(ContainerRepository containerRepository,
            ContainerMapper containerMapper,
            RestTemplateBuilder restTemplateBuilder) {
        this.containerRepository = containerRepository;
        this.containerMapper = containerMapper;
        this.restTemplate = restTemplateBuilder.build();
    }

    public List<ContainerResponseModel> getAllContainers() {
        return containerMapper.containerToContainerResponseModel(containerRepository.findAll());
    }

    public ContainerResponseModel toResponseModel(Container container) {
        return containerMapper.containerToContainerResponseModel(container);
    }

    public Container getContainerByContainerId(String containerId) {
        try {
            return containerRepository.findContainerByContainerID(containerId);
        } catch (Exception e) {
            log.error("Error finding container with ID {}: {}", containerId, e.getMessage());
            return null;
        }
    }

    public List<Container> getContainersByProjectID(String projectID) {
        return containerRepository.findContainersByProjectID(projectID);
    }

    public ContainerResponseModel createContainer(ContainerRequestModel containerRequestModel, String userId) {
        Container container = containerMapper.containerRequestModelToContainer(containerRequestModel);
        container.setStatus("Running");
        container.setCreatedAt(LocalDateTime.now());

        Container savedContainer = containerRepository.save(container);

        // Trigger build/deployment asynchronously to return immediately
        String finalProjectID = savedContainer.getProjectID();
        String finalContainerID = savedContainer.getContainerID();
        String finalName = savedContainer.getName();
        CompletableFuture.runAsync(() -> {
            try {
                triggerBuildDeployment(containerRequestModel, finalContainerID);
                sendAuditLog("create_container", finalProjectID, finalContainerID, userId,
                        Map.of("name", finalName));
            } catch (Exception e) {
                log.error("Failed to complete async create for container {}: {}", finalContainerID, e.getMessage());
            }
        });

        return containerMapper.containerToContainerResponseModel(savedContainer);
    }

    public ContainerResponseModel updateContainer(String containerID, ContainerRequestModel request, String userId) {
        Container existingContainer = containerRepository.findContainerByContainerID(containerID);
        if (existingContainer == null) {
            throw new RuntimeException("Container not found with ID: " + containerID);
        }

        String oldName = existingContainer.getName();

        existingContainer.setName(request.getName());
        existingContainer.setRepoUrl(request.getRepoUrl());
        existingContainer.setBranch(request.getBranch());
        existingContainer.setPort(request.getPort());
        existingContainer.setProjectID(request.getProjectID());
        existingContainer.setEnableDatabase(request.isEnableDatabase());
        existingContainer.setStorageSizeGB(request.getStorageSizeGB());

        if (request.getEnvVariables() != null) {
            existingContainer.setEnvVariables(containerMapper.mapToJson(request.getEnvVariables()));
        }

        Container updatedContainer = containerRepository.save(existingContainer);

        // Trigger build/deployment asynchronously to return immediately
        String finalProjectID = updatedContainer.getProjectID();
        String finalContainerID = containerID;
        String finalOldName = oldName;
        String finalNewName = updatedContainer.getName();
        String finalRepoUrl = updatedContainer.getRepoUrl();
        String finalBranch = updatedContainer.getBranch();
        int finalPort = updatedContainer.getPort();
        CompletableFuture.runAsync(() -> {
            try {
                triggerBuildDeployment(request, finalContainerID);
                Map<String, Object> changes = new java.util.HashMap<>();
                changes.put("name", finalNewName);
                if (finalOldName != null && !finalOldName.equals(finalNewName)) {
                    changes.put("previous_name", finalOldName);
                }
                changes.put("repoUrl", finalRepoUrl);
                changes.put("branch", finalBranch);
                changes.put("port", finalPort);
                sendAuditLog("update_container", finalProjectID, finalContainerID, userId, changes);
            } catch (Exception e) {
                log.error("Failed to complete async update for container {}: {}", finalContainerID, e.getMessage());
            }
        });

        return containerMapper.containerToContainerResponseModel(updatedContainer);
    }

    public ContainerResponseModel updateContainerEnvVariables(String containerID, Map<String, String> envVariables,
            String userId) {
        Container container = containerRepository.findContainerByContainerID(containerID);
        if (container == null) {
            throw new RuntimeException("Container not found with ID: " + containerID);
        }

        // Capture old env vars safely
        Map<String, String> oldEnvMap = new java.util.HashMap<>();
        try {
            if (container.getEnvVariables() != null) {
                Map<String, String> parsed = containerMapper.jsonToMap(container.getEnvVariables());
                if (parsed != null) {
                    oldEnvMap.putAll(parsed);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse existing env variables for container {}: {}", containerID, e.getMessage());
        }

        container.setEnvVariables(containerMapper.mapToJson(envVariables));
        Container updatedContainer = containerRepository.save(container);

        triggerWebAppUpdate(container, envVariables);

        // Calculate diffs safely
        try {
            if (envVariables == null)
                envVariables = new java.util.HashMap<>();
            final Map<String, String> finalEnvVars = envVariables; // for lambda

            List<String> added = finalEnvVars.keySet().stream()
                    .filter(key -> !oldEnvMap.containsKey(key))
                    .toList();

            List<String> removed = oldEnvMap.keySet().stream()
                    .filter(key -> !finalEnvVars.containsKey(key))
                    .toList();

            List<String> updated = finalEnvVars.keySet().stream()
                    .filter(key -> oldEnvMap.containsKey(key) && oldEnvMap.get(key) != null
                            && !oldEnvMap.get(key).equals(finalEnvVars.get(key)))
                    .map(key -> key + ": " + oldEnvMap.get(key) + " -> " + finalEnvVars.get(key))
                    .toList();

            Map<String, Object> details = new java.util.HashMap<>();
            details.put("container_name", container.getName());
            if (!added.isEmpty())
                details.put("added_vars", added);
            if (!removed.isEmpty())
                details.put("deleted_vars", removed);

            log.info("Env Var Update - Container: {}, Old Keys: {}, New Keys: {}", containerID, oldEnvMap.keySet(),
                    finalEnvVars.keySet());
            log.info("Calculated Diffs - Added: {}, Removed: {}, Updated: {}", added, removed, updated);

            if (!updated.isEmpty())
                details.put("updated_vars", updated);

            sendAuditLog("update_env_vars", container.getProjectID(), containerID, userId, details);

        } catch (Exception e) {
            log.error("Failed to calculate env var diffs or send audit log for {}: {}", containerID, e.getMessage());
        }

        return containerMapper.containerToContainerResponseModel(updatedContainer);
    }

    private void triggerBuildDeployment(ContainerRequestModel request, String containerID) {
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

    private void triggerWebAppUpdate(Container container, Map<String, String> envVariables) {
        String updateServiceUrl = BASE_URL + "/api/v1/webapp/update";

        Map<String, Object> updateRequest = Map.of(
                "projectID", container.getProjectID(),
                "containerID", container.getContainerID(),
                "name", container.getName(),
                "envVariables", envVariables);

        try {
            // Note: RestTemplate.patchForObject requires a specific HttpComponents client
            // to work correctly
            // with some APIs. If this fails, consider using restTemplate.postForObject or
            // exchange.
            restTemplate.patchForObject(updateServiceUrl, updateRequest, String.class);
            log.info("WebApp update triggered successfully for: {}", container.getName());
        } catch (Exception e) {
            log.error("Failed to trigger WebApp update: {}", e.getMessage());
        }
    }

    public void deleteContainer(String containerID, String userId) {
        Container container = containerRepository.findContainerByContainerID(containerID);
        if (container == null) {
            throw new RuntimeException("Container not found with ID: " + containerID);
        }

        try {
            // Delete from database first
            containerRepository.delete(container);
            log.info("Container deleted from database: {}", containerID);

            // Trigger WebApp deletion asynchronously to return immediately
            CompletableFuture.runAsync(() -> {
                try {
                    triggerWebAppDeletion(container.getProjectID(), containerID);
                    sendAuditLog("delete_container", container.getProjectID(), containerID, userId, null);
                } catch (Exception e) {
                    log.error("Failed to complete async deletion for container {}: {}", containerID, e.getMessage());
                }
            });
        } catch (Exception e) {
            log.error("Failed to delete container {}: {}", containerID, e.getMessage());
            throw new RuntimeException("Failed to delete container: " + e.getMessage(), e);
        }
    }

    public BatchDeleteResponse batchDeleteContainers(BatchDeleteRequest request) {
        if (request == null || request.getTargets() == null || request.getTargets().isEmpty()) {
            throw new RuntimeException("Targets list cannot be null or empty");
        }

        List<String> deleted = new ArrayList<>();
        List<BatchDeleteResponse.FailedItem> failed = new ArrayList<>();

        for (BatchDeleteRequest.Target target : request.getTargets()) {
            try {
                // Validate input
                if (target.getProjectID() == null || target.getProjectID().trim().isEmpty()) {
                    failed.add(BatchDeleteResponse.FailedItem.builder()
                            .containerID(target.getContainerID())
                            .reason("Invalid projectID: cannot be null or empty")
                            .build());
                    continue;
                }

                if (target.getContainerID() == null || target.getContainerID().trim().isEmpty()) {
                    failed.add(BatchDeleteResponse.FailedItem.builder()
                            .containerID(target.getContainerID())
                            .reason("Invalid containerID: cannot be null or empty")
                            .build());
                    continue;
                }

                // Find container in database
                Container container = containerRepository.findContainerByContainerID(target.getContainerID());
                
                // Idempotency: if container doesn't exist, treat as success
                if (container == null) {
                    deleted.add(target.getContainerID());
                    log.info("Container {} not found in database, treating as already deleted", target.getContainerID());
                    continue;
                }

                // Verify projectID matches (security check)
                if (!container.getProjectID().equals(target.getProjectID())) {
                    failed.add(BatchDeleteResponse.FailedItem.builder()
                            .containerID(target.getContainerID())
                            .reason("Project ID mismatch: expected " + target.getProjectID() + ", found " + container.getProjectID())
                            .build());
                    continue;
                }

                // Delete from database
                containerRepository.delete(container);
                log.info("Container deleted from database: {}", target.getContainerID());

                // Trigger WebApp deletion asynchronously
                String finalProjectID = container.getProjectID();
                String finalContainerID = container.getContainerID();
                CompletableFuture.runAsync(() -> {
                    try {
                        triggerWebAppDeletion(finalProjectID, finalContainerID);
                    } catch (Exception e) {
                        log.error("Failed to complete async deletion for container {}: {}", finalContainerID, e.getMessage());
                    }
                });

                // Success
                deleted.add(target.getContainerID());

            } catch (Exception e) {
                log.error("Failed to delete container {}: {}", target.getContainerID(), e.getMessage());
                failed.add(BatchDeleteResponse.FailedItem.builder()
                        .containerID(target.getContainerID())
                        .reason(e.getMessage())
                        .build());
            }
        }

        return BatchDeleteResponse.builder()
                .deleted(deleted)
                .failed(failed)
                .build();
    }

    private void triggerWebAppDeletion(String projectID, String containerID) {

        String deleteServiceUrl = BASE_URL + "/api/v1/webapp/" + projectID + "/" + containerID;

        try {
            restTemplate.delete(deleteServiceUrl);
            log.info("WebApp deletion triggered successfully for project: {}, container: {}", projectID, containerID);
        } catch (Exception e) {
            log.error("Failed to trigger WebApp deletion for project: {}, container: {}: {}",
                    projectID, containerID, e.getMessage());
            throw new RuntimeException("Failed to delete WebApp in Kubernetes: " + e.getMessage(), e);
        }
    }

    // Inject audit URL from application properties
    @org.springframework.beans.factory.annotation.Value("${audit.service.url:http://project-management-service:8080/api/v1/projects/audit/internal}")
    private String auditServiceUrl;

    private void sendAuditLog(String action, String projectId, String containerId, String userId,
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
