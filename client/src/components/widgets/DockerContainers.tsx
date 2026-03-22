/* ── DockerContainers – list, stats, actions, logs, overview ── */

import { useState, useCallback } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { post, get } from '@/lib/api';
import type { ChefContainer } from '@/types';

const stateBadge: Record<string, string> = {
  running: 'bg-neo-red/20 text-neo-red border-neo-red/40',
  exited: 'bg-neo-text-disabled/20 text-neo-text-disabled border-neo-text-disabled/40',
  stopped: 'bg-neo-text-disabled/20 text-neo-text-disabled border-neo-text-disabled/40',
  paused: 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40',
  created: 'bg-neo-text-disabled/20 text-neo-text-secondary border-neo-border',
};

const defaultBadge = 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40';

const healthBadge: Record<string, string> = {
  healthy: 'text-neo-red',
  unhealthy: 'text-neo-yellow',
  starting: 'text-neo-text-secondary',
};

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

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(1)} ${units[i]}`;
}

interface DockerContainersProps {
  compact?: boolean;
}

export function DockerContainers({ compact = false }: DockerContainersProps) {
  const containers = useMetricsStore((s) => s.containers);
  const containerStats = useMetricsStore((s) => s.containerStats);
  const dockerOverview = useMetricsStore((s) => s.dockerOverview);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getStats = (c: ChefContainer) =>
    containerStats[c.id ?? ''] ?? containerStats[c.name ?? ''];

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

  const runningCount = safeContainers.filter((c) => c.state === 'running').length;
  const stoppedCount = safeContainers.filter((c) => c.state !== 'running').length;

  return (
    <Card title="Docker" loading={loading}>
      <div className={`space-y-2 ${compact ? 'max-h-72 overflow-y-auto' : ''}`}>
        {/* Docker Overview */}
        {(dockerOverview || safeContainers.length > 0) && (
          <div className="flex items-center gap-4 text-[10px] font-mono pb-2 border-b border-neo-border/30">
            <span className="text-neo-red">{dockerOverview?.containers?.running ?? runningCount} running</span>
            <span className="text-neo-text-disabled">{dockerOverview?.containers?.stopped ?? stoppedCount} stopped</span>
            {dockerOverview?.containers?.paused ? (
              <span className="text-neo-yellow">{dockerOverview.containers.paused} paused</span>
            ) : null}
            {dockerOverview?.images != null && (
              <span className="text-neo-text-disabled">{dockerOverview.images} images</span>
            )}
            {dockerOverview?.volumes != null && (
              <span className="text-neo-text-disabled">{dockerOverview.volumes} vols</span>
            )}
          </div>
        )}

        {/* Disk usage breakdown */}
        {!compact && dockerOverview?.diskUsage && (
          <div className="flex items-center gap-3 text-[9px] font-mono text-neo-text-disabled pb-2 border-b border-neo-border/30">
            <span>DISK:</span>
            {dockerOverview.diskUsage.images && <span>img {dockerOverview.diskUsage.images}</span>}
            {dockerOverview.diskUsage.containers && <span>ctr {dockerOverview.diskUsage.containers}</span>}
            {dockerOverview.diskUsage.volumes && <span>vol {dockerOverview.diskUsage.volumes}</span>}
            {dockerOverview.diskUsage.buildCache && <span>cache {dockerOverview.diskUsage.buildCache}</span>}
          </div>
        )}

        {actionError && (
          <div className="text-neo-red text-xs font-mono mb-2">
            [!] {actionError}
          </div>
        )}

        {safeContainers.map((c) => {
          const stats = getStats(c);
          const badge = stateBadge[c.state ?? ''] ?? defaultBadge;
          const isExpanded = expandedId === c.id;
          const cpuPct = stats?.cpu_percent ?? 0;
          const memPct = stats?.memory_percent ?? 0;

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
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-neo-text-primary truncate">
                      {c.name}
                    </p>
                    {c.health && (
                      <span className={`text-[9px] font-mono uppercase ${healthBadge[c.health] ?? 'text-neo-text-disabled'}`}>
                        {c.health}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neo-text-disabled font-mono">
                    <span className="truncate">{c.image}</span>
                    {c.uptime && <span className="shrink-0">· {c.uptime}</span>}
                  </div>
                </div>

                {/* Per-container stats */}
                {stats && (
                  <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-neo-text-secondary">
                    <div className="flex items-center gap-1">
                      <span>CPU</span>
                      <StatBar value={cpuPct} />
                      <span className="w-10 text-right">
                        {cpuPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>MEM</span>
                      <StatBar value={memPct} />
                      <span className="w-10 text-right">
                        {memPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Detailed stats row (expanded view) */}
                {!compact && stats && (
                  <div className="hidden lg:flex items-center gap-2 text-[9px] font-mono text-neo-text-disabled">
                    {stats.memory_usage != null && stats.memory_limit != null && (
                      <span>{formatBytes(stats.memory_usage)}/{formatBytes(stats.memory_limit)}</span>
                    )}
                    {(stats.network_rx != null || stats.network_tx != null) && (
                      <span>↓{formatBytes(stats.network_rx ?? 0)} ↑{formatBytes(stats.network_tx ?? 0)}</span>
                    )}
                  </div>
                )}

                {/* Ports */}
                {!compact && c.ports && c.ports.length > 0 && (
                  <div className="hidden xl:flex items-center gap-1 text-[9px] font-mono text-neo-text-disabled">
                    {c.ports.slice(0, 3).map((port, i) => (
                      <span key={i} className="px-1 border border-neo-border/40">{port}</span>
                    ))}
                    {c.ports.length > 3 && <span>+{c.ports.length - 3}</span>}
                  </div>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    aria-label={`Restart container ${c.name}`}
                    className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-red/40 text-neo-red hover:bg-neo-red/10 transition-colors disabled:opacity-30"
                    disabled={actionLoading === `${c.id}-restart`}
                    onClick={() => handleAction(c.id!, 'restart')}
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
                    onClick={() => handleAction(c.id!, 'stop')}
                  >
                    {actionLoading === `${c.id}-stop` ? '...' : 'STOP'}
                  </button>
                  <button
                    aria-label={`View logs for ${c.name}`}
                    className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-border text-neo-text-secondary hover:text-neo-red hover:border-neo-red/40 transition-colors"
                    onClick={() => toggleLogs(c.id!)}
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
