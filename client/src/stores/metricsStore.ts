/* ── Zustand v5 metrics store ──────────────────────────────── */

import { create } from 'zustand';
import type {
  SystemHealth,
  DiskInfo,
  MetricsPoint,
  ContainerInfo,
  ContainerStats,
  ServiceStatus,
  GitHubRepo,
  GitHubNotification,
  Email,
  CronJob,
  Todo,
  LogEntry,
} from '@/types';

interface MetricsState {
  systemHealth: SystemHealth | null;
  systemDisk: DiskInfo[];
  systemMetrics: MetricsPoint[];
  containers: ContainerInfo[];
  containerStats: ContainerStats[];
  services: ServiceStatus[];
  githubRepos: GitHubRepo[];
  githubNotifications: GitHubNotification[];
  emails: Email[];
  cronJobs: CronJob[];
  todos: Todo[];
  logEntries: LogEntry[];

  /* Setters for WebSocket / REST hydration */
  setSystemHealth: (h: SystemHealth) => void;
  setSystemDisk: (d: DiskInfo[]) => void;
  pushMetricsPoint: (p: MetricsPoint) => void;
  setSystemMetrics: (m: MetricsPoint[]) => void;
  setContainers: (c: ContainerInfo[]) => void;
  setContainerStats: (s: ContainerStats[]) => void;
  setServices: (s: ServiceStatus[]) => void;
  setGithubRepos: (r: GitHubRepo[]) => void;
  setGithubNotifications: (n: GitHubNotification[]) => void;
  setEmails: (e: Email[]) => void;
  setCronJobs: (j: CronJob[]) => void;
  setTodos: (t: Todo[]) => void;
  setLogEntries: (l: LogEntry[]) => void;
}

const MAX_METRICS = 3600; // 1 hour at 1pt/sec

export const useMetricsStore = create<MetricsState>()((set) => ({
  systemHealth: null,
  systemDisk: [],
  systemMetrics: [],
  containers: [],
  containerStats: [],
  services: [],
  githubRepos: [],
  githubNotifications: [],
  emails: [],
  cronJobs: [],
  todos: [],
  logEntries: [],

  setSystemHealth: (h) => set({ systemHealth: h }),
  setSystemDisk: (d) => set({ systemDisk: d }),
  pushMetricsPoint: (p) =>
    set((s) => ({
      systemMetrics: [...s.systemMetrics.slice(-MAX_METRICS + 1), p],
    })),
  setSystemMetrics: (m) => set({ systemMetrics: m }),
  setContainers: (c) => set({ containers: c }),
  setContainerStats: (s) => set({ containerStats: s }),
  setServices: (s) => set({ services: s }),
  setGithubRepos: (r) => set({ githubRepos: r }),
  setGithubNotifications: (n) => set({ githubNotifications: n }),
  setEmails: (e) => set({ emails: e }),
  setCronJobs: (j) => set({ cronJobs: j }),
  setTodos: (t) => set({ todos: t }),
  setLogEntries: (l) => set({ logEntries: l }),
}));
