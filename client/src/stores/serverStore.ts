import { create } from 'zustand';

interface ServerState {
  /** List of available server names, fetched from /api/servers */
  servers: string[];
  /** Currently selected server name */
  activeServer: string;
  /** Whether the server list has been fetched */
  loaded: boolean;
  /** Fetch server list from the API */
  fetchServers: () => Promise<void>;
  /** Switch to a different server */
  setActiveServer: (name: string) => void;
}

export const useServerStore = create<ServerState>((set) => ({
  servers: [],
  activeServer: '',
  loaded: false,

  fetchServers: async () => {
    try {
      const resp = await fetch('/api/servers', { credentials: 'include' });
      if (!resp.ok) return;
      const data = await resp.json() as { servers: string[]; default: string };
      set({
        servers: data.servers,
        activeServer: data.default,
        loaded: true,
      });
    } catch {
      // If fetch fails, stay in single-server mode
    }
  },

  setActiveServer: (name: string) => {
    set({ activeServer: name });
  },
}));
