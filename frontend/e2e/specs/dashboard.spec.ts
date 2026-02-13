import { authTest as test } from "../fixtures/auth.fixture";
import { DashboardPage } from "../pages/dashboard/dashboard.page";
import { expect } from "@playwright/test";

test.describe("Dashboard", () => {
    
  test("loads correctly with all components", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.expectLoaded();
    
    await dashboard.expectMetricsCardsVisible();
    await dashboard.expectGraphsVisible();
  });

  test("tutorial guide opens and closes", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.expectLoaded();

    await dashboard.openTutorial();
    await dashboard.expectTutorialOpen();

    await expect(page.getByText("Project Overview")).toBeVisible();
    await expect(page.getByText("Resource Monitoring")).toBeVisible();

    await dashboard.closeTutorial();
    await dashboard.expectTutorialClosed();
  });

  test("tutorial images can be zoomed", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.expectLoaded();

    await dashboard.openTutorial();
    await dashboard.expectTutorialOpen();

    const firstImage = page.locator("img[alt='Dashboard overview statistics cards']");
    await expect(firstImage).toBeVisible();

    await firstImage.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").locator("img")).toHaveAttribute("src", "/assets/tutorial/dashboard-overview.png");
    
    await page.getByRole("dialog").locator("button").click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

});
