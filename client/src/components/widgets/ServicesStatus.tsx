/* ── ServicesStatus – grid of service status cards ─────────── */

import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';

const statusConfig: Record<
  string,
  { color: string; bg: string; border: string; pulse: boolean }
> = {
  active: {
    color: 'text-neo-cyan',
    bg: 'bg-neo-cyan/10',
    border: 'border-neo-cyan/30',
    pulse: true,
  },
  running: {
    color: 'text-neo-cyan',
    bg: 'bg-neo-cyan/10',
    border: 'border-neo-cyan/30',
    pulse: true,
  },
  inactive: {
    color: 'text-neo-yellow',
    bg: 'bg-neo-yellow/10',
    border: 'border-neo-yellow/30',
    pulse: false,
  },
  failed: {
    color: 'text-neo-red',
    bg: 'bg-neo-red/10',
    border: 'border-neo-red/30',
    pulse: false,
  },
};

const defaultStatus = {
  color: 'text-neo-text-disabled',
  bg: 'bg-neo-bg-elevated',
  border: 'border-neo-border',
  pulse: false,
};

export function ServicesStatus() {
  const rawServices = useMetricsStore((s) => s.services);
  const services = Array.isArray(rawServices) ? rawServices : [];
  const loading = services.length === 0;

  return (
    <Card title="Services" loading={loading} glowColor="cyan">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {services.map((svc) => {
          const cfg = statusConfig[svc.status] ?? defaultStatus;

          return (
            <div
              key={svc.name}
              className={`
                relative border ${cfg.border} ${cfg.bg} px-3 py-2
                transition-colors
              `}
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              }}
            >
              {/* Pulse indicator */}
              {cfg.pulse && (
                <span
                  className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${cfg.color.replace('text-', 'bg-')} animate-pulse`}
                />
              )}

              <p className="font-display text-[10px] uppercase tracking-[0.12em] text-neo-text-primary truncate">
                {svc.name}
              </p>
              <p
                className={`text-[10px] font-mono uppercase mt-0.5 ${cfg.color}`}
              >
                {svc.status}
              </p>
            </div>
          );
        })}
      </div>

      {services.length === 0 && !loading && (
        <p className="text-xs text-neo-text-disabled text-center py-4">
          No services found.
        </p>
      )}
    </Card>
  );
}
