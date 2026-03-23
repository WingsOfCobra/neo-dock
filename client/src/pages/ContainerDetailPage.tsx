/* ── ContainerDetailPage – detailed view for a single container ── */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { get } from '@/lib/api';

interface ContainerInspect {
  Id: string;
  Name: string;
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    StartedAt: string;
    FinishedAt: string;
  };
  Config: {
    Image: string;
    Env: string[];
    Labels: Record<string, string>;
  };
  NetworkSettings: {
    Networks: Record<string, {
      IPAddress: string;
      Gateway: string;
      MacAddress: string;
      NetworkID: string;
    }>;
    Ports: Record<string, Array<{ HostIp: string; HostPort: string }> | null>;
  };
  Mounts: Array<{
    Type: string;
    Source: string;
    Destination: string;
    Mode: string;
    RW: boolean;
  }>;
}

interface ContainerLogs {
  id: string;
  lines: number;
  logs: string;
}

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr || dateStr === '0001-01-01T00:00:00Z') return '--';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const stateBadge: Record<string, string> = {
  running: 'bg-neo-red/20 text-neo-red border-neo-red/40',
  exited: 'bg-neo-text-disabled/20 text-neo-text-disabled border-neo-text-disabled/40',
  stopped: 'bg-neo-text-disabled/20 text-neo-text-disabled border-neo-text-disabled/40',
  paused: 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40',
  created: 'bg-neo-text-disabled/20 text-neo-text-secondary border-neo-border',
};

const defaultBadge = 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40';

