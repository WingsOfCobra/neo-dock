/* ── Shell – main layout wrapper with tab routing ────────── */

import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';

interface ShellProps {
  wsConnected: boolean;
}

export function Shell({ wsConnected }: ShellProps) {
  return (
    <div className="relative h-screen flex flex-col z-10">
      <TopBar wsConnected={wsConnected} />
      <TabBar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
