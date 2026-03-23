import { test, expect, gotoAuthenticated } from './base';

test.describe('Tasks page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthenticated(page, '/tasks');
    await page.waitForTimeout(400);
  });

  test('renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(200);
    expect(errors).toHaveLength(0);
  });

  test('shows DB todo title from fixture', async ({ page }) => {
    await expect(page.getByText('Deploy new version to production')).toBeVisible();
  });

  test('shows file-based todo from fixture', async ({ page }) => {
    await expect(page.getByText('Update README docs')).toBeVisible();
  });

  test('shows cron job name from fixture', async ({ page }) => {
    await expect(page.getByText('backup-db')).toBeVisible();
  });

  test('shows cron schedule from fixture', async ({ page }) => {
    await expect(page.getByText('0 2 * * *')).toBeVisible();
  });

  test('creating a todo POSTs to the correct chef-api endpoint', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST') posts.push(req.url());
    });

    // Find the new-todo input and submit
    const input = page.getByPlaceholder(/new task/i);
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill('E2E test todo');
    await input.press('Enter');
    await page.waitForTimeout(300);

    // Must call /api/chef/todo — not any phantom endpoint
    expect(posts.some((u) => u.includes('/api/chef/todo'))).toBe(true);
    expect(posts.some((u) => /fleet|ansible|secret|alert/.test(u))).toBe(false);
  });
});
