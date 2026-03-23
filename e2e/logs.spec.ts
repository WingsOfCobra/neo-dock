import { test, expect, gotoAuthenticated } from './base';

test.describe('Logs page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, '/logs');
    await page.waitForTimeout(400);
  });

  test('renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(200);
    expect(errors).toHaveLength(0);
  });

  test('shows the logs viewer UI', async ({ page }) => {
    // The page container should be present
    await expect(page.locator('main, [class*="animate-fade-in"]').first()).toBeVisible();
  });

  test('shows source group selector', async ({ page }) => {
    // LogsViewer renders a <select> with "ALL SOURCES" as default option
    await expect(page.getByRole('option', { name: 'ALL SOURCES' })).toBeAttached();
  });

  test('shows log entry from fixture', async ({ page }) => {
    // lokiLogs fixture has "neo-dock started" line
    await expect(page.getByText(/neo-dock started/i).first()).toBeVisible();
  });

  test('only calls real loki and auth API endpoints', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/')) apiCalls.push(url);
    });

    await page.waitForTimeout(500);

    // All API calls must be to known routes
    const unknownCalls = apiCalls.filter(
      (u) =>
        !u.includes('/api/auth/') &&
        !u.includes('/api/layout') &&
        !u.includes('/api/loki/') &&
        !u.includes('/api/metrics/') &&
        !u.includes('/api/servers'),
    );
    expect(unknownCalls).toHaveLength(0);
  });
});
