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

    await page.route("**/api/v1/users/me", async (route) => {
      const hasDeactivatedFlag = await page.evaluate(
        () => localStorage.getItem("account-deactivated") === "true"
      );

      if (hasDeactivatedFlag) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ error: "account has been deactivated" })
        });
      } else {
        await route.continue();
      }
    });
  });

  test("deactivated account error page displays correctly", async ({ page }) => {
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.open();
    await deactivatedPage.expectLoaded();

    // Verify key elements are present with more flexible selectors
    await expect(page.locator("text=Account Deactivated")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  test("localStorage simulation - dashboard redirect", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("account-deactivated", "true");
    });

    const utils = new DeactivationTestUtils(page);
    await utils.expectProtectedRouteRedirect("/dashboard");
  });

  test("localStorage simulation - settings redirect", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("account-deactivated", "true");
    });

    const utils = new DeactivationTestUtils(page);
    await utils.expectProtectedRouteRedirect("/settings");
  });

  test("public pages remain accessible with simulation", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("account-deactivated", "true");
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
    await expect(page.locator("text=Account Deactivated")).toBeVisible({ timeout: 10_000 });
  });
});
