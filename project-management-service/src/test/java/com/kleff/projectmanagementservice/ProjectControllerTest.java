package com.kleff.projectmanagementservice;

import com.kleff.projectmanagementservice.buisnesslayer.project.ProjectService;
import com.kleff.projectmanagementservice.datalayer.project.Project;
import com.kleff.projectmanagementservice.datalayer.project.ProjectRepository;
import com.kleff.projectmanagementservice.presentationlayer.project.ProjectController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.Date;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProjectController.class)
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;
    @MockBean
    private ProjectRepository projectRepository;

    private Project testProject1;
    private Project testProject2;
    private String testUserId;

    @BeforeEach
    void setUp() {
        testUserId = "user-123-abc";
        Date now = new Date();

        testProject1 = new Project();
        testProject1.setProjectId("project-1");
        testProject1.setName("Test Project 1");
        testProject1.setOwnerId(testUserId);
        testProject1.setCreatedDate(now);
        testProject1.setUpdatedDate(now);

        testProject2 = new Project();
        testProject2.setProjectId("project-2");
        testProject2.setName("Test Project 2");
        testProject2.setOwnerId(testUserId);
        testProject2.setCreatedDate(now);
        testProject2.setUpdatedDate(now);
    }

    // ============ GET /api/v1/projects Tests ============

    @Test
    void getAllOwnedProjects_WithValidJwt_ReturnsUserProjects() throws Exception {
        // Arrange
        List<Project> userProjects = Arrays.asList(testProject1, testProject2);
        when(projectService.getAllOwnedProjects(testUserId)).thenReturn(userProjects);

        // Act & Assert
        mockMvc.perform(get("/api/v1/projects")
                .with(jwt().jwt(jwt -> jwt.subject(testUserId))))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].projectId", is("project-1")))
                .andExpect(jsonPath("$[0].name", is("Test Project 1")))
                .andExpect(jsonPath("$[0].ownerId", is(testUserId)))
                .andExpect(jsonPath("$[1].projectId", is("project-2")))
                .andExpect(jsonPath("$[1].name", is("Test Project 2")));
    }

    @Test
    void getAllOwnedProjects_WithValidJwt_ReturnsEmptyList_WhenNoProjects() throws Exception {
        // Arrange
        when(projectService.getAllOwnedProjects(testUserId)).thenReturn(Arrays.asList());

        // Act & Assert
        mockMvc.perform(get("/api/v1/projects")
                .with(jwt().jwt(jwt -> jwt.subject(testUserId))))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void getAllOwnedProjects_WithDifferentUser_ReturnsTheirProjects() throws Exception {
        // Arrange
        String differentUserId = "user-456-xyz";
        Project otherUserProject = new Project();
        otherUserProject.setProjectId("project-3");
        otherUserProject.setName("Other User Project");
        otherUserProject.setOwnerId(differentUserId);

        when(projectService.getAllOwnedProjects(differentUserId))
                .thenReturn(Arrays.asList(otherUserProject));

        // Act & Assert
        mockMvc.perform(get("/api/v1/projects")
                .with(jwt().jwt(jwt -> jwt.subject(differentUserId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].ownerId", is(differentUserId)));
    }

    @Test
    void getAllOwnedProjects_WithoutAuthentication_ReturnsUnauthorized() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/v1/projects"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getAllOwnedProjects_WithAuthentikClaims_ExtractsUserIdCorrectly() throws Exception {
        // Arrange
        String authentikUserId = "authentik-user-789";
        when(projectService.getAllOwnedProjects(authentikUserId))
                .thenReturn(Arrays.asList(testProject1));

        // Act & Assert - Simulating Authentik JWT with typical claims
        mockMvc.perform(get("/api/v1/projects")
                .with(jwt()
                        .jwt(jwt -> jwt
                                .subject(authentikUserId)
                                .claim("email", "user@example.com")
                                .claim("preferred_username", "testuser")
                                .claim("groups", Arrays.asList("users")))))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    // ============ POST /api/v1/projects Tests ============

    @Test
    void createProject_WithValidJwt_CreatesProjectWithOwnerId() throws Exception {
        // Arrange
        Project newProject = new Project();
        newProject.setName("New Project");
        newProject.setDescription("Project description");

        Project createdProject = new Project();
        createdProject.setProjectId("project-new");
        createdProject.setName("New Project");
        createdProject.setDescription("Project description");
        createdProject.setOwnerId(testUserId);
        createdProject.setCreatedDate(new Date());
        createdProject.setUpdatedDate(new Date());

        when(projectService.createProject(any(Project.class))).thenReturn(createdProject);

        // Act & Assert
        mockMvc.perform(post("/api/v1/projects")
                .with(jwt().jwt(jwt -> jwt.subject(testUserId)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "projectName": "New Project",
                            "description": "Project description"
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.projectId", is("project-new")))
                .andExpect(jsonPath("$.name", is("New Project")))
                .andExpect(jsonPath("$.ownerId", is(testUserId)));
    }

    @Test
    void createProject_WithoutAuthentication_ReturnsUnauthorized() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/api/v1/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "projectName": "New Project"
                        }
                        """))
                .andExpect(status().isForbidden());
    }

    @Test
    void createProject_WithDifferentUser_SetsCorrectOwnerId() throws Exception {
        // Arrange
        String differentUserId = "user-different-789";
        Project createdProject = new Project();
        createdProject.setProjectId("project-different");
        createdProject.setName("Different User Project");
        createdProject.setOwnerId(differentUserId);
        createdProject.setCreatedDate(new Date());
        createdProject.setUpdatedDate(new Date());

        when(projectService.createProject(any(Project.class))).thenReturn(createdProject);

        // Act & Assert
        mockMvc.perform(post("/api/v1/projects")
                .with(jwt().jwt(jwt -> jwt.subject(differentUserId)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "projectName": "Different User Project"
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerId", is(differentUserId)));
    }

    @Test
    void createProject_WithAuthentikClaims_CreatesProjectSuccessfully() throws Exception {
        // Arrange
        String authentikUserId = "authentik-user-create";
        Project createdProject = new Project();
        createdProject.setProjectId("project-authentik");
        createdProject.setName("Authentik User Project");
        createdProject.setOwnerId(authentikUserId);
        createdProject.setCreatedDate(new Date());
        createdProject.setUpdatedDate(new Date());

        when(projectService.createProject(any(Project.class))).thenReturn(createdProject);

        // Act & Assert - Simulating Authentik JWT
        mockMvc.perform(post("/api/v1/projects")
                .with(jwt()
                        .jwt(jwt -> jwt
                                .subject(authentikUserId)
                                .claim("email", "authentik@example.com")
                                .claim("preferred_username", "authentikuser")
                                .claim("email_verified", true)
                                .claim("groups", Arrays.asList("users", "developers"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "projectName": "Authentik User Project",
                            "description": "Created by Authentik user"
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerId", is(authentikUserId)));
    }

    @Test
    void createProject_WithMinimalData_CreatesSuccessfully() throws Exception {
        // Arrange
        Project createdProject = new Project();
        createdProject.setProjectId("project-minimal");
        createdProject.setName("Minimal Project");
        createdProject.setOwnerId(testUserId);
        createdProject.setCreatedDate(new Date());
        createdProject.setUpdatedDate(new Date());

        when(projectService.createProject(any(Project.class))).thenReturn(createdProject);

        // Act & Assert
        mockMvc.perform(post("/api/v1/projects")
                .with(jwt().jwt(jwt -> jwt.subject(testUserId)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "projectName": "Minimal Project"
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("Minimal Project")));
    }

    @Test
    void createProject_EnsuresOwnerIdIsSetFromJwt_EvenIfProvidedInBody() throws Exception {
        // Arrange
        String actualUserId = "actual-user-123";
        Project createdProject = new Project();
        createdProject.setProjectId("project-override");
        createdProject.setName("Override Test");
        createdProject.setOwnerId(actualUserId); // Should be set from JWT, not request body
        createdProject.setCreatedDate(new Date());
        createdProject.setUpdatedDate(new Date());

        when(projectService.createProject(any(Project.class))).thenReturn(createdProject);

        // Act & Assert - Even if ownerId is provided in body, JWT subject should be
        // used
        mockMvc.perform(post("/api/v1/projects")
                .with(jwt().jwt(jwt -> jwt.subject(actualUserId)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "name": "Override Test",
                            "ownerId": "malicious-user-999"
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerId", is(actualUserId))); // Should be from JWT, not body
    }
    // ============ GET /api/v1/projects/{projectId} Tests ============

    @Test
    void getProjectById_WhenProjectExists_ReturnsProject() throws Exception {
        when(projectService.getProjectById("project-1")).thenReturn(testProject1);

        mockMvc.perform(get("/api/v1/projects/project-1")
                .with(jwt().jwt(jwt -> jwt.subject(testUserId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId", is("project-1")))
                .andExpect(jsonPath("$.name", is("Test Project 1")));
    }

    @Test
    void getProjectById_WhenProjectDoesNotExist_ReturnsNotFound() throws Exception {
        when(projectService.getProjectById("missing-id")).thenReturn(null);

        mockMvc.perform(get("/api/v1/projects/missing-id")
                .with(jwt().jwt(jwt -> jwt.subject(testUserId))))
                .andExpect(status().isNotFound());
    }

    // ============ PATCH /api/v1/projects/{projectId} Tests ============

    @Test
    void patchProject_WhenUserIsOwner_UpdatesSuccessfully() throws Exception {
        // Arrange
        Project updatedProject = new Project();
        updatedProject.setName("Updated Project Name");

        Project returnedProject = new Project();
        returnedProject.setProjectId("project-1");
        returnedProject.setName("Updated Project Name");
        returnedProject.setOwnerId(testUserId);

        when(projectService.getProjectById("project-1")).thenReturn(testProject1);
        when(projectService.updateProject(eq("project-1"), any(Project.class)))
                .thenReturn(returnedProject);

        // Act & Assert
        mockMvc.perform(patch("/api/v1/projects/project-1")
                .with(jwt().jwt(jwt -> jwt.subject(testUserId)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "name": "Updated Project Name"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId", is("project-1")))
                .andExpect(jsonPath("$.name", is("Updated Project Name")));
    }

    @Test
    void patchProject_WhenUserIsNotOwner_ReturnsForbidden() throws Exception {
        // Someone else owns this project
        testProject1.setOwnerId("another-user-999");
        when(projectService.getProjectById("project-1")).thenReturn(testProject1);

        mockMvc.perform(patch("/api/v1/projects/project-1")
                .with(jwt().jwt(jwt -> jwt.subject(testUserId)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "name": "Updated Project Name"
                        }
                        """))
                .andExpect(status().isForbidden());
    }

    // @Test
    // void patchProject_WhenProjectDoesNotExist_ReturnsNotFound() throws Exception
    // {
    // when(projectService.getProjectById("missing-id")).thenReturn(null);
    //
    // mockMvc.perform(patch("/api/v1/projects/missing-id")
    // .with(jwt().jwt(jwt -> jwt.subject(testUserId)))
    // .contentType(MediaType.APPLICATION_JSON)
    // .content("""
    // {
    // "name": "Update"
    // }
    // """))
    // .andExpect(status().isNotFound());
    // }

    @Test
    void patchProject_WithoutAuthentication_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(patch("/api/v1/projects/project-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "name": "Updated Name"
                        }
                        """))
                .andExpect(status().isForbidden());
    }
    // ============ DELETE /api/v1/projects/{projectId} Tests ============

    @Test
    void deleteProject_WhenUserIsOwner_DeletesSuccessfully() throws Exception {
        when(projectService.getProjectById("project-1")).thenReturn(testProject1);
        when(projectService.deleteProject("project-1")).thenReturn(testProject1);

        mockMvc.perform(delete("/api/v1/projects/project-1")
                .with(jwt().jwt(jwt -> jwt.subject(testUserId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId", is("project-1")));
    }

    @Test
    void deleteProject_WhenUserIsNotOwner_ReturnsForbidden() throws Exception {
        testProject1.setOwnerId("different-owner-789");
        when(projectService.getProjectById("project-1")).thenReturn(testProject1);

        mockMvc.perform(delete("/api/v1/projects/project-1")
                .with(jwt().jwt(jwt -> jwt.subject(testUserId))))
                .andExpect(status().isForbidden());
    }

    // @Test
    // void deleteProject_WhenProjectDoesNotExist_ReturnsNotFound() throws Exception
    // {
    // when(projectService.getProjectById("missing-id")).thenReturn(null);
    //
    // mockMvc.perform(delete("/api/v1/projects/missing-id")
    // .with(jwt().jwt(jwt -> jwt.subject(testUserId))))
    // .andExpect(status().isNotFound());
    // }

    @Test
    void deleteProject_WithoutAuthentication_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(delete("/api/v1/projects/project-1"))
                .andExpect(status().isForbidden());
    }

}