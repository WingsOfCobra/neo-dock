/* ── Zustand v5 metrics store ──────────────────────────────── */

import { create } from 'zustand';
import type {
  ChefSystemHealth,
  ChefDiskInfo,
  ChefProcessInfo,
  ChefContainer,
  ChefContainerStats,
  ChefDockerOverview,
  ChefGitHubRepo,
  ChefGitHubNotification,
  ChefGitHubPR,
  ChefGitHubIssue,
  ChefGitHubWorkflow,
  ChefEmailMessage,
  ChefCronJob,
  ChefCronHealth,
  ChefService,
  ChefNetworkInterface,
  MetricsPoint,
  NetworkHistoryPoint,
  LokiLogEntry,
  TodoItem,
} from '@/types';

export interface AppNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  source: 'container' | 'cron' | 'system' | 'github' | 'email';
}

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_NOTIFICATIONS = 50;

interface MetricsState {
  /* ── Loading states ──────────────────────────────────────── */
  loadingStates: Record<string, boolean>; // topic -> isLoading
  setLoading: (topic: string, loading: boolean) => void;
  
  /* ── System ─────────────────────────────────────────────── */
  systemHealth: ChefSystemHealth | null;
  systemDisk: ChefDiskInfo[];
  systemProcesses: ChefProcessInfo[];
  systemMetrics: MetricsPoint[];

  /* ── Network ────────────────────────────────────────────── */
  networkInterfaces: ChefNetworkInterface[];
  networkHistory: NetworkHistoryPoint[];

  /* ── Docker ─────────────────────────────────────────────── */
  containers: ChefContainer[];
  containerStats: Record<string, ChefContainerStats>; // keyed by id
  dockerOverview: ChefDockerOverview | null;

  /* ── Services ───────────────────────────────────────────── */
  services: ChefService[];

  /* ── GitHub ─────────────────────────────────────────────── */
  githubRepos: ChefGitHubRepo[];
  githubNotifications: ChefGitHubNotification[];
  githubPRs: ChefGitHubPR[];
  githubIssues: ChefGitHubIssue[];
  githubWorkflows: ChefGitHubWorkflow[];

  /* ── Email ──────────────────────────────────────────────── */
  emailCount: number;
  emails: ChefEmailMessage[];

  /* ── Cron ───────────────────────────────────────────────── */
  cronJobs: ChefCronJob[];
  cronHealth: ChefCronHealth | null;

  /* ── Todos ──────────────────────────────────────────────── */
  todos: TodoItem[];
  todoTotal: number;

  /* ── Loki ───────────────────────────────────────────────── */
  lokiLogs: LokiLogEntry[];
  lokiLabels: string[];

  /* ── Notifications ────────────────────────────────────── */
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
  clearNotifications: () => void;

  /* ── Setters ────────────────────────────────────────────── */
  setSystemHealth: (h: ChefSystemHealth) => void;
  setSystemDisk: (d: ChefDiskInfo[]) => void;
  setSystemProcesses: (p: ChefProcessInfo[]) => void;
  pushMetricsPoint: (p: MetricsPoint) => void;
  setSystemMetrics: (m: MetricsPoint[]) => void;
  setNetworkInterfaces: (n: ChefNetworkInterface[]) => void;
  setContainers: (c: ChefContainer[]) => void;
  setContainerStats: (id: string, s: ChefContainerStats) => void;
  setDockerOverview: (o: ChefDockerOverview) => void;
  setServices: (s: ChefService[]) => void;
  setGithubRepos: (r: ChefGitHubRepo[]) => void;
  setGithubNotifications: (n: ChefGitHubNotification[]) => void;
  setGithubPRs: (prs: ChefGitHubPR[]) => void;
  setGithubIssues: (issues: ChefGitHubIssue[]) => void;
  setGithubWorkflows: (wf: ChefGitHubWorkflow[]) => void;
  setEmailCount: (count: number) => void;
  setEmails: (e: ChefEmailMessage[]) => void;
  setCronJobs: (j: ChefCronJob[]) => void;
  setCronHealth: (h: ChefCronHealth) => void;
  setTodos: (t: TodoItem[]) => void;
  setTodoTotal: (n: number) => void;
  appendLokiLogs: (entries: LokiLogEntry[]) => void;
  setLokiLabels: (labels: string[]) => void;
  clearLokiLogs: () => void;
}

