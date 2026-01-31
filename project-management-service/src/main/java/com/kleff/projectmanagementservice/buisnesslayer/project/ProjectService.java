package com.kleff.projectmanagementservice.buisnesslayer;

import com.kleff.projectmanagementservice.datalayer.project.Project;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface ProjectService {
    List<Project> getAllOwnedProjects(String ownerId);

    Project getProjectById(String projectId);

    Project createProject(Project project);

    Project updateProject(String projectId, Project updatedProject);

    Project deleteProject(String projectId);

    List<String> getAllProjectIds();

}
