import { expect, Locator } from "@playwright/test";
import { BasePage } from "../base.page";
import { expectPath } from "../../utils/wait";
import { routes } from "../../fixtures/test-data";

export class ProjectDetailPage extends BasePage {
  async open(projectId: string) {
    await this.goto(routes.dashboard.project(projectId));
  }

  async expectLoaded() {
    await this.expectAppShellLoaded();
    await expectPath(this.page, /\/dashboard\/projects\/[^/]+$/, 30_000);

    await expect(this.page.locator("#root")).toBeVisible({ timeout: 30_000 });
  }

  async expectInformation(name: string, description: string) {
    await expect(this.page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(this.page.getByText(description)).toBeVisible();
  }

  async goBackToProjects() {
    await this.page.getByRole("link", { name: /back to projects/i }).click();
  }

  // Container-related methods
  async expectRunningContainersSection() {
    await expect(this.page.getByText(/running containers/i)).toBeVisible({ timeout: 30_000 });
  }

  async expectNoContainers() {
    await expect(this.page.getByText(/no running containers/i)).toBeVisible({ timeout: 30_000 });
  }

  async expectContainerExists(containerName: string) {
    const container = this.page.getByText(containerName, { exact: true });
    await expect(container).toBeVisible({ timeout: 30_000 });
  }

  async getContainerCount() {
    const containers = this.page.locator('[data-container-name], [data-testid="container-row"]');
    return await containers.count();
  }

  // Metrics-related methods
  metricsSection(): Locator {
    return this.page.getByText("Project Usage (30 Days)");
  }

  cpuRequestsCard(): Locator {
    return this.page.getByText("Avg CPU Requests");
  }

  memoryUsageCard(): Locator {
    return this.page.getByText("Avg Memory Usage");
  }

  timeWindowCard(): Locator {
    return this.page.getByText("Time Window");
  }

  containerStatusCard(): Locator {
    return this.page.getByText("Container Status");
  }

  async expectMetricsVisible() {
    await expect(this.metricsSection()).toBeVisible({ timeout: 10_000 });
  }

  async expectMetricsNotVisible() {
    await expect(this.metricsSection()).not.toBeVisible({ timeout: 5_000 });
  }

  async expectAllMetricCardsVisible() {
    await expect(this.cpuRequestsCard()).toBeVisible();
    await expect(this.memoryUsageCard()).toBeVisible();
    await expect(this.timeWindowCard()).toBeVisible();
  }

  async expectMetricsLoaded() {
    await this.expectMetricsVisible();
    await this.expectAllMetricCardsVisible();

    // Verify cards contain proper units
    const cpuCard = this.cpuRequestsCard().locator("..");
    const memCard = this.memoryUsageCard().locator("..");

    await expect(cpuCard).toContainText("cores");
    await expect(memCard).toContainText("GB");
  }

  async expectMetricsBetweenSections() {
    const projectOverview = this.page.getByText("Project Overview");
    const metricsSection = this.metricsSection();
    const runningContainers = this.page.getByText("Running Containers");

    await expect(projectOverview).toBeVisible();
    await expect(metricsSection).toBeVisible();
    await expect(runningContainers).toBeVisible();

    const overviewBox = await projectOverview.boundingBox();
    const metricsBox = await metricsSection.boundingBox();
    const containersBox = await runningContainers.boundingBox();

    if (overviewBox && metricsBox && containersBox) {
      expect(metricsBox.y).toBeGreaterThan(overviewBox.y);
      expect(metricsBox.y).toBeLessThan(containersBox.y);
    }
  }

  async expectContainerCountInMetrics(count: number) {
    const statusCard = this.containerStatusCard().locator("..");
    await expect(statusCard).toContainText(`${count}`);
    await expect(statusCard).toContainText("running");
  }

  async expectViewLogsButton(containerName: string) {
    const containerCard = this.page
      .locator(`[data-container-name="${containerName}"]`)
      .or(this.page.getByText(containerName).locator(".."));
    const viewLogsButton = containerCard.getByRole("button", { name: /view logs/i });
    await expect(viewLogsButton).toBeVisible({ timeout: 10_000 });
  }

  async clickViewLogs(containerName: string) {
    const containerCard = this.page
      .locator(`[data-container-name="${containerName}"]`)
      .or(this.page.getByText(containerName).locator("../.."));
    const viewLogsButton = containerCard.getByRole("button", { name: /view logs/i });
    await viewLogsButton.click();
  }

  async expectLogsSheetOpen() {
    // Sheet should be visible
    const sheet = this.page
      .locator('[role="dialog"]')
      .or(this.page.locator('[data-testid="logs-sheet"]'));
    await expect(sheet).toBeVisible({ timeout: 10_000 });
  }

  async expectLogsSheetClosed() {
    const sheet = this.page
      .locator('[role="dialog"]')
      .or(this.page.locator('[data-testid="logs-sheet"]'));
    await expect(sheet).not.toBeVisible({ timeout: 5_000 });
  }

  async closeLogsSheet() {
    // Look for close button (X icon)
    const closeButton = this.page
      .locator('[role="dialog"]')
      .getByRole("button", { name: /close/i })
      .or(this.page.locator('button[aria-label="Close"]'));
    await closeButton.click();
  }

  async expectLogsSheetTitle(containerName: string) {
    const sheet = this.page.locator('[role="dialog"]');
    await expect(sheet.getByText(containerName)).toBeVisible({ timeout: 5_000 });
  }

  async expectNoLogsMessage() {
    await expect(this.page.getByText(/no logs found/i)).toBeVisible({ timeout: 10_000 });
  }

  async expectLogsViewerVisible() {
    // Look for the logs viewer container
    const logsViewer = this.page
      .locator('[data-testid="logs-viewer"]')
      .or(this.page.getByText(/logs:/i).locator(".."));
    await expect(logsViewer).toBeVisible({ timeout: 5_000 });
  }

  async expectRefreshButtonVisible() {
    const refreshButton = this.page.locator('[role="dialog"] .lucide-refresh-cw');
    await expect(refreshButton).toBeVisible({ timeout: 5_000 });
  }

  async clickRefreshLogs() {
    const refreshButton = this.page.locator('[role="dialog"]').getByRole("button").last();
    await refreshButton.click();
  }

  async expectRefreshButtonLoading() {
    const refreshIcon = this.page.locator('[role="dialog"] .lucide-refresh-cw');
    await expect(refreshIcon).toHaveClass(/animate-spin/, { timeout: 2_000 });
  }

  async expectLogsSheetAnimatesFromRight() {
    const sheet = this.page.locator('[role="dialog"]');
    await expect(sheet).toBeVisible({ timeout: 5_000 });

    // Verify sheet has right-side positioning
    const box = await sheet.boundingBox();
    if (box) {
      const viewportSize = this.page.viewportSize();
      if (viewportSize) {
        // Sheet should be on the right side of the viewport
        expect(box.x).toBeGreaterThan(viewportSize.width / 2);
      }
    }
  }

  async expectLogsContent(expectedLogLines: string[]) {
    const logsContainer = this.page.locator('[role="dialog"]').locator(".font-mono");

    for (const logLine of expectedLogLines) {
      await expect(logsContainer.getByText(logLine, { exact: false })).toBeVisible();
    }
  }

  async expectLogTimestampsVisible() {
    const logsContainer = this.page.locator('[role="dialog"]').locator(".font-mono");
    const timestamps = logsContainer.locator("span").filter({ hasText: /\d{1,2}:\d{2}:\d{2}/ });
    await expect(timestamps.first()).toBeVisible({ timeout: 5_000 });
  }

  async expectErrorCount(count: number) {
    const sheet = this.page.locator('[role="dialog"]');
    await expect(sheet.getByText(`${count} error`, { exact: false })).toBeVisible();
  }

  async expectWarningCount(count: number) {
    const sheet = this.page.locator('[role="dialog"]');
    await expect(sheet.getByText(`${count} warning`, { exact: false })).toBeVisible();
  }

  // Container Status methods
  async expectContainerStatus(
    containerName: string,
    expectedStatus: "up" | "down" | "checking",
    options?: { timeout?: number }
  ) {
    const containerCard = this.page
      .getByText(containerName, { exact: true })
      .locator("..")
      .locator("..");
    const statusBadge = containerCard
      .locator("span")
      .filter({ hasText: /^Up$|^Down$|^Checking\.\.\.$/ });

    const timeout = options?.timeout || 10000;

    if (expectedStatus === "up") {
      await expect(statusBadge).toHaveText("Up", { timeout });
      await expect(statusBadge).toHaveClass(/bg-emerald-500|text-emerald/);
    } else if (expectedStatus === "down") {
      await expect(statusBadge).toHaveText("Down", { timeout });
      await expect(statusBadge).toHaveClass(/bg-secondary|text-secondary-foreground/);
    } else {
      await expect(statusBadge).toHaveText("Checking...", { timeout });
      await expect(statusBadge).toHaveClass(/bg-amber-500|text-amber/);
    }
  }

  async mockContainerStatus(containerId: string, status: "up" | "down") {
    const containerUrl = `https://app-${containerId}.kleff.io`;

    await this.page.route(containerUrl, async (route) => {
      if (status === "up") {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<html><body>Container is running</body></html>"
        });
      } else {
        await route.fulfill({
          status: 500,
          contentType: "text/html",
          body: "<html><body>Internal Server Error</body></html>"
        });
      }
    });
  }

  async mockContainerNetworkError(containerId: string) {
    const containerUrl = `https://app-${containerId}.kleff.io`;

    await this.page.route(containerUrl, async (route) => {
      await route.abort("connectionrefused");
    });
  }

  async waitForStatusTransition(
    containerName: string,
    fromStatus: "checking",
    toStatus: "up" | "down",
    timeout = 10000
  ) {
    const containerCard = this.page
      .getByText(containerName, { exact: true })
      .locator("..")
      .locator("..");
    const statusBadge = containerCard
      .locator("span")
      .filter({ hasText: /^Up$|^Down$|^Checking\.\.\.$/ });

    // First verify it starts with "checking"
    await expect(statusBadge).toHaveText("Checking...", { timeout: 2000 });

    // Then wait for transition to final status
    if (toStatus === "up") {
      await expect(statusBadge).toHaveText("Up", { timeout });
    } else {
      await expect(statusBadge).toHaveText("Down", { timeout });
    }
  }

  async getContainerId(containerName: string): Promise<string> {
    // Open container detail modal to get the container ID
    const containerCard = this.page
      .getByText(containerName, { exact: true })
      .locator("..")
      .locator("..");
    await containerCard.click();

    // Wait for modal and get container ID
    const modal = this.page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const containerIdElement = modal
      .locator("span")
      .filter({ hasText: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/ });
    const containerId = await containerIdElement.textContent();

    // Close modal
    const closeButton = modal.getByRole("button", { name: /close/i });
    await closeButton.click();
    await expect(modal).not.toBeVisible();

    if (!containerId) {
      throw new Error(`Could not find container ID for ${containerName}`);
    }

    return containerId.trim();
  }
}
