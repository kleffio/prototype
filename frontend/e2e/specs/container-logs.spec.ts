import { authTest as test } from "../fixtures/auth.fixture";
import { DashboardPage } from "../pages/dashboard/dashboard.page";
import { ProjectsPage } from "../pages/dashboard/projects.page";
import { ProjectDetailPage } from "../pages/dashboard/project-detail.page";
import { ContainerModal } from "../components/container-modal";
import { generateTestString } from "../utils/strings";

test.describe("Container Logs", () => {
  let projectName: string;
  let containerName: string;

  test.beforeAll(async ({ browser }) => {
    projectName = generateTestString("logs-project");
    containerName = generateTestString("container");

    const context = await browser.newContext({
      storageState: "e2e/storage/auth.json"
    });
    const page = await context.newPage();

    const dash = new DashboardPage(page);
    await dash.open();
    await dash.expectLoaded();
    await dash.createProject(projectName, "Project for logs testing");

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
    await containerModal.createContainer(containerName, "nginx:latest", "8080");

    await context.close();
  });

  test("displays 'View Logs' button on container card", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    await detailPage.expectRunningContainersSection();
    await detailPage.expectContainerExists(containerName);

    await detailPage.expectViewLogsButton(containerName);
  });

  test("opens logs sheet when 'View Logs' button is clicked", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    await detailPage.expectRunningContainersSection();
    await detailPage.expectContainerExists(containerName);

    await detailPage.clickViewLogs(containerName);
    await detailPage.expectLogsSheetOpen(containerName);
  });

  test("closes logs sheet when close button is clicked", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    await detailPage.expectRunningContainersSection();
    await detailPage.expectContainerExists(containerName);

    await detailPage.clickViewLogs(containerName);
    await detailPage.expectLogsSheetOpen(containerName);

    await detailPage.closeLogsSheet();
    await detailPage.expectLogsSheetClosed();
  });

  test("displays container name in logs sheet header", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    await detailPage.expectRunningContainersSection();
    await detailPage.expectContainerExists(containerName);

    await detailPage.clickViewLogs(containerName);
    await detailPage.expectLogsSheetOpen(containerName);
    await detailPage.expectLogsSheetTitle(containerName);
  });

  test("displays 'No logs found' message when container has no logs", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    await detailPage.expectRunningContainersSection();
    await detailPage.expectContainerExists(containerName);

    await detailPage.clickViewLogs(containerName);
    await detailPage.expectLogsSheetOpen(containerName);

    // Wait for logs to load
    await page.waitForTimeout(2000);

    await detailPage.expectNoLogsMessage();
  });

  test("displays logs viewer with refresh button", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    await detailPage.expectRunningContainersSection();
    await detailPage.expectContainerExists(containerName);

    await detailPage.clickViewLogs(containerName);
    await detailPage.expectLogsSheetOpen(containerName);

    await detailPage.expectLogsViewerVisible();
    await detailPage.expectRefreshButtonVisible();
  });

  test("can manually refresh logs", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    await detailPage.expectRunningContainersSection();
    await detailPage.expectContainerExists(containerName);

    await detailPage.clickViewLogs(containerName);
    await detailPage.expectLogsSheetOpen(containerName);

    await detailPage.clickRefreshLogs();

    // Verify refresh button shows loading state
    await detailPage.expectRefreshButtonLoading();
  });

  test("opens logs for different containers independently", async ({ page }) => {
    // Create a second container
    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    const container2Name = generateTestString("container");
    const containerModal = new ContainerModal(page);
    await containerModal.open();
    await containerModal.expectLoaded();
    await containerModal.createContainer(container2Name, "redis:alpine", "6379");

    await detailPage.expectContainerExists(container2Name);

    // Open logs for first container
    await detailPage.clickViewLogs(containerName);
    await detailPage.expectLogsSheetOpen(containerName);
    await detailPage.expectLogsSheetTitle(containerName);

    await detailPage.closeLogsSheet();
    await detailPage.expectLogsSheetClosed();

    // Open logs for second container
    await detailPage.clickViewLogs(container2Name);
    await detailPage.expectLogsSheetOpen(container2Name);
    await detailPage.expectLogsSheetTitle(container2Name);
  });

  test("logs sheet slides in from the right", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    await detailPage.expectRunningContainersSection();
    await detailPage.expectContainerExists(containerName);

    await detailPage.clickViewLogs(containerName);

    // Verify sheet animation and position
    await detailPage.expectLogsSheetAnimatesFromRight();
  });

  test("can filter logs", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await projectsPage.expectLoaded();

    const projectCell = page.getByRole("cell", { name: projectName, exact: true });
    await projectCell.click();

    const detailPage = new ProjectDetailPage(page);
    await detailPage.expectLoaded();

    await detailPage.expectRunningContainersSection();
    await detailPage.expectContainerExists(containerName);

    await detailPage.clickViewLogs(containerName);
    await detailPage.expectLogsSheetOpen(containerName);

    // Verify filters exist
    await detailPage.expectLogsFiltersVisible();

    // Type in search
    await detailPage.fillLogsSearch("searching text");

    // Select severity
    // Note: Since we don't have real logs driving this in E2E environment easily without seeding,
    // we primarily check that the interaction works and controls state.
    await detailPage.selectLogsSeverity("Error");

    // Select time range
    await detailPage.selectLogsTimeRange("Last 24h");

    // Clear filters
    await detailPage.clickClearFilters();

    // Verify inputs reset (Search is empty)
    await expect(page.getByPlaceholder("Search logs...")).toBeEmpty();
  });
});
