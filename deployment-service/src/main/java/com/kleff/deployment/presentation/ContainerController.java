package com.kleff.deployment.presentation;

import com.kleff.deployment.business.ContainerServiceImpl;
import com.kleff.deployment.data.container.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping("/api/v1/containers")
public class ContainerController {

    private final ContainerServiceImpl containerService;

    public ContainerController(ContainerServiceImpl containerService) {
        this.containerService = containerService;
    }

    @GetMapping
    public List<ContainerResponseModel> getAllContainers() {
        return containerService.getAllContainers();
    }

    @GetMapping("{projectID}")
    public List<ContainerResponseModel> getAllContainersByProjectID(@PathVariable String projectID) {
        List<Container> containers = containerService.getContainersByProjectID(projectID);
        return containers.stream()
                .map(container -> containerService.toResponseModel(container))
                .toList();
    }

    @PostMapping
    public ContainerResponseModel createContainer(@RequestBody ContainerRequestModel container,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt != null ? jwt.getSubject() : "unknown";
        // Basic validation
        if (container.getName() == null || container.getName().trim().isEmpty()) {
            throw new RuntimeException("Container name cannot be empty");
        }
        if (container.getProjectID() == null || container.getProjectID().trim().isEmpty()) {
            throw new RuntimeException("Project ID cannot be empty");
        }
        // Database validation
        if (container.isEnableDatabase()) {
            if (container.getStorageSizeGB() == null) {
                throw new RuntimeException("Storage size is required when database is enabled");
            }
            if (container.getStorageSizeGB() < 1 || container.getStorageSizeGB() > 100) {
                throw new RuntimeException("Storage size must be between 1 and 100 GB");
            }
        }
        return containerService.createContainer(container, userId);
    }

    @PutMapping("/{containerID}")
    public ContainerResponseModel updateContainer(@PathVariable String containerID,
            @RequestBody ContainerRequestModel containerRequest, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt != null ? jwt.getSubject() : "unknown";
        try {
            return containerService.updateContainer(containerID, containerRequest, userId);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                throw new RuntimeException("Container not found with ID: " + containerID);
            } else {
                throw e;
            }
        }
    }

    @PatchMapping("/{containerID}/env")
    public ContainerResponseModel updateContainerEnvVariables(
            @PathVariable String containerID,
            @RequestBody UpdateEnvVariablesRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt != null ? jwt.getSubject() : "unknown";
        try {
            return containerService.updateContainerEnvVariables(containerID, request.getEnvVariables(), userId);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                throw new RuntimeException("Container not found with ID: " + containerID);
            } else {
                throw e;
            }
        }
    }

    @DeleteMapping("/{containerID}")
    public ResponseEntity<String> deleteContainer(@PathVariable String containerID, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt != null ? jwt.getSubject() : "unknown";
        try {
            containerService.deleteContainer(containerID, userId);
            return ResponseEntity.ok("Container deleted successfully");
        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            } else {
                return ResponseEntity.internalServerError().body("Failed to delete container: " + e.getMessage());
            }
        }
    }

    @PostMapping("/batch-delete")
    public BatchDeleteResponse batchDeleteContainers(@RequestBody BatchDeleteRequest request) {
        return containerService.batchDeleteContainers(request);
    }
}
