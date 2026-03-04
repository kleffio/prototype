/**
 * UC-50 – View Cluster Health
 * ============================================================
 * Playwright E2E suite covering every path in the FDUC:
 *
 *   MSS Steps 1–11  – Navigation → mount → API call → render cards + nodes
 *   Extension 6a    – Prometheus timeout → null fields → 200 OK → zero-value cards, no crash
 *   Extension 10a   – Some metric fields null → available cards render normally
 *   Exception       – API 500 / network error → inline red error alert with exact text
 *   Postcondition   – MetricCard elements present; NodesList has ≥1 row
 *
 * All tests:
 *   • Use authTest fixture (storageState auth)
 *   • Use page.route() to mock /api/v1/systems/metrics — no real backend needed
 *   • Use MetricsDashboardPage page-object
 */

import { expect } from "@playwright/test";
import { authTest as test } from "../fixtures/auth.fixture";
import { DashboardPage } from "../pages/dashboard/dashboard.page";
import { Sidebar } from "../components/sidebar";
import { MetricsDashboardPage } from "../pages/dashboard/metrics-dashboard.page";

// ─────────────────────────────────────────────────────────────────────────────
// MSS Steps 1–4: Navigation & Dashboard Mount
// ─────────────────────────────────────────────────────────────────────────────

