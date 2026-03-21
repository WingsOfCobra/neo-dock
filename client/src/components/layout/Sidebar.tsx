/* ── Sidebar – icon navigation for widgets ─────────────────── */

import { WIDGET_CONFIGS, WIDGET_LABELS } from '@/lib/constants';
import type { WidgetType } from '@/types/widgets';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const widgetIcons: Record<WidgetType, string> = {
  'server-monitor': '⬡',
  'docker-containers': '◈',
  'services-status': '◉',
  'github-dashboard': '⬢',
  'email-inbox': '▣',
  'todo-list': '☐',
  'logs-viewer': '▤',
  'cron-jobs': '⏣',
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const scrollTo = (id: string) => {
    const el = document.querySelector(`[data-widget-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-10 left-0 bottom-0 z-50 w-14
          bg-neo-bg-surface/90 backdrop-blur border-r border-neo-border
          flex flex-col items-center py-3 gap-1
          transition-transform duration-200
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {WIDGET_CONFIGS.map((w) => {
          const icon = widgetIcons[w.type as WidgetType] ?? '◻';
          const label = WIDGET_LABELS[w.type as WidgetType] ?? '???';

          return (
            <button
              key={w.id}
              onClick={() => scrollTo(w.id)}
              title={w.title}
              className="group relative w-10 h-10 flex items-center justify-center text-neo-text-disabled hover:text-neo-cyan transition-colors"
            >
              <span className="text-base">{icon}</span>
              {/* Tooltip */}
              <span className="absolute left-12 px-2 py-1 bg-neo-bg-elevated border border-neo-border text-[10px] font-mono text-neo-text-secondary uppercase tracking-wide whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                {label}
              </span>
            </button>
          );
        })}
      </aside>
    </>
  );
}
