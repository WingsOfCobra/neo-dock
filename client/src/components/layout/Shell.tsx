/* ── Shell – main layout wrapper with tab routing ────────── */

import { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { SettingsPanel } from './SettingsPanel';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ShortcutsHelp } from '@/components/ui/ShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSettingsStore } from '@/stores/settingsStore';

interface ShellProps {
  wsConnected: boolean;
  isOffline?: boolean;
  cacheTimestamp?: number | null;
}

export function Shell({ wsConnected, isOffline = false, cacheTimestamp = null }: ShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const compactMode = useSettingsStore((s) => s.compactMode);
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);

  /* Sync animations toggle to document root */
  useEffect(() => {
    if (animationsEnabled) {
      document.documentElement.removeAttribute('data-no-animations');
    } else {
      document.documentElement.setAttribute('data-no-animations', '');
    }
  }, [animationsEnabled]);

  const togglePalette = useCallback(() => {
    setHelpOpen(false);
    setSettingsOpen(false);
    setPaletteOpen((v) => !v);
  }, []);

  const toggleHelp = useCallback(() => {
    setPaletteOpen(false);
    setSettingsOpen(false);
    setHelpOpen((v) => !v);
  }, []);

  const openSettings = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen(false);
    setSettingsOpen(true);
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
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
