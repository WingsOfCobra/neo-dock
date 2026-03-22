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
  if (!ws.hasSubscribers('system')) return;

  try {
    // Broadcast the full health object — let the client read the nested fields
    const health = await chefFetch<Record<string, unknown>>('/system/health');
    ws.broadcast('system:health', health);

    // Push to metrics buffer using nested fields
    const now = Date.now();
    const cpuObj = health['cpu'] as Record<string, unknown> | undefined;
    const memObj = health['memory'] as Record<string, unknown> | undefined;
    const cpu = Number(cpuObj?.['usage_percent'] ?? 0);
    const memUsedPercent = parseFloat(String(memObj?.['usedPercent'] ?? '0'));
    const loadAvg = Array.isArray(health['loadAvg']) ? (health['loadAvg'] as number[]) : [0, 0, 0];

    const metrics: SystemMetrics = { cpu, memUsedPercent, loadAvg };
    systemMetricsBuffer.push(now, metrics);
  } catch (err) {
    log.error('system/health failed', err);
  }

  try {
    // Broadcast disk array directly — chef-api returns an array
    const disks = await chefFetch<unknown>('/system/disk');
    ws.broadcast('system:disk', Array.isArray(disks) ? disks : []);
  } catch (err) {
    log.error('system/disk failed', err);
  }

  try {
    const processes = await chefFetch<unknown[]>('/system/processes');
    ws.broadcast('system:processes', Array.isArray(processes) ? processes : []);
  } catch (err) {
    log.error('system/processes failed', err);
  }

  try {
    const network = await chefFetch<unknown>('/system/network');
    ws.broadcast('system:network', Array.isArray(network) ? network : []);
  } catch (err) {
    log.error('system/network failed', err);
  }
}

interface ChefContainerEntry {
  id?: string;
  name?: string;
}

async function pollDocker(ws: WsManager): Promise<void> {
  if (!ws.hasSubscribers('docker')) return;

  try {
    const containers = await chefFetch<ChefContainerEntry[]>('/docker/containers');
    ws.broadcast('docker:containers', containers);

    // Fetch per-container stats for running containers
    if (Array.isArray(containers)) {
      for (const c of containers) {
        const cId = c.id ?? c.name;
        if (!cId) continue;
        try {
          const stats = await chefFetch<Record<string, unknown>>(`/docker/containers/${encodeURIComponent(cId)}/stats`);
          ws.broadcast('docker:containerStats', stats);

          // Push to per-container metrics buffer
          const now = Date.now();
          const metrics: ContainerMetrics = {
            cpuPercent: Number(stats['cpu_percent'] ?? 0),
            memPercent: Number(stats['memory_percent'] ?? 0),
            memUsage: Number(stats['memory_usage'] ?? 0),
          };
          const buffer = getOrCreateContainerBuffer(cId);
          buffer.push(now, metrics);
        } catch {
          // Individual container stats can fail if container is stopped
        }
      }
    }
  } catch (err) {
    log.error('docker/containers failed', err);
  }

  try {
    const overview = await chefFetch<Record<string, unknown>>('/docker/stats');
    ws.broadcast('docker:overview', overview);
  } catch (err) {
    log.error('docker/stats (overview) failed', err);
  }
}

async function pollServices(ws: WsManager): Promise<void> {
  if (!ws.hasSubscribers('services')) return;
  try {
    const result = await chefFetch<{ services?: unknown[] }>('/services/status');
    const services = result.services ?? [];
    ws.broadcast('services:status', services);
  } catch (err) {
    log.error('services/status failed', err);
  }
}

async function pollGithub(ws: WsManager): Promise<void> {
  if (!ws.hasSubscribers('github')) return;
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

  try {
    const prs = await chefFetch('/github/prs');
    ws.broadcast('github:prs', prs);
  } catch (err) {
    log.error('github/prs failed', err);
  }

  try {
    const issues = await chefFetch('/github/issues');
    ws.broadcast('github:issues', issues);
  } catch (err) {
    log.error('github/issues failed', err);
  }

  try {
    const workflows = await chefFetch('/github/workflows');
    ws.broadcast('github:workflows', workflows);
  } catch (err) {
    log.error('github/workflows failed', err);
  }
}

