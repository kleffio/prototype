package com.kleff.deployment.presentation;

import com.kleff.deployment.business.ContainerServiceImpl;
import com.kleff.deployment.data.container.Container;
import com.kleff.deployment.data.container.ContainerRequestModel;
import com.kleff.deployment.data.container.ContainerResponseModel;
import com.kleff.deployment.data.container.UpdateEnvVariablesRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ContainerResponseModel createContainer(@RequestBody ContainerRequestModel container) {
        return containerService.createContainer(container);
    }

    @PutMapping("/{containerID}")
    public ContainerResponseModel updateContainer(@PathVariable String containerID, @RequestBody ContainerRequestModel containerRequest) {
        return containerService.updateContainer(containerID, containerRequest);
    }

    @PatchMapping("/{containerID}/env")
    public ContainerResponseModel updateContainerEnvVariables(
            @PathVariable String containerID,
            @RequestBody UpdateEnvVariablesRequest request) {
        return containerService.updateContainerEnvVariables(containerID, request.getEnvVariables());
    }

    @DeleteMapping("/{containerID}")
    public ResponseEntity<String> deleteContainer(@PathVariable String containerID) {
        try {
            containerService.deleteContainer(containerID);
            return ResponseEntity.ok("Container deleted successfully");
        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            } else {
                return ResponseEntity.internalServerError().body("Failed to delete container: " + e.getMessage());
            }
        }
    }
}