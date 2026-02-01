import { expect } from "@playwright/test";
import { BaseComponent } from "./base.component";

/**
 * Project creation modal component
 * Used on dashboard and projects pages to create new projects
 */

export class ProjectModal extends BaseComponent {
  async open() {
    await this.page
      .getByRole("button", { name: "Deploy New Project" })
      .or(this.page.getByRole("button", { name: "Create Project" }))
      .first()
      .click();
  }

  async expectLoaded() {
    await expect(this.projectCreateModal()).toBeVisible({ timeout: 30_000 });

    await expect(this.projectNameInput()).toBeVisible({ timeout: 30_000 });
    await expect(this.projectDescriptionInput()).toBeVisible({ timeout: 30_000 });
    await expect(this.createButton()).toBeVisible({ timeout: 30_000 });
  }

  projectCreateModal() {
    return this.page.getByTestId("create-project-modal");
  }

  projectNameInput() {
    return this.page.getByLabel(/^project name/i);
  }

  projectDescriptionInput() {
    return this.page.getByLabel(/^description/i);
  }

  createButton() {
    return this.projectCreateModal().getByRole("button", { name: /^create project$/i });
  }

  async createProject(name: string, description: string) {
    const nameInput = this.projectNameInput();
    await nameInput.fill(name);

    const descInput = this.projectDescriptionInput();
    await descInput.fill(description);

    const create = this.createButton();
    await expect(create).toBeEnabled({ timeout: 30_000 });
    await create.click();

    // Wait for either success (modal closes) or failure (error appears)
    const modal = this.projectCreateModal();
    const errorMessage = modal.locator("text=/Failed to create project|Project name is required/");

    try {
      // Wait for modal to close (success) with shorter timeout
      await expect(modal).not.toBeVisible({ timeout: 5000 });
    } catch {
      // If modal didn't close, check for error
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      throw new Error("Project creation failed - API error or validation issue");
    }

    // Wait a moment for the creation to complete
    await this.page.waitForTimeout(1000);
  }
}
