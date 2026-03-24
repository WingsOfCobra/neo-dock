/* ── TabBar – horizontal tab navigation ──────────────────── */

import { NavLink } from 'react-router-dom';
import { useSound } from '@/hooks/useSound';

interface TabDef {
  to: string;
  label: string;
  shortLabel: string;
  shortcut: string;
}

const TABS: TabDef[] = [
  { to: '/', label: 'DASHBOARD', shortLabel: 'DASH', shortcut: 'g+d' },
  { to: '/system', label: 'SYSTEM', shortLabel: 'SYS', shortcut: 'g+s' },
  { to: '/docker', label: 'DOCKER', shortLabel: 'DCK', shortcut: 'g+k' },
  { to: '/comms', label: 'COMMS', shortLabel: 'COM', shortcut: 'g+c' },
  { to: '/tasks', label: 'TASKS', shortLabel: 'TSK', shortcut: 'g+t' },
  { to: '/logs', label: 'LOGS', shortLabel: 'LOG', shortcut: 'g+l' },
  { to: '/ansible', label: 'ANSIBLE', shortLabel: 'ANS', shortcut: 'g+a' },
  { to: '/alerts', label: 'ALERTS', shortLabel: 'ALT', shortcut: 'g+x' },
];

export function TabBar() {
  const { playSound } = useSound();

  return (
    <nav className="relative bg-neo-bg-deep/80 border-b border-neo-red/10 flex items-stretch overflow-x-auto shrink-0 z-30">
      {/* Left decorator */}
      <div className="flex items-center px-3">
        <span className="font-mono text-[9px] text-neo-red/30">&gt;</span>
      </div>

      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          onClick={() => playSound('navigate')}
          className={({ isActive }: { isActive: boolean }) =>
            `relative flex items-center px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] transition-all duration-200 whitespace-nowrap ${
              isActive
                ? 'text-neo-red tab-active bg-neo-red/5'
                : 'text-neo-text-disabled hover:text-neo-red/60 hover:bg-neo-red/[0.02]'
            }`
          }
        >
          {({ isActive }: { isActive: boolean }) => (
            <>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline text-[8px] font-mono text-neo-text-disabled ml-1">
                [{tab.shortcut}]
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-neo-red shadow-[0_0_8px_rgba(255,0,51,0.5)]" />
              )}
            </>
          )}
        </NavLink>
      ))}

      {/* Right spacer with animated line */}
      <div className="flex-1" />
      <div className="flex items-center px-3">
        <span className="font-mono text-[9px] text-neo-red/20 animate-pulse">_</span>
      </div>
    </nav>
  );
}
