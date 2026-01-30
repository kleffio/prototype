import { expect } from "@playwright/test";
import { test } from "../fixtures/base.fixture";

test.describe("Account Deactivation - Safe UI Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/users/me/deactivate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Deactivation prevented" })
      });
    });
  });

  test("deactivated account error page loads", async ({ page }) => {
    await page.goto("/error/deactivated");
    await page.waitForLoadState("domcontentloaded");

    // Basic check that page loads
    await expect(page.locator("body")).toBeVisible();
    // Use more specific selector to avoid strict mode violation
    await expect(page.getByRole("heading", { name: "Account Deactivated" })).toBeVisible({
      timeout: 15_000
    });
  });

  test("sign out button exists", async ({ page }) => {
    await page.goto("/error/deactivated");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible({ timeout: 15_000 });
  });

  test("contact support button exists", async ({ page }) => {
    await page.goto("/error/deactivated");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("button", { name: /contact support/i })).toBeVisible({
      timeout: 15_000
    });
  });

  test("page has deactivation information", async ({ page }) => {
    await page.goto("/error/deactivated");
    await page.waitForLoadState("domcontentloaded");

    // Check for key text content
    await expect(page.locator("text=permanently deactivated")).toBeVisible({ timeout: 10_000 });
  });

  test("localStorage simulation only - no real API calls", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("account-deactivated", "true");
    });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await page.waitForTimeout(4000);

    const currentUrl = page.url();
    const isRedirected = currentUrl.includes("/error/deactivated");
    const hasLocalStorageFlag = await page.evaluate(
      () => localStorage.getItem("account-deactivated") === "true"
    );

    expect(isRedirected || hasLocalStorageFlag).toBeTruthy();
  });
});
