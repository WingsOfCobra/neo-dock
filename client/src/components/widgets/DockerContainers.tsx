/* ── DockerContainers – list, stats, actions, logs, overview ── */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { ExportButton } from '@/components/ui/ExportButton';
import { WidgetError } from '@/components/ui/WidgetError';
import { post, get, del } from '@/lib/api';
import { useSound } from '@/hooks/useSound';
import type { ChefContainer, ChefContainerStats, ChefDockerOverview } from '@/types';

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

function StatBar({ value, max = 100, className = 'w-16' }: { value: number; max?: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color =
    pct > 80 ? 'bg-neo-red' : pct > 50 ? 'bg-neo-yellow' : 'bg-neo-red/60';
  return (
    <div className={`h-1 bg-neo-bg-deep overflow-hidden ${className}`}>
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

/* ── Confirm Action Inline ─────────────────────────────────── */

function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
  loading,
  variant = 'danger',
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'danger' | 'neutral';
}) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playSound } = useSound();

  useEffect(() => {
    return () => { if (timerRef.current !== null) clearTimeout(timerRef.current); };
  }, []);

  const handleClick = () => {
    if (loading || disabled) return;
    if (!confirming) {
      playSound('click');
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setConfirming(false);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    playSound('confirm');
    onConfirm();
  };

  const dangerBase = 'border-neo-red/40 text-neo-red hover:bg-neo-red/10';
  const dangerConfirm = 'border-neo-red text-neo-bg-deep bg-neo-red hover:bg-neo-red/80';
  const neutralBase = 'border-neo-border text-neo-text-secondary hover:text-neo-red hover:border-neo-red/40';

  const cls = confirming
    ? dangerConfirm
    : variant === 'danger' ? dangerBase : neutralBase;

  return (
    <button
      className={`px-2 py-1 text-[10px] font-mono uppercase border transition-colors disabled:opacity-30 ${cls}`}
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {loading ? '...' : confirming ? confirmLabel : label}
    </button>
  );
}

/* ── Docker Overview Bar ───────────────────────────────────── */

function DockerOverviewBar({
  dockerOverview,
  runningCount,
  stoppedCount,
  compact,
}: {
  dockerOverview: ChefDockerOverview | null;
  runningCount: number;
  stoppedCount: number;
  compact: boolean;
}) {
  return (
    <>
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

      {!compact && dockerOverview?.diskUsage && (
        <div className="flex items-center gap-3 text-[9px] font-mono text-neo-text-disabled pb-2 border-b border-neo-border/30">
          <span>DISK:</span>
          {dockerOverview.diskUsage.images && <span>img {dockerOverview.diskUsage.images}</span>}
          {dockerOverview.diskUsage.containers && <span>ctr {dockerOverview.diskUsage.containers}</span>}
          {dockerOverview.diskUsage.volumes && <span>vol {dockerOverview.diskUsage.volumes}</span>}
          {dockerOverview.diskUsage.buildCache && <span>cache {dockerOverview.diskUsage.buildCache}</span>}
        </div>
      )}
    </>
  );
}

/* ── Compact Row (Dashboard) ───────────────────────────────── */

