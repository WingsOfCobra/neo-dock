/* ── SettingsPage – dedicated settings page with all config options ── */

import { useState, useCallback } from 'react';
import {
  useSettingsStore,
  DEFAULT_REFRESH_RATES,
  REFRESH_RATE_RANGES,
} from '@/stores/settingsStore';
import { useThemeStore, type Theme } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';

/* ── Refresh rate source labels ───────────────────────────── */

const SOURCE_LABELS: Record<string, string> = {
  system: 'System Monitor',
  docker: 'Docker',
  github: 'GitHub',
  email: 'Email',
  logs: 'Logs',
  cron: 'Cron Jobs',
};

/* ── Toggle switch component ──────────────────────────────── */

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between cursor-pointer group py-2">
      <div className="flex-1">
        <div className="font-mono text-xs uppercase tracking-wider text-neo-text-primary group-hover:text-neo-red transition-colors">
          {label}
        </div>
        {description && (
          <div className="font-mono text-[10px] text-neo-text-disabled mt-1">
            {description}
          </div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-12 h-6 border transition-colors shrink-0
          ${checked
            ? 'bg-neo-red/20 border-neo-red/60'
            : 'bg-neo-bg-deep border-neo-border'
          }
        `}
      >
        <span
          className={`
            absolute top-0.5 w-5 h-4.5 transition-all
            ${checked
              ? 'left-[calc(100%-1.375rem)] bg-neo-red shadow-[0_0_8px_rgba(255,0,51,0.6)]'
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
    <div className="space-y-2 py-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-neo-text-primary">
          {SOURCE_LABELS[source]}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-neo-red tabular-nums">
            {currentRate}s
          </span>
          {rate !== null && rate !== undefined && (
            <button
              onClick={() => setRefreshRate(source, null)}
              className="px-1.5 py-0.5 font-mono text-[9px] text-neo-text-disabled hover:text-neo-red border border-neo-border hover:border-neo-red/40 transition-colors"
              title="Reset to default"
            >
              RESET
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[9px] text-neo-text-disabled tabular-nums w-8 text-right">
          {range.min}s
        </span>
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={1}
          value={currentRate}
          onChange={(e) => setRefreshRate(source, Number(e.target.value))}
          className="flex-1 h-1.5 appearance-none bg-neo-border cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-neo-red
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,0,51,0.6)]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:bg-neo-red
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(255,0,51,0.6)]
            [&::-moz-range-thumb]:cursor-pointer
          "
        />
        <span className="font-mono text-[9px] text-neo-text-disabled tabular-nums w-10">
          {range.max}s
        </span>
      </div>
      <div className="flex justify-between">
        <span className="font-mono text-[9px] text-neo-text-disabled">
          Default: {defaultRate}s
        </span>
        <span className="font-mono text-[9px] text-neo-text-disabled">
          Range: {range.min}s - {range.max}s
        </span>
      </div>
    </div>
  );
}

/* ── Theme selector ───────────────────────────────────────── */

