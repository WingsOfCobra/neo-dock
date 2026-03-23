/* ── FleetPage – Fleet server management ────────────────────── */

import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { Card } from '@/components/ui/Card';

interface FleetServer {
  id?: number | string;
  name: string;
  host: string;
  port?: number;
  status?: 'online' | 'offline' | 'unknown';
  lastSeen?: string;
}

interface FleetStatus {
  total: number;
  online: number;
  offline: number;
  unknown: number;
}

interface FleetRunResult {
  server: string;
  success: boolean;
  output?: string;
  error?: string;
}

export function FleetPage() {
  const [servers, setServers] = useState<FleetServer[]>([]);
  const [status, setStatus] = useState<FleetStatus | null>(null);
  const [command, setCommand] = useState('');
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [runResults, setRunResults] = useState<FleetRunResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFleet();
  }, []);

  async function loadFleet() {
    try {
      setError(null);
      const [serversData, statusData] = await Promise.all([
        get<FleetServer[]>('/chef/fleet/servers'),
        get<FleetStatus>('/chef/fleet/status'),
      ]);
      setServers(serversData);
      setStatus(statusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fleet data');
    }
  }

  async function handleRunCommand() {
    if (!command.trim() || selectedServers.length === 0) {
      setError('Please enter a command and select at least one server');
      return;
    }

    setLoading(true);
    setError(null);
    setRunResults([]);

    try {
      const result = await post<FleetRunResult[]>('/chef/fleet/run', {
        command: command.trim(),
        servers: selectedServers,
      });
      setRunResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run command');
    } finally {
      setLoading(false);
    }
  }

  function toggleServer(serverName: string) {
    setSelectedServers((prev) =>
      prev.includes(serverName) ? prev.filter((s) => s !== serverName) : [...prev, serverName],
    );
  }

  function selectAll() {
    setSelectedServers(servers.map((s) => s.name));
  }

  function deselectAll() {
    setSelectedServers([]);
  }

  const statusColor = (s: FleetServer['status']) => {
    switch (s) {
      case 'online':
        return 'text-neo-green';
      case 'offline':
        return 'text-neo-red';
      default:
        return 'text-neo-yellow';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl uppercase tracking-[0.2em] text-neo-cyan">
          ◈ Fleet Management
        </h1>
        <button
          onClick={loadFleet}
          className="px-3 py-1.5 text-xs font-mono border border-neo-cyan text-neo-cyan hover:bg-neo-cyan/10 transition-colors uppercase"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 border border-neo-red/50 bg-neo-red/5">
          <p className="text-xs font-mono text-neo-red">⚠ {error}</p>
        </div>
      )}

      {/* Fleet Status Overview */}
      {status && (
        <Card title="Fleet Status" glowColor="cyan">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-[10px] font-mono text-neo-text-secondary uppercase mb-1">Total</div>
              <div className="text-2xl font-mono text-neo-cyan">{status.total}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-neo-text-secondary uppercase mb-1">Online</div>
              <div className="text-2xl font-mono text-neo-green">{status.online}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-neo-text-secondary uppercase mb-1">Offline</div>
              <div className="text-2xl font-mono text-neo-red">{status.offline}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-neo-text-secondary uppercase mb-1">Unknown</div>
              <div className="text-2xl font-mono text-neo-yellow">{status.unknown}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Server List */}
      <Card title="Fleet Servers" glowColor="red">
        <div className="space-y-2">
          {servers.length === 0 ? (
            <p className="text-xs font-mono text-neo-text-secondary">No fleet servers configured</p>
          ) : (
            servers.map((server) => (
              <div
                key={server.id || server.name}
                className="flex items-center justify-between p-2 border border-neo-border hover:border-neo-cyan/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedServers.includes(server.name)}
                    onChange={() => toggleServer(server.name)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="text-xs font-mono text-neo-text-primary">{server.name}</div>
                    <div className="text-[10px] font-mono text-neo-text-secondary">
                      {server.host}
                      {server.port ? `:${server.port}` : ''}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-mono uppercase ${statusColor(server.status)}`}>
                  {server.status ?? 'unknown'}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Run Command */}
      <Card title="Run Command on Fleet" glowColor="yellow">
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-2 py-1 text-[10px] font-mono border border-neo-cyan/50 text-neo-cyan hover:bg-neo-cyan/10 transition-colors uppercase"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-2 py-1 text-[10px] font-mono border border-neo-cyan/50 text-neo-cyan hover:bg-neo-cyan/10 transition-colors uppercase"
            >
              Deselect All
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command (e.g., uptime, df -h, whoami)"
              className="flex-1 px-3 py-2 bg-neo-bg-elevated border border-neo-border text-neo-text-primary font-mono text-xs focus:outline-none focus:border-neo-cyan"
              onKeyDown={(e) => e.key === 'Enter' && handleRunCommand()}
              disabled={loading}
            />
            <button
              onClick={handleRunCommand}
              disabled={loading || selectedServers.length === 0 || !command.trim()}
              className="px-4 py-2 text-xs font-mono border border-neo-green text-neo-green hover:bg-neo-green/10 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⟳ Running...' : '▶ Execute'}
            </button>
          </div>

          {selectedServers.length > 0 && (
            <p className="text-[10px] font-mono text-neo-cyan">
              ◆ {selectedServers.length} server{selectedServers.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </Card>

      {/* Command Results */}
      {runResults.length > 0 && (
        <Card title="Command Results" glowColor="cyan">
          <div className="space-y-3">
            {runResults.map((result, idx) => (
              <div
                key={idx}
                className={`p-2 border ${
                  result.success ? 'border-neo-green/30 bg-neo-green/5' : 'border-neo-red/30 bg-neo-red/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-neo-text-primary">{result.server}</span>
                  <span
                    className={`text-[10px] font-mono uppercase ${
                      result.success ? 'text-neo-green' : 'text-neo-red'
                    }`}
                  >
                    {result.success ? '✓ Success' : '✕ Failed'}
                  </span>
                </div>
                <pre className="text-[10px] font-mono text-neo-text-secondary whitespace-pre-wrap break-all">
                  {result.output || result.error || 'No output'}
                </pre>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
