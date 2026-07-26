/**
 * Playwright E2E helpers shared across maintainer specs.
 *
 * These utilities mock NextAuth session cookies so tests can simulate
 * authenticated maintainer sessions without a real GitHub OAuth flow.
 */

import { type Page, type BrowserContext } from "@playwright/test";

export interface FakeSession {
  id?: string;
  githubUsername?: string;
  name?: string;
  image?: string | null;
  isMaintainer?: boolean;
}

/**
 * Injects a mocked NextAuth session into the browser context.
 *
 * This sets `next-auth.session-token` as a plaintext cookie. In tests the
 * Next.js server should be running in an environment where
 * `NEXTAUTH_SECRET` resolves the JWT — for pure UI-layer tests we instead
 * intercept the `/api/auth/session` endpoint via route interception so no
 * real JWT is required.
 */
export async function mockSession(
  page: Page,
  session: FakeSession
): Promise<void> {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: session.id ?? "test-user-1",
          name: session.name ?? "Test User",
          image: session.image ?? null,
          githubUsername: session.githubUsername ?? "testuser",
          isMaintainer: session.isMaintainer ?? false,
        },
        expires: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    });
  });
}

/** Mock session as an authenticated maintainer. */
export async function mockMaintainerSession(
  page: Page,
  overrides: Partial<FakeSession> = {}
): Promise<void> {
  await mockSession(page, {
    id: "maintainer-1",
    githubUsername: "octocat",
    name: "Octo Cat",
    isMaintainer: true,
    ...overrides,
  });
}

/** Mock session as a regular (non-maintainer) contributor. */
export async function mockContributorSession(
  page: Page,
  overrides: Partial<FakeSession> = {}
): Promise<void> {
  await mockSession(page, {
    id: "contributor-1",
    githubUsername: "contributor",
    name: "Contributor",
    isMaintainer: false,
    ...overrides,
  });
}

/** Intercept a GET/POST API endpoint and return a canned response. */
export async function interceptApi(
  page: Page,
  urlPattern: string,
  body: unknown,
  status = 200
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}