function CompactRow({ c, stats, onClick }: { c: ChefContainer; stats: ChefContainerStats | undefined; onClick: () => void }) {
  const badge = stateBadge[c.state ?? ''] ?? defaultBadge;
  const cpuPct = stats?.cpu_percent ?? 0;
  const memPct = stats?.memory_percent ?? 0;

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 border border-neo-border/50 hover:border-neo-red/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 border shrink-0 ${badge}`}>
        {c.state}
      </span>
      <p className="text-sm text-neo-text-primary truncate flex-1 min-w-0">{c.name}</p>
      {stats && (
        <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-neo-text-secondary shrink-0">
          <div className="flex items-center gap-1">
            <span>CPU</span>
            <StatBar value={cpuPct} />
            <span className="w-10 text-right">{cpuPct.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span>MEM</span>
            <StatBar value={memPct} />
            <span className="w-10 text-right">{memPct.toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Full Card (Docker Page) ───────────────────────────────── */

function ContainerCard({
  c,
  stats,
  actionLoading,
  actionError,
  onAction,
  expandedId,
  onToggleLogs,
  logs,
  logsLoading,
  onNavigate,
}: {
  c: ChefContainer;
  stats: ChefContainerStats | undefined;
  actionLoading: string | null;
  actionError: string | null;
  onAction: (id: string, action: 'restart' | 'stop' | 'delete') => void;
  expandedId: string | null;
  onToggleLogs: (id: string) => void;
  logs: string;
  logsLoading: boolean;
  onNavigate: (id: string) => void;
}) {
  const badge = stateBadge[c.state ?? ''] ?? defaultBadge;
  const cpuPct = stats?.cpu_percent ?? 0;
  const memPct = stats?.memory_percent ?? 0;
  const isExpanded = expandedId === c.id;

  return (
    <div className="border border-neo-border/50 hover:border-neo-red/30 transition-colors bg-neo-bg-surface/60">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neo-border/30 bg-neo-bg-deep/40">
        <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 border shrink-0 ${badge}`}>
          {c.state}
        </span>
        <button 
          onClick={() => onNavigate(c.id!)}
          className="text-sm text-neo-text-primary truncate flex-1 font-mono text-left hover:text-neo-red transition-colors"
        >
          {c.name}
        </button>
        {c.health && (
          <span className={`text-[9px] font-mono uppercase ${healthBadge[c.health] ?? 'text-neo-text-disabled'}`}>
            [{c.health}]
          </span>
        )}
      </div>

      {/* Card body — stats & info */}
      <div className="p-3 space-y-2.5">
        {/* Image + uptime */}
        <div className="flex items-center justify-between text-[10px] font-mono text-neo-text-disabled">
          <span className="truncate">{c.image}</span>
          {c.uptime && <span className="shrink-0 text-neo-text-secondary">{c.uptime}</span>}
        </div>

        {/* CPU + MEM bars */}
        {stats && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] font-mono text-neo-text-secondary">
              <span className="w-7 text-neo-text-disabled">CPU</span>
              <StatBar value={cpuPct} className="flex-1" />
              <span className="w-12 text-right">{cpuPct.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-neo-text-secondary">
              <span className="w-7 text-neo-text-disabled">MEM</span>
              <StatBar value={memPct} className="flex-1" />
              <span className="w-12 text-right">{memPct.toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Detailed memory + network */}
        {stats && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-mono text-neo-text-disabled">
            {stats.memory_usage != null && stats.memory_limit != null && (
              <span>RAM {formatBytes(stats.memory_usage)}/{formatBytes(stats.memory_limit)}</span>
            )}
            {(stats.network_rx != null || stats.network_tx != null) && (
              <span>NET ↓{formatBytes(stats.network_rx ?? 0)} ↑{formatBytes(stats.network_tx ?? 0)}</span>
            )}
          </div>
        )}

        {/* Ports */}
        {c.ports && c.ports.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[9px] font-mono text-neo-text-disabled">
            <span className="text-neo-text-disabled mr-1">PORTS</span>
            {c.ports.slice(0, 5).map((port, i) => (
              <span key={i} className="px-1 py-0.5 border border-neo-border/40 bg-neo-bg-deep/60">{port}</span>
            ))}
            {c.ports.length > 5 && <span>+{c.ports.length - 5}</span>}
          </div>
        )}

        {/* Error for this container */}
        {actionError && actionError.includes(c.id?.slice(0, 12) ?? '___') && (
          <div className="text-neo-red text-[10px] font-mono">[!] {actionError}</div>
        )}
      </div>

      {/* Card footer — actions */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-neo-border/30 bg-neo-bg-deep/30">
        <ConfirmButton
          label="RST"
          confirmLabel="CONFIRM?"
          onConfirm={() => onAction(c.id!, 'restart')}
          disabled={actionLoading === `${c.id}-restart`}
          loading={actionLoading === `${c.id}-restart`}
          variant="danger"
        />
        <ConfirmButton
          label="STOP"
          confirmLabel="CONFIRM?"
          onConfirm={() => onAction(c.id!, 'stop')}
          disabled={c.state !== 'running' || actionLoading === `${c.id}-stop`}
          loading={actionLoading === `${c.id}-stop`}
          variant="danger"
        />
        <button
          aria-label={`View logs for ${c.name}`}
          className={`px-2 py-1 text-[10px] font-mono uppercase border transition-colors ${
            isExpanded
              ? 'border-neo-red/40 text-neo-red bg-neo-red/10'
              : 'border-neo-border text-neo-text-secondary hover:text-neo-red hover:border-neo-red/40'
          }`}
          onClick={() => onToggleLogs(c.id!)}
        >
          LOG
        </button>
        <button
          onClick={() => onNavigate(c.id!)}
          className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-border text-neo-text-secondary hover:text-neo-red hover:border-neo-red/40 transition-colors"
        >
          DETAILS
        </button>
        {(c.state === 'exited' || c.state === 'stopped') && (
          <ConfirmButton
            label="✕"
            confirmLabel="DELETE?"
            onConfirm={() => onAction(c.id!, 'delete')}
            disabled={actionLoading === `${c.id}-delete`}
            loading={actionLoading === `${c.id}-delete`}
            variant="danger"
          />
        )}
      </div>

      {/* Logs panel */}
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
}