test.describe("MSS Steps 1–4: Navigation & Dashboard Mount", () => {
    /**
     * MSS Step 1 – Admin clicks the Observability / Systems sidebar link.
     * MSS Step 2 – React mounts MetricsDashboard at /dashboard/systems.
     *
     * Covers: FDUC MSS 1, 2
     */
    test("navigates to the Systems page via sidebar link", async ({ page }) => {
        const dash = new DashboardPage(page);
        await dash.open();
        await dash.expectLoaded();

        const sidebar = new Sidebar(page);
        await sidebar.waitReady();

        // MSS Step 1: click the sidebar link
        await sidebar.systems().click();

        // MSS Step 2: MetricsDashboard mounts
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.expectLoaded();
    });

    /**
     * MSS Step 2 – MetricsDashboard mounts when navigated to directly.
     *
     * Covers: FDUC MSS 2
     */
    test("loads MetricsDashboard when navigated to directly", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.open();
        await metricsPage.expectLoaded();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// MSS Steps 3–5: API Call – GET /api/v1/systems/metrics?duration=1h
// ─────────────────────────────────────────────────────────────────────────────

test.describe("MSS Steps 3–5: API Request", () => {
    /**
     * MSS Step 3 – GET /api/v1/systems/metrics?duration=1h fired on mount.
     * MSS Step 4 – Prometheus adapter aggregates and returns AggregatedMetrics.
     * MSS Step 5 – Response shape: ClusterOverview + NodeMetric[].
     *
     * Covers: FDUC MSS 3, 4, 5
     */
    test("calls GET /api/v1/systems/metrics?duration=1h on mount", async ({ page }) => {
        const requestPromise = page.waitForRequest(
            (req) => req.url().includes("/api/v1/systems/metrics") && req.method() === "GET",
            { timeout: 15_000 },
        );

        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockSuccessResponse();
        await metricsPage.open();

        const request = await requestPromise;

        // MSS Step 3: correct endpoint and default duration param
        expect(request.url()).toContain("/api/v1/systems/metrics");
        expect(request.url()).toContain("duration=1h");

        await metricsPage.expectLoaded();
    });

    /**
     * MSS Step 3 (user-driven re-fetch) – Changing the time-range selector
     * triggers a new GET with the updated duration.
     *
     * Covers: FDUC MSS 3 (re-fetch on duration change)
     */
    test("re-calls API with new duration when time-range selector changes", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockSuccessResponse();
        await metricsPage.open();
        await metricsPage.expectLoaded();

        const nextRequestPromise = page.waitForRequest(
            (req) =>
                req.url().includes("/api/v1/systems/metrics") && req.url().includes("duration=24h"),
            { timeout: 15_000 },
        );

        await metricsPage.selectTimeRange("24h");
        await nextRequestPromise;
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// MSS Steps 6–9: Dashboard Renders MetricCards & NodesList
// ─────────────────────────────────────────────────────────────────────────────

test.describe("MSS Steps 6–9: Dashboard Renders Metric Cards & NodesList", () => {
    /**
     * MSS Step 6 – Response returns AggregatedMetrics.
     * MSS Step 7 – Dashboard renders the four metric cards
     *              (CPU%, RAM%, RunningNodes/TotalNodes, Tenants).
     *
     * Covers: FDUC MSS 6, 7
     */
    test("renders four MetricCard elements after successful API response", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockSuccessResponse();
        await metricsPage.open();
        await metricsPage.expectLoaded();
        await metricsPage.expectReady();

        // MSS Step 7: four cards visible in the summary grid
        await metricsPage.expectMetricCardsPresent(4);
    });

    /**
     * MSS Step 8 – NodesList renders with at least one node row.
     * Postcondition: NodesList table has ≥1 row.
     *
     * Covers: FDUC MSS 8, Postcondition
     */
    test("renders NodesList with at least one node row", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockSuccessResponse();
        await metricsPage.open();
        await metricsPage.expectLoaded();

        await metricsPage.expectNodesListPresent();
        await metricsPage.expectAtLeastOneNodeRow();
    });

    /**
     * MSS Step 9 – Node cards display Name, Status badge, and CPU bar.
     *
     * Covers: FDUC MSS 8, 9
     */
    test("each node card shows name, status badge, and CPU usage bar", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockSuccessResponse();
        await metricsPage.open();
        await metricsPage.expectLoaded();

        // Node names from mock response
        await expect(page.getByText("node-1")).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText("node-2")).toBeVisible({ timeout: 15_000 });

        // Status badge
        await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 10_000 });

        // CPU Usage label
        await expect(page.getByText("CPU Usage").first()).toBeVisible({ timeout: 10_000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// MSS Steps 10–11: Postcondition Assertions
// ─────────────────────────────────────────────────────────────────────────────

test.describe("MSS Steps 10–11: Postcondition Assertions", () => {
    /**
     * Postcondition: MetricCard elements and NodesList row present after full load.
     *
     * Covers: FDUC MSS 10–11, Postcondition
     */
    test(
        "postcondition: MetricCard elements and NodesList row are present after load",
        async ({ page }) => {
            const metricsPage = new MetricsDashboardPage(page);
            await metricsPage.mockSuccessResponse();
            await metricsPage.open();
            await metricsPage.expectLoaded();
            await metricsPage.expectReady();

            await metricsPage.expectMetricCardsPresent(4);
            await metricsPage.expectAtLeastOneNodeRow();
        },
    );

    /**
     * MSS Step 3 (manual refresh) – Refresh button triggers a new API call.
     *
     * Covers: FDUC MSS 3 (manual re-fetch)
     */
    test("Refresh button triggers a new API call", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockSuccessResponse();
        await metricsPage.open();
        await metricsPage.expectLoaded();

        const refreshPromise = page.waitForRequest(
            (req) => req.url().includes("/api/v1/systems/metrics"),
            { timeout: 10_000 },
        );
        await metricsPage.clickRefresh();
        await refreshPromise;
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Extension 6a: Prometheus Timeout → Partial Data (null fields) → 200 OK
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Extension 6a: Prometheus Timeout → Partial Data", () => {
    /**
     * Extension 6a – A specific Prometheus query hangs past the 10s timeout.
     * The adapter returns null for the affected field but still delivers 200 OK.
     * The UI must NOT crash; it shows zero-value / skeleton cards instead.
     *
     * Covers: FDUC Extension 6a
     */
    test(
        "shows zero-value cards and no error when some Prometheus fields are null",
        async ({ page }) => {
            const metricsPage = new MetricsDashboardPage(page);
            await metricsPage.mockPartialDataResponse();
            await metricsPage.open();
            await metricsPage.expectLoaded();

            // Extension 6a: system returns 200 OK – no error alert shown
            await metricsPage.expectReady();

            // UI does not crash – the page container is still present
            await expect(page.getByTestId("systems-page")).toBeVisible();
        },
    );

    /**
     * Extension 6a – Non-null cards still render normally even when other
     * Prometheus queries timed out and returned null.
     *
     * Covers: FDUC Extension 6a (partial render still works)
     */
    test(
        "non-null metric cards still render when other Prometheus queries timed out",
        async ({ page }) => {
            const metricsPage = new MetricsDashboardPage(page);
            await metricsPage.mockPartialDataResponse();
            await metricsPage.open();
            await metricsPage.expectLoaded();

            // podsMetric and nodesMetric are non-null in the partial response
            await expect(page.getByText("Running Pods")).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText("Nodes")).toBeVisible({ timeout: 15_000 });
        },
    );

    /**
     * Extension 6a – NodesList still shows available nodes even with partial data.
     *
     * Covers: FDUC Extension 6a + Postcondition (NodesList ≥1 row)
     */
    test("NodesList renders available nodes when metric fields are null", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockPartialDataResponse();
        await metricsPage.open();
        await metricsPage.expectLoaded();

        await metricsPage.expectNodesListPresent();
        await metricsPage.expectAtLeastOneNodeRow();
    });

    /**
     * Extension 6a – A node with NotReady status is visible in the list.
     *
     * Covers: FDUC Extension 6a (degraded node display)
     */
    test(
        "NodesList shows NotReady status for a degraded node in partial-data response",
        async ({ page }) => {
            const metricsPage = new MetricsDashboardPage(page);
            await metricsPage.mockPartialDataResponse();
            await metricsPage.open();
            await metricsPage.expectLoaded();

            await expect(page.getByText("NotReady")).toBeVisible({ timeout: 15_000 });
        },
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Extension 10a: Partial Data Display – some fields null
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Extension 10a: Partial Data Display", () => {
    /**
     * Extension 10a – Some metric fields in the response are null.
     * Available cards render normally; missing data shows as empty/zero.
     *
     * Covers: FDUC Extension 10a
     */
    test("available MetricCards render normally when some fields are null", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockPartialDataResponse();
        await metricsPage.open();
        await metricsPage.expectLoaded();

        // No error alert – UI degrades gracefully
        await metricsPage.expectReady();

        // The two non-null cards are visible
        await expect(page.getByText("Running Pods")).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText("Nodes")).toBeVisible({ timeout: 15_000 });
    });

    /**
     * Extension 10a – Page container does not crash when cpuUsagePercent
     * and memoryUsagePercent fields are null.
     *
     * Covers: FDUC Extension 10a (graceful degradation)
     */
    test("page does not crash when overview cpu/memory fields are null", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockPartialDataResponse();
        await metricsPage.open();
        await metricsPage.expectLoaded();

        // Page container still alive
        await expect(page.getByTestId("systems-page")).toBeVisible();
        // No error banner
        await expect(page.getByTestId("systems-error")).not.toBeVisible({ timeout: 10_000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Exception: Service Unreachable → Inline Red Error Alert
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Exception: Service Unreachable → Error Alert", () => {
    /**
     * Exception – API returns 500.
     * UI displays inline red error alert with the exact FDUC-specified text.
     *
     * Covers: FDUC Exception
     */
    test("displays inline red error alert when API returns 500", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockServerError();
        await metricsPage.open();
        await metricsPage.expectLoaded();

        await metricsPage.expectErrorAlert(
            "Unable to retrieve cluster metrics. Please verify the observability service is running and accessible.",
        );
    });

    /**
     * Exception – Network-level error (connection refused / service unreachable).
     * UI displays exactly the same inline red error alert.
     *
     * Covers: FDUC Exception (network error variant)
     */
    test(
        "displays inline red error alert on network error (service unreachable)",
        async ({ page }) => {
            const metricsPage = new MetricsDashboardPage(page);
            await metricsPage.mockNetworkError();
            await metricsPage.open();
            await metricsPage.expectLoaded();

            await metricsPage.expectErrorAlert(
                "Unable to retrieve cluster metrics. Please verify the observability service is running and accessible.",
            );
        },
    );

    /**
     * Exception – Error banner carries the correct data-testid="systems-error"
     * (same id used by the existing SystemsPage PO).
     *
     * Covers: FDUC Exception (correct testid rendered)
     */
    test("error alert is rendered with correct data-testid (systems-error)", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockServerError();
        await metricsPage.open();
        await metricsPage.expectLoaded();

        await expect(metricsPage.errorBanner()).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId("systems-error")).toBeVisible();
    });

    /**
     * Exception – The systems-page container remains visible even in error state
     * (no full-page crash / blank screen).
     *
     * Covers: FDUC Exception (graceful error UI)
     */
    test("systems-page container remains visible even in error state", async ({ page }) => {
        const metricsPage = new MetricsDashboardPage(page);
        await metricsPage.mockServerError();
        await metricsPage.open();
        await metricsPage.expectLoaded();

        await expect(page.getByTestId("systems-page")).toBeVisible();
    });
});
