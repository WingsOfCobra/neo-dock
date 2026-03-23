/* ── CommandPalette – Ctrl+K quick-action overlay with fuzzy search ─── */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMetricsStore } from '@/stores/metricsStore';
import { useSound } from '@/hooks/useSound';
import { post } from '@/lib/api';

/* ── Types ─────────────────────────────────────────────────── */

type Category = 'NAV' | 'CONTAINER' | 'REPO' | 'DOCKER' | 'GITHUB';

interface CommandItem {
  id: string;
  label: string;
  category: Category;
  action: () => void | Promise<void>;
  keywords?: string[]; // Additional search keywords for fuzzy matching
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/* ── Category chip colors ──────────────────────────────────── */

const CATEGORY_STYLE: Record<Category, string> = {
  NAV: 'bg-neo-red/20 text-neo-red',
  CONTAINER: 'bg-cyan-900/40 text-cyan-400',
  DOCKER: 'bg-cyan-900/40 text-cyan-400',
  REPO: 'bg-purple-900/40 text-purple-400',
  GITHUB: 'bg-purple-900/40 text-purple-400',
};

const MAX_RESULTS = 10;

/* ── Fuzzy match helper ────────────────────────────────────── */

/**
 * Simple fuzzy/substring matching.
 * Returns a score (higher is better) if query matches, or 0 if no match.
 */
function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  
  // Exact match gets highest score
  if (t === q) return 1000;
  
  // Starts with query gets high score
  if (t.startsWith(q)) return 500;
  
  // Contains query gets medium score
  if (t.includes(q)) return 100;
  
  // Fuzzy match: all characters in query appear in order in target
  let targetIndex = 0;
  for (let i = 0; i < q.length; i++) {
    const charIndex = t.indexOf(q[i], targetIndex);
    if (charIndex === -1) return 0; // No match
    targetIndex = charIndex + 1;
  }
  
  // Fuzzy match found
  return 50;
}

/**
 * Score a command item against the query.
 * Returns combined score from label and keywords.
 */
function scoreCommand(item: CommandItem, query: string): number {
  if (!query.trim()) return 1; // All items have equal score when no query
  
  let maxScore = fuzzyMatch(query, item.label);
  
  // Also check keywords
  if (item.keywords) {
    for (const keyword of item.keywords) {
      const score = fuzzyMatch(query, keyword);
      if (score > maxScore) maxScore = score;
    }
  }
  
  // Also check category
  const catScore = fuzzyMatch(query, item.category);
  if (catScore > maxScore) maxScore = catScore;
  
  return maxScore;
}

