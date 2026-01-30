import { authTest as test } from "../fixtures/auth.fixture";
import { DashboardPage } from "../pages/dashboard/dashboard.page";
import { ProjectsPage } from "../pages/dashboard/projects.page";
import { ProjectDetailPage } from "../pages/dashboard/project-detail.page";
import { ContainerModal } from "../components/container-modal";
import { ContainerDetailModal } from "../components/container-detail-modal";
import { generateTestString } from "../utils/strings";

test.describe("Delete Container", () => {
    let projectName: string;
    let containerName: string;

    test.beforeEach(async ({ page }) => {
        projectName = generateTestString("delete-project");
        containerName = generateTestString("delete-container");

        const dash = new DashboardPage(page);
        await dash.open();
        await dash.expectLoaded();
        await dash.createProject(projectName, "Project for delete container testing");

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
    });

    test("can delete a container from the container detail modal", async ({ page }) => {
        const detailPage = new ProjectDetailPage(page);
        await detailPage.expectLoaded();

        // Verify container exists initially
        await detailPage.expectContainerExists(containerName);

        // Open container detail modal
        const containerDetailModal = new ContainerDetailModal(page);
        await detailPage.openContainerDetailModal(containerName);
        await containerDetailModal.expectLoaded(containerName);

        // Delete container
        await containerDetailModal.deleteContainer();

        // Verify container no longer exists in project detail
        await detailPage.expectContainerMissing(containerName);
    });
});
