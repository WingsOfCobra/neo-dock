/* ── useKeyboardShortcuts – vim-style g+x navigation ─────── */

import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const NAV_MAP: Record<string, string> = {
  d: '/',
  s: '/system',
  k: '/docker',
  c: '/comms',
  t: '/tasks',
  l: '/logs',
};

const SEQUENCE_TIMEOUT = 1000;

interface Options {
  onToggleHelp: () => void;
  onTogglePalette: () => void;
}

export function useKeyboardShortcuts({ onToggleHelp, onTogglePalette }: Options) {
  const navigate = useNavigate();
  const pendingG = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    pendingG.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // Ctrl+K / Cmd+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onTogglePalette();
        return;
      }

      // Escape → close overlays (handled by palette/help themselves, but also here)
      if (e.key === 'Escape') {
        clearPending();
        return;
      }

      // ? → help overlay
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      // g+x sequences
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!pendingG.current) {
          pendingG.current = true;
          timerRef.current = setTimeout(clearPending, SEQUENCE_TIMEOUT);
          return;
        }
      }

      if (pendingG.current) {
        const path = NAV_MAP[e.key];
        if (path) {
          e.preventDefault();
          navigate(path);
        }
        clearPending();
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      clearPending();
    };
  }, [navigate, onToggleHelp, onTogglePalette, clearPending]);
}
