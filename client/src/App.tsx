/* ── App – Root component with routing ─────────────────────── */

import { useEffect, useRef, useState, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useMetricsStore } from '@/stores/metricsStore';
import { WebSocketClient, type WsMessage } from '@/lib/ws';
import { LoginGate } from '@/components/auth/LoginGate';
import { Shell } from '@/components/layout/Shell';
import { Background } from '@/components/three/Background';
import { DashboardPage } from '@/pages/DashboardPage';
import { SystemPage } from '@/pages/SystemPage';
import { DockerPage } from '@/pages/DockerPage';
import { CommsPage } from '@/pages/CommsPage';
import { TasksPage } from '@/pages/TasksPage';
import { LogsPage } from '@/pages/LogsPage';
import { RepoDetailPage } from '@/pages/RepoDetailPage';
import type { TodoItem } from '@/types';

/* ── Route → topic group mapping ──────────────────────────── */

const ALL_GROUPS = ['system', 'docker', 'services', 'github', 'email', 'cron', 'todos', 'loki'];

const ROUTE_GROUPS: Record<string, string[]> = {
  '/':       ALL_GROUPS,
  '/system': ['system', 'services'],
  '/docker': ['docker'],
  '/comms':  ['github', 'email'],
  '/tasks':  ['cron', 'todos'],
  '/logs':   ['loki'],
  '/repo/:owner/:repo': ['github'],
};

/* ── Error Boundary ────────────────────────────────────────── */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center p-8">
            <div className="bg-neo-bg-surface border border-neo-red/40 p-6 max-w-md">
              <h2 className="font-display text-sm uppercase tracking-[0.15em] text-neo-red mb-2">
                System Error
              </h2>
              <p className="text-xs font-mono text-neo-text-secondary mb-4">
                {this.state.error?.message ?? 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-3 py-1.5 text-[10px] uppercase font-mono border border-neo-red text-neo-red hover:bg-neo-red/10 transition-colors"
              >
                [RETRY]
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

/* ── Safe data extraction helpers ──────────────────────────── */

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  return [];
}

