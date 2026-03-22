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
    const raw = await chefFetch<Record<string, unknown>>('/system/health');

    // Normalize field names — chef-api may use snake_case or different keys
    const health: Record<string, unknown> = {
      hostname: raw['hostname'] ?? '',
      platform: raw['platform'] ?? '',
      arch: raw['arch'] ?? '',
      uptime: raw['uptime'] ?? 0,
      cpuModel: raw['cpuModel'] ?? raw['cpu_model'] ?? '',
      cpuCores: raw['cpuCores'] ?? raw['cpu_cores'] ?? raw['cores'] ?? 0,
      cpu: raw['cpu'] ?? raw['cpu_percent'] ?? raw['cpuPercent'] ?? 0,
      memTotal: raw['memTotal'] ?? raw['mem_total'] ?? raw['totalMem'] ?? 0,
      memUsed: raw['memUsed'] ?? raw['mem_used'] ?? raw['usedMem'] ?? 0,
      memFree: raw['memFree'] ?? raw['mem_free'] ?? raw['freeMem'] ?? 0,
      memUsedPercent: raw['memUsedPercent'] ?? raw['mem_used_percent'] ?? 0,
      loadAvg: raw['loadAvg'] ?? raw['load_avg'] ?? raw['loadavg'] ?? [0, 0, 0],
    };

    // Compute memUsedPercent if not provided
    const memTotal = Number(health['memTotal']) || 0;
    const memUsed = Number(health['memUsed']) || 0;
    if (!health['memUsedPercent'] && memTotal > 0) {
      health['memUsedPercent'] = (memUsed / memTotal) * 100;
    }

    ws.broadcast('system:health', health);

    // Push to metrics buffer
    const now = Date.now();
    const cpu = typeof health['cpu'] === 'number' ? health['cpu'] : 0;
    const memUsedPercent = typeof health['memUsedPercent'] === 'number' ? (health['memUsedPercent'] as number) : 0;
    const loadAvg = Array.isArray(health['loadAvg']) ? (health['loadAvg'] as number[]) : [0, 0, 0];

    const metrics: SystemMetrics = { cpu, memUsedPercent, loadAvg };
    systemMetricsBuffer.push(now, metrics);
  } catch (err) {
    log.error('system/health failed', err);
  }

  try {
    const raw = await chefFetch<unknown>('/system/disk');

    // Unwrap common response shapes: { disks: [...] }, { data: [...] }, or raw array
    let disks: unknown[];
    if (Array.isArray(raw)) {
      disks = raw;
    } else if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      disks = (Array.isArray(obj['disks']) ? obj['disks']
        : Array.isArray(obj['data']) ? obj['data']
        : Array.isArray(obj['mounts']) ? obj['mounts']
        : []) as unknown[];
    } else {
      disks = [];
    }

    // Normalize disk field names
    const normalized = disks.map((d) => {
      if (!d || typeof d !== 'object') return d;
      const entry = d as Record<string, unknown>;
      return {
        mount: entry['mount'] ?? entry['mountpoint'] ?? entry['mount_point'] ?? entry['path'] ?? '',
        filesystem: entry['filesystem'] ?? entry['fs'] ?? entry['type'] ?? '',
        size: entry['size'] ?? entry['total'] ?? 0,
        used: entry['used'] ?? 0,
        available: entry['available'] ?? entry['free'] ?? entry['avail'] ?? 0,
        usedPercent: entry['usedPercent'] ?? entry['used_percent'] ?? entry['use_percent'] ?? entry['capacity'] ?? 0,
      };
    });

    ws.broadcast('system:disk', normalized);
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
  if (!ws.hasSubscribers('docker')) return;
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
}

async function pollEmail(ws: WsManager): Promise<void> {
  if (!ws.hasSubscribers('email')) return;
  try {
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
}

async function pollTodos(ws: WsManager): Promise<void> {
  if (!ws.hasSubscribers('todos')) return;
  try {
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

    const queryUrl = new URL('/loki/api/v1/query_range', lokiUrl);
    queryUrl.searchParams.set('query', '{job=~".+"}');
    queryUrl.searchParams.set('start', startNs);
    queryUrl.searchParams.set('end', endNs);
    queryUrl.searchParams.set('limit', '100');
    queryUrl.searchParams.set('direction', 'forward');

    const logsResp = await fetch(queryUrl.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (logsResp.ok) {
      const logsData = await logsResp.json() as {
        data?: {
          result?: Array<{
            stream: Record<string, string>;
            values: Array<[string, string]>;
          }>;
        };
      };

      const streams = logsData.data?.result ?? [];
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
