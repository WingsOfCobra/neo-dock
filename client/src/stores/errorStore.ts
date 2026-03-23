/* ── Zustand error store for global toast notifications ────── */

import { create } from 'zustand';

export interface ErrorToastData {
  id: string;
  service: string;
  message: string;
  timestamp: number;
}

interface ErrorState {
  errors: ErrorToastData[];
  addError: (service: string, message: string) => void;
  dismissError: (id: string) => void;
  clearErrors: () => void;
  apiUnreachable: boolean;
  setApiUnreachable: (unreachable: boolean) => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  errors: [],
  apiUnreachable: false,

  addError: (service: string, message: string) => {
    const error: ErrorToastData = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      service,
      message,
      timestamp: Date.now(),
    };

    set((state) => ({
      errors: [...state.errors, error],
    }));
  },

  dismissError: (id: string) => {
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== id),
    }));
  },

  clearErrors: () => {
    set({ errors: [] });
  },

  setApiUnreachable: (unreachable: boolean) => {
    set({ apiUnreachable: unreachable });
  },
}));
