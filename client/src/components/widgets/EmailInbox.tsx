/* ── EmailInbox – unread count + email list with preview ────── */

import { useState, useCallback } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';
import { get } from '@/lib/api';
import type { EmailThread } from '@/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function EmailInbox() {
  const rawEmails = useMetricsStore((s) => s.emails);
  const emails = Array.isArray(rawEmails) ? rawEmails : [];
  const [expandedUid, setExpandedUid] = useState<number | null>(null);
  const [threadBody, setThreadBody] = useState('');
  const [threadLoading, setThreadLoading] = useState(false);

  const toggleThread = useCallback(
    async (uid: number) => {
      if (expandedUid === uid) {
        setExpandedUid(null);
        setThreadBody('');
        return;
      }
      setExpandedUid(uid);
      setThreadLoading(true);
      try {
        const data = await get<EmailThread>(
          `/chef/email/thread/${uid}`,
        );
        setThreadBody(data.body ?? '');
      } catch {
        setThreadBody('Failed to load email.');
      } finally {
        setThreadLoading(false);
      }
    },
    [expandedUid],
  );

  const loading = emails.length === 0;

  return (
    <Card title="Email" loading={loading} glowColor="cyan">
      <div className="space-y-1">
        {/* Unread count */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg font-mono text-neo-cyan font-bold">
            {emails.length}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-neo-text-disabled">
            Unread
          </span>
        </div>

        {/* Email list */}
        {emails.slice(0, 10).map((email) => {
          const isExpanded = expandedUid === email.uid;

          return (
            <div key={email.uid} className="border border-neo-border/50 hover:border-neo-border transition-colors">
              <button
                className="w-full text-left px-3 py-2 flex items-start gap-2"
                onClick={() => toggleThread(email.uid)}
              >
                <span className="w-1 h-1 rounded-full bg-neo-cyan shrink-0 mt-2" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-neo-text-primary truncate font-medium">
                      {email.from}
                    </span>
                    <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">
                      {formatDate(email.date)}
                    </span>
                  </div>
                  <p className="text-[11px] text-neo-text-secondary truncate mt-0.5">
                    {email.subject}
                  </p>
                </div>
              </button>

              {/* Expanded preview */}
              {isExpanded && (
                <div className="border-t border-neo-border/50 bg-neo-bg-deep p-3 max-h-40 overflow-auto">
                  {threadLoading ? (
                    <div className="flex items-center gap-2 text-xs text-neo-text-disabled">
                      <div className="w-3 h-3 border border-neo-cyan border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <pre className="text-[10px] font-mono text-neo-text-secondary whitespace-pre-wrap break-words leading-relaxed">
                      {threadBody || 'No content.'}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {emails.length === 0 && !loading && (
          <p className="text-xs text-neo-text-disabled text-center py-4">
            No unread emails.
          </p>
        )}
      </div>
    </Card>
  );
}
