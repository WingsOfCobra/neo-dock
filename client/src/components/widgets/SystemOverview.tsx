/* ── SystemOverview – compact CPU, RAM, network, host info ── */

import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { ExportButton } from '@/components/ui/ExportButton';
import { useMemo } from 'react';
import type { ChefSystemHealth } from '@/types';

function formatUptime(uptimeHuman?: string, seconds?: number): string {
  if (uptimeHuman) return uptimeHuman;
  if (!seconds) return '--';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function UsageBar({
  label,
  percent,
  detail,
}: {
  label: string;
  percent: number;
  detail?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent || 0));
  const color =
    clamped > 90
      ? 'bg-neo-red shadow-[0_0_8px_rgba(255,0,51,0.4)]'
      : clamped > 70
        ? 'bg-neo-yellow'
        : 'bg-neo-red/70';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-neo-text-secondary uppercase tracking-wide font-mono">
          {label}
        </span>
        <span className="font-mono text-neo-text-primary">
          {clamped.toFixed(1)}%
          {detail && (
            <span className="text-neo-text-disabled ml-1">({detail})</span>
          )}
        </span>
      </div>
      <div className="h-1.5 bg-neo-bg-deep overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function formatNetBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(1)} ${units[i]}`;
}

function getCpu(health: ChefSystemHealth): number {
  return health.cpu?.usage_percent ?? 0;
}

function getMemPercent(health: ChefSystemHealth): number {
  return parseFloat(String(health.memory?.usedPercent ?? '0'));
}

export function SystemOverview() {
  const health = useMetricsStore((s) => s.systemHealth);

  const cpuPercent = health ? getCpu(health) : 0;
  const memPercent = health ? getMemPercent(health) : 0;
  const network = health?.network;
  const loadAvg = health?.loadAvg;
  const safeLoadAvg = Array.isArray(loadAvg) ? loadAvg : [];

  const exportData = useMemo(() => {
    if (!health) return [];
    return [
      {
        hostname: health.hostname,
        platform: health.platform,
        uptime: health.uptime,
        cpu_usage_percent: health.cpu?.usage_percent,
        cpu_cores: health.cpu?.cores,
        cpu_model: health.cpu?.model,
        memory_total: health.memory?.total,
        memory_free: health.memory?.free,
        memory_usedPercent: health.memory?.usedPercent,
        network_rx_bytes: health.network?.rx_bytes,
        network_tx_bytes: health.network?.tx_bytes,
      },
    ];
  }, [health]);

  return (
    <Card
      title="System Monitor"
      status={health ? 'ok' : undefined}
      loading={health === null}
      actions={<ExportButton data={exportData} filename="system" />}
    >
      <div className="space-y-3">
        {/* Header row: uptime + hostname */}
        {health && (
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <span className="text-xs text-neo-text-secondary uppercase tracking-wide font-mono">
                Uptime
              </span>
              <span className="font-mono text-neo-red text-sm">
                {formatUptime(health.uptimeHuman, health.uptime)}
              </span>
            </div>
            <span className="text-[10px] text-neo-text-disabled font-mono truncate">
              {health.hostname ?? 'unknown'}
            </span>
          </div>
        )}

        {/* CPU bar */}
        {health && (
          <UsageBar
            label="CPU"
            percent={cpuPercent}
            detail={`${health.cpu?.cores ?? '?'} cores · ${health.cpu?.model ?? ''}`}
          />
        )}

        {/* RAM bar */}
        {health && (
          <UsageBar
            label="RAM"
            percent={memPercent}
            detail={`${health.memory?.free ?? '?'} free of ${health.memory?.total ?? '?'}`}
          />
        )}

        {/* Network I/O */}
        {network && (network.rx_bytes || network.tx_bytes) && (
          <div className="flex items-baseline justify-between text-[10px] font-mono">
            <span className="text-neo-text-secondary uppercase">Network</span>
            <span className="text-neo-text-primary">
              <span className="text-neo-red/60">↓</span> {formatNetBytes(network.rx_bytes ?? 0)}
              <span className="ml-2 text-neo-red/60">↑</span> {formatNetBytes(network.tx_bytes ?? 0)}
            </span>
          </div>
        )}

        {/* Host info footer */}
        {health && (
          <div className="pt-2 border-t border-neo-border text-[10px] text-neo-text-disabled font-mono flex flex-wrap gap-x-4 gap-y-1">
            <span>{health.platform ?? 'unknown'}</span>
            {health.nodeVersion && <span>Node {health.nodeVersion}</span>}
            {health.cpu?.model && <span>{health.cpu.model}</span>}
            {health.cpu?.cores && <span>{health.cpu.cores} cores</span>}
            {safeLoadAvg.length > 0 && (
              <span>
                Load: {safeLoadAvg.map((v) => (typeof v === 'number' ? v.toFixed(2) : '?')).join(' ')}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
