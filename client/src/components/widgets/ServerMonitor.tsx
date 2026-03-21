/* ── ServerMonitor – CPU chart, RAM, disk, uptime ─────────── */

import { useMemo } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { Chart } from '@/components/ui/Chart';
import type { MetricsPoint } from '@/types';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(1)} ${units[i]}`;
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
      ? 'bg-neo-red'
      : clamped > 70
        ? 'bg-neo-yellow'
        : 'bg-neo-cyan';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-neo-text-secondary uppercase tracking-wide">
          {label}
        </span>
        <span className="font-mono text-neo-text-primary">
          {clamped.toFixed(1)}%
          {detail && (
            <span className="text-neo-text-disabled ml-1">({detail})</span>
          )}
        </span>
      </div>
      <div className="h-1.5 bg-neo-bg-deep rounded-sm overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function ServerMonitor() {
  const health = useMetricsStore((s) => s.systemHealth);
  const disk = useMetricsStore((s) => s.systemDisk);
  const metrics = useMetricsStore((s) => s.systemMetrics);

  const safeDisk = Array.isArray(disk) ? disk : [];
  const safeMetrics = Array.isArray(metrics) ? metrics : [];

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
          stroke: '#55EAD4',
          width: 1.5,
          fill: 'rgba(85, 234, 212, 0.08)',
        },
      ],
      axes: [
        {
          stroke: '#4A4A55',
          grid: { stroke: 'rgba(42,42,58,0.5)', width: 1 },
          ticks: { stroke: 'rgba(42,42,58,0.3)', width: 1 },
          font: '10px JetBrains Mono',
        },
        {
          stroke: '#4A4A55',
          grid: { stroke: 'rgba(42,42,58,0.5)', width: 1 },
          ticks: { stroke: 'rgba(42,42,58,0.3)', width: 1 },
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

  const memPercent = health
    ? (health.memUsed / (health.memTotal || 1)) * 100
    : 0;

  const loadAvg = health?.loadAvg;
  const safeLoadAvg = Array.isArray(loadAvg) ? loadAvg : [];

  return (
    <Card
      title="System Monitor"
      status={health ? 'ok' : undefined}
      loading={health === null}
      glowColor="cyan"
    >
      <div className="space-y-4">
        {/* Uptime */}
        {health && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-neo-text-secondary uppercase tracking-wide">
              Uptime
            </span>
            <span className="font-mono text-neo-cyan text-sm">
              {formatUptime(health.uptime ?? 0)}
            </span>
          </div>
        )}

        {/* CPU Chart */}
        {chartData && (
          <div>
            <p className="text-xs text-neo-text-secondary uppercase tracking-wide mb-1">
              CPU Usage (1h)
            </p>
            <Chart data={chartData} options={chartOpts} height={120} />
          </div>
        )}

        {/* RAM */}
        {health && (
          <UsageBar
            label="RAM"
            percent={memPercent}
            detail={`${formatBytes(health.memUsed)} / ${formatBytes(health.memTotal)}`}
          />
        )}

        {/* Disk mounts */}
        {safeDisk.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-neo-text-secondary uppercase tracking-wide">
              Disk
            </p>
            {safeDisk.map((d, i) => (
              <UsageBar
                key={d.mount ?? `disk-${i}`}
                label={d.mount ?? 'unknown'}
                percent={d.usedPercent ?? 0}
                detail={`${formatBytes(d.used ?? 0)} / ${formatBytes(d.size ?? 0)}`}
              />
            ))}
          </div>
        )}

        {/* Host info */}
        {health && (
          <div className="pt-2 border-t border-neo-border text-[10px] text-neo-text-disabled font-mono flex flex-wrap gap-x-4 gap-y-1">
            <span>{health.hostname ?? 'unknown'}</span>
            {health.cpuModel && <span>{health.cpuModel}</span>}
            {health.cpuCores && <span>{health.cpuCores} cores</span>}
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
