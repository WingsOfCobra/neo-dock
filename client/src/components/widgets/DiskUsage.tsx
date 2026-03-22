/* ── DiskUsage – disk mount usage bars ── */

import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';

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

export function DiskUsage() {
  const disk = useMetricsStore((s) => s.systemDisk);
  const health = useMetricsStore((s) => s.systemHealth);
  const safeDisk = Array.isArray(disk) ? disk : [];

  // Filter out virtual/zero-size filesystems to reduce noise
  const relevantDisks = safeDisk.filter((d) => {
    const mp = d.mountpoint ?? '';
    if (mp.startsWith('/proc') || mp.startsWith('/sys')) return false;
    const percent = parseFloat(String(d.usePercent ?? '0'));
    return percent > 0;
  });

  return (
    <Card
      title="Disk"
      status={health ? 'ok' : undefined}
      loading={health === null}
    >
      <div className="space-y-2">
        {relevantDisks.length > 0 ? (
          relevantDisks.map((d, i) => (
            <UsageBar
              key={d.mountpoint ?? `disk-${i}`}
              label={d.mountpoint ?? 'unknown'}
              percent={parseFloat(String(d.usePercent ?? '0'))}
              detail={`${d.used ?? '?'} / ${d.size ?? '?'}`}
            />
          ))
        ) : (
          <p className="text-[10px] font-mono text-neo-text-disabled">No disk data</p>
        )}
      </div>
    </Card>
  );
}