async function pollEmail(ws: WsManager): Promise<void> {
  if (!ws.hasSubscribers('email')) return;
  try {
    // Broadcast the full { count, messages } object
    const unread = await chefFetch('/email/unread');
    ws.broadcast('email:unread', unread);
  } catch (err) {
    log.error('email/unread failed', err);
  }
}

async function pollCron(ws: WsManager): Promise<void> {
  if (!ws.hasSubscribers('cron')) return;
  try {
    const jobs = await chefFetch('/cron/jobs');
    ws.broadcast('cron:jobs', jobs);
  } catch (err) {
    log.error('cron/jobs failed', err);
  }

  try {
    const health = await chefFetch('/cron/health');
    ws.broadcast('cron:health', health);
  } catch (err) {
    log.error('cron/health failed', err);
  }
}

async function pollTodos(ws: WsManager): Promise<void> {
  if (!ws.hasSubscribers('todos')) return;
  try {
    // Broadcast the full { db, file, total } structure
    const todos = await chefFetch('/todo');
    ws.broadcast('todo:list', todos);
  } catch (err) {
    log.error('todo failed', err);
  }
}

// --- Loki log polling ---

let lastLokiTimestamp = '0';

async function pollLoki(ws: WsManager): Promise<void> {
  if (!ws.hasSubscribers('loki')) return;
  try {
    const lokiUrl = config.lokiUrl ?? 'http://localhost:3100';

    // Fetch labels for categories
    const labelsResp = await fetch(`${lokiUrl}/loki/api/v1/labels`, {
      headers: { Accept: 'application/json' },
    });
    if (labelsResp.ok) {
      const labelsData = await labelsResp.json() as { data?: string[] };
      ws.broadcast('loki:labels', labelsData.data ?? []);
    }

    // Fetch recent logs (last 30 seconds, or since last poll)
    const now = Date.now();
    const startNs = lastLokiTimestamp !== '0'
      ? lastLokiTimestamp
      : String((now - 30_000) * 1_000_000); // 30s ago in nanoseconds
    const endNs = String(now * 1_000_000);

    // Fetch from both label dimensions in parallel:
    // - compose_service=~".+" covers all Docker container logs
    // - job=~".+"            covers file-based logs (fail2ban/security)
    type LokiStream = { stream: Record<string, string>; values: Array<[string, string]> };
    type LokiResponse = { data?: { result?: LokiStream[] } };

    const fetchQuery = async (query: string): Promise<LokiStream[]> => {
      const url = new URL('/loki/api/v1/query_range', lokiUrl);
      url.searchParams.set('query', query);
      url.searchParams.set('start', startNs);
      url.searchParams.set('end', endNs);
      url.searchParams.set('limit', '100');
      url.searchParams.set('direction', 'forward');
      const resp = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!resp.ok) return [];
      const data = await resp.json() as LokiResponse;
      return data.data?.result ?? [];
    };

    const [dockerStreams, jobStreams] = await Promise.all([
      fetchQuery('{compose_service=~".+"}'),
      fetchQuery('{job=~".+"}'),
    ]);

    const logsResp = { ok: true }; // keep structure below intact
    if (logsResp.ok) {
      const streams = [...dockerStreams, ...jobStreams];
      const entries: Array<{
        timestamp: string;
        line: string;
        labels: Record<string, string>;
      }> = [];

      let maxTs = lastLokiTimestamp;

      for (const stream of streams) {
        for (const [ts, line] of stream.values) {
          entries.push({
            timestamp: ts,
            line,
            labels: stream.stream,
          });
          if (ts > maxTs) maxTs = ts;
        }
      }

      // Sort by timestamp ascending
      entries.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));

      if (entries.length > 0) {
        ws.broadcast('loki:logs', entries);
        // Move past the last seen timestamp to avoid duplicates
        lastLokiTimestamp = String(BigInt(maxTs) + 1n);
      }
    }
  } catch (err) {
    log.error('loki poll failed', err);
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
  register(pollLoki, intervals.logs);

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
