import { create } from 'zustand';
import { post, get, ApiError } from '@/lib/api';

interface AuthState {
  authenticated: boolean;
  checking: boolean;
  error: string | null;
  login: (key: string) => Promise<boolean>;
  checkAuth: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  authenticated: false,
  checking: true,
  error: null,

  login: async (key: string) => {
    set({ error: null });
    try {
      await post('/auth/verify', { key });
      set({ authenticated: true, error: null });
      return true;
    } catch (err) {
      const message =
        err instanceof ApiError ? 'Invalid API key' : 'Connection failed';
      set({ error: message });
      return false;
    }
  },

  checkAuth: async () => {
    set({ checking: true });
    try {
      await get('/auth/check');
      set({ authenticated: true, checking: false });
    } catch {
      set({ authenticated: false, checking: false });
    }
  },

  logout: () => {
    set({ authenticated: false, error: null });
    // Clear the auth cookie by calling logout endpoint
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(
      () => {},
    );
  },
}));
