/* ── DockerContainers – list, stats, actions, logs ────────── */

import { useState, useCallback } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { post, get } from '@/lib/api';
import type { ContainerInfo, ContainerStats } from '@/types';

const stateBadge: Record<string, string> = {
  running: 'bg-neo-red/20 text-neo-red border-neo-red/40',
  exited: 'bg-neo-text-disabled/20 text-neo-text-disabled border-neo-text-disabled/40',
  stopped: 'bg-neo-text-disabled/20 text-neo-text-disabled border-neo-text-disabled/40',
};

const defaultBadge = 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40';

function StatBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color =
    pct > 80 ? 'bg-neo-red' : pct > 50 ? 'bg-neo-yellow' : 'bg-neo-red/60';
  return (
    <div className="h-1 w-16 bg-neo-bg-deep overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-300`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface DockerContainersProps {
  compact?: boolean;
}

export function DockerContainers({ compact = false }: DockerContainersProps) {
  const containers = useMetricsStore((s) => s.containers);
  const containerStats = useMetricsStore((s) => s.containerStats);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const statsMap = new Map<string, ContainerStats>();
  if (Array.isArray(containerStats)) {
    for (const s of containerStats) {
      if (s && typeof s === 'object') {
        if (s.id) statsMap.set(s.id, s);
        if (s.name) statsMap.set(s.name, s);
      }
    }
  }

  const getStats = (c: ContainerInfo): ContainerStats | undefined =>
    statsMap.get(c.id) ?? statsMap.get(c.name);

  const toggleLogs = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null);
        setLogs('');
        return;
      }
      setExpandedId(id);
      setLogsLoading(true);
      try {
        const data = await get<{ logs?: string }>(
          `/chef/docker/containers/${id}/logs`,
        );
        setLogs(data?.logs ?? '');
      } catch {
        setLogs('Failed to fetch logs.');
      } finally {
        setLogsLoading(false);
      }
    },
    [expandedId],
  );

  const handleAction = useCallback(
    async (id: string, action: 'restart' | 'stop') => {
      setActionError(null);
      setActionLoading(`${id}-${action}`);
      try {
        await post(`/chef/docker/containers/${id}/${action}`);
      } catch {
        setActionError(`Failed to ${action} container ${id.slice(0, 12)}`);
      } finally {
        setActionLoading(null);
      }
    },
    [],
  );

  const safeContainers = Array.isArray(containers) ? containers : [];
  const loading = safeContainers.length === 0;

  return (
    <Card title="Docker" loading={loading}>
      <div className={`space-y-1 ${compact ? 'max-h-72 overflow-y-auto' : ''}`}>
        {actionError && (
          <div className="text-neo-red text-xs font-mono mb-2">
            [!] {actionError}
          </div>
        )}

        {safeContainers.map((c) => {
          const stats = getStats(c);
          const badge = stateBadge[c.state] ?? defaultBadge;
          const isExpanded = expandedId === c.id;

          return (
            <div
              key={c.id}
              className="group border border-neo-border/50 hover:border-neo-red/30 transition-colors"
            >
              {/* Main row */}
              <div className="flex items-center gap-2 px-3 py-2">
                <span
                  className={`text-[10px] uppercase font-mono px-1.5 py-0.5 border ${badge}`}
                >
                  {c.state}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neo-text-primary truncate">
                    {c.name}
                  </p>
                  <p className="text-[10px] text-neo-text-disabled font-mono truncate">
                    {c.image}
                  </p>
                </div>

                {stats && (
                  <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-neo-text-secondary">
                    <div className="flex items-center gap-1">
                      <span>CPU</span>
                      <StatBar value={stats.cpuPercent ?? 0} />
                      <span className="w-10 text-right">
                        {(stats.cpuPercent ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>MEM</span>
                      <StatBar value={stats.memPercent ?? 0} />
                      <span className="w-10 text-right">
                        {(stats.memPercent ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    aria-label={`Restart container ${c.name}`}
                    className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-red/40 text-neo-red hover:bg-neo-red/10 transition-colors disabled:opacity-30"
                    disabled={actionLoading === `${c.id}-restart`}
                    onClick={() => handleAction(c.id, 'restart')}
                  >
                    {actionLoading === `${c.id}-restart` ? '...' : 'RST'}
                  </button>
                  <button
                    aria-label={`Stop container ${c.name}`}
                    className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-red/40 text-neo-red hover:bg-neo-red/10 transition-colors disabled:opacity-30"
                    disabled={
                      c.state !== 'running' ||
                      actionLoading === `${c.id}-stop`
                    }
                    onClick={() => handleAction(c.id, 'stop')}
                  >
                    {actionLoading === `${c.id}-stop` ? '...' : 'STOP'}
                  </button>
                  <button
                    aria-label={`View logs for ${c.name}`}
                    className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-border text-neo-text-secondary hover:text-neo-red hover:border-neo-red/40 transition-colors"
                    onClick={() => toggleLogs(c.id)}
                  >
                    LOG
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-neo-border/50 bg-neo-bg-deep p-3 max-h-48 overflow-auto">
                  {logsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-neo-text-disabled">
                      <div className="w-3 h-3 border border-neo-red border-t-transparent rounded-full animate-spin" />
                      Loading logs...
                    </div>
                  ) : (
                    <pre className="text-[10px] font-mono text-neo-text-secondary whitespace-pre-wrap break-all leading-relaxed">
                      {logs || 'No logs available.'}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {safeContainers.length === 0 && !loading && (
          <p className="text-xs text-neo-text-disabled text-center py-4 font-mono">
            No containers found.
          </p>
        )}
      </div>
    </Card>
  );
}
