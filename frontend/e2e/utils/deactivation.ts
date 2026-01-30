import { Page, expect } from "@playwright/test";

/**
 * Utility functions for account deactivation testing
 */
export class DeactivationTestUtils {
  constructor(private readonly page: Page) {}

  /**
   * Simulates a deactivated account by setting the localStorage flag
   */
  async setDeactivatedAccountFlag() {
    await this.page.addInitScript(() => {
      localStorage.setItem('account-deactivated', 'true');
    });
  }

  /**
   * Clears the deactivated account flag
   */
  async clearDeactivatedAccountFlag() {
    await this.page.addInitScript(() => {
      localStorage.removeItem('account-deactivated');
    });
  }

  /**
   * Mocks the user API to return 403 for deactivated accounts
   */
  async mockDeactivatedUserAPI() {
    await this.page.route("**/api/v1/users/me", async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: "account has been deactivated" 
        })
      });
    });
  }

  /**
   * Mocks the deactivation API call to avoid actually deactivating accounts
   */
  async mockDeactivationAPI() {
    await this.page.route("**/api/v1/users/me/deactivate", async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          message: "Account deactivated successfully" 
        })
      });
    });
  }

  /**
   * Expects that navigation to a protected route redirects to the deactivated error page
   */
  async expectProtectedRouteRedirect(protectedPath: string) {
    // Navigate to the path and wait for potential redirect
    await this.page.goto(protectedPath, { waitUntil: 'domcontentloaded' });
    
    // Give the UserContext time to process the route change and redirect
    await this.page.waitForTimeout(1000);
    
    // Check if we were redirected to the error page
    await expect(this.page).toHaveURL(/\/error\/deactivated/, { timeout: 15_000 });
  }

  /**
   * Expects that a public route does NOT redirect to the deactivated error page
   */
  async expectPublicRouteAccessible(publicPath: string) {
    await this.page.goto(publicPath);
    await expect(this.page).not.toHaveURL(/\/error\/deactivated/);
    await expect(this.page.locator("body")).toBeVisible();
  }

  /**
   * Tests the complete deactivation flow from settings
   */
  async testDeactivationFlow() {
    // Mock APIs to avoid actually deactivating
    await this.mockDeactivationAPI();
    
    // Click deactivate account button
    const deactivateButton = this.page.getByRole("button", { name: /deactivate account/i });
    await expect(deactivateButton).toBeVisible();
    await deactivateButton.click();
    
    // Confirm in modal
    const confirmButton = this.page.getByRole("button", { name: /yes, deactivate/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    
    // Should redirect to deactivated error page
    await expect(this.page).toHaveURL(/\/error\/deactivated/, { timeout: 10_000 });
  }
}