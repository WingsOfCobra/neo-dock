/* ── ShortcutsHelp – keyboard shortcuts overlay ──────────── */

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: 'Ctrl+K', desc: 'Open command palette' },
  { keys: 'g → d', desc: 'Go to Dashboard' },
  { keys: 'g → s', desc: 'Go to System' },
  { keys: 'g → k', desc: 'Go to Docker' },
  { keys: 'g → c', desc: 'Go to Comms' },
  { keys: 'g → t', desc: 'Go to Tasks' },
  { keys: 'g → l', desc: 'Go to Logs' },
  { keys: '?', desc: 'Show this help' },
  { keys: 'Esc', desc: 'Close overlay' },
];

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-neo-bg-surface border border-neo-red/40 shadow-[0_0_40px_rgba(255,0,51,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-neo-red/20 px-4 py-3 flex items-center justify-between">
          <span className="font-display text-xs uppercase tracking-[0.15em] text-neo-red">
            Keyboard Shortcuts
          </span>
          <button
            onClick={onClose}
            className="font-mono text-[9px] text-neo-text-disabled border border-neo-red/20 px-1.5 py-0.5 hover:text-neo-red hover:border-neo-red/40 transition-colors"
          >
            ESC
          </button>
        </div>

        <div className="p-4 space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-1">
              <span className="font-mono text-xs text-neo-text-secondary">{s.desc}</span>
              <kbd className="font-mono text-[10px] text-neo-red/80 bg-neo-red/10 border border-neo-red/20 px-2 py-0.5 min-w-[60px] text-center">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
