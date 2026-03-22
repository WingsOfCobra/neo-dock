/* ── soundStore – persist sound preferences ────────────────── */

import { create } from 'zustand';

const STORAGE_KEY = 'neo-dock-sound';

interface SoundState {
  soundEnabled: boolean;
  volume: number;
  toggleSound: () => void;
  setVolume: (v: number) => void;
}

function loadPersistedState(): { soundEnabled: boolean; volume: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SoundState>;
      return {
        soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : false,
        volume: typeof parsed.volume === 'number' ? parsed.volume : 0.3,
      };
    }
  } catch {
    // ignore
  }
  return { soundEnabled: false, volume: 0.3 };
}

function persist(state: { soundEnabled: boolean; volume: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const useSoundStore = create<SoundState>((set, get) => ({
  ...loadPersistedState(),

  toggleSound: () => {
    const next = !get().soundEnabled;
    set({ soundEnabled: next });
    persist({ soundEnabled: next, volume: get().volume });
  },

  setVolume: (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    set({ volume: clamped });
    persist({ soundEnabled: get().soundEnabled, volume: clamped });
  },
}));
