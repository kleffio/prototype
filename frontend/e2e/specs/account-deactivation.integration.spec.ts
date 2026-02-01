import { expect } from "@playwright/test";
import { test } from "../fixtures/base.fixture";
import { DeactivatedAccountPage } from "../pages/dashboard/deactivated-account.page";
import { DeactivationTestUtils } from "../utils/deactivation";

test.describe("Account Deactivation - Safe Integration Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/users/me/deactivate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Deactivation blocked" })
      });
    });
  });

  test("deactivated account error page displays correctly", async ({ page }) => {
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.open();
    await deactivatedPage.expectLoaded();

    // Verify key elements are present with specific selectors
    await expect(page.getByRole("heading", { name: "Account Deactivated" })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  test.skip("deactivated user API response - dashboard redirect", async ({ page }) => {
    // This test requires authenticated context - skipping for now
    // TODO: Implement with proper auth fixture
    const utils = new DeactivationTestUtils(page);
    await utils.mockDeactivatedUserAPI();
    await utils.expectProtectedRouteRedirect("/dashboard");
  });

  test.skip("deactivated user API response - settings redirect", async ({ page }) => {
    // This test requires authenticated context - skipping for now
    // TODO: Implement with proper auth fixture
    const utils = new DeactivationTestUtils(page);
    await utils.mockDeactivatedUserAPI();
    await utils.expectProtectedRouteRedirect("/settings");
  });

  test("public pages remain accessible for deactivated users", async ({ page }) => {
    // Mock the user API to return deactivation error
    await page.route("**/api/v1/users/me", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: "account has been deactivated"
        })
      });
    });

    const utils = new DeactivationTestUtils(page);
    await utils.expectPublicRouteAccessible("/");
  });

  test("sign out button is visible", async ({ page }) => {
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.open();

    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible({ timeout: 10_000 });
  });

  test("contact support button is visible", async ({ page }) => {
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.open();

    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("button", { name: /contact support/i })).toBeVisible({
      timeout: 10_000
    });
  });

  test("error page loads without authentication", async ({ page }) => {
    await page.goto("/error/deactivated");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Account Deactivated" })).toBeVisible({
      timeout: 10_000
    });
  });
});
