package com.kleff.deployment.business;

import com.kleff.deployment.data.container.*;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

@Service
public class ContainerServiceImpl {

    private static final Logger log = LoggerFactory.getLogger(ContainerServiceImpl.class);

    private final ContainerRepository containerRepository;
    private final ContainerMapper containerMapper;
    private final AsyncDeploymentService asyncDeploymentService;

    public ContainerServiceImpl(ContainerRepository containerRepository,
            ContainerMapper containerMapper,
            AsyncDeploymentService asyncDeploymentService) {
        this.containerRepository = containerRepository;
        this.containerMapper = containerMapper;
        this.asyncDeploymentService = asyncDeploymentService;
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

        // FIX: Pass both the request and the ID from the saved object
        asyncDeploymentService.triggerBuildDeployment(containerRequestModel, savedContainer.getContainerID());

        asyncDeploymentService.sendAuditLog("create_container", savedContainer.getProjectID(), savedContainer.getContainerID(), userId,
                Map.of("name", savedContainer.getName()));

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

        // FIX: Pass both the request and the containerID
        asyncDeploymentService.triggerBuildDeployment(request, containerID);

        Map<String, Object> changes = new java.util.HashMap<>();
        changes.put("name", updatedContainer.getName());
        if (oldName != null && !oldName.equals(updatedContainer.getName())) {
            changes.put("previous_name", oldName);
        }
        changes.put("repoUrl", updatedContainer.getRepoUrl());
        changes.put("branch", updatedContainer.getBranch());
        changes.put("port", updatedContainer.getPort());
        changes.put("enableDatabase", updatedContainer.isEnableDatabase());
        changes.put("storageSizeGB", updatedContainer.getStorageSizeGB());

        asyncDeploymentService.sendAuditLog("update_container", updatedContainer.getProjectID(), containerID, userId, changes);

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

        asyncDeploymentService.triggerWebAppUpdate(container, envVariables);

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

            asyncDeploymentService.sendAuditLog("update_env_vars", container.getProjectID(), containerID, userId, details);

        } catch (Exception e) {
            log.error("Failed to calculate env var diffs or send audit log for {}: {}", containerID, e.getMessage());
        }

        return containerMapper.containerToContainerResponseModel(updatedContainer);
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

            // Make upstream call to delete the WebApp in Kubernetes
            asyncDeploymentService.triggerWebAppDeletion(container.getProjectID(), containerID);

            asyncDeploymentService.sendAuditLog("delete_container", container.getProjectID(), containerID, userId, null);
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

                // Delete upstream WebApp
                asyncDeploymentService.triggerWebAppDeletion(container.getProjectID(), container.getContainerID());

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
}