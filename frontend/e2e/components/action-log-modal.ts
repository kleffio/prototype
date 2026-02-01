import { expect } from "@playwright/test";
import { BaseComponent } from "./base.component";

/**
 * Action Log Modal component
 * Used on project detail pages to view project activity logs
 */
export class ActionLogModal extends BaseComponent {
  async open() {
    await this.page
      .getByRole("button", { name: /view activity/i })
      .or(this.page.getByRole("button", { name: /activity log/i }))
      .first()
      .click();
  }

  async expectLoaded() {
    // Wait for the modal to appear
    await expect(this.modal()).toBeVisible({ timeout: 30_000 });

    // Wait for the title
    await expect(this.page.getByRole("heading", { name: /activity log/i })).toBeVisible({
      timeout: 10_000
    });

    // Wait for table or no logs message
    const hasTable = await this.table()
      .isVisible()
      .catch(() => false);
    const hasNoLogs = await this.noLogsMessage()
      .isVisible()
      .catch(() => false);
    expect(hasTable || hasNoLogs).toBe(true);
  }

  async close() {
    const closeButton = this.modal().getByRole("button", { name: /close/i });
    await closeButton.click();
    await expect(this.modal()).not.toBeVisible({ timeout: 5_000 });
  }

  modal() {
    return this.page.locator('[role="dialog"]').filter({
      has: this.page.getByRole("heading", { name: /activity log/i })
    });
  }

  table() {
    return this.modal().locator("table");
  }

  tableRows() {
    return this.table().locator("tbody tr");
  }

  noLogsMessage() {
    return this.modal().getByText(/no activity logs/i);
  }

  collaboratorFilter() {
    return this.modal().locator('[role="combobox"]').first();
  }

  sortButton(column: "action" | "collaborator" | "timestamp") {
    const columnMap = {
      action: /action/i,
      collaborator: /collaborator/i,
      timestamp: /timestamp/i
    };
    return this.table()
      .locator("thead th")
      .filter({ hasText: columnMap[column] })
      .locator("button")
      .first();
  }

  async expectLogCount(count: number) {
    if (count === 0) {
      await expect(this.noLogsMessage()).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(this.tableRows()).toHaveCount(count, { timeout: 10_000 });
    }
  }

  async expectNoLogs() {
    await expect(this.noLogsMessage()).toBeVisible({ timeout: 10_000 });
    await expect(this.table()).not.toBeVisible();
  }

  async expectLogEntry(action: string, collaborator: string, options?: { exact?: boolean }) {
    const row = this.tableRows().filter({
      hasText: action
    });

    await expect(row).toBeVisible({ timeout: 10_000 });

    if (options?.exact) {
      await expect(row.getByText(action, { exact: true })).toBeVisible();
    }

    await expect(row.getByText(collaborator)).toBeVisible();
  }

  async filterByCollaborator(collaboratorName: string) {
    // Open the filter dropdown
    await this.collaboratorFilter().click();

    // Wait for dropdown to open
    await this.page.waitForTimeout(500);

    // Select the collaborator
    const option = this.page
      .locator('[role="option"]')
      .filter({ hasText: new RegExp(collaboratorName, "i") });
    await option.click();

    // Wait for filter to apply
    await this.page.waitForTimeout(1000);
  }

  async expectCollaboratorFilterOptions(expectedOptions: string[]) {
    // Open the filter dropdown
    await this.collaboratorFilter().click();

    // Wait for dropdown to open
    await this.page.waitForTimeout(500);

    // Check each expected option exists
    for (const option of expectedOptions) {
      const optionElement = this.page
        .locator('[role="option"]')
        .filter({ hasText: new RegExp(option, "i") });
      await expect(optionElement).toBeVisible({ timeout: 5_000 });
    }

    // Close dropdown by clicking outside
    await this.modal().click({ position: { x: 10, y: 10 } });
  }

  async expectCollaboratorNotInFilter(collaboratorName: string) {
    // Open the filter dropdown
    await this.collaboratorFilter().click();

    // Wait for dropdown to open
    await this.page.waitForTimeout(500);

    // Check that the collaborator is NOT in the list
    const option = this.page
      .locator('[role="option"]')
      .filter({ hasText: new RegExp(collaboratorName, "i") });
    await expect(option).not.toBeVisible();

    // Close dropdown
    await this.modal().click({ position: { x: 10, y: 10 } });
  }

  async sortBy(column: "action" | "collaborator" | "timestamp") {
    const button = this.sortButton(column);
    await button.click();
    await this.page.waitForTimeout(500);
  }

  async expectSortedBy(column: "action" | "collaborator" | "timestamp", direction: "asc" | "desc") {
    // Get all values from the specified column
    const columnIndex = column === "action" ? 0 : column === "collaborator" ? 1 : 2;
    const cells = this.tableRows().locator(`td:nth-child(${columnIndex + 1})`);
    const count = await cells.count();

    if (count === 0) return;

    const values: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await cells.nth(i).textContent();
      if (text) values.push(text.trim());
    }

    // Create a sorted copy
    const sorted = [...values].sort();
    if (direction === "desc") {
      sorted.reverse();
    }

    // Compare
    expect(values).toEqual(sorted);
  }

  async expectTimestampFormat() {
    // Check that timestamps are in a reasonable format
    const timestampCells = this.tableRows().locator("td:nth-child(3)");
    const firstTimestamp = await timestampCells.first().textContent();

    if (firstTimestamp) {
      // Should contain date/time information (flexible check)
      expect(firstTimestamp).toMatch(/\d+/);
    }
  }

  async getLogEntries(): Promise<
    Array<{ action: string; collaborator: string; timestamp: string }>
  > {
    const rows = this.tableRows();
    const count = await rows.count();
    const entries: Array<{ action: string; collaborator: string; timestamp: string }> = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const action = await row.locator("td:nth-child(1)").textContent();
      const collaborator = await row.locator("td:nth-child(2)").textContent();
      const timestamp = await row.locator("td:nth-child(3)").textContent();

      entries.push({
        action: action?.trim() || "",
        collaborator: collaborator?.trim() || "",
        timestamp: timestamp?.trim() || ""
      });
    }

    return entries;
  }

  async expectActionContains(text: string) {
    const actionCells = this.tableRows().locator("td:nth-child(1)");
    const matchingCell = actionCells.filter({ hasText: new RegExp(text, "i") });
    await expect(matchingCell.first()).toBeVisible({ timeout: 10_000 });
  }
}
