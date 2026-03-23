/**
 * e2e/base.ts
 *
 * Extended Playwright test that automatically applies all API and WebSocket
 * mocks before each test, then waits for auth to complete so the app is in
 * an authenticated state before assertions run.
 */

import { test as base, expect, type Page } from '@playwright/test';
import { mockRestApi } from './helpers/mockApi';
import { mockWebSocket } from './helpers/mockWs';

export { expect };

/** Set up all mocks on a page. Call before page.goto(). */
export async function setupMocks(page: Page): Promise<void> {
  await mockRestApi(page);
  await mockWebSocket(page);
}

/** Navigate and wait until the authenticated shell (nav) is visible. */
export async function gotoAuthenticated(page: Page, path: string): Promise<void> {
  await page.goto(path);
  // Wait for the auth check to complete and the Shell nav to appear.
  // With mocked auth this should be near-instant, but we allow 10s for CI.
  await page.locator('nav').waitFor({ state: 'visible', timeout: 10_000 });
}

export const test = base.extend<object>({
  page: async ({ page }, use) => {
    await setupMocks(page);
    await use(page);
  },
});