const MAX_METRICS = 3600; // 1 hour at 1pt/sec
const MAX_NETWORK_HISTORY = 300; // 5 min at 1pt/sec
const MAX_LOKI_LOGS = 2000;

export const useMetricsStore = create<MetricsState>()((set) => ({
  loadingStates: {},
  setLoading: (topic, loading) =>
    set((s) => ({
      loadingStates: { ...s.loadingStates, [topic]: loading },
    })),
  
  systemHealth: null,
  systemDisk: [],
  systemProcesses: [],
  systemMetrics: [],
  networkInterfaces: [],
  networkHistory: [],
  containers: [],
  containerStats: {},
  dockerOverview: null,
  services: [],
  githubRepos: [],
  githubNotifications: [],
  githubPRs: [],
  githubIssues: [],
  githubWorkflows: [],
  emailCount: -1, // -1 = not loaded yet, 0 = loaded with no emails
  emails: [],
  cronJobs: [],
  cronHealth: null,
  todos: [],
  todoTotal: 0,
  lokiLogs: [],
  lokiLabels: [],
  notifications: [],

  addNotification: (n) =>
    set((s) => {
      const now = Date.now();
      const isDupe = s.notifications.some(
        (existing) =>
          existing.title === n.title &&
          existing.source === n.source &&
          now - existing.timestamp < DEDUP_WINDOW_MS,
      );
      if (isDupe) return s;
      const notif: AppNotification = {
        ...n,
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        read: false,
      };
      return {
        notifications: [notif, ...s.notifications].slice(0, MAX_NOTIFICATIONS),
      };
    }),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
  clearNotifications: () => set({ notifications: [] }),

  setSystemHealth: (h) => set({ systemHealth: h }),
  setSystemDisk: (d) => set({ systemDisk: d }),
  setSystemProcesses: (p) => set({ systemProcesses: p }),
  pushMetricsPoint: (p) =>
    set((s) => ({
      systemMetrics: [...s.systemMetrics.slice(-MAX_METRICS + 1), p],
    })),
  setSystemMetrics: (m) => set({ systemMetrics: m }),
  setNetworkInterfaces: (interfaces) =>
    set((s) => {
      const now = Date.now();
      // Compute total rx/tx across all interfaces
      const totalRx = interfaces.reduce((sum, i) => sum + (i.rx_bytes ?? 0), 0);
      const totalTx = interfaces.reduce((sum, i) => sum + (i.tx_bytes ?? 0), 0);
      const point: NetworkHistoryPoint = { timestamp: now, rx_bytes: totalRx, tx_bytes: totalTx };
      return {
        networkInterfaces: interfaces,
        networkHistory: [...s.networkHistory.slice(-(MAX_NETWORK_HISTORY - 1)), point],
      };
    }),
  setContainers: (c) => set({ containers: c }),
  setContainerStats: (id, stats) =>
    set((s) => ({
      containerStats: { ...s.containerStats, [id]: stats },
    })),
  setDockerOverview: (o) => set({ dockerOverview: o }),
  setServices: (s) => set({ services: s }),
  setGithubRepos: (r) => set({ githubRepos: r }),
  setGithubNotifications: (n) => set({ githubNotifications: n }),
  setGithubPRs: (prs) => set({ githubPRs: prs }),
  setGithubIssues: (issues) => set({ githubIssues: issues }),
  setGithubWorkflows: (wf) => set({ githubWorkflows: wf }),
  setEmailCount: (count) => set({ emailCount: count }),
  setEmails: (e) => set({ emails: e }),
  setCronJobs: (j) => set({ cronJobs: j }),
  setCronHealth: (h) => set({ cronHealth: h }),
  setTodos: (t) => set({ todos: t }),
  setTodoTotal: (n) => set({ todoTotal: n }),
  appendLokiLogs: (entries) =>
    set((s) => {
      const combined = [...s.lokiLogs, ...entries];
      return { lokiLogs: combined.slice(-MAX_LOKI_LOGS) };
    }),
  setLokiLabels: (labels) => set({ lokiLabels: labels }),
  clearLokiLogs: () => set({ lokiLogs: [] }),
}));
