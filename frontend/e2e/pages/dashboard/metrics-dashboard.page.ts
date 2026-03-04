import { expect } from "@playwright/test";
import { BasePage } from "../base.page";
import { expectPath } from "../../utils/wait";

/**
 * Page Object for the MetricsDashboard component rendered at /dashboard/systems.
 * Wraps all assertions used by the UC-50 Cluster Health E2E suite.
 */
export class MetricsDashboardPage extends BasePage {
    // ── Navigation ────────────────────────────────────────────────────────────

    async open() {
        await this.goto("/dashboard/systems");
    }

    // ── Load assertions ───────────────────────────────────────────────────────

    /** Confirms the page container is present (data-testid="systems-page"). */
    async expectLoaded() {
        await expectPath(this.page, /\/dashboard\/systems$/, 30_000);
        await expect(this.page.getByTestId("systems-page")).toBeVisible({ timeout: 30_000 });
    }

    /** Confirms the happy-path "ready" state: no error banner visible. */
    async expectReady() {
        await expect(this.page.getByTestId("systems-error")).not.toBeVisible({ timeout: 15_000 });
    }

    // ── Error state ───────────────────────────────────────────────────────────

    /** Returns the error banner element. */
    errorBanner() {
        return this.page.getByTestId("systems-error");
    }

    /** Confirms the inline red error alert is visible with the exact FDUC text. */
    async expectErrorAlert(
        text = "Unable to retrieve cluster metrics. Please verify the observability service is running and accessible."
    ) {
        await expect(this.errorBanner()).toBeVisible({ timeout: 15_000 });
        await expect(this.errorBanner()).toContainText(text);
    }

    // ── MetricCard helpers ────────────────────────────────────────────────────

    /**
     * Returns all metric-card elements.
     * MetricCard has no individual data-testid so we locate them by their
     * shared CSS classes rendered inside data-testid="systems-page".
     */
    metricCards() {
        return this.page
            .getByTestId("systems-page")
            .locator(".rounded-xl.border.border-white\\/6.bg-white\\/3");
    }

    /** Asserts exactly `count` metric-card elements exist. */
    async expectMetricCardsPresent(count = 4) {
        await expect(this.metricCards()).toHaveCount(count, { timeout: 15_000 });
    }

    // ── Time-range selector ───────────────────────────────────────────────────

    timeRangeSelect() {
        return this.page.locator("select");
    }

    async selectTimeRange(value: string) {
        await this.timeRangeSelect().selectOption(value);
    }

    // ── NodesList ─────────────────────────────────────────────────────────────

    nodesSection() {
        return this.page.getByText("Node Metrics").first();
    }

    nodeCards() {
        return this.page.locator(
            ".nodes-scroll-container .rounded-lg.border.border-neutral-700.bg-neutral-800"
        );
    }

    async expectNodesListPresent() {
        await expect(this.nodesSection()).toBeVisible({ timeout: 15_000 });
    }

    async expectAtLeastOneNodeRow() {
        await expect(this.nodeCards().first()).toBeVisible({ timeout: 15_000 });
    }

    // ── Refresh button ────────────────────────────────────────────────────────

    refreshButton() {
        return this.page.getByRole("button", { name: /refresh/i });
    }

    async clickRefresh() {
        await this.refreshButton().click();
    }

    // ── API route mocks ───────────────────────────────────────────────────────

