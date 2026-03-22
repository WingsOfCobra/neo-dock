/* ── ServerMonitor – CPU chart, RAM, disk, processes, network ── */

import { useMemo } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { Chart } from '@/components/ui/Chart';
import { ExportButton } from '@/components/ui/ExportButton';
import type { MetricsPoint, ChefSystemHealth } from '@/types';

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

/** Extract CPU percent from the nested health object */
function getCpu(health: ChefSystemHealth): number {
  return health.cpu?.usage_percent ?? 0;
}

/** Extract memory percent from the nested health object */
function getMemPercent(health: ChefSystemHealth): number {
  return parseFloat(String(health.memory?.usedPercent ?? '0'));
}

export function ServerMonitor() {
  const health = useMetricsStore((s) => s.systemHealth);
  const disk = useMetricsStore((s) => s.systemDisk);
  const metrics = useMetricsStore((s) => s.systemMetrics);
  const processes = useMetricsStore((s) => s.systemProcesses);

  const safeDisk = Array.isArray(disk) ? disk : [];
  const safeMetrics = Array.isArray(metrics) ? metrics : [];
  const safeProcesses = Array.isArray(processes) ? processes.slice(0, 8) : [];

  const chartData = useMemo(() => {
    if (safeMetrics.length === 0) return null;
    const timestamps = safeMetrics.map((p: MetricsPoint) => p.timestamp);
    const cpuValues = safeMetrics.map((p: MetricsPoint) => p.cpu ?? 0);
    return [timestamps, cpuValues] as [number[], number[]];
  }, [safeMetrics]);

  const chartOpts = useMemo(
    () => ({
      series: [
        {},
        {
          label: 'CPU %',
          stroke: '#FF0033',
          width: 1.5,
          fill: 'rgba(255, 0, 51, 0.08)',
        },
      ],
      axes: [
        {
          stroke: '#552222',
          grid: { stroke: 'rgba(58,21,21,0.5)', width: 1 },
          ticks: { stroke: 'rgba(58,21,21,0.3)', width: 1 },
          font: '10px JetBrains Mono',
        },
        {
          stroke: '#552222',
          grid: { stroke: 'rgba(58,21,21,0.5)', width: 1 },
          ticks: { stroke: 'rgba(58,21,21,0.3)', width: 1 },
          font: '10px JetBrains Mono',
          scale: 'y',
        },
      ],
      scales: {
        y: { min: 0, max: 100 },
      },
      cursor: { show: true },
      legend: { show: false },
    }),
    [],
  );

  const cpuPercent = health ? getCpu(health) : 0;
  const memPercent = health ? getMemPercent(health) : 0;
  const loadAvg = health?.loadAvg;
  const safeLoadAvg = Array.isArray(loadAvg) ? loadAvg : [];
  const network = health?.network;

  const exportData = useMemo(() => {
    const rows: Record<string, unknown>[] = [];
    if (health) {
      rows.push({
        type: 'health',
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
      });
    }
    for (const d of safeDisk) {
      rows.push({
        type: 'disk',
        mountpoint: d.mountpoint,
        size: d.size,
        used: d.used,
        usePercent: d.usePercent,
      });
    }
    return rows;
  }, [health, safeDisk]);

  return (
    <Card
      title="System Monitor"
      status={health ? 'ok' : undefined}
      loading={health === null}
      actions={<ExportButton data={exportData} filename="system" />}
    >
      <div className="space-y-4">
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

        {/* CPU Chart */}
        {chartData && (
          <div>
            <p className="text-xs text-neo-text-secondary uppercase tracking-wide mb-1 font-mono">
              CPU Usage (1h)
            </p>
            <Chart data={chartData} options={chartOpts} height={120} />
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

        {/* Disk mounts */}
        {safeDisk.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-neo-text-secondary uppercase tracking-wide font-mono">
              Disk
            </p>
            {safeDisk.map((d, i) => (
              <UsageBar
                key={d.mountpoint ?? `disk-${i}`}
                label={d.mountpoint ?? 'unknown'}
                percent={parseFloat(String(d.usePercent ?? '0'))}
                detail={`${d.used ?? '?'} / ${d.size ?? '?'}`}
              />
            ))}
          </div>
        )}

        {/* Top processes */}
        {safeProcesses.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-neo-text-secondary uppercase tracking-wide font-mono">
              Top Processes
            </p>
            <div className="bg-neo-bg-deep border border-neo-border/50 overflow-hidden">
              <div className="grid grid-cols-[50px_50px_50px_1fr] gap-1 px-2 py-1 text-[9px] font-mono text-neo-text-disabled uppercase border-b border-neo-border/30">
                <span>PID</span>
                <span className="text-right">CPU%</span>
                <span className="text-right">MEM%</span>
                <span>CMD</span>
              </div>
              {safeProcesses.map((p) => {
                const cpuPct = parseFloat(String(p.cpuPercent ?? '0'));
                return (
                  <div
                    key={p.pid}
                    className="grid grid-cols-[50px_50px_50px_1fr] gap-1 px-2 py-0.5 text-[10px] font-mono hover:bg-neo-red/[0.03]"
                  >
                    <span className="text-neo-text-disabled">{p.pid}</span>
                    <span className={`text-right ${cpuPct > 50 ? 'text-neo-red' : cpuPct > 20 ? 'text-neo-yellow' : 'text-neo-text-secondary'}`}>
                      {p.cpuPercent}
                    </span>
                    <span className="text-right text-neo-text-secondary">{p.memPercent}</span>
                    <span className="text-neo-text-primary truncate">{p.command}</span>
                  </div>
                );
              })}
            </div>
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

function formatNetBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(1)} ${units[i]}`;
}
