/**
 * e2e/fixtures.ts
 *
 * Typed API fixtures for e2e tests. Types are extracted directly from the
 * generated chef-api.types.ts — if the API spec changes its response shapes,
 * TypeScript will flag these fixtures as broken, forcing tests and consuming
 * code to stay in sync with the real API.
 */

import type { paths } from '../client/src/types/chef-api.types';

// ── Extract response types from chef-api OpenAPI paths ──────────────────────
// This is the key coordination guarantee: mismatches between fixtures and the
// real API spec surface as TypeScript errors, not silent runtime failures.

type SystemHealth =
  paths['/system/health']['get']['responses'][200]['content']['application/json'];

type DiskArray =
  paths['/system/disk']['get']['responses'][200]['content']['application/json'];

type ProcessArray =
  paths['/system/processes']['get']['responses'][200]['content']['application/json'];

type ContainerArray =
  paths['/docker/containers']['get']['responses'][200]['content']['application/json'];

type GithubRepoArray =
  paths['/github/repos']['get']['responses'][200]['content']['application/json'];

type GithubNotificationArray =
  paths['/github/notifications']['get']['responses'][200]['content']['application/json'];

type EmailUnread =
  paths['/email/unread']['get']['responses'][200]['content']['application/json'];

type TodoResponse =
  paths['/todo/']['get']['responses'][200]['content']['application/json'];

type CronJobArray =
  paths['/cron/jobs']['get']['responses'][200]['content']['application/json'];

// ── Fixture values ───────────────────────────────────────────────────────────
// Use specific string values that tests can assert against.

const systemHealth: SystemHealth = {
  status: 'healthy',
  uptime: 86400,
  uptimeHuman: '1 day',
  hostname: 'test-server',
  platform: 'linux',
  nodeVersion: 'v22.0.0',
  cpu: { usage_percent: 25.5, cores: 8, model: 'Intel Core i7-9700K' },
  memory: { total: '16 GB', free: '8 GB', usedPercent: '50%' },
  network: { rx_bytes: 1_024_000, tx_bytes: 512_000 },
  loadAvg: [0.5, 0.7, 0.8],
  timestamp: new Date().toISOString(),
};

const systemDisk: DiskArray = [
  {
    filesystem: '/dev/sda1',
    size: '500 GB',
    used: '200 GB',
    available: '300 GB',
    usePercent: '40%',
    mountpoint: '/',
  },
];

const systemProcesses: ProcessArray = [
  { pid: 1, user: 'root', cpuPercent: '0.1', memPercent: '0.3', command: 'systemd' },
  { pid: 1234, user: 'node', cpuPercent: '2.5', memPercent: '1.2', command: 'node /app/server/dist/index.js' },
  { pid: 5678, user: 'www-data', cpuPercent: '1.1', memPercent: '0.5', command: 'nginx: worker process' },
];

const dockerContainers: ContainerArray = [
  {
    id: 'abc123def456',
    name: 'neo-dock',
    image: 'ghcr.io/wingsofcobra/neo-dock:latest',
    status: 'Up 2 hours',
    state: 'running',
    health: 'healthy',
    uptime: '2 hours',
    ports: ['4445:4445'],
  },
  {
    id: 'def456ghi789',
    name: 'chef-api',
    image: 'chef-api:local',
    status: 'Up 5 hours',
    state: 'running',
    health: null,
    uptime: '5 hours',
    ports: ['4242:4242'],
  },
];

// The WS poller sends result.services (inner array), not the wrapped object.
// This matches how App.tsx handles 'services:status': s.setServices(asArray(d))
const servicesArray = [
  { name: 'nginx', active: true, status: 'active (running)' },
  { name: 'postgresql', active: true, status: 'active (running)' },
];

const githubRepos: GithubRepoArray = [
  {
    name: 'neo-dock',
    fullName: 'WingsOfCobra/neo-dock',
    description: 'Cyberpunk self-hosted monitoring dashboard',
    stars: 42,
    lastPush: new Date().toISOString(),
    openIssues: 3,
    url: 'https://github.com/WingsOfCobra/neo-dock',
    private: false,
  },
];

const githubNotifications: GithubNotificationArray = [
  {
    id: 'n1',
    reason: 'mention',
    title: 'Fix WebSocket reconnect logic',
    type: 'Issue',
    repo: 'neo-dock',
    url: 'https://github.com/WingsOfCobra/neo-dock/issues/1',
    updatedAt: new Date().toISOString(),
  },
];

const emailUnread: EmailUnread = {
  count: 3,
  messages: [
    {
      uid: 1,
      subject: 'Server Alert: High CPU Usage',
      from: 'monitoring@example.com',
      date: new Date().toISOString(),
    },
  ],
};

const todos: TodoResponse = {
  db: [
    {
      id: 1,
      title: 'Deploy new version to production',
      description: null,
      completed: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  file: [
    { id: 0, title: 'Update README docs', completed: false, source: 'TODO.md' },
  ],
  total: 2,
};

const cronJobs: CronJobArray = [
  {
    id: 1,
    name: 'backup-db',
    schedule: '0 2 * * *',
    type: 'shell',
    config: { command: 'pg_dump neo_dock > backup.sql' },
    enabled: 1,
    preset: null,
    last_run_at: new Date().toISOString(),
    last_run_status: 'ok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nextRun: null,
  },
];

export const FIXTURES = {
  // chef-api typed fixtures (TypeScript enforces shape matches spec)
  systemHealth,
  systemDisk,
  systemProcesses,
  dockerContainers,
  githubRepos,
  githubNotifications,
  emailUnread,
  todos,
  cronJobs,

  // WS-specific: services sends the inner array (not the REST wrapper object)
  servicesArray,

  // Loki (not chef-api, so typed inline)
  lokiLabels: ['job', 'container_name', 'unit'],
  lokiLogs: [
    {
      timestamp: String(Date.now() * 1_000_000),
      line: '2026-03-23T12:00:00Z INFO neo-dock started',
      labels: { job: 'neo-dock' },
    },
  ],

  // Docker overview (opaque shape from /docker/stats)
  dockerOverview: { containers: { running: 2, stopped: 0, paused: 0 } },
};
