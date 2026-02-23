import { test, expect } from "../fixtures/base.fixture";
import { authTest } from "../fixtures/auth.fixture";
import { LandingPage } from "../pages/public/landing.page";
import { DashboardPage } from "../pages/dashboard/dashboard.page";
import { routes } from "../fixtures/test-data";

const API_BASE_URL = "https://api.kleff.io";

test.describe("UC-01 Register Account — Pre-Authentication", () => {
  test("MSS Step 1-2: Landing page loads with Sign Up and Get Started buttons", async ({
    page
  }) => {
    const landing = new LandingPage(page);
    await landing.open();
    await landing.expectLoaded();

    const getStarted = page.locator('a[href="/dashboard"]').first();
    await expect(getStarted).toBeVisible();

    const header = page.locator("header").first();
    await expect(header).toBeVisible();
  });

  test("MSS Step 2-3: Clicking Get Started redirects unauthenticated user to auth", async ({
    page
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const getStarted = page.locator('a[href="/dashboard"]').first();
    await expect(getStarted).toBeVisible();
    await getStarted.click();

    await expect(page).toHaveURL(/\/auth\/signin|auth\.kleff\.io/, { timeout: 30_000 });
  });

  test("Alt 2b: Accessing /dashboard without auth redirects to /auth/signin", async ({ page }) => {
    await page.goto(routes.dashboard.root, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/auth\/signin|auth\.kleff\.io/, { timeout: 30_000 });
  });

  test("Alt 2b: Accessing /dashboard/projects without auth redirects to /auth/signin", async ({
    page
  }) => {
    await page.goto(routes.dashboard.projects, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/auth\/signin|auth\.kleff\.io/, { timeout: 30_000 });
  });

  test("Exc 9a: /auth/callback without valid session redirects to Authentik", async ({ page }) => {
    await page.goto(routes.auth.callback, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/auth\.kleff\.io/, { timeout: 30_000 });
  });

  test("Exc 9a: /auth/signin redirects unauthenticated user to Authentik", async ({ page }) => {
    await page.goto(routes.auth.signin, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/auth\.kleff\.io/, { timeout: 30_000 });
  });
});

authTest.describe("UC-01 Register Account — Post-Authentication", () => {
  authTest(
    "MSS Step 8-10: Authenticated user is redirected from /auth/signin to /dashboard",
    async ({ page }) => {
      await page.goto(routes.auth.signin, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    }
  );

  authTest("MSS Step 11-13: GET /api/v1/users/me returns valid user profile", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (resp) => /\/api\/v1\/users\/me(\?|$)/.test(resp.url()) && resp.request().method() === "GET"
    );

    const dash = new DashboardPage(page);
    await dash.open();

    const apiResponse = await responsePromise;
    expect(apiResponse.status()).toBe(200);

    const user = await apiResponse.json();

    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("username");
    expect(user).toHaveProperty("displayName");
    expect(user).toHaveProperty("emailVerified");
    expect(user).toHaveProperty("createdAt");
    expect(user).toHaveProperty("updatedAt");
    expect(user).toHaveProperty("isDeactivated");

    expect(user.username).toMatch(/^[a-z0-9_-]{2,63}$/);

    expect(typeof user.emailVerified).toBe("boolean");

    expect(user.isDeactivated).toBe(false);
  });

  authTest("MSS Step 14: Dashboard loads and shows project management UI", async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.open();
    await dash.expectLoaded();

    await expect(page.getByRole("heading", { name: "My Projects Dashboard" })).toBeVisible();
  });

  authTest("MSS Step 14: Authenticated user can navigate to Projects page", async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.open();
    await dash.expectLoaded();

    await page.goto(routes.dashboard.projects, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard\/projects/);
  });

  authTest("MSS Step 14: Authenticated user can access Settings page", async ({ page }) => {
    await page.goto(routes.dashboard.settings, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard\/settings/);
  });

  authTest(
    "Postcondition: User has at least one platform role assigned",
    async ({ page, request }) => {
      const dash = new DashboardPage(page);
      await dash.open();
      await dash.expectLoaded();

      const token = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const oidcKey = keys.find((k) => k.startsWith("oidc.user:"));
        if (!oidcKey) return null;
        const oidcData = JSON.parse(localStorage.getItem(oidcKey) || "{}");
        return oidcData.access_token || null;
      });
      expect(token).not.toBeNull();

      const response = await request.get(`${API_BASE_URL}/api/v1/users/me/platform-roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("roles");
      expect(Array.isArray(body.roles)).toBe(true);
      expect(body.roles.length).toBeGreaterThanOrEqual(1);
    }
  );

  authTest(
    "Exc 13a: GET /api/v1/users/me without Authorization header returns 401",
    async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/v1/users/me`);
      expect(response.status()).toBe(401);
    }
  );

  authTest(
    "Exc 13a: GET /api/v1/users/me with invalid Bearer token returns 401",
    async ({ request }) => {
      // Call API with a garbage token
      const response = await request.get(`${API_BASE_URL}/api/v1/users/me`, {
        headers: { Authorization: "Bearer invalid_token_value" }
      });
      expect(response.status()).toBe(401);
    }
  );

  authTest("Exc 14b: /error/deactivated page is accessible", async ({ page }) => {
    await page.goto("/error/deactivated", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/error\/deactivated/);
  });
});
