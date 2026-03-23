import { test, expect, gotoAuthenticated } from './base';

test.describe('Docker page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, '/docker');
    await page.waitForTimeout(400);
  });

  test('renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(200);
    expect(errors).toHaveLength(0);
  });

  test('shows container names from fixture', async ({ page }) => {
    await expect(page.getByText('neo-dock').first()).toBeVisible();
    await expect(page.getByText('chef-api').first()).toBeVisible();
  });

  test('shows running state badges', async ({ page }) => {
    const runningBadge = page.getByText('running').first();
    await expect(runningBadge).toBeVisible();
  });

  test('shows the container count header', async ({ page }) => {
    // DockerContainers header shows "X running"
    await expect(page.getByText(/running/i).first()).toBeVisible();
  });

  test('navigating to a container detail page does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    // Click the neo-dock container row to navigate to detail
    await page.getByText('neo-dock').first().click();
    await page.waitForTimeout(300);
    expect(errors).toHaveLength(0);
  });
});
