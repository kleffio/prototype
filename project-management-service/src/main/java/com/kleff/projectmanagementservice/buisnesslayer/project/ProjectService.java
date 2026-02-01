package com.kleff.projectmanagementservice.buisnesslayer.project;

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

    /**
     * Get all project-related data for cleanup during deletion
     */
    ProjectDeletionData getProjectDeletionData(String projectId);

    /**
     * Data transfer object for project deletion operations
     */
    class ProjectDeletionData {
        private final Project project;
        private final List<String> invitationIds;
        private final List<Integer> collaboratorIds;
        private final List<Integer> customRoleIds;

        public ProjectDeletionData(Project project, List<String> invitationIds,
                List<Integer> collaboratorIds, List<Integer> customRoleIds) {
            this.project = project;
            this.invitationIds = invitationIds;
            this.collaboratorIds = collaboratorIds;
            this.customRoleIds = customRoleIds;
        }

        // Getters
        public Project getProject() {
            return project;
        }

        public List<String> getInvitationIds() {
            return invitationIds;
        }

        public List<Integer> getCollaboratorIds() {
            return collaboratorIds;
        }

        public List<Integer> getCustomRoleIds() {
            return customRoleIds;
        }
    }
}
