/* ── CronJobs – schedule list with run action + history ──────── */

import { useState, useCallback } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { post, get, del } from '@/lib/api';
import type { ChefCronJob, ChefCronHistory } from '@/types';

const statusBadge: Record<string, string> = {
  success: 'bg-neo-red/20 text-neo-red border-neo-red/40',
  failed: 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40',
  error: 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40',
  running: 'bg-neo-red/10 text-neo-red border-neo-red/30 animate-pulse',
};
const defaultBadge = 'bg-neo-bg-elevated text-neo-text-disabled border-neo-border';

function formatNextRun(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const diff = d.getTime() - Date.now();
  if (diff < 0) return 'overdue';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '--';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return '--';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface CronJobsProps {
  compact?: boolean;
}

export function CronJobs({ compact = false }: CronJobsProps) {
  const rawJobs = useMetricsStore((s) => s.cronJobs);
  const cronHealth = useMetricsStore((s) => s.cronHealth);
  const jobs = Array.isArray(rawJobs) ? rawJobs : [];
  const [runningId, setRunningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [history, setHistory] = useState<ChefCronHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleRun = useCallback(async (job: ChefCronJob) => {
    setError(null);
    setRunningId(job.id ?? null);
    try {
      await post(`/chef/cron/jobs/${job.id}/run`);
    } catch {
      setError(`Failed to run ${job.name}`);
    } finally {
      setRunningId(null);
    }
  }, []);

  const handleDelete = useCallback(async (job: ChefCronJob) => {
    try {
      await del(`/chef/cron/jobs/${job.id}`);
    } catch {
      setError(`Failed to delete ${job.name}`);
    }
  }, []);

  const toggleHistory = useCallback(async (job: ChefCronJob) => {
    if (expandedId === job.id) {
      setExpandedId(null);
      setHistory([]);
      return;
    }
    setExpandedId(job.id ?? null);
    setHistoryLoading(true);
    try {
      const data = await get<ChefCronHistory[]>(`/chef/cron/jobs/${job.id}/history?limit=10`);
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [expandedId]);

  const loading = jobs.length === 0;
  const enabledCount = jobs.filter((j) => j.enabled === 1).length;

  return (
    <Card title="Cron Jobs" loading={loading}>
      <div className={`space-y-1 ${compact ? 'max-h-72 overflow-y-auto' : ''}`}>
        {/* Scheduler health summary */}
        {(cronHealth || jobs.length > 0) && (
          <div className="flex items-center gap-3 text-[10px] font-mono pb-2 border-b border-neo-border/30">
            {cronHealth?.schedulerActive && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neo-red animate-pulse shadow-[0_0_4px_rgba(255,0,51,0.4)]" />
                <span className="text-neo-red">SCHEDULER ACTIVE</span>
              </span>
            )}
            <span className="text-neo-text-disabled">{enabledCount} enabled</span>
            <span className="text-neo-text-disabled">{jobs.length} total</span>
          </div>
        )}

        {error && (
          <div className="text-neo-red text-xs font-mono mb-2">[!] {error}</div>
        )}

        {jobs.map((job) => {
          const badge = statusBadge[job.last_run_status ?? ''] ?? defaultBadge;
          const isEnabled = job.enabled === 1;
          const isExpanded = expandedId === job.id;

          return (
            <div
              key={job.id}
              className="group border border-neo-border/50 hover:border-neo-red/30 transition-colors"
            >
              <div className="flex items-center gap-2 px-2 py-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isEnabled
                      ? 'bg-neo-red shadow-[0_0_4px_rgba(255,0,51,0.4)]'
                      : 'bg-neo-text-disabled'
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-neo-text-primary truncate">
                      {job.name}
                    </p>
                    {job.type && (
                      <span className="text-[8px] font-mono text-neo-text-disabled uppercase px-1 border border-neo-border/40">
                        {job.type}
                      </span>
                    )}
                    {job.preset && (
                      <span className="text-[8px] font-mono text-neo-red/60 uppercase px-1 border border-neo-red/20">
                        {job.preset}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-neo-text-disabled">
                    <span>{job.schedule}</span>
                    {job.last_run_at && (
                      <span>· ran {timeAgo(job.last_run_at)}</span>
                    )}
                  </div>
                </div>

                {job.last_run_status && (
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${badge} shrink-0`}
                  >
                    {job.last_run_status}
                  </span>
                )}

                <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">
                  {formatNextRun(job.nextRun)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!compact && (
                    <button
                      onClick={() => toggleHistory(job)}
                      className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-border text-neo-text-disabled hover:text-neo-red hover:border-neo-red/40 transition-colors"
                    >
                      HIST
                    </button>
                  )}
                  <button
                    onClick={() => handleRun(job)}
                    disabled={runningId === job.id || !isEnabled}
                    className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-red/40 text-neo-red hover:bg-neo-red/10 transition-colors disabled:opacity-30 shrink-0"
                  >
                    {runningId === job.id ? '...' : 'RUN'}
                  </button>
                  {!compact && (
                    <button
                      onClick={() => handleDelete(job)}
                      className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-border text-neo-text-disabled hover:text-neo-red hover:border-neo-red/40 transition-colors"
                    >
                      DEL
                    </button>
                  )}
                </div>
              </div>

              {/* Execution history */}
              {isExpanded && (
                <div className="border-t border-neo-border/50 bg-neo-bg-deep p-2 max-h-40 overflow-auto">
                  {historyLoading ? (
                    <div className="flex items-center gap-2 text-xs text-neo-text-disabled">
                      <div className="w-3 h-3 border border-neo-red border-t-transparent rounded-full animate-spin" />
                      Loading history...
                    </div>
                  ) : history.length > 0 ? (
                    <div className="space-y-1">
                      <div className="grid grid-cols-[80px_60px_50px_1fr] gap-1 text-[9px] font-mono text-neo-text-disabled uppercase border-b border-neo-border/30 pb-1">
                        <span>Time</span>
                        <span>Status</span>
                        <span>Duration</span>
                        <span>Output</span>
                      </div>
                      {history.map((h) => {
                        const hBadge = statusBadge[h.status ?? ''] ?? defaultBadge;
                        return (
                          <div
                            key={h.id}
                            className="grid grid-cols-[80px_60px_50px_1fr] gap-1 text-[10px] font-mono"
                          >
                            <span className="text-neo-text-disabled">{timeAgo(h.created_at)}</span>
                            <span className={`px-1 py-px border text-[9px] uppercase ${hBadge} text-center`}>
                              {h.status}
                            </span>
                            <span className="text-neo-text-secondary">{formatDuration(h.duration_ms)}</span>
                            <span className="text-neo-text-secondary truncate">
                              {h.stdout || h.stderr || '--'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] font-mono text-neo-text-disabled">No history yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {jobs.length === 0 && !loading && (
          <p className="text-xs text-neo-text-disabled text-center py-4 font-mono">
            No cron jobs configured.
          </p>
        )}
      </div>
    </Card>
  );
}
