/* ── CronJobModal – Create/Edit cron jobs with preset support ── */

import { useState, useEffect, useCallback } from 'react';
import { post, get } from '@/lib/api';
import type { ChefCronPresets, ChefCronJobCreated } from '@/types';

interface CronJobModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editJob?: {
    id: number;
    name: string;
    schedule: string;
    type?: string;
    config?: { [key: string]: unknown };
    enabled: number | boolean;
  } | null;
}

interface CronPreset {
  name: string;
  schedule: string;
  description: string;
  examples?: string[];
}

/** Parse cron expression to human-readable format */
function humanizeCron(cron: string): string {
  if (!cron) return '';
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return 'Invalid cron expression';

  const [minute, hour, dayMonth, month, dayWeek] = parts;

  // Common patterns
  if (cron === '* * * * *') return 'Every minute';
  if (cron === '0 * * * *') return 'Every hour';
  if (cron === '0 0 * * *') return 'Daily at midnight';
  if (cron === '0 0 * * 0') return 'Weekly on Sunday at midnight';
  if (cron === '0 0 1 * *') return 'Monthly on the 1st at midnight';
  if (cron === '*/5 * * * *') return 'Every 5 minutes';
  if (cron === '*/15 * * * *') return 'Every 15 minutes';
  if (cron === '*/30 * * * *') return 'Every 30 minutes';

  // Try to build a readable description
  let desc = '';
  
  if (minute === '*') desc += 'Every minute';
  else if (minute.startsWith('*/')) desc += `Every ${minute.slice(2)} minutes`;
  else desc += `At minute ${minute}`;

  if (hour !== '*') {
    if (hour.startsWith('*/')) desc += ` every ${hour.slice(2)} hours`;
    else desc += ` at ${hour}:00`;
  }

  if (dayMonth !== '*') desc += ` on day ${dayMonth}`;
  if (month !== '*') desc += ` in month ${month}`;
  if (dayWeek !== '*') desc += ` on weekday ${dayWeek}`;

  return desc;
}

export function CronJobModal({ open, onClose, onSuccess, editJob }: CronJobModalProps) {
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('');
  const [command, setCommand] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [presets, setPresets] = useState<CronPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [presetsLoading, setPresetsLoading] = useState(false);

  // Load presets on mount
  useEffect(() => {
    if (!open) return;
    setPresetsLoading(true);
    get<ChefCronPresets>('/chef/cron/presets')
      .then((data) => {
        if (data && Array.isArray(data.presets)) {
          setPresets(data.presets as CronPreset[]);
        }
      })
      .catch(() => setPresets([]))
      .finally(() => setPresetsLoading(false));
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (editJob) {
      setName(editJob.name);
      setSchedule(editJob.schedule);
      // Extract command from config - assume type=shell and config.command
      const cmd = editJob.config?.command as string | undefined;
      setCommand(cmd ?? '');
      setEnabled(editJob.enabled === 1 || editJob.enabled === true);
    } else {
      setName('');
      setSchedule('');
      setCommand('');
      setEnabled(true);
      setSelectedPreset('');
    }
    setError(null);
  }, [editJob, open]);

  const handlePresetSelect = useCallback((presetName: string) => {
    setSelectedPreset(presetName);
    const preset = presets.find((p) => p.name === presetName);
    if (preset) {
      setSchedule(preset.schedule);
      if (!name) setName(preset.name);
      if (!command && preset.examples && preset.examples.length > 0) {
        setCommand(preset.examples[0]);
      }
    }
  }, [presets, name, command]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!schedule.trim()) {
      setError('Schedule is required');
      return;
    }
    if (!command.trim()) {
      setError('Command is required');
      return;
    }

    setLoading(true);
    try {
      if (editJob) {
        // Note: PATCH endpoint may not exist yet
        setError('Edit functionality not yet available in chef-api. Please delete and recreate.');
        setLoading(false);
        return;
      } else {
        // Create job with type=shell and config.command
        await post<ChefCronJobCreated>('/chef/cron/jobs', {
          name: name.trim(),
          schedule: schedule.trim(),
          type: 'shell',
          config: {
            command: command.trim(),
          },
          enabled: enabled ? 1 : 0,
        });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cron job');
    } finally {
      setLoading(false);
    }
  }, [name, schedule, command, enabled, editJob, onSuccess, onClose]);

  if (!open) return null;

  const humanReadable = humanizeCron(schedule);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neo-bg-deep/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neo-bg-surface border border-neo-red/40 shadow-[0_0_30px_rgba(255,0,51,0.15)] max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neo-border/30 px-4 py-3">
          <h2 className="font-display text-sm uppercase tracking-[0.15em] text-neo-red">
            {editJob ? 'Edit Cron Job' : 'Create Cron Job'}
          </h2>
          <button
            onClick={onClose}
            className="text-neo-text-disabled hover:text-neo-red transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="text-neo-red text-xs font-mono border border-neo-red/40 bg-neo-red/5 p-2">
              [!] {error}
            </div>
          )}

          {/* Preset selector */}
          {!editJob && presets.length > 0 && (
            <div>
              <label className="block text-[10px] font-mono uppercase text-neo-text-disabled mb-1.5">
                Use Preset (Optional)
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetSelect(e.target.value)}
                disabled={presetsLoading}
                className="w-full bg-neo-bg-deep border border-neo-border text-neo-text-primary font-mono text-xs px-3 py-2 focus:outline-none focus:border-neo-red transition-colors"
              >
                <option value="">-- Select a preset --</option>
                {presets.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} — {p.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-neo-text-disabled mb-1.5">
              Name <span className="text-neo-red">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. backup-database"
              className="w-full bg-neo-bg-deep border border-neo-border text-neo-text-primary font-mono text-xs px-3 py-2 focus:outline-none focus:border-neo-red transition-colors"
              required
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-neo-text-disabled mb-1.5">
              Schedule (Cron Expression) <span className="text-neo-red">*</span>
            </label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="* * * * *"
              className="w-full bg-neo-bg-deep border border-neo-border text-neo-text-primary font-mono text-xs px-3 py-2 focus:outline-none focus:border-neo-red transition-colors"
              required
            />
            {schedule && (
              <p className="mt-1.5 text-[10px] font-mono text-neo-text-secondary">
                ➜ {humanReadable}
              </p>
            )}
            <p className="mt-1 text-[9px] font-mono text-neo-text-disabled">
              Format: minute hour day month weekday
            </p>
          </div>

          {/* Command */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-neo-text-disabled mb-1.5">
              Command <span className="text-neo-red">*</span>
            </label>
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. /usr/bin/backup.sh"
              rows={3}
              className="w-full bg-neo-bg-deep border border-neo-border text-neo-text-primary font-mono text-xs px-3 py-2 focus:outline-none focus:border-neo-red transition-colors resize-none"
              required
            />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 bg-neo-bg-deep border border-neo-border checked:bg-neo-red checked:border-neo-red focus:outline-none focus:ring-1 focus:ring-neo-red transition-colors"
            />
            <label htmlFor="enabled" className="text-xs font-mono text-neo-text-primary cursor-pointer">
              Enabled
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-xs font-mono uppercase border border-neo-red text-neo-red hover:bg-neo-red hover:text-neo-bg-deep transition-colors disabled:opacity-30"
            >
              {loading ? 'Saving...' : editJob ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase border border-neo-border text-neo-text-disabled hover:text-neo-red hover:border-neo-red/40 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
