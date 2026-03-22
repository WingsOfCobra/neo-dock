/* ── Offline Data Cache ───────────────────────────────────── */

import { useMetricsStore } from '@/stores/metricsStore';

const CACHE_KEY = 'neo-dock-offline-cache';
const SAVE_INTERVAL_MS = 5_000;
const HYDRATE_TIMEOUT_MS = 3_000;

export interface OfflineCacheData {
  timestamp: number;
  systemHealth: unknown;
  containers: unknown;
  dockerOverview: unknown;
  services: unknown;
  todos: unknown;
  todoTotal: number;
  cronJobs: unknown;
}

/* ── Save: debounced snapshot to localStorage ────────────── */

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave = false;

function doSave(): void {
  const s = useMetricsStore.getState();

  const data: OfflineCacheData = {
    timestamp: Date.now(),
    systemHealth: s.systemHealth,
    containers: s.containers,
    dockerOverview: s.dockerOverview,
    services: s.services,
    todos: s.todos,
    todoTotal: s.todoTotal,
    cronJobs: s.cronJobs,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage might be full or unavailable — ignore */
  }

  pendingSave = false;
}

/** Call on every WS message; actual save is debounced to every 5s. */
export function scheduleSave(): void {
  if (pendingSave) return;
  pendingSave = true;

  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, SAVE_INTERVAL_MS);
}

/* ── Load: read cached data from localStorage ────────────── */

export function loadOfflineCache(): OfflineCacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineCacheData;
  } catch {
    return null;
  }
}

/* ── Hydrate: restore store from offline cache ───────────── */

export function hydrateFromCache(data: OfflineCacheData): void {
  const s = useMetricsStore.getState();

  if (data.systemHealth) {
    s.setSystemHealth(data.systemHealth as Parameters<typeof s.setSystemHealth>[0]);
  }
  if (Array.isArray(data.containers)) {
    s.setContainers(data.containers as Parameters<typeof s.setContainers>[0]);
  }
  if (data.dockerOverview) {
    s.setDockerOverview(data.dockerOverview as Parameters<typeof s.setDockerOverview>[0]);
  }
  if (Array.isArray(data.services)) {
    s.setServices(data.services as Parameters<typeof s.setServices>[0]);
  }
  if (Array.isArray(data.todos)) {
    s.setTodos(data.todos as Parameters<typeof s.setTodos>[0]);
    s.setTodoTotal(data.todoTotal ?? data.todos.length);
  }
  if (Array.isArray(data.cronJobs)) {
    s.setCronJobs(data.cronJobs as Parameters<typeof s.setCronJobs>[0]);
  }
}

/**
 * Start offline hydration timeout.
 * If WS doesn't connect within 3s, hydrate from cache.
 * Returns the cache data if hydration occurred, or null.
 */
export function startOfflineHydration(
  isConnected: () => boolean,
): Promise<OfflineCacheData | null> {
  return new Promise((resolve) => {
    // If already connected, no need to hydrate
    if (isConnected()) {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => {
      if (isConnected()) {
        resolve(null);
        return;
      }
      const cached = loadOfflineCache();
      if (cached) {
        hydrateFromCache(cached);
        resolve(cached);
      } else {
        resolve(null);
      }
    }, HYDRATE_TIMEOUT_MS);

    // Also check periodically in case we connect before timeout
    const checkInterval = setInterval(() => {
      if (isConnected()) {
        clearTimeout(timer);
        clearInterval(checkInterval);
        resolve(null);
      }
    }, 500);

    // Clean up interval after timeout fires
    setTimeout(() => clearInterval(checkInterval), HYDRATE_TIMEOUT_MS + 100);
  });
}
