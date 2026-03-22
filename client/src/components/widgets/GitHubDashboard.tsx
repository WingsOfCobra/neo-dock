/* ── GitHubDashboard – repos, PRs, issues, workflows, notifications ── */

import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';

const langColors: Record<string, string> = {
  TypeScript: '#FF3355',
  JavaScript: '#FF6600',
  Python: '#FF4444',
  Rust: '#CC2222',
  Go: '#FF2244',
  Java: '#BB1133',
  'C++': '#FF1A1A',
  C: '#AA3333',
  Shell: '#FF5544',
  HTML: '#FF3333',
  CSS: '#CC3355',
};

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return '--';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ciColors: Record<string, string> = {
  success: 'text-neo-red',
  failure: 'text-neo-yellow',
  pending: 'text-neo-text-disabled animate-pulse',
};

const conclusionColors: Record<string, string> = {
  success: 'bg-neo-red/20 text-neo-red border-neo-red/40',
  failure: 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40',
  cancelled: 'bg-neo-text-disabled/20 text-neo-text-disabled border-neo-border',
  skipped: 'bg-neo-bg-elevated text-neo-text-disabled border-neo-border',
};

interface GitHubDashboardProps {
  compact?: boolean;
}

export function GitHubDashboard({ compact = false }: GitHubDashboardProps) {
  const rawRepos = useMetricsStore((s) => s.githubRepos);
  const rawNotifications = useMetricsStore((s) => s.githubNotifications);
  const rawPRs = useMetricsStore((s) => s.githubPRs);
  const rawIssues = useMetricsStore((s) => s.githubIssues);
  const rawWorkflows = useMetricsStore((s) => s.githubWorkflows);

  const repos = Array.isArray(rawRepos) ? rawRepos : [];
  const notifications = Array.isArray(rawNotifications) ? rawNotifications : [];
  const prs = Array.isArray(rawPRs) ? rawPRs : [];
  const issues = Array.isArray(rawIssues) ? rawIssues : [];
  const workflows = Array.isArray(rawWorkflows) ? rawWorkflows : [];
  const loading = repos.length === 0;

  const unreadCount = notifications.length;
  const sortedRepos = [...repos]
    .sort((a, b) => new Date(b.lastPush ?? '').getTime() - new Date(a.lastPush ?? '').getTime())
    .slice(0, compact ? 6 : 20);

  return (
    <Card
      title="GitHub"
      loading={loading}
      status={unreadCount > 0 ? 'warning' : 'ok'}
    >
      <div className={`space-y-3 ${compact ? 'max-h-72 overflow-y-auto' : ''}`}>
        {/* Notifications */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-neo-red/5 border border-neo-red/20">
            <span className="w-1.5 h-1.5 rounded-full bg-neo-red animate-pulse shadow-[0_0_4px_rgba(255,0,51,0.5)]" />
            <span className="text-[10px] font-mono uppercase text-neo-red">
              {unreadCount} notification{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Open PRs */}
        {prs.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-neo-text-disabled font-mono">
              Open PRs ({prs.length})
            </p>
            {prs.slice(0, compact ? 3 : 10).map((pr) => (
              <div
                key={pr.number}
                className="flex items-center gap-2 px-2 py-1.5 border border-transparent hover:border-neo-red/20 transition-colors"
              >
                <span className="text-neo-red text-[10px] font-mono shrink-0">#{pr.number}</span>
                <span className="flex-1 text-xs text-neo-text-primary truncate">{pr.title}</span>
                {pr.draft && (
                  <span className="text-[9px] font-mono text-neo-text-disabled uppercase">draft</span>
                )}
                {pr.ciStatus && (
                  <span className={`text-[9px] font-mono uppercase ${ciColors[pr.ciStatus] ?? 'text-neo-text-disabled'}`}>
                    CI:{pr.ciStatus}
                  </span>
                )}
                <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">
                  {pr.author}
                </span>
                <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">
                  {timeAgo(pr.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Open Issues */}
        {!compact && issues.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-neo-text-disabled font-mono">
              Open Issues ({issues.length})
            </p>
            {issues.slice(0, 8).map((issue) => (
              <div
                key={issue.number}
                className="flex items-center gap-2 px-2 py-1 border border-transparent hover:border-neo-red/20 transition-colors"
              >
                <span className="text-neo-yellow text-[10px] font-mono shrink-0">#{issue.number}</span>
                <span className="flex-1 text-xs text-neo-text-primary truncate">{issue.title}</span>
                {issue.labels && issue.labels.length > 0 && (
                  <div className="flex items-center gap-1">
                    {issue.labels.slice(0, 2).map((label) => (
                      <span key={label} className="text-[8px] font-mono px-1 py-px border border-neo-border text-neo-text-disabled">
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">
                  {timeAgo(issue.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Workflow Runs */}
        {!compact && workflows.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-neo-text-disabled font-mono">
              CI/CD Workflows
            </p>
            {workflows.slice(0, 5).map((wf) => {
              const badge = conclusionColors[wf.conclusion ?? ''] ?? conclusionColors['cancelled'];
              return (
                <div
                  key={wf.id}
                  className="flex items-center gap-2 px-2 py-1 text-[10px] font-mono"
                >
                  <span className={`px-1 py-px border text-[9px] uppercase ${badge}`}>
                    {wf.conclusion ?? wf.status ?? '?'}
                  </span>
                  <span className="flex-1 text-neo-text-primary truncate">{wf.name}</span>
                  <span className="text-neo-text-disabled shrink-0">{wf.branch}</span>
                  <span className="text-neo-text-disabled shrink-0">{timeAgo(wf.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Repo list */}
        <div className="space-y-1">
          {!compact && repos.length > 0 && (
            <p className="text-[10px] uppercase tracking-wide text-neo-text-disabled font-mono">
              Repositories ({repos.length})
            </p>
          )}
          {sortedRepos.map((repo) => (
            <div
              key={repo.fullName ?? repo.name}
              className="flex items-center gap-2 px-2 py-1.5 border border-transparent hover:border-neo-red/20 transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: '#552222',
                }}
              />

              <span className="flex-1 text-sm text-neo-text-primary truncate">
                {repo.name}
              </span>

              {(repo.openIssues ?? 0) > 0 && (
                <span className="text-[9px] font-mono text-neo-yellow">
                  {repo.openIssues} issues
                </span>
              )}

              {(repo.stars ?? 0) > 0 && (
                <span className="text-[10px] font-mono text-neo-yellow">
                  * {repo.stars}
                </span>
              )}

              {repo.private && (
                <span className="text-[10px] font-mono text-neo-red-dim uppercase">
                  priv
                </span>
              )}

              <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">
                {timeAgo(repo.lastPush)}
              </span>
            </div>
          ))}
        </div>

        {/* Recent notifications */}
        {notifications.length > 0 && (
          <div className="border-t border-neo-border pt-2 space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-neo-text-disabled mb-1 font-mono">
              Recent Activity
            </p>
            {notifications.slice(0, compact ? 4 : 15).map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-2 text-[10px] font-mono text-neo-text-secondary"
              >
                <span className="shrink-0 mt-0.5 w-1 h-1 rounded-full bg-neo-red" />
                <span className="truncate">{n.title}</span>
                {n.type && (
                  <span className="shrink-0 text-[9px] text-neo-text-disabled uppercase">{n.type}</span>
                )}
                <span className="shrink-0 text-neo-text-disabled">
                  {n.repo?.split('/').pop()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
