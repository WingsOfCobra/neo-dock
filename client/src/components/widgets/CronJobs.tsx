/* ── CronJobs – schedule list with run action ──────────────── */

import { useState, useCallback } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { post } from '@/lib/api';
import type { CronJob } from '@/types';

const statusBadge: Record<string, string> = {
  success: 'bg-neo-cyan/20 text-neo-cyan border-neo-cyan/40',
  failed: 'bg-neo-red/20 text-neo-red border-neo-red/40',
  error: 'bg-neo-red/20 text-neo-red border-neo-red/40',
};
const defaultBadge = 'bg-neo-bg-elevated text-neo-text-disabled border-neo-border';

function formatNextRun(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diff = d.getTime() - Date.now();
  if (diff < 0) return 'overdue';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}

export function CronJobs() {
  const rawJobs = useMetricsStore((s) => s.cronJobs);
  const jobs = Array.isArray(rawJobs) ? rawJobs : [];
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async (job: CronJob) => {
    setError(null);
    setRunningId(job.id);
    try {
      await post(`/chef/cron/jobs/${job.id}/run`);
    } catch {
      setError(`Failed to run ${job.name}`);
    } finally {
      setRunningId(null);
    }
  }, []);

  const loading = jobs.length === 0;

  return (
    <Card title="Cron Jobs" loading={loading} glowColor="cyan">
      <div className="space-y-1">
        {error && (
          <div className="text-neo-red text-xs font-mono mb-2">{error}</div>
        )}

        {jobs.map((job) => {
          const badge = statusBadge[job.lastStatus ?? ''] ?? defaultBadge;

          return (
            <div
              key={job.id}
              className="group flex items-center gap-2 px-2 py-2 border border-neo-border/50 hover:border-neo-border transition-colors"
            >
              {/* Enabled indicator */}
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  job.enabled ? 'bg-neo-cyan' : 'bg-neo-text-disabled'
                }`}
              />

              {/* Name + schedule */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neo-text-primary truncate">
                  {job.name}
                </p>
                <p className="text-[10px] font-mono text-neo-text-disabled">
                  {job.schedule}
                </p>
              </div>

              {/* Last status */}
              {job.lastStatus && (
                <span
                  className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${badge} shrink-0`}
                >
                  {job.lastStatus}
                </span>
              )}

              {/* Next run */}
              <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">
                {formatNextRun(job.nextRun)}
              </span>

              {/* Run button */}
              <button
                onClick={() => handleRun(job)}
                disabled={runningId === job.id || !job.enabled}
                className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-cyan/40 text-neo-cyan hover:bg-neo-cyan/10 transition-colors disabled:opacity-30 opacity-0 group-hover:opacity-100 shrink-0"
              >
                {runningId === job.id ? '...' : 'Run'}
              </button>
            </div>
          );
        })}

        {jobs.length === 0 && !loading && (
          <p className="text-xs text-neo-text-disabled text-center py-4">
            No cron jobs configured.
          </p>
        )}
      </div>
    </Card>
  );
}
