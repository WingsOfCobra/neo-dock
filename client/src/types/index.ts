/* ── Neo-Dock shared types ─────────────────────────────────── */

export interface SystemHealth {
  hostname: string;
  platform: string;
  arch: string;
  uptime: number; // seconds
  cpuModel: string;
  cpuCores: number;
  memTotal: number; // bytes
  memUsed: number;
  memFree: number;
  loadAvg: [number, number, number];
}

export interface DiskInfo {
  mount: string;
  filesystem: string;
  size: number; // bytes
  used: number;
  available: number;
  usedPercent: number;
}

export interface MetricsPoint {
  timestamp: number; // unix seconds
  cpu: number;
  memUsedPercent: number;
  loadAvg: number;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
}

export interface ContainerStats {
  id: string;
  name: string;
  cpuPercent: number;
  memPercent: number;
  memUsage: string;
  netIO: string;
  blockIO: string;
}

export interface ServiceStatus {
  name: string;
  status: string; // "active" | "inactive" | "failed" | string
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
}

export interface GitHubNotification {
  id: string;
  type: string;
  title: string;
  url: string;
  repo: string;
  reason: string;
  unread: boolean;
  updated_at: string;
}

export interface Email {
  uid: number;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  flags: string[];
}

export interface EmailThread {
  uid: number;
  from: string;
  subject: string;
  date: string;
  body: string;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  lastStatus?: string;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
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
