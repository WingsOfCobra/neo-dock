/* ── CommandPalette – Ctrl+K quick-action overlay ─────────── */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMetricsStore } from '@/stores/metricsStore';
import { useSound } from '@/hooks/useSound';

/* ── Types ─────────────────────────────────────────────────── */

type Category = 'NAV' | 'CONTAINER' | 'REPO';

interface CommandItem {
  id: string;
  label: string;
  category: Category;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/* ── Category chip colors ──────────────────────────────────── */

const CATEGORY_STYLE: Record<Category, string> = {
  NAV: 'bg-neo-red/20 text-neo-red',
  CONTAINER: 'bg-cyan-900/40 text-cyan-400',
  REPO: 'bg-purple-900/40 text-purple-400',
};

const MAX_RESULTS = 8;

/* ── Component ─────────────────────────────────────────────── */

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const containers = useMetricsStore((s) => s.containers);
  const repos = useMetricsStore((s) => s.githubRepos);

  const { playSound } = useSound();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Build full command list */
  const commands = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      { id: 'nav-dashboard', label: 'Dashboard', category: 'NAV', action: () => navigate('/') },
      { id: 'nav-system', label: 'System', category: 'NAV', action: () => navigate('/system') },
      { id: 'nav-docker', label: 'Docker', category: 'NAV', action: () => navigate('/docker') },
      { id: 'nav-comms', label: 'Comms', category: 'NAV', action: () => navigate('/comms') },
      { id: 'nav-tasks', label: 'Tasks', category: 'NAV', action: () => navigate('/tasks') },
      { id: 'nav-logs', label: 'Logs', category: 'NAV', action: () => navigate('/logs') },
    ];

    const containerItems: CommandItem[] = containers.map((c) => {
      const name = typeof c === 'object' && c !== null
        ? String((c as Record<string, unknown>)['name'] ?? (c as Record<string, unknown>)['Names'] ?? '')
        : '';
      const cleanName = name.replace(/^\//, '');
      return {
        id: `container-${cleanName}`,
        label: `Container: ${cleanName}`,
        category: 'CONTAINER' as const,
        action: () => navigate('/docker'),
      };
    });

    const repoItems: CommandItem[] = repos.map((r) => {
      const name = typeof r === 'object' && r !== null
        ? String((r as Record<string, unknown>)['full_name'] ?? (r as Record<string, unknown>)['name'] ?? '')
        : '';
      return {
        id: `repo-${name}`,
        label: `Repo: ${name}`,
        category: 'REPO' as const,
        action: () => {
          const parts = name.split('/');
          if (parts.length === 2) {
            navigate(`/repo/${parts[0]}/${parts[1]}`);
          } else {
            navigate('/comms');
          }
        },
      };
    });

    return [...nav, ...containerItems, ...repoItems];
  }, [containers, repos, navigate]);

  /* Filter by query */
  const filtered = useMemo(() => {
    if (!query.trim()) return commands.slice(0, MAX_RESULTS);
    const q = query.toLowerCase();
    return commands
      .filter((c) => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [commands, query]);

  /* Reset on open/close */
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Focus after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  /* Clamp selection when results change */
  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  /* Scroll selected item into view */
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const execute = useCallback(
    (item: CommandItem) => {
      playSound('navigate');
      onClose();
      item.action();
    },
    [onClose, playSound],
  );

  /* Keyboard navigation */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % filtered.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[selectedIndex]) execute(filtered[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, execute, onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-neo-bg-surface border border-neo-red/40 shadow-[0_0_40px_rgba(255,0,51,0.15)]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* Input */}
        <div className="flex items-center border-b border-neo-red/20 px-4 py-3">
          <span className="font-mono text-neo-red text-xs mr-2 select-none">&gt;_</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent font-mono text-sm text-neo-text-primary placeholder:text-neo-text-disabled outline-none"
          />
          <kbd className="font-mono text-[9px] text-neo-text-disabled border border-neo-red/20 px-1.5 py-0.5 ml-2">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center font-mono text-xs text-neo-text-disabled">
              NO RESULTS FOUND
            </div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selectedIndex
                  ? 'bg-neo-red/10 text-neo-text-primary'
                  : 'text-neo-text-secondary hover:bg-neo-red/5'
              }`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => execute(item)}
            >
              <span
                className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 ${CATEGORY_STYLE[item.category]}`}
              >
                {item.category}
              </span>
              <span className="font-mono text-xs truncate">{item.label}</span>
              {i === selectedIndex && (
                <span className="ml-auto font-mono text-[9px] text-neo-text-disabled">
                  ENTER ↵
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-neo-red/20 px-4 py-2 flex items-center gap-4">
          <span className="font-mono text-[9px] text-neo-text-disabled">
            ↑↓ NAVIGATE
          </span>
          <span className="font-mono text-[9px] text-neo-text-disabled">
            ↵ SELECT
          </span>
          <span className="font-mono text-[9px] text-neo-text-disabled">
            ESC CLOSE
          </span>
        </div>
      </div>
    </div>
  );
}
