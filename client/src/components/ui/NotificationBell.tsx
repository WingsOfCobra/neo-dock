/* ── NotificationBell – dropdown with recent alerts ────────── */

import { useState, useRef, useEffect } from 'react';
import { useMetricsStore, type AppNotification } from '@/stores/metricsStore';

const TYPE_COLORS: Record<AppNotification['type'], string> = {
  error: 'bg-neo-red',
  warning: 'bg-[#FF6600]',
  info: 'bg-[#4488FF]',
  success: 'bg-[#44FF66]',
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notifications = useMetricsStore((s) => s.notifications);
  const markAllRead = useMetricsStore((s) => s.markAllRead);
  const clearNotifications = useMetricsStore((s) => s.clearNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const recent = notifications.slice(0, 10);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-7 h-7 text-neo-text-disabled hover:text-neo-red transition-colors"
        title="Notifications"
      >
        {/* Bell icon (SVG) */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center bg-neo-red text-[8px] font-mono text-neo-bg-deep px-0.5 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-neo-bg-deep border border-neo-red/30 shadow-[0_0_20px_rgba(255,0,51,0.15)] z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-neo-red/20">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neo-red">
              Alerts ({notifications.length})
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => markAllRead()}
                className="font-mono text-[9px] uppercase text-neo-text-disabled hover:text-neo-red transition-colors"
              >
                [MARK READ]
              </button>
              <button
                onClick={() => clearNotifications()}
                className="font-mono text-[9px] uppercase text-neo-text-disabled hover:text-neo-red transition-colors"
              >
                [CLEAR]
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <span className="font-mono text-[10px] text-neo-text-disabled">
                  NO ALERTS
                </span>
              </div>
            ) : (
              recent.map((n) => (
                <div
                  key={n.id}
                  className={`px-3 py-2 border-b border-neo-red/10 ${
                    n.read ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1 w-1.5 h-1.5 shrink-0 ${TYPE_COLORS[n.type]}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-neo-red uppercase truncate">
                          {n.title}
                        </span>
                        <span className="font-mono text-[9px] text-neo-text-disabled shrink-0">
                          {timeAgo(n.timestamp)}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-neo-text-secondary truncate">
                        {n.message}
                      </p>
                      <span className="inline-block mt-0.5 px-1 py-px font-mono text-[8px] uppercase tracking-wider border border-neo-red/20 text-neo-text-disabled">
                        {n.source}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
