/* ── TopBar – status bar with clock, WS status, notifications ── */

import { useEffect, useState } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { useAuthStore } from '@/stores/authStore';

interface TopBarProps {
  wsConnected: boolean;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-sm text-neo-text-secondary tabular-nums">
      {time.toLocaleTimeString('en-GB', { hour12: false })}
    </span>
  );
}

export function TopBar({ wsConnected, onToggleSidebar, sidebarOpen }: TopBarProps) {
  const notificationCount = useMetricsStore(
    (s) => s.githubNotifications.filter((n) => n.unread).length,
  );
  const emailCount = useMetricsStore((s) => s.emails.length);
  const logout = useAuthStore((s) => s.logout);

  const totalAlerts = notificationCount + emailCount;

  return (
    <header className="h-10 bg-neo-bg-surface/80 backdrop-blur border-b border-neo-border flex items-center px-4 gap-4 shrink-0 z-40">
      {/* Hamburger (mobile) */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden text-neo-text-secondary hover:text-neo-text-primary transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {sidebarOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <path d="M3 12h18M3 6h18M3 18h18" />
          )}
        </svg>
      </button>

      {/* Title */}
      <h1 className="font-display text-sm tracking-[0.2em] text-neo-red">
        NEO-DOCK
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification badge */}
      {totalAlerts > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-neo-cyan animate-pulse" />
          <span className="text-[10px] font-mono text-neo-cyan">
            {totalAlerts}
          </span>
        </div>
      )}

      {/* WS status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            wsConnected ? 'bg-neo-cyan' : 'bg-neo-red animate-pulse'
          }`}
        />
        <span className="text-[10px] font-mono text-neo-text-disabled uppercase hidden sm:inline">
          {wsConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Clock */}
      <Clock />

      {/* Logout */}
      <button
        onClick={logout}
        className="text-[10px] font-mono uppercase text-neo-text-disabled hover:text-neo-red transition-colors tracking-wide"
      >
        Exit
      </button>
    </header>
  );
}
