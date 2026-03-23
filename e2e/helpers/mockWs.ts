/**
 * e2e/helpers/mockWs.ts
 *
 * Intercepts the WebSocket connection and injects fixture data as if it came
 * from the neo-dock server poller. This populates all Zustand stores so that
 * every page has data to render without needing a live chef-api backend.
 *
 * Message format: { topic: string, data: unknown, timestamp: string }
 *
 * Topic → store mapping mirrors the switch in App.tsx handleMessage().
 * If a new topic is added to the poller but not here, the corresponding
 * widget will show an empty/loading state and the test will fail.
 *
 * NOTE: The WS URL pattern uses a regex to reliably match ws://localhost:4173/ws
 * regardless of the glob engine's protocol handling.
 */

import type { Page } from '@playwright/test';
import { FIXTURES } from '../fixtures';

function wsMsg(topic: string, data: unknown): string {
  return JSON.stringify({ topic, data, timestamp: new Date().toISOString() });
}

function sendAllFixtures(ws: { send: (msg: string) => void }): void {
  // System
  ws.send(wsMsg('system:health', FIXTURES.systemHealth));
  ws.send(wsMsg('system:disk', FIXTURES.systemDisk));
  ws.send(wsMsg('system:processes', FIXTURES.systemProcesses));
  ws.send(wsMsg('system:network', []));

  // Docker
  ws.send(wsMsg('docker:containers', FIXTURES.dockerContainers));
  ws.send(wsMsg('docker:overview', FIXTURES.dockerOverview));

  // Services — poller sends result.services (inner array), not the wrapper
  ws.send(wsMsg('services:status', FIXTURES.servicesArray));

  // GitHub
  ws.send(wsMsg('github:repos', FIXTURES.githubRepos));
  ws.send(wsMsg('github:notifications', FIXTURES.githubNotifications));
  ws.send(wsMsg('github:prs', []));
  ws.send(wsMsg('github:issues', []));
  ws.send(wsMsg('github:workflows', []));

  // Email — poller sends raw { count, messages } object
  ws.send(wsMsg('email:unread', FIXTURES.emailUnread));

  // Cron
  ws.send(wsMsg('cron:jobs', FIXTURES.cronJobs));
  ws.send(wsMsg('cron:health', { schedulerActive: true }));

  // Todos — poller sends raw { db, file, total } object (normalizeTodos runs in App.tsx)
  ws.send(wsMsg('todo:list', FIXTURES.todos));

  // Loki
  ws.send(wsMsg('loki:labels', FIXTURES.lokiLabels));
  ws.send(wsMsg('loki:logs', FIXTURES.lokiLogs));
}

export async function mockWebSocket(page: Page): Promise<void> {
  // Use a regex to reliably match the WS URL regardless of glob engine behaviour
  await page.routeWebSocket(/\/ws$/, (ws) => {
    // Don't call ws.connectToServer() — we run without a neo-dock backend.

    // Send all fixture data immediately when the connection is established.
    sendAllFixtures(ws);

    // Also resend when the client sends its subscription message
    // (the app sends { type: 'subscribe', groups: [...] } on connect and reconnect).
    ws.onMessage(() => {
      sendAllFixtures(ws);
    });
  });
}
