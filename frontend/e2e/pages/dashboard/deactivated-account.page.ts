import { expect } from "@playwright/test";
import { BasePage } from "../base.page";

export class DeactivatedAccountPage extends BasePage {
  async open() {
    await this.goto("/error/deactivated");
  }

  async expectLoaded() {
    // Wait for the page to load
    await this.page.waitForLoadState("domcontentloaded");

    // More flexible selectors
    await expect(this.page.getByText("Account Deactivated").first()).toBeVisible({
      timeout: 30_000
    });
    await expect(this.signOutButton()).toBeVisible({ timeout: 10_000 });
  }

  signOutButton() {
    return this.page.getByRole("button", { name: /sign out/i });
  }

  contactSupportButton() {
    return this.page.getByRole("button", { name: /contact support/i });
  }

  async clickSignOut() {
    await this.signOutButton().click();
  }

  async clickContactSupport() {
    await this.contactSupportButton().click();
  }

  async expectSignOutRedirect() {
    // Should redirect to auth.kleff.io for sign out
    await expect(this.page).toHaveURL(/auth\.kleff\.io/, { timeout: 10_000 });
  }

  async expectContactSupportEmail() {
    // Should open mailto link
    await this.page.waitForEvent("popup");
  }
}
