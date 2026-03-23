// e2e/helpers/mockApi.ts
// Intercepts all REST API calls. Vite preview has no backend, so every
// /api/* request must be fulfilled here. Route patterns use the star-star
// prefix to match the full URL including protocol and host. Catch-all at
// the bottom returns 404 so phantom endpoints surface as test failures.

import type { Page } from '@playwright/test';
import { FIXTURES } from '../fixtures';

export async function mockRestApi(page: Page): Promise<void> {
  // ── Catch-all: registered FIRST so specific handlers below take priority.
  // (Playwright applies routes LIFO — last registered wins. Any /api/** path
  // not matched by a later handler reaches this 404, surfacing phantom calls.)
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 404, json: { error: 'Not Found' } }),
  );

  // ── Auth ────────────────────────────────────────────────────────────────
  await page.route('**/api/auth/check', (route) =>
    route.fulfill({ json: { authenticated: true } }),
  );
  await page.route('**/api/auth/verify', (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.route('**/api/auth/logout', (route) =>
    route.fulfill({ status: 204, body: '' }),
  );

  // ── Layout (persisted dashboard config) ─────────────────────────────────
  await page.route('**/api/layout', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 404, json: { error: 'Not Found' } });
    }
    return route.fulfill({ json: { ok: true } });
  });

  // ── Servers list (multi-server feature) ─────────────────────────────────
  await page.route('**/api/servers', (route) =>
    route.fulfill({ json: { servers: [], default: '' } }),
  );

  // ── Metrics history (in-memory ring buffer, not chef-api) ────────────────
  await page.route('**/api/metrics/system**', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/metrics/containers/**', (route) =>
    route.fulfill({ json: [] }),
  );

  // ── Loki (proxied through neo-dock, not chef-api) ────────────────────────
  await page.route('**/api/loki/labels', (route) =>
    route.fulfill({ json: { status: 'success', data: FIXTURES.lokiLabels } }),
  );
  await page.route('**/api/loki/label/**', (route) =>
    route.fulfill({ json: { status: 'success', data: [] } }),
  );
  await page.route('**/api/loki/query_range**', (route) =>
    route.fulfill({ json: { status: 'success', data: { result: [] } } }),
  );
  await page.route('**/api/loki/query**', (route) =>
    route.fulfill({ json: { status: 'success', data: { result: [] } } }),
  );

  // ── Chef-API mutations (data reads come via WebSocket, not REST) ─────────

  // Cron: run job, delete job, job history
  await page.route('**/api/chef/cron/jobs/*/run', (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.route('**/api/chef/cron/jobs/*/history**', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/chef/cron/jobs/*', (route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    if (route.request().method() === 'PATCH') {
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ status: 404, json: { error: 'Not Found' } });
  });

  // Cron: create
  await page.route('**/api/chef/cron/jobs', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        json: {
          id: 99,
          name: 'new-job',
          schedule: '*/5 * * * *',
          type: 'shell',
          config: {},
          enabled: 1,
          preset: null,
          last_run_at: null,
          last_run_status: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          nextRun: null,
        },
      });
    }
    return route.fulfill({ status: 404, json: { error: 'Not Found' } });
  });

  // Todo: create
  await page.route('**/api/chef/todo', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        json: {
          id: 99,
          title: 'New test todo',
          description: null,
          completed: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }
    return route.fulfill({ status: 404, json: { error: 'Not Found' } });
  });

  // Todo: update, delete
  await page.route('**/api/chef/todo/*', (route) => {
    if (route.request().method() === 'PATCH') {
      return route.fulfill({ json: { ok: true } });
    }
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ status: 404, json: { error: 'Not Found' } });
  });

  // Docker: container actions
  await page.route('**/api/chef/docker/containers/*/restart', (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
  await page.route('**/api/chef/docker/containers/*/stop', (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
  await page.route('**/api/chef/docker/containers/*/logs**', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/chef/docker/containers/*/inspect', (route) =>
    route.fulfill({ json: {} }),
  );

}
