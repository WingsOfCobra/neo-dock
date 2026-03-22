/* ── TopBar – terminal-style status bar ───────────────────── */

import { useEffect, useState } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { useAuthStore } from '@/stores/authStore';
import { useSoundStore } from '@/stores/soundStore';
import { useSound } from '@/hooks/useSound';
import { NotificationBell } from '@/components/ui/NotificationBell';

interface TopBarProps {
  wsConnected: boolean;
}

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-[11px] text-neo-red tabular-nums">
      {time.toLocaleTimeString('en-GB', { hour12: false })}
    </span>
  );
}

export function TopBar({ wsConnected }: TopBarProps) {
  const notificationCount = useMetricsStore(
    (s) => s.githubNotifications.length,
  );
  const emailCount = useMetricsStore((s) => s.emailCount);
  const logout = useAuthStore((s) => s.logout);
  const soundEnabled = useSoundStore((s) => s.soundEnabled);
  const toggleSound = useSoundStore((s) => s.toggleSound);
  const { playSound } = useSound();

  const totalAlerts = notificationCount + emailCount;

  const handleToggleSound = () => {
    toggleSound();
    // Play click sound if we're enabling (after toggle, soundEnabled is now true)
    if (!soundEnabled) {
      // Small delay so the store updates first
      requestAnimationFrame(() => playSound('click'));
    }
  };

  return (
    <header className="relative h-10 bg-neo-bg-deep/90 backdrop-blur border-b border-neo-red/20 flex items-center px-4 gap-4 shrink-0 z-40">
      {/* Animated top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neo-red/60 to-transparent" />

      {/* Title — glitch style */}
      <h1
        className="glitch font-display text-sm tracking-[0.3em] text-neo-red"
        data-text="NEO-DOCK"
      >
        NEO-DOCK
      </h1>

      {/* Terminal prompt */}
      <span className="hidden sm:inline font-mono text-[10px] text-neo-red/30 terminal-cursor">
        root@neo-dock:~$
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* External alerts count */}
      {totalAlerts > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-neo-red animate-pulse shadow-[0_0_6px_rgba(255,0,51,0.6)]" />
          <span className="text-[10px] font-mono text-neo-red">
            {totalAlerts} ALERT{totalAlerts !== 1 ? 'S' : ''}
          </span>
        </div>
      )}

      {/* Notification bell */}
      <NotificationBell />

      {/* WS status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            wsConnected
              ? 'bg-neo-red shadow-[0_0_6px_rgba(255,0,51,0.6)]'
              : 'bg-neo-text-disabled animate-pulse'
          }`}
        />
        <span className="text-[10px] font-mono text-neo-text-disabled uppercase hidden sm:inline">
          {wsConnected ? 'LINKED' : 'OFFLINE'}
        </span>
      </div>

      {/* Sound toggle */}
      <button
        onClick={handleToggleSound}
        className="text-[11px] font-mono text-neo-text-disabled hover:text-neo-red transition-colors"
        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
      >
        {soundEnabled ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.08" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </button>

      {/* Clock */}
      <Clock />

      {/* Logout */}
      <button
        onClick={logout}
        className="text-[10px] font-mono uppercase text-neo-text-disabled hover:text-neo-red transition-colors tracking-wide"
      >
        [EXIT]
      </button>
    </header>
  );
}
