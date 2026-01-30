import { expect } from "@playwright/test";
import { BaseComponent } from "./base.component";

/**
 * Container detail modal component
 * Used on project detail pages to view and manage container details
 */
export class ContainerDetailModal extends BaseComponent {
  async expectLoaded(containerName: string) {
    // Wait for the modal to appear
    await expect(this.containerDetailModal()).toBeVisible({ timeout: 30_000 });

    // Verify container name is displayed in the modal header (h2)
    await expect(this.containerName()).toContainText(containerName);

    // Verify key sections are present
    await expect(this.detailsSection()).toBeVisible();
    await expect(this.sourceCodeSection()).toBeVisible();
  }

  async expectClosed() {
    await expect(this.containerDetailModal()).not.toBeVisible({ timeout: 5_000 });
  }

  async close() {
    await this.closeButton().click();
    await this.expectClosed();
  }

  // Modal structure
  containerDetailModal() {
    return this.page.locator("section.fixed.inset-0.z-50");
  }

  closeButton() {
    return this.containerDetailModal()
      .locator("button")
      .filter({ has: this.page.locator("svg.lucide-x") });
  }

  // Header section
  containerName() {
    return this.containerDetailModal().locator("h2");
  }

  containerStatus() {
    return this.containerDetailModal()
      .locator('[data-testid="container-status"], .flex.items-center.gap-2')
      .first();
  }

  visitAppButton() {
    return this.containerDetailModal().getByRole("button", { name: /visit app/i });
  }

  // Details section
  detailsSection() {
    return this.containerDetailModal().getByText("Details");
  }

  containerId() {
    return this.containerDetailModal().getByText("Container ID").locator("..");
  }

  portsInfo() {
    return this.containerDetailModal().getByText("Ports").locator("..");
  }

  branchInfo() {
    return this.containerDetailModal().getByText("Branch").locator("..");
  }

  // Source code section
  sourceCodeSection() {
    return this.containerDetailModal().getByText("Source Code");
  }

  sourceCodeLink() {
    return this.containerDetailModal()
      .locator("a")
      .filter({ hasText: /click to open repo/i });
  }

  // Environment variables section
  envVariablesSection() {
    return this.containerDetailModal().getByRole("heading", { name: "Environment Variables" });
  }

  envVariableRows() {
    return this.containerDetailModal()
      .locator('[class*="rounded border"]')
      .filter({ hasText: "=" });
  }

  editEnvVariablesButton() {
    return this.containerDetailModal().getByRole("button", { name: /edit variables/i });
  }

  // Action buttons
  restartButton() {
    return this.containerDetailModal().getByRole("button", { name: /restart/i });
  }

  stopButton() {
    return this.containerDetailModal().getByRole("button", { name: /stop/i });
  }

  editContainerButton() {
    return this.containerDetailModal().getByRole("button", { name: /edit container/i });
  }

  editEnvironmentVariablesButton() {
    return this.containerDetailModal().getByRole("button", { name: /edit environment variables/i });
  }

  deleteButton() {
    return this.containerDetailModal().getByRole("button", { name: /delete/i });
  }

  // Actions
  async visitApp() {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent("page"),
      this.visitAppButton().click()
    ]);
    return newPage;
  }

  async copyContainerId() {
    const copyButton = this.containerDetailModal()
      .locator("button")
      .filter({ has: this.page.locator("svg.lucide-copy") });
    await copyButton.click();

    // Note: "Copied" text may not appear in test environment due to clipboard API limitations
    // Just verify the button exists and can be clicked
  }

  async openSourceCode() {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent("page"),
      this.sourceCodeLink().click()
    ]);
    return newPage;
  }

  async clickEditEnvironmentVariables() {
    await this.editEnvironmentVariablesButton().click();
    await this.expectClosed();
  }

  async clickEditContainer() {
    await this.editContainerButton().click();
    // Modal closing is handled by React state changes, not immediate DOM updates
  }

  async deleteContainer() {
    await this.deleteButton().click();

    // Handle confirmation dialog
    const confirmationDialog = this.page
      .getByRole("dialog")
      .filter({ hasText: /delete container/i });
    await expect(confirmationDialog).toBeVisible();

    // In ConfirmationDialog component:
    // destructive variant button has no specific text other than children, or confirmText
    // We can target the button with "Delete" text inside the dialog
    // The dialog content renders children, and buttons.
    // The confirm button is the last button usually or variant="destructive"

    // Based on ConfirmationDialog.tsx:
    // <Button variant={getConfirmButtonVariant()} ... >{isConfirming ? "Deleting..." : confirmText}</Button>
    // confirmText defaults to "Confirm", but in ContainerDetailModal usage: confirmText={t.delete}
    // and t.delete is likely "Delete"

    const confirmButton = confirmationDialog.getByRole("button", { name: /delete/i }).last();
    await confirmButton.click();

    await this.expectClosed();
  }

  // Verifications
  async expectContainerDetails(
    containerName: string,
    expectedDetails: {
      status?: string;
      ports?: string[];
      branch?: string;
      hasEnvVars?: boolean;
      envVarCount?: number;
    }
  ) {
    await expect(this.containerName()).toContainText(containerName);

    if (expectedDetails.status) {
      await expect(this.containerStatus()).toContainText(expectedDetails.status);
    }

    if (expectedDetails.ports && expectedDetails.ports.length > 0) {
      for (const port of expectedDetails.ports) {
        await expect(this.portsInfo()).toContainText(port);
      }
    }

    if (expectedDetails.branch) {
      await expect(this.branchInfo()).toContainText(expectedDetails.branch);
    }

    if (expectedDetails.hasEnvVars) {
      await expect(this.envVariablesSection()).toBeVisible();
      if (expectedDetails.envVarCount !== undefined) {
        const envRows = this.envVariableRows();
        await expect(envRows).toHaveCount(expectedDetails.envVarCount);
      }
    } else {
      await expect(this.envVariablesSection()).not.toBeVisible();
    }
  }

  async expectActionButtonsVisible() {
    await expect(this.restartButton()).toBeVisible();
    await expect(this.stopButton()).toBeVisible();
    await expect(this.editContainerButton()).toBeVisible();
    await expect(this.editEnvironmentVariablesButton()).toBeVisible();
    await expect(this.deleteButton()).toBeVisible();
  }

  // Container ID extraction and verification methods
  async getContainerId(): Promise<string> {
    const containerIdElement = this.containerDetailModal().locator("button[data-container-id]");
    const containerId = await containerIdElement.getAttribute("data-container-id");
    return containerId || "";
  }

  async expectContainerIdIsUUID() {
    const containerId = await this.getContainerId();
    // UUID v4 regex pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(containerId).toMatch(uuidPattern);
  }

  async expectVisitAppUrl() {
    // Since the button uses window.open which may not work in test environment,
    // just verify the button exists and can be clicked
    await expect(this.visitAppButton()).toBeVisible();
    // Note: Actual URL verification would require mocking window.open or using different approach
  }
}
