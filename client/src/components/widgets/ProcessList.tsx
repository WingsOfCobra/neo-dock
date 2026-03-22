/* ── ProcessList – top processes by CPU ────────────────────── */

import { useMemo } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { ExportButton } from '@/components/ui/ExportButton';

interface ProcessListProps {
  compact?: boolean;
}

export function ProcessList({ compact = false }: ProcessListProps) {
  const processes = useMetricsStore((s) => s.systemProcesses);

  const limit = compact ? 8 : 15;

  const sorted = useMemo(() => {
    return [...processes]
      .sort((a, b) => {
        const aCpu = Number((a as Record<string, unknown>)['cpu_percent'] ?? (a as Record<string, unknown>)['cpu'] ?? 0);
        const bCpu = Number((b as Record<string, unknown>)['cpu_percent'] ?? (b as Record<string, unknown>)['cpu'] ?? 0);
        return bCpu - aCpu;
      })
      .slice(0, limit);
  }, [processes, limit]);

  function cpuColor(val: number): string {
    if (val > 50) return 'text-neo-red';
    if (val > 20) return 'text-[#FF6600]';
    return 'text-neo-text-secondary';
  }

  const exportData = useMemo(() => {
    return sorted.map((proc) => {
      const p = proc as Record<string, unknown>;
      return {
        pid: p['pid'],
        name: p['name'] ?? p['command'],
        cpu_percent: p['cpu_percent'] ?? p['cpu'],
        mem_percent: p['mem_percent'] ?? p['memory'],
        user: p['user'] ?? p['username'],
      } as Record<string, unknown>;
    });
  }, [sorted]);

  return (
    <Card title="Processes" actions={<ExportButton data={exportData} filename="processes" />}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neo-red/20">
              {['PID', 'PROCESS', 'CPU%', 'MEM%', 'USER'].map((h) => (
                <th
                  key={h}
                  className="px-2 py-1.5 text-left font-mono text-[9px] uppercase tracking-wider text-neo-text-disabled font-normal"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-2 py-4 text-center font-mono text-[10px] text-neo-text-disabled"
                >
                  NO PROCESS DATA
                </td>
              </tr>
            ) : (
              sorted.map((proc, i) => {
                const p = proc as Record<string, unknown>;
                const pid = String(p['pid'] ?? '-');
                const name = String(p['name'] ?? p['command'] ?? '-');
                const cpu = Number(p['cpu_percent'] ?? p['cpu'] ?? 0);
                const mem = Number(p['mem_percent'] ?? p['memory'] ?? 0);
                const user = String(p['user'] ?? p['username'] ?? '-');

                return (
                  <tr
                    key={`${pid}-${i}`}
                    className="border-b border-neo-red/5 hover:bg-neo-red/5 transition-colors"
                  >
                    <td className="px-2 py-1 font-mono text-[10px] text-neo-text-disabled tabular-nums">
                      {pid}
                    </td>
                    <td className="px-2 py-1 font-mono text-[10px] text-neo-text-secondary truncate max-w-[200px]">
                      {name}
                    </td>
                    <td className={`px-2 py-1 font-mono text-[10px] tabular-nums ${cpuColor(cpu)}`}>
                      {cpu.toFixed(1)}
                    </td>
                    <td className="px-2 py-1 font-mono text-[10px] text-neo-text-secondary tabular-nums">
                      {mem.toFixed(1)}
                    </td>
                    <td className="px-2 py-1 font-mono text-[10px] text-neo-text-disabled truncate max-w-[100px]">
                      {user}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
