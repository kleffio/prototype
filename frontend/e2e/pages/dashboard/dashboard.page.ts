import { BasePage } from "../base.page";
import { expectPath } from "../../utils/wait";
import { ProjectModal } from "../../components/project-modal";
import { expect } from "@playwright/test";

export class DashboardPage extends BasePage {
  async open() {
    await this.goto("/dashboard");
  }

  async expectLoaded() {
    await this.expectAppShellLoaded();
    await expectPath(this.page, /\/dashboard$/, 30_000);
    // Verify Header
    await expect(this.page.getByRole("heading", { name: "My Projects Dashboard" })).toBeVisible();
  }

  async createProject(name: string, description: string) {
    const createModal = new ProjectModal(this.page);
    await createModal.open();
    await createModal.expectLoaded();
    await createModal.createProject(name, description);
  }

  // Tutorial Interaction
  async openTutorial() {
    await this.page.getByRole("button", { name: "Guide" }).click();
  }

  async expectTutorialOpen() {
    await expect(this.page.getByRole("heading", { name: "Dashboard Tutorial" })).toBeVisible();
    await expect(this.page.getByText("Welcome to your Project Dashboard")).toBeVisible();
  }

  async closeTutorial() {
    // Click outside or press escape, or find the close button. 
    // Standard sheet usually has a close button (X).
    await this.page.keyboard.press("Escape");
  }

  async expectTutorialClosed() {
    await expect(this.page.getByRole("heading", { name: "Dashboard Tutorial" })).not.toBeVisible();
  }

  // Cards Verification
  async expectMetricsCardsVisible() {
     const cards = [
         "Active Projects",
         "Projects with Data",
         "Real-time CPU Load",
         "Real-time Memory",
         "Current Network",
         "Current Disk I/O"
     ];

     for (const title of cards) {
         await expect(this.page.locator("div").filter({ hasText: title }).first()).toBeVisible();
     }
  }

  // Graph Verification
  async expectGraphsVisible() {
      // We look for the graph titles from NetworkDiskGraph.tsx
      await expect(this.page.getByText("Network Traffic")).toBeVisible();
      await expect(this.page.getByText("Disk I/O")).toBeVisible();
      // Check for Recharts container
      await expect(this.page.locator(".recharts-surface").first()).toBeVisible();
  }
}
