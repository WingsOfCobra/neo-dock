/* ── ServerSelector – dropdown for switching between chef-api servers ── */

import { useServerStore } from '@/stores/serverStore';

export function ServerSelector() {
  const servers = useServerStore((s) => s.servers);
  const activeServer = useServerStore((s) => s.activeServer);
  const setActiveServer = useServerStore((s) => s.setActiveServer);

  // Only show when multiple servers are configured
  if (servers.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-mono text-neo-text-disabled uppercase hidden sm:inline">
        HOST:
      </span>
      <select
        value={activeServer}
        onChange={(e) => setActiveServer(e.target.value)}
        className="bg-neo-bg-deep border border-neo-red/30 text-neo-red text-[10px] font-mono uppercase px-1.5 py-0.5 focus:outline-none focus:border-neo-red/60 hover:border-neo-red/50 transition-colors appearance-none cursor-pointer"
        style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
      >
        {servers.map((name) => (
          <option key={name} value={name} className="bg-neo-bg-deep text-neo-red">
            {name.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
