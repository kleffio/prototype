import { authTest as test } from "../fixtures/auth.fixture";
import { DashboardPage } from "../pages/dashboard/dashboard.page";
import { ProjectsPage } from "../pages/dashboard/projects.page";
import { ProjectDetailPage } from "../pages/dashboard/project-detail.page";
import { ContainerModal } from "../components/container-modal";
import { generateTestString } from "../utils/strings";

test.describe("Container Status Display", () => {
  test("container initially shows 'Checking...' status", async ({ page }) => {
    const projectName = generateTestString("status-project");
    const containerName = generateTestString("status-container");

    // Mock project creation API to avoid backend dependency
    await page.route("**/api/v1/projects", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-project-id",
          name: projectName,
          description: "Project for container status testing",
          createdAt: new Date().toISOString()
        })
      });
    });

    // Setup: create project and container
    const dash = new DashboardPage(page);
    await dash.open();
    await dash.expectLoaded();
    await dash.createProject(projectName, "Project for container status testing");

    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    const containerModal = new ContainerModal(page);
    await containerModal.open();
    await containerModal.expectLoaded();
    await containerModal.createContainer(containerName, "8080", {
      url: "https://github.com/user/repo.git",
      branch: "main"
    });

    // Container should initially show "Checking..." status
    await detailPage.expectContainerStatus(containerName, "checking");
  });

  test("container shows 'Up' status when ping succeeds", async ({ page }) => {
    const projectName = generateTestString("up-status-project");
    const containerName = generateTestString("up-status-container");

    // Mock project creation API to avoid backend dependency
    await page.route("**/api/v1/projects", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-project-id",
          name: projectName,
          description: "Project for up status testing",
          createdAt: new Date().toISOString()
        })
      });
    });

    // Setup: create project and container
    const dash = new DashboardPage(page);
    await dash.open();
    await dash.expectLoaded();
    await dash.createProject(projectName, "Project for up status testing");

    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    const containerModal = new ContainerModal(page);
    await containerModal.open();
    await containerModal.expectLoaded();
    await containerModal.createContainer(containerName, "8080", {
      url: "https://github.com/user/repo.git",
      branch: "main"
    });

    // Get container ID to mock the status
    const containerId = await detailPage.getContainerId(containerName);

    // Mock successful ping response
    await detailPage.mockContainerStatus(containerId, "up");

    // Wait for status transition from "Checking..." to "Up"
    await detailPage.waitForStatusTransition(containerName, "checking", "up");

    // Verify final status
    await detailPage.expectContainerStatus(containerName, "up");
  });

  test("container shows 'Down' status when ping fails with server error", async ({ page }) => {
    const projectName = generateTestString("down-status-project");
    const containerName = generateTestString("down-status-container");

    // Mock project creation API to avoid backend dependency
    await page.route("**/api/v1/projects", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-project-id",
          name: projectName,
          description: "Project for down status testing",
          createdAt: new Date().toISOString()
        })
      });
    });

    // Setup: create project and container
    const dash = new DashboardPage(page);
    await dash.open();
    await dash.expectLoaded();
    await dash.createProject(projectName, "Project for down status testing");

    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    const containerModal = new ContainerModal(page);
    await containerModal.open();
    await containerModal.expectLoaded();
    await containerModal.createContainer(containerName, "8080", {
      url: "https://github.com/user/repo.git",
      branch: "main"
    });

    // Get container ID to mock the status
    const containerId = await detailPage.getContainerId(containerName);

    // Mock failed ping response (server error)
    await detailPage.mockContainerStatus(containerId, "down");

    // Wait for status transition from "Checking..." to "Down"
    await detailPage.waitForStatusTransition(containerName, "checking", "down");

    // Verify final status
    await detailPage.expectContainerStatus(containerName, "down");
  });

  test("container shows 'Down' status when ping fails with network error", async ({ page }) => {
    const projectName = generateTestString("network-error-project");
    const containerName = generateTestString("network-error-container");

    // Mock project creation API to avoid backend dependency
    await page.route("**/api/v1/projects", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-project-id",
          name: projectName,
          description: "Project for network error testing",
          createdAt: new Date().toISOString()
        })
      });
    });

    // Setup: create project and container
    const dash = new DashboardPage(page);
    await dash.open();
    await dash.expectLoaded();
    await dash.createProject(projectName, "Project for network error testing");

    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    const containerModal = new ContainerModal(page);
    await containerModal.open();
    await containerModal.expectLoaded();
    await containerModal.createContainer(containerName, "8080", {
      url: "https://github.com/user/repo.git",
      branch: "main"
    });

    // Get container ID to mock the status
    const containerId = await detailPage.getContainerId(containerName);

    // Mock network error (connection refused)
    await detailPage.mockContainerNetworkError(containerId);

    // Wait for status transition from "Checking..." to "Down"
    await detailPage.waitForStatusTransition(containerName, "checking", "down");

    // Verify final status
    await detailPage.expectContainerStatus(containerName, "down");
  });

  test("status updates periodically", async ({ page }) => {
    const projectName = generateTestString("periodic-status-project");
    const containerName = generateTestString("periodic-status-container");

    // Mock project creation API to avoid backend dependency
    await page.route("**/api/v1/projects", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-project-id",
          name: projectName,
          description: "Project for periodic status testing",
          createdAt: new Date().toISOString()
        })
      });
    });

    // Setup: create project and container
    const dash = new DashboardPage(page);
    await dash.open();
    await dash.expectLoaded();
    await dash.createProject(projectName, "Project for periodic status testing");

    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    const containerModal = new ContainerModal(page);
    await containerModal.open();
    await containerModal.expectLoaded();
    await containerModal.createContainer(containerName, "8080", {
      url: "https://github.com/user/repo.git",
      branch: "main"
    });

    // Get container ID to mock the status
    const containerId = await detailPage.getContainerId(containerName);

    // Start with "up" status
    await detailPage.mockContainerStatus(containerId, "up");
    await detailPage.waitForStatusTransition(containerName, "checking", "up");
    await detailPage.expectContainerStatus(containerName, "up");

    // Change mock to "down" - status should update on next check (within 35 seconds)
    await detailPage.mockContainerStatus(containerId, "down");

    // Wait for status to update (should happen within 30-35 seconds)
    await detailPage.expectContainerStatus(containerName, "down", { timeout: 35000 });
  });
});