    /** Stubs GET /api/v1/systems/metrics with a full happy-path response. */
    async mockSuccessResponse(overrides: Record<string, unknown> = {}) {
        await this.page.route("**/api/v1/systems/metrics**", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    overview: {
                        totalNodes: 3,
                        runningNodes: 3,
                        totalPods: 12,
                        totalNamespaces: 4,
                        cpuUsagePercent: 42.5,
                        memoryUsagePercent: 67.1
                    },
                    requestsMetric: {
                        title: "Requests/s",
                        value: "1.2k",
                        rawValue: 1200,
                        changePercent: "+5.0%",
                        changeLabel: "vs last window",
                        status: "good",
                        sparkline: []
                    },
                    podsMetric: {
                        title: "Running Pods",
                        value: "12",
                        rawValue: 12,
                        changePercent: "+0.0%",
                        changeLabel: "stable",
                        status: "excellent",
                        sparkline: []
                    },
                    nodesMetric: {
                        title: "Nodes",
                        value: "3/3",
                        rawValue: 3,
                        changePercent: "+0.0%",
                        changeLabel: "all healthy",
                        status: "excellent",
                        sparkline: []
                    },
                    tenantsMetric: {
                        title: "Tenants",
                        value: "4",
                        rawValue: 4,
                        changePercent: "+0.0%",
                        changeLabel: "namespaces",
                        status: "good",
                        sparkline: []
                    },
                    cpuUtilization: { currentValue: 42.5, changePercent: 2.1, trend: "up", history: [] },
                    memoryUtilization: {
                        currentValue: 67.1,
                        changePercent: -0.5,
                        trend: "stable",
                        history: []
                    },
                    nodes: [
                        {
                            name: "node-1",
                            cpuUsagePercent: 35.0,
                            memoryUsagePercent: 60.0,
                            podCount: 6,
                            status: "Ready"
                        },
                        {
                            name: "node-2",
                            cpuUsagePercent: 50.0,
                            memoryUsagePercent: 74.2,
                            podCount: 6,
                            status: "Ready"
                        }
                    ],
                    namespaces: [
                        { name: "default", podCount: 4, cpuUsage: 20.0, memoryUsage: 30.0 },
                        { name: "kube-system", podCount: 8, cpuUsage: 22.5, memoryUsage: 37.1 }
                    ],
                    databaseIOMetrics: {
                        diskReadBytesPerSec: 0,
                        diskWriteBytesPerSec: 0,
                        diskReadOpsPerSec: 0,
                        diskWriteOpsPerSec: 0,
                        networkReceiveBytesPerSec: 0,
                        networkTransmitBytesPerSec: 0,
                        networkReceiveOpsPerSec: 0,
                        networkTransmitOpsPerSec: 0,
                        diskReadHistory: [],
                        diskWriteHistory: [],
                        networkReceiveHistory: [],
                        networkTransmitHistory: [],
                        source: "mock"
                    },
                    uptimeMetrics: { services: [] },
                    systemUptime: 86400,
                    systemUptimeFormatted: "1d 0h 0m",
                    ...overrides
                })
            });
        });
    }

    /** Stubs GET /api/v1/systems/metrics with a 500 response (Exception path). */
    async mockServerError() {
        await this.page.route("**/api/v1/systems/metrics**", async (route) => {
            await route.fulfill({ status: 500, body: "Internal Server Error" });
        });
    }

    /** Stubs GET /api/v1/systems/metrics with a network-level abort (Exception path). */
    async mockNetworkError() {
        await this.page.route("**/api/v1/systems/metrics**", async (route) => {
            await route.abort("failed");
        });
    }

    /**
     * Stubs GET /api/v1/systems/metrics with a partial/null-field response.
     * Simulates Extension 6a (Prometheus timeout) and Extension 10a (partial data).
     */
    async mockPartialDataResponse() {
        await this.page.route("**/api/v1/systems/metrics**", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    overview: {
                        totalNodes: 2,
                        runningNodes: 1,
                        totalPods: 4,
                        totalNamespaces: 2,
                        cpuUsagePercent: null, // null field – Extension 10a
                        memoryUsagePercent: null // null field – Extension 10a
                    },
                    requestsMetric: null, // null card – Extension 6a (query timed out)
                    podsMetric: {
                        title: "Running Pods",
                        value: "4",
                        rawValue: 4,
                        changePercent: "+0.0%",
                        changeLabel: "available",
                        status: "good",
                        sparkline: []
                    },
                    nodesMetric: {
                        title: "Nodes",
                        value: "1/2",
                        rawValue: 1,
                        changePercent: "-50.0%",
                        changeLabel: "one notready",
                        status: "warning",
                        sparkline: []
                    },
                    tenantsMetric: null, // null card – Extension 10a
                    cpuUtilization: null,
                    memoryUtilization: null,
                    nodes: [
                        {
                            name: "node-1",
                            cpuUsagePercent: 0,
                            memoryUsagePercent: 0,
                            podCount: 4,
                            status: "Ready"
                        },
                        {
                            name: "node-2",
                            cpuUsagePercent: 0,
                            memoryUsagePercent: 0,
                            podCount: 0,
                            status: "NotReady"
                        }
                    ],
                    namespaces: [],
                    databaseIOMetrics: {
                        diskReadBytesPerSec: 0,
                        diskWriteBytesPerSec: 0,
                        diskReadOpsPerSec: 0,
                        diskWriteOpsPerSec: 0,
                        networkReceiveBytesPerSec: 0,
                        networkTransmitBytesPerSec: 0,
                        networkReceiveOpsPerSec: 0,
                        networkTransmitOpsPerSec: 0,
                        diskReadHistory: [],
                        diskWriteHistory: [],
                        networkReceiveHistory: [],
                        networkTransmitHistory: [],
                        source: "mock-partial"
                    },
                    uptimeMetrics: { services: [] },
                    systemUptime: 0,
                    systemUptimeFormatted: "0d 0h 0m"
                })
            });
        });
    }
}
