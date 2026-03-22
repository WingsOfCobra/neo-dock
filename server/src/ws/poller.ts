import { config, type ChefServer } from '../config.js';
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

/** Create a fetch function bound to a specific chef-api server. */
function createChefFetch(server: ChefServer) {
  return async function chefFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
    const url = `${server.url}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Chef-API-Key': server.apiKey,
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      throw new Error(`Chef API [${server.name}] ${path} returned ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  };
}

type ChefFetchFn = ReturnType<typeof createChefFetch>;

// --- Individual pollers (now parameterized by server) ---

async function pollSystem(ws: WsManager, serverName: string, chefFetch: ChefFetchFn): Promise<void> {
  if (!ws.hasSubscribers('system', serverName)) return;

  try {
    const health = await chefFetch<Record<string, unknown>>('/system/health');
    ws.broadcast('system:health', health, serverName);

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
    log.error(`[${serverName}] system/health failed`, err);
  }

  try {
    const disks = await chefFetch<unknown>('/system/disk');
    ws.broadcast('system:disk', Array.isArray(disks) ? disks : [], serverName);
  } catch (err) {
    log.error(`[${serverName}] system/disk failed`, err);
  }

  try {
    const processes = await chefFetch<unknown[]>('/system/processes');
    ws.broadcast('system:processes', Array.isArray(processes) ? processes : [], serverName);
  } catch (err) {
    log.error(`[${serverName}] system/processes failed`, err);
  }
}

interface ChefContainerEntry {
  id?: string;
  name?: string;
}

async function pollDocker(ws: WsManager, serverName: string, chefFetch: ChefFetchFn): Promise<void> {
  if (!ws.hasSubscribers('docker', serverName)) return;

  try {
    const containers = await chefFetch<ChefContainerEntry[]>('/docker/containers');
    ws.broadcast('docker:containers', containers, serverName);

    if (Array.isArray(containers)) {
      for (const c of containers) {
        const cId = c.id ?? c.name;
        if (!cId) continue;
        try {
          const stats = await chefFetch<Record<string, unknown>>(`/docker/containers/${encodeURIComponent(cId)}/stats`);
          ws.broadcast('docker:containerStats', stats, serverName);

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
    log.error(`[${serverName}] docker/containers failed`, err);
  }

  try {
    const overview = await chefFetch<Record<string, unknown>>('/docker/stats');
    ws.broadcast('docker:overview', overview, serverName);
  } catch (err) {
    log.error(`[${serverName}] docker/stats (overview) failed`, err);
  }
}

async function pollServices(ws: WsManager, serverName: string, chefFetch: ChefFetchFn): Promise<void> {
  if (!ws.hasSubscribers('services', serverName)) return;
  try {
    const result = await chefFetch<{ services?: unknown[] }>('/services/status');
    const services = result.services ?? [];
    ws.broadcast('services:status', services, serverName);
  } catch (err) {
    log.error(`[${serverName}] services/status failed`, err);
  }
}

async function pollGithub(ws: WsManager, serverName: string, chefFetch: ChefFetchFn): Promise<void> {
  if (!ws.hasSubscribers('github', serverName)) return;
  try {
    const repos = await chefFetch('/github/repos');
    ws.broadcast('github:repos', repos, serverName);
  } catch (err) {
    log.error(`[${serverName}] github/repos failed`, err);
  }

  try {
    const notifications = await chefFetch('/github/notifications');
    ws.broadcast('github:notifications', notifications, serverName);
  } catch (err) {
    log.error(`[${serverName}] github/notifications failed`, err);
  }

  try {
    const prs = await chefFetch('/github/prs');
    ws.broadcast('github:prs', prs, serverName);
  } catch (err) {
    log.error(`[${serverName}] github/prs failed`, err);
  }

  try {
    const issues = await chefFetch('/github/issues');
    ws.broadcast('github:issues', issues, serverName);
  } catch (err) {
    log.error(`[${serverName}] github/issues failed`, err);
  }

  try {
    const workflows = await chefFetch('/github/workflows');
    ws.broadcast('github:workflows', workflows, serverName);
  } catch (err) {
    log.error(`[${serverName}] github/workflows failed`, err);
  }
}

async function pollEmail(ws: WsManager, serverName: string, chefFetch: ChefFetchFn): Promise<void> {
  if (!ws.hasSubscribers('email', serverName)) return;
  try {
    const unread = await chefFetch('/email/unread');
    ws.broadcast('email:unread', unread, serverName);
  } catch (err) {
    log.error(`[${serverName}] email/unread failed`, err);
  }
}

async function pollCron(ws: WsManager, serverName: string, chefFetch: ChefFetchFn): Promise<void> {
  if (!ws.hasSubscribers('cron', serverName)) return;
  try {
    const jobs = await chefFetch('/cron/jobs');
    ws.broadcast('cron:jobs', jobs, serverName);
  } catch (err) {
    log.error(`[${serverName}] cron/jobs failed`, err);
  }

  try {
    const health = await chefFetch('/cron/health');
    ws.broadcast('cron:health', health, serverName);
  } catch (err) {
    log.error(`[${serverName}] cron/health failed`, err);
  }
}

async function pollTodos(ws: WsManager, serverName: string, chefFetch: ChefFetchFn): Promise<void> {
  if (!ws.hasSubscribers('todos', serverName)) return;
  try {
    const todos = await chefFetch('/todo');
    ws.broadcast('todo:list', todos, serverName);
  } catch (err) {
    log.error(`[${serverName}] todo failed`, err);
  }
}

// --- Loki log polling (not server-specific, only runs once) ---

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

  const register = (fn: () => Promise<void>, intervalSec: number) => {
    // Run immediately on startup
    fn().catch((err) => log.error('initial poll failed', err));
    // Then on interval
    const timer = setInterval(() => {
      fn().catch((err) => log.error('poll tick failed', err));
    }, intervalSec * 1000);
    timers.push(timer);
  };

  // Register pollers for each configured server
  for (const server of config.servers) {
    const fetchFn = createChefFetch(server);
    const name = server.name;

    register(() => pollSystem(ws, name, fetchFn), intervals.system);
    register(() => pollDocker(ws, name, fetchFn), intervals.docker);
    register(() => pollServices(ws, name, fetchFn), intervals.services);
    register(() => pollGithub(ws, name, fetchFn), intervals.github);
    register(() => pollEmail(ws, name, fetchFn), intervals.email);
    register(() => pollCron(ws, name, fetchFn), intervals.cron);
    register(() => pollTodos(ws, name, fetchFn), 10);
  }

  // Loki polling is not server-specific — only runs once
  register(() => pollLoki(ws), intervals.logs);

  const serverNames = config.servers.map((s) => s.name).join(', ');
  log.info(
    `Started pollers for ${config.servers.length} server(s) [${serverNames}] ` +
    `(system:${intervals.system}s, docker:${intervals.docker}s, ` +
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