export function ContainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ContainerInspect | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLogsLoading(true);
    setError(null);

    Promise.allSettled([
      get<ContainerInspect>(`/chef/docker/containers/${id}/inspect`).then(setDetail),
      get<ContainerLogs>(`/chef/docker/containers/${id}/logs?lines=50`).then((data) => setLogs(data.logs)),
    ])
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load container details');
        setLoading(false);
      })
      .finally(() => setLogsLoading(false));
  }, [id]);

  if (error) {
    return (
      <div className="p-3">
        <p className="text-neo-red font-mono text-sm">[!] {error}</p>
        <button onClick={() => navigate('/docker')} className="mt-2 text-[10px] font-mono text-neo-text-disabled hover:text-neo-red">
          ← BACK TO DOCKER
        </button>
      </div>
    );
  }

  const badge = stateBadge[detail?.State?.Status ?? ''] ?? defaultBadge;
  const networks = detail?.NetworkSettings?.Networks ?? {};
  const ports = detail?.NetworkSettings?.Ports ?? {};
  const mounts = detail?.Mounts ?? [];
  const env = detail?.Config?.Env ?? [];

  return (
    <div className="p-3 space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/docker')}
          className="text-[10px] font-mono text-neo-text-disabled hover:text-neo-red transition-colors"
        >
          ← DOCKER
        </button>
        <span className="text-neo-text-disabled font-mono text-[10px]">/</span>
        <span className="font-mono text-sm text-neo-text-primary">{detail?.Name?.replace(/^\//, '') ?? id}</span>
        {detail?.State && (
          <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 border ${badge}`}>
            {detail.State.Status}
          </span>
        )}
      </div>

      <div className="font-mono text-[10px] text-neo-red/40 px-1">
        &gt; CONTAINER_DETAIL // {id?.slice(0, 12)}
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Status */}
        <Card title="Status" loading={loading}>
          {detail && (
            <div className="space-y-2 font-mono text-[11px]">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-neo-text-disabled">Image</span>
                <span className="text-neo-text-primary truncate">{detail.Config?.Image ?? 'n/a'}</span>
                <span className="text-neo-text-disabled">Running</span>
                <span className="text-neo-text-primary">{detail.State?.Running ? 'Yes' : 'No'}</span>
                <span className="text-neo-text-disabled">Paused</span>
                <span className="text-neo-text-primary">{detail.State?.Paused ? 'Yes' : 'No'}</span>
                <span className="text-neo-text-disabled">Restarting</span>
                <span className="text-neo-text-primary">{detail.State?.Restarting ? 'Yes' : 'No'}</span>
                <span className="text-neo-text-disabled">Started</span>
                <span className="text-neo-text-primary">{timeAgo(detail.State?.StartedAt)}</span>
                {detail.State?.FinishedAt && detail.State.FinishedAt !== '0001-01-01T00:00:00Z' && (
                  <>
                    <span className="text-neo-text-disabled">Finished</span>
                    <span className="text-neo-text-primary">{timeAgo(detail.State.FinishedAt)}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Networks */}
        <Card title="Networks" loading={loading}>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(networks).map(([name, net]) => (
              <div key={name} className="px-2 py-2 border border-neo-border/50 bg-neo-bg-deep/40 font-mono text-[10px]">
                <div className="text-neo-red mb-1 uppercase">{name}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-neo-text-secondary">
                  <span className="text-neo-text-disabled">IP Address</span>
                  <span>{net.IPAddress || 'n/a'}</span>
                  <span className="text-neo-text-disabled">Gateway</span>
                  <span>{net.Gateway || 'n/a'}</span>
                  <span className="text-neo-text-disabled">MAC Address</span>
                  <span>{net.MacAddress || 'n/a'}</span>
                </div>
              </div>
            ))}
            {Object.keys(networks).length === 0 && !loading && (
              <p className="text-[10px] font-mono text-neo-text-disabled px-2">No networks configured</p>
            )}
          </div>
        </Card>

        {/* Ports */}
        <Card title="Ports">
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {Object.entries(ports).map(([containerPort, hostBindings]) => (
              <div key={containerPort} className="flex items-center gap-2 px-2 py-1 font-mono text-[11px] hover:bg-neo-red/[0.03]">
                <span className="text-neo-red">{containerPort}</span>
                <span className="text-neo-text-disabled">→</span>
                {hostBindings && hostBindings.length > 0 ? (
                  <span className="text-neo-text-primary">
                    {hostBindings.map((b) => `${b.HostIp}:${b.HostPort}`).join(', ')}
                  </span>
                ) : (
                  <span className="text-neo-text-disabled">not published</span>
                )}
              </div>
            ))}
            {Object.keys(ports).length === 0 && !loading && (
              <p className="text-[10px] font-mono text-neo-text-disabled px-2">No ports exposed</p>
            )}
          </div>
        </Card>

        {/* Volumes */}
        <Card title="Volumes">
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {mounts.map((m, i) => (
              <div key={i} className="px-2 py-1.5 border border-neo-border/50 bg-neo-bg-deep/40 font-mono text-[10px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-neo-red uppercase">{m.Type}</span>
                  {m.RW ? (
                    <span className="text-neo-yellow text-[9px]">RW</span>
                  ) : (
                    <span className="text-neo-text-disabled text-[9px]">RO</span>
                  )}
                </div>
                <div className="text-neo-text-secondary space-y-0.5">
                  <div className="truncate">
                    <span className="text-neo-text-disabled">Source:</span> {m.Source}
                  </div>
                  <div className="truncate">
                    <span className="text-neo-text-disabled">Dest:</span> {m.Destination}
                  </div>
                </div>
              </div>
            ))}
            {mounts.length === 0 && !loading && (
              <p className="text-[10px] font-mono text-neo-text-disabled px-2">No volumes mounted</p>
            )}
          </div>
        </Card>

        {/* Environment Variables */}
        <Card title="Environment Variables" className="lg:col-span-2">
          <div className="space-y-0.5 max-h-64 overflow-y-auto font-mono text-[10px]">
            {env.map((e, i) => {
              const [key, ...valueParts] = e.split('=');
              const value = valueParts.join('=');
              return (
                <div key={i} className="flex items-start gap-2 px-2 py-1 hover:bg-neo-red/[0.03]">
                  <span className="text-neo-red shrink-0">{key}</span>
                  <span className="text-neo-text-disabled">=</span>
                  <span className="text-neo-text-secondary truncate">***</span>
                </div>
              );
            })}
            {env.length === 0 && !loading && (
              <p className="text-[10px] font-mono text-neo-text-disabled px-2">No environment variables</p>
            )}
          </div>
        </Card>

        {/* Logs */}
        <Card title="Recent Logs (Last 50 Lines)" className="lg:col-span-2" loading={logsLoading}>
          <div className="max-h-96 overflow-auto bg-neo-bg-deep p-3">
            <pre className="text-[10px] font-mono text-neo-text-secondary whitespace-pre-wrap break-all leading-relaxed">
              {logs || 'No logs available.'}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
}
