/* ── ServicesStatus – grid of service status cards ─────────── */

import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';

const statusConfig: Record<
  string,
  { color: string; bg: string; border: string; pulse: boolean }
> = {
  active: {
    color: 'text-neo-red',
    bg: 'bg-neo-red/10',
    border: 'border-neo-red/30',
    pulse: true,
  },
  running: {
    color: 'text-neo-red',
    bg: 'bg-neo-red/10',
    border: 'border-neo-red/30',
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
    bg: 'bg-neo-red/20',
    border: 'border-neo-red/50',
    pulse: false,
  },
};

const defaultStatus = {
  color: 'text-neo-text-disabled',
  bg: 'bg-neo-bg-elevated',
  border: 'border-neo-border',
  pulse: false,
};

interface ServicesStatusProps {
  compact?: boolean;
}

export function ServicesStatus({ compact = false }: ServicesStatusProps) {
  const rawServices = useMetricsStore((s) => s.services);
  const loadingStates = useMetricsStore((s) => s.loadingStates);
  const services = Array.isArray(rawServices) ? rawServices : [];
  const loading = (loadingStates['services:status'] ?? false) || (services.length === 0 && loadingStates['services:status'] !== false);

  const activeCount = services.filter((s) => s.active).length;
  const failedCount = services.filter((s) => s.status === 'failed' || s.status === 'inactive').length;

  return (
    <Card
      title="Services"
      loading={loading}
      status={failedCount > 0 ? 'warning' : activeCount > 0 ? 'ok' : undefined}
    >
      {/* Summary bar */}
      {services.length > 0 && (
        <div className="flex items-center gap-3 mb-3 text-[10px] font-mono">
          <span className="text-neo-red">{activeCount} active</span>
          {failedCount > 0 && (
            <span className="text-neo-yellow">{failedCount} down</span>
          )}
          <span className="text-neo-text-disabled">{services.length} total</span>
        </div>
      )}

      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${compact ? 'max-h-72 overflow-y-auto' : ''}`}>
        {services.map((svc) => {
          const cfg = statusConfig[svc.status ?? ''] ?? defaultStatus;

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
              {cfg.pulse && (
                <span
                  className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${cfg.color.replace('text-', 'bg-')} animate-pulse shadow-[0_0_4px_rgba(255,0,51,0.4)]`}
                />
              )}

              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-neo-text-primary truncate">
                {svc.name}
              </p>
              <p
                className={`text-[10px] font-mono uppercase mt-0.5 ${cfg.color}`}
              >
                {svc.status ?? (svc.active ? 'active' : 'inactive')}
              </p>

              {/* Details: uptime, memory, PID */}
              <div className="mt-1 space-y-0.5 text-[9px] font-mono text-neo-text-disabled">
                {svc.uptime && (
                  <p>UP {svc.uptime}</p>
                )}
                {svc.memory && (
                  <p>MEM {svc.memory}</p>
                )}
                {svc.pid != null && (
                  <p>PID {svc.pid}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {services.length === 0 && !loading && (
        <p className="text-xs text-neo-text-disabled text-center py-4 font-mono">
          No services found.
        </p>
      )}
    </Card>
  );
}
