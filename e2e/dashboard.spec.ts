import { test, expect, gotoAuthenticated } from './base';

test.describe('Dashboard', () => {
  test('renders the authenticated shell without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await gotoAuthenticated(page, '/');
    expect(errors).toHaveLength(0);
  });

  test('shows DASHBOARD tab as active', async ({ page }) => {
    await gotoAuthenticated(page, '/');
    const dashTab = page.getByRole('link', { name: /DASHBOARD/i });
    await expect(dashTab).toBeVisible();
    await expect(dashTab).toHaveAttribute('aria-current', 'page');
  });

  test('all core tabs are present in navigation', async ({ page }) => {
    await gotoAuthenticated(page, '/');
    for (const label of ['DASHBOARD', 'SYSTEM', 'DOCKER', 'COMMS', 'TASKS', 'LOGS']) {
      await expect(page.getByRole('link', { name: new RegExp(label, 'i') })).toBeVisible();
    }
  });

  test('removed phantom tabs are NOT present', async ({ page }) => {
    await gotoAuthenticated(page, '/');
    for (const label of ['FLEET', 'ANSIBLE', 'SECRETS', 'ALERTS']) {
      await expect(page.getByRole('link', { name: new RegExp(label, 'i') })).not.toBeVisible();
    }
  });

  test('receives WS data and renders widgets without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await gotoAuthenticated(page, '/');
    // Give WS fixture data time to arrive and render
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
