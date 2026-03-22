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

/* ── Route → topic group mapping ──────────────────────────── */

const ALL_GROUPS = ['system', 'docker', 'services', 'github', 'email', 'cron', 'todos', 'loki'];

const ROUTE_GROUPS: Record<string, string[]> = {
  '/':       ALL_GROUPS,
  '/system': ['system', 'services'],
  '/docker': ['docker'],
  '/comms':  ['github', 'email'],
  '/tasks':  ['cron', 'todos'],
  '/logs':   ['loki'],
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
            }
            break;
          case 'system:disk': {
            let diskArr: unknown[];
            if (Array.isArray(d)) {
              diskArr = d;
            } else if (d && typeof d === 'object') {
              const obj = d as Record<string, unknown>;
              diskArr = (Array.isArray(obj['disks']) ? obj['disks']
                : Array.isArray(obj['data']) ? obj['data']
                : Array.isArray(obj['mounts']) ? obj['mounts']
                : []) as unknown[];
            } else {
              diskArr = [];
            }
            s.setSystemDisk(diskArr as Parameters<typeof s.setSystemDisk>[0]);
            break;
          }
          case 'docker:containers':
            s.setContainers(asArray(d) as Parameters<typeof s.setContainers>[0]);
            break;
          case 'docker:stats':
            s.setContainerStats(asArray(d) as Parameters<typeof s.setContainerStats>[0]);
            break;
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
            const payload = d as Record<string, unknown> | null;
            const messages = payload?.messages;
            s.setEmails(asArray(messages) as Parameters<typeof s.setEmails>[0]);
            break;
          }
          case 'cron:jobs':
            s.setCronJobs(asArray(d) as Parameters<typeof s.setCronJobs>[0]);
            break;
          case 'todo:list': {
            const todoPayload = d as Record<string, unknown> | null;
            const db = todoPayload?.db;
            s.setTodos(asArray(db) as Parameters<typeof s.setTodos>[0]);
            break;
          }
          case 'logs:tail':
            s.setLogEntries(asArray(d) as Parameters<typeof s.setLogEntries>[0]);
            break;
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
            </Route>
          </Routes>
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
}
