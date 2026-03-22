import { create } from 'zustand';

export type Theme = 'red' | 'blue' | 'green' | 'amber';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

function applyTheme(theme: Theme) {
  if (theme === 'red') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function loadPersistedTheme(): Theme {
  try {
    const stored = localStorage.getItem('neo-dock-theme');
    if (stored === 'blue' || stored === 'green' || stored === 'amber' || stored === 'red') {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return 'red';
}

const initialTheme = loadPersistedTheme();
applyTheme(initialTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  setTheme: (t: Theme) => {
    applyTheme(t);
    try {
      localStorage.setItem('neo-dock-theme', t);
    } catch {
      // localStorage unavailable
    }
    set({ theme: t });
  },
}));

/** Color mappings for Three.js scenes per theme */
export const themeColors: Record<Theme, {
  primary: string;
  primaryDim: string;
  accent: string;
  bgDeep: string;
}> = {
  red: { primary: '#FF0033', primaryDim: '#990020', accent: '#FF4444', bgDeep: '#0A0000' },
  blue: { primary: '#0088FF', primaryDim: '#004488', accent: '#44AAFF', bgDeep: '#000A14' },
  green: { primary: '#00FF33', primaryDim: '#009920', accent: '#44FF44', bgDeep: '#000A00' },
  amber: { primary: '#FFAA00', primaryDim: '#996600', accent: '#FFCC44', bgDeep: '#0A0800' },
};
