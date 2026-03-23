import { test, expect, gotoAuthenticated } from './base';

test.describe('Comms page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, '/comms');
    await page.waitForTimeout(400);
  });

  test('renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(200);
    expect(errors).toHaveLength(0);
  });

  test('shows GitHub repo name from fixture', async ({ page }) => {
    await expect(page.getByText('neo-dock').first()).toBeVisible();
  });

  test('shows GitHub repo stars from fixture', async ({ page }) => {
    // repo.stars = 42, rendered as "* 42" in GitHubDashboard
    await expect(page.getByText('* 42')).toBeVisible();
  });

  test('shows GitHub notification title from fixture', async ({ page }) => {
    await expect(page.getByText(/Fix WebSocket reconnect logic/i)).toBeVisible();
  });

  test('shows unread email count from fixture', async ({ page }) => {
    // emailUnread.count = 3
    await expect(page.getByText('3').first()).toBeVisible();
  });

  test('shows email subject from fixture', async ({ page }) => {
    await expect(page.getByText(/Server Alert: High CPU Usage/i)).toBeVisible();
  });
});
