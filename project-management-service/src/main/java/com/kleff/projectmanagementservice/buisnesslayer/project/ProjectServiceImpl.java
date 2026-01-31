package com.kleff.projectmanagementservice.buisnesslayer;

import com.kleff.projectmanagementservice.buisnesslayer.collaborator.CollaboratorService;
import com.kleff.projectmanagementservice.datalayer.collaborator.Collaborator;
import com.kleff.projectmanagementservice.datalayer.collaborator.CollaboratorRole;
import com.kleff.projectmanagementservice.datalayer.collaborator.collaboratorRepository;
import com.kleff.projectmanagementservice.datalayer.project.Project;
import com.kleff.projectmanagementservice.datalayer.project.ProjectRepository;
import com.kleff.projectmanagementservice.datalayer.project.ProjectStatus;
import com.kleff.projectmanagementservice.presentationlayer.collaborator.CollaboratorRequestModel;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final CollaboratorService collaboratorService;
    private final collaboratorRepository collaboratorRepo;

    public ProjectServiceImpl(ProjectRepository projectRepository, CollaboratorService collaboratorService,
            collaboratorRepository collaboratorRepo) {
        this.projectRepository = projectRepository;
        this.collaboratorService = collaboratorService;
        this.collaboratorRepo = collaboratorRepo;
    }

    @Override
    public List<Project> getAllOwnedProjects(String userId) {
        List<Project> ownedProjects = projectRepository.findByOwnerIdEquals(userId);

        List<Collaborator> collaborations = collaboratorRepo.findByUserId(userId);
        List<String> collaboratedProjectIds = collaborations.stream()
                .map(Collaborator::getProjectId)
                .collect(Collectors.toList());

        List<Project> collaboratedProjects = new ArrayList<>();
        for (String projectId : collaboratedProjectIds) {
            Project project = projectRepository.findByProjectId(projectId);
            if (project != null && !ownedProjects.contains(project)) {
                collaboratedProjects.add(project);
            }
        }

        List<Project> allProjects = new ArrayList<>(ownedProjects);
        allProjects.addAll(collaboratedProjects);

        return allProjects;
    }

    @Override
    public Project getProjectById(String projectId) {
        try {
            return projectRepository.findByProjectId(projectId);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public Project createProject(Project project) {
        Project saved = projectRepository.save(project);

        try {
            CollaboratorRequestModel ownerCollab = CollaboratorRequestModel.builder()
                    .projectId(saved.getProjectId())
                    .userId(saved.getOwnerId())
                    .role(CollaboratorRole.OWNER)
                    .permissions(null)
                    .build();

            collaboratorService.addCollaborator(ownerCollab, "system");
        } catch (Exception e) {
            System.err.println("Failed to create owner collaborator: " + e.getMessage());
        }

        return saved;
    }

    @Override
    public Project updateProject(String projectId, Project updatedProject) {
        Project existing = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        if (updatedProject.getName() != null) {
            existing.setName(updatedProject.getName());
        }
        if (updatedProject.getDescription() != null) {
            existing.setDescription(updatedProject.getDescription());
        }
        if (updatedProject.getOwnerId() != null) {
            existing.setOwnerId(updatedProject.getOwnerId());
        }
        if (updatedProject.getProjectStatus() != null) {
            existing.setProjectStatus(updatedProject.getProjectStatus());
        }
        existing.setUpdatedDate(new Date());
        return projectRepository.save(existing);

    }

    @Override
    public Project deleteProject(String projectId) {
        Project toDelete = projectRepository.findByProjectId(projectId);
        toDelete.setProjectStatus(ProjectStatus.DELETED);
        return projectRepository.save(toDelete);
    }

    @Override
    public List<String> getAllProjectIds() {
        return projectRepository.findAll().stream()
                .map(Project::getProjectId)
                .collect(Collectors.toList());
    }
}
