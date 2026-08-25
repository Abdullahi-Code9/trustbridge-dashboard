import { test, expect } from "@playwright/test";
import {
  interceptApi,
  mockContributorSession,
  mockMaintainerSession,
} from "./helpers";

// ── Fixture data ──────────────────────────────────────────────────────────

const contributorsFixture = {
  contributors: [
    {
      id: "reg-1",
      githubUsername: "alice",
      stellarAddress: "GADDRALICE12345678901234567890123456789012345678901234",
      trustlineReady: true,
      trustlineAuthorized: true,
      verified: true,
      funded: true,
      xlmBalance: "10",
      spendableXlmBalance: "7",
      lastCheckedAt: new Date().toISOString(),
      readiness: "ready",
    },
    {
      id: "reg-2",
      githubUsername: "bob",
      stellarAddress: "GADDRBOBBBB12345678901234567890123456789012345678901234",
      trustlineReady: true,
      trustlineAuthorized: true,
      verified: false,
      funded: true,
      xlmBalance: "1.2",
      spendableXlmBalance: "0.2",
      lastCheckedAt: new Date().toISOString(),
      readiness: "low_reserve",
    },
    {
      id: "reg-3",
      githubUsername: "charlie",
      stellarAddress: "GADDRCHARLIECCC12345678901234567890123456789012345678",
      trustlineReady: false,
      trustlineAuthorized: false,
      verified: false,
      funded: false,
      xlmBalance: "0",
      spendableXlmBalance: "0",
      lastCheckedAt: null,
      readiness: "not_ready",
    },
  ],
};

const networkFixture = {
  horizonUrl: "https://horizon-testnet.stellar.org",
  horizonNetwork: "testnet",
  sorobanUrl: "https://soroban-testnet.stellar.org",
  sorobanNetwork: "testnet",
  sorobanContractConfigured: false,
  mismatched: false,
  warnings: [],
};

const sorobanFixture = { events: [], latestLedger: 0, errors: [] };
const statsFixture = { totalContributors: 3, readyCount: 1, readyPercent: 33 };

// ── Helpers ───────────────────────────────────────────────────────────────

async function setupDashboard(page: Parameters<typeof interceptApi>[0]) {
  await mockMaintainerSession(page);
  await interceptApi(page, "**/api/contributors/paginated**", {
    ...contributorsFixture,
    total: contributorsFixture.contributors.length,
    hasMore: false,
  });
  await interceptApi(page, "**/api/settings/network", networkFixture);
  await interceptApi(page, "**/api/soroban/events", sorobanFixture);
  await interceptApi(page, "**/api/stats", statsFixture);
}

// ── Dashboard access ──────────────────────────────────────────────────────

test.describe("Maintainer dashboard — access control", () => {
  test("unauthenticated users are redirected away from /dashboard", async ({ page }) => {
    // No session mock → NextAuth /api/auth/session returns 200 with no user
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/dashboard");
    // Middleware redirects non-authenticated visitors
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test("non-maintainer contributors cannot access /dashboard", async ({ page }) => {
    await mockContributorSession(page);
    await page.goto("/dashboard");
    // Middleware redirects non-maintainers to /register?error=maintainer
    await expect(page).toHaveURL(/register/);
  });

  test("maintainer can load the dashboard page", async ({ page }) => {
    await setupDashboard(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /maintainer dashboard/i })).toBeVisible();
  });
});

// ── Contributor table ─────────────────────────────────────────────────────

