/* ── Zustand settings store with localStorage persistence ──── */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ── Default refresh rates (seconds) per data source ──────── */

export const DEFAULT_REFRESH_RATES: Record<string, number> = {
  system: 5,
  docker: 10,
  github: 60,
  email: 60,
  logs: 2,
  cron: 30,
};

export const REFRESH_RATE_RANGES: Record<string, { min: number; max: number }> = {
  system: { min: 2, max: 30 },
  docker: { min: 5, max: 60 },
  github: { min: 30, max: 300 },
  email: { min: 30, max: 300 },
  logs: { min: 2, max: 30 },
  cron: { min: 10, max: 120 },
};

export interface WidgetSettings {
  /** Per-widget refresh rate overrides (in seconds, null = use default) */
  refreshRates: Record<string, number | null>;
  /** Per-widget display mode */
  displayModes: Record<string, string>;
  /** Reduces padding/spacing globally */
  compactMode: boolean;
  /** Toggle CRT effects, glitch, animations, etc */
  animationsEnabled: boolean;
}

interface SettingsActions {
  setRefreshRate: (source: string, rate: number | null) => void;
  setDisplayMode: (widgetId: string, mode: string) => void;
  setCompactMode: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  resetAll: () => void;
}

const DEFAULT_STATE: WidgetSettings = {
  refreshRates: {},
  displayModes: {},
  compactMode: false,
  animationsEnabled: true,
};

export const useSettingsStore = create<WidgetSettings & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setRefreshRate: (source, rate) =>
        set((s) => ({
          refreshRates: { ...s.refreshRates, [source]: rate },
        })),

      setDisplayMode: (widgetId, mode) =>
        set((s) => ({
          displayModes: { ...s.displayModes, [widgetId]: mode },
        })),

      setCompactMode: (enabled) => set({ compactMode: enabled }),

      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),

      resetAll: () => set(DEFAULT_STATE),
    }),
    {
      name: 'neo-dock-settings',
    },
  ),
);
