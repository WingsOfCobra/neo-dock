import { test, expect, gotoAuthenticated } from './base';

test.describe('System page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, '/system');
    // Wait for WS fixture data to arrive and React to re-render
    await page.waitForTimeout(400);
  });

  test('renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(200);
    expect(errors).toHaveLength(0);
  });

  test('shows hostname from fixture', async ({ page }) => {
    await expect(page.getByText('test-server')).toBeVisible();
  });

  test('shows CPU model from fixture', async ({ page }) => {
    await expect(page.getByText(/Intel Core i7/i).first()).toBeVisible();
  });

  test('shows disk mountpoint from fixture', async ({ page }) => {
    // Disk entry for '/'
    await expect(page.getByText('/', { exact: true }).first()).toBeVisible();
  });

  test('shows service names from fixture', async ({ page }) => {
    await expect(page.getByText('nginx').first()).toBeVisible();
    await expect(page.getByText('postgresql').first()).toBeVisible();
  });

  test('shows process command from fixture', async ({ page }) => {
    await expect(page.getByText(/node \/app\/server/i).first()).toBeVisible();
  });
});
