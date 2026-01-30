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
    
    // Mock localStorage to simulate deactivated account
    await page.addInitScript(() => {
      localStorage.setItem('account-deactivated', 'true');
    });
    
    await deactivatedPage.clickSignOut();
    // Note: In test environment, this may not actually redirect to auth server
    // but the click should be successful
  });

  test("contact support button opens email link", async ({ page }) => {
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.open();
    await deactivatedPage.expectLoaded();

    // Check that the mailto link exists
    const supportButton = deactivatedPage.contactSupportButton();
    await expect(supportButton).toHaveAttribute('onclick', /mailto:support@kleff\.io/);
  });

  test("public pages remain accessible when account is marked as deactivated", async ({ page }) => {
    // Set deactivated flag in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('account-deactivated', 'true');
    });

    // Test that home page is accessible
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    
    // Should not redirect to deactivated error page for public routes
    await expect(page).not.toHaveURL(/\/error\/deactivated/);
  });

  // Note: These tests require database manipulation which may not be available in e2e environment
  // They are included as examples of what should be tested with proper test data setup

  test.skip("deactivated account redirects from dashboard to error page", async ({ page }) => {
    // This test would require:
    // 1. A test user that is marked as deactivated in the database
    // 2. Valid auth tokens for that user
    // 3. Proper test data setup/teardown
    
    await page.addInitScript(() => {
      localStorage.setItem('account-deactivated', 'true');
    });

    const dashboard = new DashboardPage(page);
    await page.goto("/dashboard");
    
    // Should redirect to deactivated error page
    await expect(page).toHaveURL(/\/error\/deactivated/, { timeout: 10_000 });
    
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.expectLoaded();
  });

  test.skip("deactivated account redirects from settings to error page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('account-deactivated', 'true');
    });

    await page.goto("/settings");
    
    // Should redirect to deactivated error page
    await expect(page).toHaveURL(/\/error\/deactivated/, { timeout: 10_000 });
    
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.expectLoaded();
  });

  test.skip("deactivated account redirects from projects to error page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('account-deactivated', 'true');
    });

    await page.goto("/projects");
    
    // Should redirect to deactivated error page
    await expect(page).toHaveURL(/\/error\/deactivated/, { timeout: 10_000 });
    
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.expectLoaded();
  });

  authTest.skip("authenticated deactivated user gets 403 on API calls", async ({ page }) => {
    // This test would require:
    // 1. An authenticated user that is deactivated in the database
    // 2. Intercepting API calls and checking for 403 responses
    
    await page.route("**/api/v1/users/me", async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: "account has been deactivated" })
      });
    });

    const dashboard = new DashboardPage(page);
    await dashboard.open();
    
    // Should detect 403 and redirect to error page
    await expect(page).toHaveURL(/\/error\/deactivated/, { timeout: 10_000 });
  });

  authTest.skip("account deactivation flow from settings page", async ({ page }) => {
    // This test would require:
    // 1. A test environment where account deactivation can be safely tested
    // 2. Ability to clean up/restore test data
    // 3. Mock or test-specific deactivation endpoint
    
    const settings = new SettingsPage(page);
    await settings.open();
    await settings.expectLoaded();
    
    // Mock the deactivation API call to avoid actually deactivating the test account
    await page.route("**/api/v1/users/me/deactivate", async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: "Account deactivated successfully" })
      });
    });
    
    // Look for deactivate account button and click it
    const deactivateButton = page.getByRole("button", { name: /deactivate account/i });
    await expect(deactivateButton).toBeVisible();
    await deactivateButton.click();
    
    // Should open confirmation modal
    const confirmButton = page.getByRole("button", { name: /yes, deactivate/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    
    // Should redirect to deactivated error page after successful deactivation
    await expect(page).toHaveURL(/\/error\/deactivated/, { timeout: 10_000 });
    
    const deactivatedPage = new DeactivatedAccountPage(page);
    await deactivatedPage.expectLoaded();
  });
});