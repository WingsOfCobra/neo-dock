/* ── TopProcesses – top CPU/memory consuming processes ── */

import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';

export function TopProcesses() {
  const processes = useMetricsStore((s) => s.systemProcesses);
  const health = useMetricsStore((s) => s.systemHealth);
  const safeProcesses = Array.isArray(processes) ? processes.slice(0, 8) : [];

  return (
    <Card
      title="Processes"
      status={health ? 'ok' : undefined}
      loading={health === null}
    >
      {safeProcesses.length > 0 ? (
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
      ) : (
        <p className="text-[10px] font-mono text-neo-text-disabled">No process data</p>
      )}
    </Card>
  );
}
