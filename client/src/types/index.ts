export * from './chef-api.types';
export * from './chef-api.helpers';

/* ── Neo-Dock UI types (not from chef-api) ───────────────────── */

/** Metrics time-series point (computed server-side from system:health) */
export interface MetricsPoint {
  timestamp: number; // unix ms
  cpu: number;
  memUsedPercent: number;
  loadAvg: number[];
}

/** Network bandwidth history point */
export interface NetworkHistoryPoint {
  timestamp: number;
  rx_bytes: number;
  tx_bytes: number;
}

/** Per-container metrics time-series point */
export interface ContainerMetricsPoint {
  timestamp: number;
  cpuPercent: number;
  memPercent: number;
  memUsage: number;
}

/** Loki log entry as received from the poller */
export interface LokiLogEntry {
  timestamp: string; // nanosecond timestamp
  line: string;
  labels: Record<string, string>;
}

/** Category derived from Loki labels */
export interface LokiCategory {
  label: string;
  value: string;
}

/** Unified todo item for display (normalized from db + file sources) */
export interface TodoItem {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  source: 'db' | 'file';
  createdAt?: string;
  updatedAt?: string;
  fileSource?: string; // e.g. "TODO.md"
}

export type WidgetType =
  | 'server-monitor'
  | 'docker-containers'
  | 'services-status'
  | 'github-dashboard'
  | 'email-inbox'
  | 'todo-list'
  | 'logs-viewer'
  | 'cron-jobs';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
}