function asObj(data: unknown): Record<string, unknown> | null {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

/* ── Todo normalizer: merge db + file into TodoItem[] ──────── */

function normalizeTodos(data: unknown): { items: TodoItem[]; total: number } {
  const obj = asObj(data);
  if (!obj) return { items: [], total: 0 };

  const items: TodoItem[] = [];

  const dbArr = asArray(obj['db']);
  for (const raw of dbArr) {
    const row = asObj(raw);
    if (!row) continue;
    items.push({
      id: Number(row['id'] ?? 0),
      title: String(row['title'] ?? ''),
      description: row['description'] as string | null | undefined,
      completed: row['completed'] === 1 || row['completed'] === true,
      source: 'db',
      createdAt: row['created_at'] as string | undefined,
      updatedAt: row['updated_at'] as string | undefined,
    });
  }

  const fileArr = asArray(obj['file']);
  for (const raw of fileArr) {
    const row = asObj(raw);
    if (!row) continue;
    items.push({
      id: Number(row['id'] ?? 0),
      title: String(row['title'] ?? ''),
      completed: row['completed'] === true || row['completed'] === 1,
      source: 'file',
      fileSource: row['source'] as string | undefined,
    });
  }

  return { items, total: Number(obj['total'] ?? items.length) };
}

/* ── WebSocket hook ────────────────────────────────────────── */

function useWsConnection() {
  const wsRef = useRef<WebSocketClient | null>(null);
  const [connected, setConnected] = useState(false);
  const store = useMetricsStore;

  useEffect(() => {
    const handleMessage = (msg: WsMessage) => {
      const s = store.getState();
      const d = msg.data;

      try {
        switch (msg.topic) {
          case 'system:health':
            if (d && typeof d === 'object') {
              s.setSystemHealth(d as Parameters<typeof s.setSystemHealth>[0]);
              // Notify on high CPU
              const health = d as Record<string, unknown>;
              const cpu = asObj(health['cpu']);
              if (cpu) {
                const usage = Number(cpu['usage_percent'] ?? 0);
                if (usage > 90) {
                  s.addNotification({
                    type: 'warning',
                    title: 'High CPU',
                    message: `CPU at ${Math.round(usage)}%`,
                    source: 'system',
                  });
                }
              }
            }
            break;
          case 'system:disk':
            s.setSystemDisk(asArray(d) as Parameters<typeof s.setSystemDisk>[0]);
            break;
          case 'system:processes':
            s.setSystemProcesses(asArray(d) as Parameters<typeof s.setSystemProcesses>[0]);
            break;
          case 'system:network':
            s.setNetworkInterfaces(asArray(d) as Parameters<typeof s.setNetworkInterfaces>[0]);
            break;
          case 'docker:containers': {
            const prevContainers = s.containers;
            const newContainers = asArray(d) as Parameters<typeof s.setContainers>[0];
            s.setContainers(newContainers);
            // Notify on container stops
            if (prevContainers.length > 0) {
              for (const c of newContainers) {
                const state = String((c as Record<string, unknown>)['state'] ?? '').toLowerCase();
                if (state === 'stopped' || state === 'exited') {
                  const name = String((c as Record<string, unknown>)['name'] ?? 'unknown');
                  const prev = prevContainers.find(
                    (p) => (p as Record<string, unknown>)['id'] === (c as Record<string, unknown>)['id'],
                  );
                  const prevState = prev ? String((prev as Record<string, unknown>)['state'] ?? '').toLowerCase() : '';
                  if (prevState === 'running') {
                    s.addNotification({
                      type: 'error',
                      title: 'Container stopped',
                      message: `${name} is down`,
                      source: 'container',
                    });
                  }
                }
              }
            }
            break;
          }
          case 'docker:overview': {
            const obj = asObj(d);
            if (obj) s.setDockerOverview(obj as Parameters<typeof s.setDockerOverview>[0]);
            break;
          }
          case 'services:status':
            s.setServices(asArray(d) as Parameters<typeof s.setServices>[0]);
            break;
          case 'github:repos':
            s.setGithubRepos(asArray(d) as Parameters<typeof s.setGithubRepos>[0]);
            break;
          case 'github:notifications':
            s.setGithubNotifications(asArray(d) as Parameters<typeof s.setGithubNotifications>[0]);
            break;
          case 'email:unread': {
            const payload = asObj(d);
            if (payload) {
              const newCount = Number(payload['count'] ?? 0);
              const prevCount = s.emailCount;
              s.setEmailCount(newCount);
              s.setEmails(asArray(payload['messages']) as Parameters<typeof s.setEmails>[0]);
              if (newCount > prevCount && prevCount >= 0) {
                s.addNotification({
                  type: 'info',
                  title: 'New email',
                  message: `${newCount} unread message${newCount !== 1 ? 's' : ''}`,
                  source: 'email',
                });
              }
            }
            break;
          }
          case 'cron:jobs': {
            const prevJobs = s.cronJobs;
            const newJobs = asArray(d) as Parameters<typeof s.setCronJobs>[0];
            s.setCronJobs(newJobs);
            // Notify on cron failures
            if (prevJobs.length > 0) {
              for (const job of newJobs) {
                const j = job as Record<string, unknown>;
                if (j['last_run_status'] === 'error') {
                  const name = String(j['name'] ?? 'unknown');
                  const prev = prevJobs.find(
                    (p) => (p as Record<string, unknown>)['id'] === j['id'],
                  );
                  const prevStatus = prev ? (prev as Record<string, unknown>)['last_run_status'] : '';
                  if (prevStatus !== 'error') {
                    s.addNotification({
                      type: 'warning',
                      title: 'Cron job failed',
                      message: `${name} failed`,
                      source: 'cron',
                    });
                  }
                }
              }
            }
            break;
          }
          case 'cron:health': {
            const obj = asObj(d);
            if (obj) s.setCronHealth(obj as Parameters<typeof s.setCronHealth>[0]);
            break;
          }
          case 'todo:list': {
            const { items, total } = normalizeTodos(d);
            s.setTodos(items);
            s.setTodoTotal(total);
            break;
          }
          case 'loki:logs':
            s.appendLokiLogs(asArray(d) as Parameters<typeof s.appendLokiLogs>[0]);
            break;
          case 'loki:labels':
            s.setLokiLabels(asArray(d) as string[]);
            break;
        }
      } catch (err) {
        console.error(`[ws] Failed to handle topic "${msg.topic}":`, err);
      }
    };

    const ws = new WebSocketClient(handleMessage, setConnected);
    ws.connect();
    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [store]);

  return { connected, wsRef };
}

/* ── Route subscription sync ──────────────────────────────── */

function RouteSubscriber({ wsRef }: { wsRef: React.RefObject<WebSocketClient | null> }) {
  const { pathname } = useLocation();

  useEffect(() => {
    const groups = ROUTE_GROUPS[pathname] ?? ALL_GROUPS;
    wsRef.current?.subscribe(groups);
  }, [pathname, wsRef]);

  return null;
}

/* ── App ───────────────────────────────────────────────────── */

export default function App() {
  const { authenticated, checking, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const { connected: wsConnected, wsRef } = useWsConnection();

  if (checking) {
    return (
      <div className="fixed inset-0 bg-neo-bg-deep flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border border-neo-red border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="font-mono text-[10px] text-neo-red/60 animate-pulse">
            INITIALIZING...
          </span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginGate />;
  }

  return (
    <BrowserRouter>
      <RouteSubscriber wsRef={wsRef} />
      <div className="scan-lines noise-overlay crt-flicker">
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-neo-bg-deep" />
          }
        >
          <Background />
        </ErrorBoundary>
        <ErrorBoundary>
          <Routes>
            <Route element={<Shell wsConnected={wsConnected} />}>
              <Route index element={<DashboardPage />} />
              <Route path="system" element={<SystemPage />} />
              <Route path="docker" element={<DockerPage />} />
              <Route path="comms" element={<CommsPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="repo/:owner/:repo" element={<RepoDetailPage />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
}