test.describe("Maintainer dashboard — contributor table", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
    await page.goto("/dashboard");
    // Wait for contributors to load
    await expect(page.getByText("@alice")).toBeVisible();
  });

  test("shows all contributors by default", async ({ page }) => {
    await expect(page.getByText("@alice")).toBeVisible();
    await expect(page.getByText("@bob")).toBeVisible();
    await expect(page.getByText("@charlie")).toBeVisible();
  });

  test("search filters contributors by username", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by username/i);
    await searchInput.fill("alice");

    await expect(page.getByText("@alice")).toBeVisible();
    await expect(page.getByText("@bob")).not.toBeVisible();
    await expect(page.getByText("@charlie")).not.toBeVisible();
  });

  test("search is case-insensitive", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by username/i);
    await searchInput.fill("ALICE");
    await expect(page.getByText("@alice")).toBeVisible();
    await expect(page.getByText("@bob")).not.toBeVisible();
  });

  test("searching by partial Stellar address works", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by username/i);
    await searchInput.fill("GADDRBOBBBB");
    await expect(page.getByText("@bob")).toBeVisible();
    await expect(page.getByText("@alice")).not.toBeVisible();
  });

  test("no-match search shows an empty state message", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by username/i);
    await searchInput.fill("zzz_no_match_zzz");
    await expect(page.getByText(/no contributors match/i)).toBeVisible();
  });

  test("clearing search restores all contributors", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by username/i);
    await searchInput.fill("alice");
    await expect(page.getByText("@bob")).not.toBeVisible();

    await searchInput.clear();
    await expect(page.getByText("@bob")).toBeVisible();
    await expect(page.getByText("@charlie")).toBeVisible();
  });

  test("'Ready' filter shows only ready contributors", async ({ page }) => {
    await page.getByRole("button", { name: /✅ Ready/i }).click();

    await expect(page.getByText("@alice")).toBeVisible();
    await expect(page.getByText("@bob")).not.toBeVisible();
    await expect(page.getByText("@charlie")).not.toBeVisible();
  });

  test("'Needs attention' filter hides ready contributors", async ({ page }) => {
    await page.getByRole("button", { name: /❌ Needs attention/i }).click();

    await expect(page.getByText("@alice")).not.toBeVisible();
    // low_reserve and not_ready should appear
    await expect(page.getByText("@bob")).toBeVisible();
    await expect(page.getByText("@charlie")).toBeVisible();
  });

  test("'Low reserve' filter shows only low-reserve contributors", async ({ page }) => {
    await page.getByRole("button", { name: /⚠️ Low reserve/i }).click();

    await expect(page.getByText("@bob")).toBeVisible();
    await expect(page.getByText("@alice")).not.toBeVisible();
    await expect(page.getByText("@charlie")).not.toBeVisible();
  });

  test("column toggle panel opens and hides a column", async ({ page }) => {
    // Stellar address column is visible by default
    const addressHeader = page.getByRole("columnheader", { name: /stellar address/i });
    await expect(addressHeader).toBeVisible();

    // Open column picker
    await page.getByRole("button", { name: /columns/i }).click();

    // Toggle off "Stellar address"
    await page.getByRole("button", { name: /Stellar address/i }).click();

    // Column header should be gone
    await expect(addressHeader).not.toBeVisible();
  });

  test("toggling a hidden column back on restores it", async ({ page }) => {
    await page.getByRole("button", { name: /columns/i }).click();

    // Spendable XLM is hidden by default — toggle it on
    await page.getByRole("button", { name: /Spendable XLM/i }).click();

    await expect(
      page.getByRole("columnheader", { name: /spendable xlm/i })
    ).toBeVisible();
  });
});

// ── Re-check action ───────────────────────────────────────────────────────

test.describe("Maintainer dashboard — re-check action", () => {
  test("re-check all button triggers POST /api/contributors", async ({ page }) => {
    await setupDashboard(page);

    let recheckCalled = false;
    await page.route("**/api/contributors", async (route) => {
      if (route.request().method() === "POST") {
        recheckCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ refreshed: 3, ...contributorsFixture }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(contributorsFixture),
        });
      }
    });

    await page.goto("/dashboard");
    await expect(page.getByText("@alice")).toBeVisible();

    await page.getByRole("button", { name: /re-check all/i }).click();
    await expect(async () => {
      expect(recheckCalled).toBe(true);
    }).toPass();
  });
});

// ── Admin metrics page ────────────────────────────────────────────────────

const metricsFixture = {
  contributors: {
    total: 3,
    ready: 1,
    readyPercent: 33,
    byStatus: { ready: 1, low_reserve: 1, not_ready: 1 },
  },
  audit: {
    recentEntries: 2,
    byAction: { "recheck.single": 1, "recheck.batch": 1 },
    latestAt: new Date().toISOString(),
  },
  config: {
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 10,
    circuitBreakerFailureThreshold: 5,
    circuitBreakerRecoveryMs: 30000,
    staleCsvMaxAgeMs: 86400000,
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanContractConfigured: false,
  },
};

test.describe("Admin metrics page", () => {
  test("non-maintainer cannot access /dashboard/metrics", async ({ page }) => {
    await mockContributorSession(page);
    await page.goto("/dashboard/metrics");
    await expect(page).toHaveURL(/register/);
  });

  test("maintainer sees the metrics page with contributor counts", async ({ page }) => {
    await mockMaintainerSession(page);
    await interceptApi(page, "**/api/metrics", metricsFixture);

    await page.goto("/dashboard/metrics");

    await expect(
      page.getByRole("heading", { name: /admin metrics/i })
    ).toBeVisible();

    // Contributor readiness breakdown should be visible
    await expect(page.getByText("1")).toBeVisible(); // ready count
  });

  test("metrics page shows operational config values", async ({ page }) => {
    await mockMaintainerSession(page);
    await interceptApi(page, "**/api/metrics", metricsFixture);

    await page.goto("/dashboard/metrics");
    await expect(page.getByText(/rate limit/i)).toBeVisible();
    await expect(page.getByText(/circuit breaker/i)).toBeVisible();
  });

  test("metrics page shows an error state when API fails", async ({ page }) => {
    await mockMaintainerSession(page);
    await interceptApi(page, "**/api/metrics", { error: "Forbidden" }, 403);

    await page.goto("/dashboard/metrics");
    await expect(page.getByText(/failed to load metrics/i)).toBeVisible();
  });
});
