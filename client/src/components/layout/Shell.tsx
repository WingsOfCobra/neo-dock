/* ── Shell – main layout wrapper ────────────────────────────── */

import { useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { WidgetGrid } from './WidgetGrid';

interface ShellProps {
  wsConnected: boolean;
}

export function Shell({ wsConnected }: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative h-screen flex flex-col z-10">
      <TopBar
        wsConnected={wsConnected}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto">
          <WidgetGrid />
        </main>
      </div>
    </div>
  );
}