function ThemeSelector() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const themes: Array<{ value: Theme; label: string; color: string }> = [
    { value: 'red', label: 'Red (Default)', color: '#FF0033' },
    { value: 'blue', label: 'Blue', color: '#0088FF' },
    { value: 'green', label: 'Green', color: '#00FF33' },
    { value: 'amber', label: 'Amber', color: '#FFAA00' },
  ];

  return (
    <div className="space-y-2">
      <label className="font-mono text-xs uppercase tracking-wider text-neo-text-primary">
        Theme Color
      </label>
      <div className="grid grid-cols-2 gap-2">
        {themes.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`
              px-3 py-2 font-mono text-xs border transition-colors flex items-center gap-2
              ${theme === t.value
                ? 'border-neo-red bg-neo-red/10 text-neo-red'
                : 'border-neo-border text-neo-text-secondary hover:border-neo-red/40'
              }
            `}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── API Configuration ────────────────────────────────────── */

function ApiConfiguration() {
  const logout = useAuthStore((s) => s.logout);
  const [showKey, setShowKey] = useState(false);
  const [apiUrl] = useState(() => {
    return window.location.origin + '/api';
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-mono text-xs uppercase tracking-wider text-neo-text-primary">
          API Endpoint
        </label>
        <div className="px-3 py-2 bg-neo-bg-deep border border-neo-border font-mono text-xs text-neo-text-secondary">
          {apiUrl}
        </div>
        <p className="font-mono text-[9px] text-neo-text-disabled">
          API endpoint is configured automatically. For custom configurations, see environment variables.
        </p>
      </div>

      <div className="space-y-2">
        <label className="font-mono text-xs uppercase tracking-wider text-neo-text-primary">
          API Key
        </label>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 bg-neo-bg-deep border border-neo-border font-mono text-xs text-neo-text-secondary">
            {showKey ? '••••••••••••••••' : '••••••••••••••••'}
          </div>
          <button
            onClick={() => setShowKey(!showKey)}
            className="px-3 py-2 font-mono text-[10px] uppercase border border-neo-border text-neo-text-secondary hover:text-neo-red hover:border-neo-red/40 transition-colors"
          >
            {showKey ? 'HIDE' : 'SHOW'}
          </button>
        </div>
        <p className="font-mono text-[9px] text-neo-text-disabled">
          API key is stored securely in HTTP-only cookies. To change your key, log out and log in again.
        </p>
      </div>

      <button
        onClick={logout}
        className="w-full py-2 font-mono text-xs uppercase tracking-wider text-neo-text-secondary hover:text-neo-red border border-neo-border hover:border-neo-red/40 transition-colors"
      >
        LOGOUT
      </button>
    </div>
  );
}

/* ── Main page component ──────────────────────────────────── */

export function SettingsPage() {
  const compactMode = useSettingsStore((s) => s.compactMode);
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);
  const setCompactMode = useSettingsStore((s) => s.setCompactMode);
  const setAnimationsEnabled = useSettingsStore((s) => s.setAnimationsEnabled);
  const resetAll = useSettingsStore((s) => s.resetAll);

  const handleResetAll = useCallback(() => {
    if (confirm('Reset all settings to defaults?')) {
      resetAll();
    }
  }, [resetAll]);

  return (
    <div className="p-3 space-y-3 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-neo-red text-sm">&gt;_</span>
        <h1 className="font-display text-sm uppercase tracking-[0.2em] text-neo-red">
          SYSTEM CONFIGURATION
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Display Settings */}
        <Card title="Display Settings">
          <div className="space-y-1 divide-y divide-neo-border/30">
            <Toggle
              label="Compact Mode"
              description="Reduce padding and spacing globally"
              checked={compactMode}
              onChange={setCompactMode}
            />
            <Toggle
              label="Animations & Effects"
              description="CRT scanlines, glitch effects, and transitions"
              checked={animationsEnabled}
              onChange={setAnimationsEnabled}
            />
          </div>
        </Card>

        {/* Theme Settings */}
        <Card title="Theme">
          <ThemeSelector />
        </Card>

        {/* API Configuration */}
        <Card title="API Configuration">
          <ApiConfiguration />
        </Card>

        {/* Refresh Rates */}
        <Card title="Refresh Rates">
          <div className="space-y-1 divide-y divide-neo-border/30">
            {Object.keys(SOURCE_LABELS).map((source) => (
              <RefreshRateRow key={source} source={source} />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-neo-border/30">
            <p className="font-mono text-[9px] text-neo-text-disabled leading-relaxed">
              Note: Poll interval overrides are stored locally. Server-side polling
              adjustment via WebSocket is a planned enhancement.
            </p>
          </div>
        </Card>
      </div>

      {/* Reset Section */}
      <Card title="Reset Settings">
        <div className="space-y-3">
          <p className="font-mono text-xs text-neo-text-secondary">
            Reset all settings to their default values. This cannot be undone.
          </p>
          <button
            onClick={handleResetAll}
            className="w-full py-2.5 font-mono text-xs uppercase tracking-wider text-neo-text-disabled hover:text-neo-red border border-neo-border hover:border-neo-red/40 transition-colors"
          >
            [RESET ALL SETTINGS TO DEFAULTS]
          </button>
        </div>
      </Card>
    </div>
  );
}