/* ── Component ─────────────────────────────────────────────── */

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const containers = useMetricsStore((s) => s.containers);
  const repos = useMetricsStore((s) => s.githubRepos);

  const { playSound } = useSound();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Build full command list */
  const commands = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      { id: 'nav-dashboard', label: 'Dashboard', category: 'NAV', action: () => navigate('/'), keywords: ['home', 'overview'] },
      { id: 'nav-system', label: 'System', category: 'NAV', action: () => navigate('/system'), keywords: ['cpu', 'memory', 'disk', 'monitor'] },
      { id: 'nav-docker', label: 'Docker', category: 'NAV', action: () => navigate('/docker'), keywords: ['containers', 'images'] },
      { id: 'nav-comms', label: 'Comms', category: 'NAV', action: () => navigate('/comms'), keywords: ['github', 'email', 'communication'] },
      { id: 'nav-tasks', label: 'Tasks', category: 'NAV', action: () => navigate('/tasks'), keywords: ['todo', 'cron', 'jobs'] },
      { id: 'nav-logs', label: 'Logs', category: 'NAV', action: () => navigate('/logs'), keywords: ['loki', 'viewer'] },
      { id: 'nav-settings', label: 'Settings', category: 'NAV', action: () => navigate('/settings'), keywords: ['config', 'preferences', 'options'] },
    ];

    const containerItems: CommandItem[] = [];
    const safeContainers = Array.isArray(containers) ? containers : [];
    
    for (const c of safeContainers) {
      const name = typeof c === 'object' && c !== null
        ? String((c as Record<string, unknown>)['name'] ?? (c as Record<string, unknown>)['Names'] ?? '')
        : '';
      const cleanName = name.replace(/^\//, '');
      const id = (c as Record<string, unknown>)['id'] as string | undefined;
      
      if (!cleanName || !id) continue;

      // Navigate to container detail
      containerItems.push({
        id: `container-view-${cleanName}`,
        label: `View: ${cleanName}`,
        category: 'CONTAINER' as const,
        action: () => navigate('/docker'),
        keywords: ['container', 'view', cleanName],
      });

      // Stop container
      containerItems.push({
        id: `container-stop-${cleanName}`,
        label: `Stop: ${cleanName}`,
        category: 'DOCKER' as const,
        action: async () => {
          setActionLoading(true);
          try {
            await post(`/chef/docker/containers/${id}/stop`);
            playSound('confirm');
          } catch {
            playSound('error');
          } finally {
            setActionLoading(false);
          }
        },
        keywords: ['docker', 'stop', 'container', cleanName],
      });

      // Restart container
      containerItems.push({
        id: `container-restart-${cleanName}`,
        label: `Restart: ${cleanName}`,
        category: 'DOCKER' as const,
        action: async () => {
          setActionLoading(true);
          try {
            await post(`/chef/docker/containers/${id}/restart`);
            playSound('confirm');
          } catch {
            playSound('error');
          } finally {
            setActionLoading(false);
          }
        },
        keywords: ['docker', 'restart', 'reboot', 'container', cleanName],
      });

      // View logs
      containerItems.push({
        id: `container-logs-${cleanName}`,
        label: `Logs: ${cleanName}`,
        category: 'DOCKER' as const,
        action: () => {
          navigate('/docker');
          // Note: The actual log viewer expansion would need to be implemented
          // in the DockerContainers component via URL params or state
        },
        keywords: ['docker', 'logs', 'container', cleanName],
      });
    }

    const repoItems: CommandItem[] = [];
    const safeRepos = Array.isArray(repos) ? repos : [];
    
    for (const r of safeRepos) {
      const fullName = typeof r === 'object' && r !== null
        ? String((r as Record<string, unknown>)['full_name'] ?? (r as Record<string, unknown>)['name'] ?? '')
        : '';
      const name = typeof r === 'object' && r !== null
        ? String((r as Record<string, unknown>)['name'] ?? '')
        : '';
      
      if (!fullName || !name) continue;

      const parts = fullName.split('/');
      if (parts.length !== 2) continue;
      
      const [owner, repo] = parts;

      // Open repo detail
      repoItems.push({
        id: `repo-open-${fullName}`,
        label: `Open: ${fullName}`,
        category: 'REPO' as const,
        action: () => navigate(`/repo/${owner}/${repo}`),
        keywords: ['github', 'repo', 'repository', 'open', name, fullName],
      });

      // View pulls
      repoItems.push({
        id: `repo-pulls-${fullName}`,
        label: `PRs: ${fullName}`,
        category: 'GITHUB' as const,
        action: () => navigate(`/repo/${owner}/${repo}`),
        keywords: ['github', 'pull', 'pr', 'pulls', 'requests', name, fullName],
      });

      // View runs
      repoItems.push({
        id: `repo-runs-${fullName}`,
        label: `Runs: ${fullName}`,
        category: 'GITHUB' as const,
        action: () => navigate(`/repo/${owner}/${repo}`),
        keywords: ['github', 'ci', 'cd', 'runs', 'workflow', 'actions', name, fullName],
      });
    }

    return [...nav, ...containerItems, ...repoItems];
  }, [containers, repos, navigate, playSound]);

  /* Filter and sort by fuzzy match score */
  const filtered = useMemo(() => {
    const q = query.trim();
    
    if (!q) {
      // No query: show navigation first, then recent containers/repos
      return commands.slice(0, MAX_RESULTS);
    }

    // Score and filter
    const scored = commands
      .map((cmd) => ({ cmd, score: scoreCommand(cmd, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map(({ cmd }) => cmd);

    return scored;
  }, [commands, query]);

  /* Reset on open/close */
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setActionLoading(false);
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
    async (item: CommandItem) => {
      if (actionLoading) return;
      
      playSound('navigate');
      
      const result = item.action();
      
      // If action returns a promise, wait for it
      if (result instanceof Promise) {
        await result;
      }
      
      // Close palette after action completes
      onClose();
    },
    [onClose, playSound, actionLoading],
  );

  /* Keyboard navigation */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (actionLoading) return;
      
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
    [filtered, selectedIndex, execute, onClose, actionLoading],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-neo-bg-surface border border-neo-red/40 shadow-[0_0_40px_rgba(255,0,51,0.15)]"
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
            placeholder="Type a command or search..."
            disabled={actionLoading}
            className="flex-1 bg-transparent font-mono text-sm text-neo-text-primary placeholder:text-neo-text-disabled outline-none disabled:opacity-50"
          />
          <kbd className="font-mono text-[9px] text-neo-text-disabled border border-neo-red/20 px-1.5 py-0.5 ml-2">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto">
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
              } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onMouseEnter={() => !actionLoading && setSelectedIndex(i)}
              onClick={() => !actionLoading && execute(item)}
              disabled={actionLoading}
            >
              <span
                className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 ${CATEGORY_STYLE[item.category]}`}
              >
                {item.category}
              </span>
              <span className="font-mono text-xs truncate flex-1">{item.label}</span>
              {i === selectedIndex && !actionLoading && (
                <span className="ml-auto font-mono text-[9px] text-neo-text-disabled">
                  ENTER ↵
                </span>
              )}
              {actionLoading && i === selectedIndex && (
                <span className="ml-auto font-mono text-[9px] text-neo-text-disabled animate-pulse">
                  ...
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
          {filtered.length > 0 && (
            <span className="ml-auto font-mono text-[9px] text-neo-text-disabled">
              {filtered.length} {filtered.length === MAX_RESULTS ? 'of many' : 'results'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