test.describe("Multiple Containers Status", () => {
  test("multiple containers show different statuses simultaneously", async ({ page }) => {
    const projectName = generateTestString("multi-status-project");
    const container1Name = generateTestString("status-container-1");
    const container2Name = generateTestString("status-container-2");

    // Mock project creation API to avoid backend dependency
    await page.route("**/api/v1/projects", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-project-id",
          name: projectName,
          description: "Project for multiple container status testing",
          createdAt: new Date().toISOString()
        })
      });
    });

    // Setup: create project and containers
    const dash = new DashboardPage(page);
    await dash.open();
    await dash.expectLoaded();
    await dash.createProject(projectName, "Project for multiple container status testing");

    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    // Create first container
    const containerModal1 = new ContainerModal(page);
    await containerModal1.open();
    await containerModal1.expectLoaded();
    await containerModal1.createContainer(container1Name, "8080", {
      url: "https://github.com/user/repo1.git",
      branch: "main"
    });

    // Create second container
    const containerModal2 = new ContainerModal(page);
    await containerModal2.open();
    await containerModal2.expectLoaded();
    await containerModal2.createContainer(container2Name, "3000", {
      url: "https://github.com/user/repo2.git",
      branch: "main"
    });

    // Get container IDs
    const container1Id = await detailPage.getContainerId(container1Name);
    const container2Id = await detailPage.getContainerId(container2Name);

    // Mock first container as "up", second as "down"
    await detailPage.mockContainerStatus(container1Id, "up");
    await detailPage.mockContainerStatus(container2Id, "down");

    // Wait for both containers to show their respective statuses
    await detailPage.waitForStatusTransition(container1Name, "checking", "up");
    await detailPage.waitForStatusTransition(container2Name, "checking", "down");

    // Verify final statuses
    await detailPage.expectContainerStatus(container1Name, "up");
    await detailPage.expectContainerStatus(container2Name, "down");
  });

  test("status changes are independent between containers", async ({ page }) => {
    const projectName = generateTestString("independent-status-project");
    const container1Name = generateTestString("independent-container-1");
    const container2Name = generateTestString("independent-container-2");

    // Mock project creation API to avoid backend dependency
    await page.route("**/api/v1/projects", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-project-id",
          name: projectName,
          description: "Project for independent status testing",
          createdAt: new Date().toISOString()
        })
      });
    });

    // Setup: create project and containers
    const dash = new DashboardPage(page);
    await dash.open();
    await dash.expectLoaded();
    await dash.createProject(projectName, "Project for independent status testing");

    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    // Create first container
    const containerModal1 = new ContainerModal(page);
    await containerModal1.open();
    await containerModal1.expectLoaded();
    await containerModal1.createContainer(container1Name, "8080", {
      url: "https://github.com/user/repo1.git",
      branch: "main"
    });

    // Create second container
    const containerModal2 = new ContainerModal(page);
    await containerModal2.open();
    await containerModal2.expectLoaded();
    await containerModal2.createContainer(container2Name, "3000", {
      url: "https://github.com/user/repo2.git",
      branch: "main"
    });

    // Get container IDs
    const container1Id = await detailPage.getContainerId(container1Name);
    const container2Id = await detailPage.getContainerId(container2Name);

    // Start with both containers "up"
    await detailPage.mockContainerStatus(container1Id, "up");
    await detailPage.mockContainerStatus(container2Id, "up");

    await detailPage.waitForStatusTransition(container1Name, "checking", "up");
    await detailPage.waitForStatusTransition(container2Name, "checking", "up");

    // Change only container2 to "down"
    await detailPage.mockContainerStatus(container2Id, "down");

    // Wait for container2 to change while container1 stays "up"
    await detailPage.expectContainerStatus(container2Name, "down", { timeout: 35000 });

    // Verify container1 is still "up"
    await detailPage.expectContainerStatus(container1Name, "up");
  });
});
