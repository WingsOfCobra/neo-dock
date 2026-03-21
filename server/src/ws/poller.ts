import { config } from '../config.js';
import { WsManager } from './manager.js';
import {
  systemMetricsBuffer,
  getOrCreateContainerBuffer,
  type SystemMetrics,
  type ContainerMetrics,
} from '../services/metricsBuffer.js';

const log = {
  error: (msg: string, err?: unknown) => {
    const errMsg = err instanceof Error ? err.message : String(err ?? '');
    console.error(`[poller] ${msg}${errMsg ? `: ${errMsg}` : ''}`);
  },
  info: (msg: string) => console.log(`[poller] ${msg}`),
};

async function chefFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const url = `${config.chefApiUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Chef-API-Key': config.chefApiKey,
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    throw new Error(`Chef API ${path} returned ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// --- Individual pollers ---

async function pollSystem(ws: WsManager): Promise<void> {
  try {
    const health = await chefFetch<Record<string, unknown>>('/system/health');
    ws.broadcast('system:health', health);

    // Push to metrics buffer
    const now = Date.now();
    const cpu = typeof health['cpu'] === 'number' ? health['cpu'] : 0;
    const memUsedPercent = typeof health['memUsedPercent'] === 'number' ? health['memUsedPercent'] : 0;
    const loadAvg = Array.isArray(health['loadAvg']) ? (health['loadAvg'] as number[]) : [0, 0, 0];

    const metrics: SystemMetrics = { cpu, memUsedPercent, loadAvg };
    systemMetricsBuffer.push(now, metrics);
  } catch (err) {
    log.error('system/health failed', err);
  }

  try {
    const disk = await chefFetch('/system/disk');
    ws.broadcast('system:disk', disk);
  } catch (err) {
    log.error('system/disk failed', err);
  }
}

interface ContainerInfo {
  id?: string;
  Id?: string;
}

interface ContainerStatsEntry {
  id?: string;
  Id?: string;
  cpuPercent?: number;
  cpu_percent?: number;
  memPercent?: number;
  mem_percent?: number;
  memUsage?: number;
  mem_usage?: number;
}

async function pollDocker(ws: WsManager): Promise<void> {
  try {
    const containers = await chefFetch<ContainerInfo[]>('/docker/containers');
    ws.broadcast('docker:containers', containers);
  } catch (err) {
    log.error('docker/containers failed', err);
  }

  try {
    const stats = await chefFetch<ContainerStatsEntry[]>('/docker/stats');
    ws.broadcast('docker:stats', stats);

    // Push to per-container metrics buffer
    const now = Date.now();
    if (Array.isArray(stats)) {
      for (const entry of stats) {
        const containerId = entry.id ?? entry.Id;
        if (!containerId) continue;

        const metrics: ContainerMetrics = {
          cpuPercent: entry.cpuPercent ?? entry.cpu_percent ?? 0,
          memPercent: entry.memPercent ?? entry.mem_percent ?? 0,
          memUsage: entry.memUsage ?? entry.mem_usage ?? 0,
        };

        const buffer = getOrCreateContainerBuffer(containerId);
        buffer.push(now, metrics);
      }
    }
  } catch (err) {
    log.error('docker/stats failed', err);
  }
}

async function pollServices(ws: WsManager): Promise<void> {
  try {
    const result = await chefFetch<{ services?: unknown[] }>('/services/status');
    const services = result.services ?? [];
    ws.broadcast('services:status', services);
  } catch (err) {
    log.error('services/status failed', err);
  }
}

async function pollGithub(ws: WsManager): Promise<void> {
  try {
    const repos = await chefFetch('/github/repos');
    ws.broadcast('github:repos', repos);
  } catch (err) {
    log.error('github/repos failed', err);
  }

  try {
    const notifications = await chefFetch('/github/notifications');
    ws.broadcast('github:notifications', notifications);
  } catch (err) {
    log.error('github/notifications failed', err);
  }
}

async function pollEmail(ws: WsManager): Promise<void> {
  try {
    const unread = await chefFetch('/email/unread');
    ws.broadcast('email:unread', unread);
  } catch (err) {
    log.error('email/unread failed', err);
  }
}

async function pollCron(ws: WsManager): Promise<void> {
  try {
    const jobs = await chefFetch('/cron/jobs');
    ws.broadcast('cron:jobs', jobs);
  } catch (err) {
    log.error('cron/jobs failed', err);
  }
}

async function pollTodos(ws: WsManager): Promise<void> {
  try {
    const todos = await chefFetch('/todo');
    ws.broadcast('todo:list', todos);
  } catch (err) {
    log.error('todo failed', err);
  }
}

// --- Poller orchestrator ---

interface PollerHandle {
  timers: ReturnType<typeof setInterval>[];
  stop: () => void;
}

export function startPollers(ws: WsManager): PollerHandle {
  const timers: ReturnType<typeof setInterval>[] = [];
  const intervals = config.pollIntervals;

  const register = (fn: (ws: WsManager) => Promise<void>, intervalSec: number) => {
    // Run immediately on startup
    fn(ws).catch((err) => log.error('initial poll failed', err));
    // Then on interval
    const timer = setInterval(() => {
      fn(ws).catch((err) => log.error('poll tick failed', err));
    }, intervalSec * 1000);
    timers.push(timer);
  };

  register(pollSystem, intervals.system);
  register(pollDocker, intervals.docker);
  register(pollServices, intervals.services);
  register(pollGithub, intervals.github);
  register(pollEmail, intervals.email);
  register(pollCron, intervals.cron);
  register(pollTodos, 10);

  log.info(
    `Started ${timers.length} pollers (system:${intervals.system}s, docker:${intervals.docker}s, ` +
    `services:${intervals.services}s, github:${intervals.github}s, email:${intervals.email}s, ` +
    `cron:${intervals.cron}s)`,
  );

  return {
    timers,
    stop: () => {
      for (const timer of timers) {
        clearInterval(timer);
      }
      timers.length = 0;
      log.info('All pollers stopped');
    },
  };
}