/* ── Main Component ────────────────────────────────────────── */

interface DockerContainersProps {
  compact?: boolean;
}

export function DockerContainers({ compact = false }: DockerContainersProps) {
  const navigate = useNavigate();
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
    async (id: string, action: 'restart' | 'stop' | 'delete') => {
      setActionError(null);
      setActionLoading(`${id}-${action}`);
      try {
        if (action === 'delete') {
          await del(`/chef/docker/containers/${id}`);
        } else {
          await post(`/chef/docker/containers/${id}/${action}`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : `Failed to ${action} container`;
        setActionError(`${errMsg} (${id.slice(0, 12)})`);
      } finally {
        setActionLoading(null);
      }
    },
    [],
  );

  const handleNavigate = useCallback(
    (id: string) => {
      navigate(`/docker/${id}`);
    },
    [navigate],
  );

  const safeContainers = Array.isArray(containers) ? containers : [];
  const loading = safeContainers.length === 0;
  const runningCount = safeContainers.filter((c) => c.state === 'running').length;
  const stoppedCount = safeContainers.filter((c) => c.state !== 'running').length;

  const exportData = useMemo(() => {
    return safeContainers.map((c) => {
      const stats = getStats(c);
      return {
        id: c.id,
        name: c.name,
        image: c.image,
        state: c.state,
        health: c.health,
        uptime: c.uptime,
        cpu_percent: stats?.cpu_percent,
        memory_percent: stats?.memory_percent,
        memory_usage: stats?.memory_usage,
        memory_limit: stats?.memory_limit,
        network_rx: stats?.network_rx,
        network_tx: stats?.network_tx,
      } as Record<string, unknown>;
    });
  }, [safeContainers, containerStats]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportAction = <ExportButton data={exportData} filename="docker" />;

  /* ── Compact mode (dashboard widget) ── */
  if (compact) {
    return (
      <Card title="Docker" loading={loading} actions={exportAction}>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {actionError && (
            <WidgetError service="Docker" message={actionError} compact />
          )}
          {(dockerOverview || safeContainers.length > 0) && (
            <DockerOverviewBar
              dockerOverview={dockerOverview}
              runningCount={runningCount}
              stoppedCount={stoppedCount}
              compact
            />
          )}
          {safeContainers.map((c) => (
            <CompactRow key={c.id} c={c} stats={getStats(c)} onClick={() => handleNavigate(c.id!)} />
          ))}
          {safeContainers.length === 0 && !loading && (
            <p className="text-xs text-neo-text-disabled text-center py-4 font-mono">
              No containers found.
            </p>
          )}
        </div>
      </Card>
    );
  }

  /* ── Full mode (Docker page) — card grid ── */
  return (
    <Card title="Docker" loading={loading} actions={exportAction}>
      <div className="space-y-3">
        {(dockerOverview || safeContainers.length > 0) && (
          <DockerOverviewBar
            dockerOverview={dockerOverview}
            runningCount={runningCount}
            stoppedCount={stoppedCount}
            compact={false}
          />
        )}

        {actionError && (
          <WidgetError service="Docker" message={actionError} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {safeContainers.map((c) => (
            <ContainerCard
              key={c.id}
              c={c}
              stats={getStats(c)}
              actionLoading={actionLoading}
              actionError={actionError}
              onAction={handleAction}
              expandedId={expandedId}
              onToggleLogs={toggleLogs}
              logs={logs}
              logsLoading={logsLoading}
              onNavigate={handleNavigate}
            />
          ))}
        </div>

        {safeContainers.length === 0 && !loading && (
          <p className="text-xs text-neo-text-disabled text-center py-4 font-mono">
            No containers found.
          </p>
        )}
      </div>
    </Card>
  );
}
