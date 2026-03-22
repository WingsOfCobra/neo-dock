/* ── SystemPage – dedicated system monitoring view ────────── */

import { ServerMonitor } from '@/components/widgets/ServerMonitor';
import { ServicesStatus } from '@/components/widgets/ServicesStatus';

export function SystemPage() {
  return (
    <div className="p-3 space-y-3 animate-fade-in">
      <div className="font-mono text-[10px] text-neo-red/40 px-1">
        &gt; SYSTEM_MONITOR // server health + processes + services
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ServerMonitor />
        </div>
        <ServicesStatus />
      </div>
    </div>
  );
}
