/* ── Shell – main layout wrapper with tab routing ────────── */

import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ShortcutsHelp } from '@/components/ui/ShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface ShellProps {
  wsConnected: boolean;
  isOffline?: boolean;
  cacheTimestamp?: number | null;
}

export function Shell({ wsConnected, isOffline = false, cacheTimestamp = null }: ShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const togglePalette = useCallback(() => {
    setHelpOpen(false);
    setPaletteOpen((v) => !v);
  }, []);

  const toggleHelp = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen((v) => !v);
  }, []);

  useKeyboardShortcuts({
    onTogglePalette: togglePalette,
    onToggleHelp: toggleHelp,
  });

  return (
    <div className="relative h-screen flex flex-col z-10">
      <TopBar wsConnected={wsConnected} isOffline={isOffline} />
      <OfflineBanner cacheTimestamp={cacheTimestamp} />
      <TabBar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
