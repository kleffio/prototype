import { expect } from "@playwright/test";
import { test } from "../fixtures/base.fixture";
import { authTest } from "../fixtures/auth.fixture";
import { DeactivatedAccountPage } from "../pages/dashboard/deactivated-account.page";
import { DashboardPage } from "../pages/dashboard/dashboard.page";
import { SettingsPage } from "../pages/dashboard/settings.page";

test.describe("Account Deactivation", () => {
  test("deactivated account error page loads correctly", async ({ page }) => {
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.open();
    await deactivatedPage.expectLoaded();
  });

  test("deactivated account error page has working sign out button", async ({ page }) => {
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.open();
    await deactivatedPage.expectLoaded();

    await page.addInitScript(() => {
      localStorage.setItem("account-deactivated", "true");
    });

    await deactivatedPage.clickSignOut();
  });

  test("contact support button opens email link", async ({ page }) => {
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.open();
    await deactivatedPage.expectLoaded();

    // Check that the mailto link exists
    const supportButton = deactivatedPage.contactSupportButton();
    await expect(supportButton).toHaveAttribute("onclick", /mailto:support@kleff\.io/);
  });

  test("public pages remain accessible when account is marked as deactivated", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("account-deactivated", "true");
    });

    // Test that home page is accessible
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    await expect(page).not.toHaveURL(/\/error\/deactivated/);
  });

  test.skip("deactivated account redirects from dashboard to error page", async ({ page }) => {
    // 3. Proper test data setup/teardown

    await page.addInitScript(() => {
      localStorage.setItem("account-deactivated", "true");
    });

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/error\/deactivated/, { timeout: 10_000 });

    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.expectLoaded();
  });

  test.skip("deactivated account redirects from settings to error page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("account-deactivated", "true");
    });

    await page.goto("/settings");

    await expect(page).toHaveURL(/\/error\/deactivated/, { timeout: 10_000 });

    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.expectLoaded();
  });

  test.skip("deactivated account redirects from projects to error page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("account-deactivated", "true");
    });

    await page.goto("/projects");

    await expect(page).toHaveURL(/\/error\/deactivated/, { timeout: 10_000 });

    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.expectLoaded();
  });

  authTest.skip("authenticated deactivated user gets 403 on API calls", async ({ page }) => {
    await page.route("**/api/v1/users/me", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "account has been deactivated" })
      });
    });

    const dashboard = new DashboardPage(page);
    await dashboard.open();

    await expect(page).toHaveURL(/\/error\/deactivated/, { timeout: 10_000 });
  });

  authTest.skip("account deactivation flow from settings page", async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.open();
    await settings.expectLoaded();

    await page.route("**/api/v1/users/me/deactivate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Account deactivated successfully" })
      });
    });

    const deactivateButton = page.getByRole("button", { name: /deactivate account/i });
    await expect(deactivateButton).toBeVisible();
    await deactivateButton.click();

    const confirmButton = page.getByRole("button", { name: /yes, deactivate/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(page).toHaveURL(/\/error\/deactivated/, { timeout: 10_000 });

    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.expectLoaded();
  });
});
