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
  MetricsPoint,
  LokiLogEntry,
  TodoItem,
} from '@/types';

interface MetricsState {
  /* ── System ─────────────────────────────────────────────── */
  systemHealth: ChefSystemHealth | null;
  systemDisk: ChefDiskInfo[];
  systemProcesses: ChefProcessInfo[];
  systemMetrics: MetricsPoint[];

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

  /* ── Setters ────────────────────────────────────────────── */
  setSystemHealth: (h: ChefSystemHealth) => void;
  setSystemDisk: (d: ChefDiskInfo[]) => void;
  setSystemProcesses: (p: ChefProcessInfo[]) => void;
  pushMetricsPoint: (p: MetricsPoint) => void;
  setSystemMetrics: (m: MetricsPoint[]) => void;
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
const MAX_LOKI_LOGS = 2000;

export const useMetricsStore = create<MetricsState>()((set) => ({
  systemHealth: null,
  systemDisk: [],
  systemProcesses: [],
  systemMetrics: [],
  containers: [],
  containerStats: {},
  dockerOverview: null,
  services: [],
  githubRepos: [],
  githubNotifications: [],
  githubPRs: [],
  githubIssues: [],
  githubWorkflows: [],
  emailCount: 0,
  emails: [],
  cronJobs: [],
  cronHealth: null,
  todos: [],
  todoTotal: 0,
  lokiLogs: [],
  lokiLabels: [],

  setSystemHealth: (h) => set({ systemHealth: h }),
  setSystemDisk: (d) => set({ systemDisk: d }),
  setSystemProcesses: (p) => set({ systemProcesses: p }),
  pushMetricsPoint: (p) =>
    set((s) => ({
      systemMetrics: [...s.systemMetrics.slice(-MAX_METRICS + 1), p],
    })),
  setSystemMetrics: (m) => set({ systemMetrics: m }),
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
