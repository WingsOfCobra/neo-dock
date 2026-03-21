/* ── GitHubDashboard – repos, notifications ────────────────── */

import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';

const langColors: Record<string, string> = {
  TypeScript: '#3178C6',
  JavaScript: '#F7DF1E',
  Python: '#3776AB',
  Rust: '#CE422B',
  Go: '#00ADD8',
  Java: '#B07219',
  'C++': '#F34B7D',
  C: '#555555',
  Shell: '#89E051',
  HTML: '#E34C26',
  CSS: '#563D7C',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function GitHubDashboard() {
  const rawRepos = useMetricsStore((s) => s.githubRepos);
  const rawNotifications = useMetricsStore((s) => s.githubNotifications);
  const repos = Array.isArray(rawRepos) ? rawRepos : [];
  const notifications = Array.isArray(rawNotifications) ? rawNotifications : [];
  const loading = repos.length === 0;

  const unreadCount = notifications.filter((n) => n?.unread).length;
  const sortedRepos = [...repos]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8);

  return (
    <Card
      title="GitHub"
      loading={loading}
      glowColor="cyan"
      status={unreadCount > 0 ? 'warning' : 'ok'}
    >
      <div className="space-y-3">
        {/* Notifications */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-neo-yellow/5 border border-neo-yellow/20">
            <span className="w-1.5 h-1.5 rounded-full bg-neo-yellow animate-pulse" />
            <span className="text-[10px] font-mono uppercase text-neo-yellow">
              {unreadCount} notification{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Repo list */}
        <div className="space-y-1">
          {sortedRepos.map((repo) => (
            <div
              key={repo.id}
              className="flex items-center gap-2 px-2 py-1.5 border border-transparent hover:border-neo-border/50 transition-colors"
            >
              {/* Language dot */}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    langColors[repo.language ?? ''] ?? '#4A4A55',
                }}
              />

              {/* Name */}
              <span className="flex-1 text-sm text-neo-text-primary truncate">
                {repo.name}
              </span>

              {/* Stars */}
              {repo.stargazers_count > 0 && (
                <span className="text-[10px] font-mono text-neo-yellow">
                  ★ {repo.stargazers_count}
                </span>
              )}

              {/* Private badge */}
              {repo.private && (
                <span className="text-[10px] font-mono text-neo-red-dim uppercase">
                  priv
                </span>
              )}

              {/* Last update */}
              <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">
                {timeAgo(repo.updated_at)}
              </span>
            </div>
          ))}
        </div>

        {/* Recent notifications */}
        {notifications.length > 0 && (
          <div className="border-t border-neo-border pt-2 space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-neo-text-disabled mb-1">
              Recent Activity
            </p>
            {notifications.slice(0, 4).map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-2 text-[10px] font-mono text-neo-text-secondary"
              >
                <span className={`shrink-0 mt-0.5 w-1 h-1 rounded-full ${n.unread ? 'bg-neo-cyan' : 'bg-neo-text-disabled'}`} />
                <span className="truncate">{n.title}</span>
                <span className="shrink-0 text-neo-text-disabled">
                  {n.repo.split('/').pop()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
