/* ── LogsPage – dedicated full-screen Loki log viewer ──────── */

import { LogsViewer } from '@/components/widgets/LogsViewer';

export function LogsPage() {
  return (
    <div className="p-3 space-y-3 animate-fade-in">
      <div className="font-mono text-[10px] text-neo-red/40 px-1">
        &gt; LOKI_STREAM // real-time log aggregation via Loki
      </div>
      <LogsViewer fullHeight />
    </div>
  );
}
