/* ── ExportButton – dropdown for JSON/CSV export ─────────── */

import { useState, useRef, useEffect, useCallback } from 'react';
import { exportJSON, exportCSV, makeFilename } from '@/lib/export';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
}

export function ExportButton({ data, filename }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleExport = useCallback(
    (format: 'json' | 'csv') => {
      setOpen(false);
      if (data.length === 0) return;
      const fname = makeFilename(filename, format);
      if (format === 'json') {
        exportJSON(data, fname);
      } else {
        exportCSV(data, fname);
      }
    },
    [data, filename],
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-1.5 py-0.5 text-[8px] font-mono uppercase border border-neo-border text-neo-text-disabled hover:text-neo-red hover:border-neo-red/40 transition-colors tracking-wider"
        title="Export data"
      >
        EXP
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 border border-neo-red/40 bg-neo-bg-deep shadow-lg shadow-neo-red/10">
          <button
            onClick={() => handleExport('json')}
            className="block w-full px-3 py-1.5 text-[10px] font-mono text-neo-text-secondary hover:text-neo-red hover:bg-neo-red/5 text-left transition-colors whitespace-nowrap"
          >
            JSON
          </button>
          <div className="h-px bg-neo-border/50" />
          <button
            onClick={() => handleExport('csv')}
            className="block w-full px-3 py-1.5 text-[10px] font-mono text-neo-text-secondary hover:text-neo-red hover:bg-neo-red/5 text-left transition-colors whitespace-nowrap"
          >
            CSV
          </button>
        </div>
      )}
    </div>
  );
}
