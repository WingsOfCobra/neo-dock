/* ── SettingsPanel – slide-out configuration panel ─────────── */

import { useEffect, useRef, useCallback } from 'react';
import {
  useSettingsStore,
  DEFAULT_REFRESH_RATES,
  REFRESH_RATE_RANGES,
} from '@/stores/settingsStore';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

/* ── Refresh rate source labels ───────────────────────────── */

const SOURCE_LABELS: Record<string, string> = {
  system: 'SYSTEM',
  docker: 'DOCKER',
  github: 'GITHUB',
  email: 'EMAIL',
  logs: 'LOGS',
  cron: 'CRON',
};

/* ── Toggle switch ────────────────────────────────────────── */

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="font-mono text-[11px] uppercase tracking-wider text-neo-text-primary group-hover:text-neo-red transition-colors">
        {label}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-10 h-5 border transition-colors
          ${checked
            ? 'bg-neo-red/20 border-neo-red/60'
            : 'bg-neo-bg-deep border-neo-border'
          }
        `}
        style={{
          clipPath: 'polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)',
        }}
      >
        <span
          className={`
            absolute top-0.5 w-4 h-3.5 transition-all
            ${checked
              ? 'left-[calc(100%-1.125rem)] bg-neo-red shadow-[0_0_8px_rgba(255,0,51,0.6)]'
              : 'left-0.5 bg-neo-text-disabled'
            }
          `}
        />
      </button>
    </label>
  );
}

/* ── Refresh rate slider row ──────────────────────────────── */

function RefreshRateRow({ source }: { source: string }) {
  const rate = useSettingsStore((s) => s.refreshRates[source]);
  const setRefreshRate = useSettingsStore((s) => s.setRefreshRate);
  const range = REFRESH_RATE_RANGES[source];
  const defaultRate = DEFAULT_REFRESH_RATES[source];
  const currentRate = rate ?? defaultRate;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-neo-text-primary">
          {SOURCE_LABELS[source]}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-neo-red tabular-nums">
            {currentRate}s
          </span>
          {rate !== null && rate !== undefined && (
            <button
              onClick={() => setRefreshRate(source, null)}
              className="font-mono text-[8px] text-neo-text-disabled hover:text-neo-red transition-colors"
              title="Reset to default"
            >
              [RST]
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[8px] text-neo-text-disabled tabular-nums w-6 text-right">
          {range.min}s
        </span>
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={1}
          value={currentRate}
          onChange={(e) => setRefreshRate(source, Number(e.target.value))}
          className="flex-1 h-1 appearance-none bg-neo-border cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-neo-red
            [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(255,0,51,0.6)]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-3
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:bg-neo-red
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:shadow-[0_0_6px_rgba(255,0,51,0.6)]
            [&::-moz-range-thumb]:cursor-pointer
          "
        />
        <span className="font-mono text-[8px] text-neo-text-disabled tabular-nums w-8">
          {range.max}s
        </span>
      </div>
      <div className="text-right">
        <span className="font-mono text-[8px] text-neo-text-disabled">
          DEFAULT: {defaultRate}s
        </span>
      </div>
    </div>
  );
}

/* ── Main panel ───────────────────────────────────────────── */

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const compactMode = useSettingsStore((s) => s.compactMode);
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);
  const setCompactMode = useSettingsStore((s) => s.setCompactMode);
  const setAnimationsEnabled = useSettingsStore((s) => s.setAnimationsEnabled);
  const resetAll = useSettingsStore((s) => s.resetAll);

  /* Close on click outside */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="absolute top-0 right-0 h-full w-80 max-w-[90vw] bg-neo-bg-surface border-l border-neo-red/30 shadow-[-4px_0_30px_rgba(255,0,51,0.1)] overflow-y-auto animate-slide-in-right"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-neo-bg-deep/95 backdrop-blur border-b border-neo-red/20 px-4 py-3 flex items-center gap-3">
          <span className="font-mono text-neo-red text-xs">&gt;_</span>
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-neo-red flex-1">
            SETTINGS
          </h2>
          <button
            onClick={onClose}
            className="font-mono text-[10px] text-neo-text-disabled hover:text-neo-red transition-colors"
          >
            [CLOSE]
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* ── Display section ─────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-neo-red/20" />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-neo-red/60">
                DISPLAY
              </span>
              <div className="h-px flex-1 bg-neo-red/20" />
            </div>

            <div className="space-y-4">
              <Toggle
                label="Compact Mode"
                checked={compactMode}
                onChange={setCompactMode}
              />
              <Toggle
                label="CRT / Animations"
                checked={animationsEnabled}
                onChange={setAnimationsEnabled}
              />
            </div>
          </section>

          {/* ── Refresh rates section ──────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-neo-red/20" />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-neo-red/60">
                REFRESH RATES
              </span>
              <div className="h-px flex-1 bg-neo-red/20" />
            </div>

            {/*
              NOTE: These refresh rate values are stored client-side only.
              A future enhancement will send a WebSocket message to the server
              to dynamically change poll intervals. For now, the UI displays
              the settings but they don't affect actual server-side polling.
            */}

            <div className="space-y-4">
              {Object.keys(SOURCE_LABELS).map((source) => (
                <RefreshRateRow key={source} source={source} />
              ))}
            </div>

            <p className="mt-3 font-mono text-[8px] text-neo-text-disabled leading-relaxed">
              * POLL INTERVAL OVERRIDES ARE STORED LOCALLY. SERVER-SIDE POLLING
              ADJUSTMENT VIA WEBSOCKET IS A PLANNED ENHANCEMENT.
            </p>
          </section>

          {/* ── Reset ──────────────────────────────────────── */}
          <section className="pt-2 border-t border-neo-red/10">
            <button
              onClick={resetAll}
              className="w-full py-2 font-mono text-[10px] uppercase tracking-wider text-neo-text-disabled hover:text-neo-red border border-neo-border hover:border-neo-red/40 transition-colors"
              style={{
                clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
              }}
            >
              [RESET ALL TO DEFAULTS]
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
