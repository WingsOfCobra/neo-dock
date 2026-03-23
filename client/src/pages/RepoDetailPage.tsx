/* ── RepoDetailPage – detailed view for a single GitHub repo ── */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { get } from '@/lib/api';

interface RepoDetail {
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  size: number;
  defaultBranch: string;
  language: string | null;
  topics: string[];
  license: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  url: string;
  private: boolean;
}

interface Branch {
  name: string;
  protected: boolean;
  sha: string;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface PRItem {
  number: number;
  title: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  draft: boolean;
  ciStatus: string | null;
}

interface IssueItem {
  number: number;
  title: string;
  author: string;
  createdAt: string;
  labels: string[];
  url: string;
  state: string;
}

interface WorkflowRun {
  id: number;
  name: string;
  status: string | null;
  conclusion: string | null;
  createdAt: string;
  url: string;
  branch: string;
}

interface Release {
  id: number;
  tagName: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  createdAt: string;
  publishedAt: string | null;
  author: string;
  url: string;
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDuration(createdAt: string): string {
  if (!createdAt) return '--';
  const now = Date.now();
  const start = new Date(createdAt).getTime();
  const diffMs = now - start;
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h`;
}

const conclusionBadge: Record<string, string> = {
  success: 'bg-neo-red/20 text-neo-red border-neo-red/40',
  failure: 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40',
  cancelled: 'bg-neo-text-disabled/20 text-neo-text-disabled border-neo-border',
  skipped: 'bg-neo-bg-elevated text-neo-text-disabled border-neo-border',
  in_progress: 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40',
  queued: 'bg-neo-text-disabled/20 text-neo-text-secondary border-neo-border',
};

type TabKey = 'overview' | 'commits' | 'prs' | 'runs' | 'issues' | 'releases';

export function RepoDetailPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<RepoDetail | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [prs, setPRs] = useState<PRItem[]>([]);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!owner || !repo) return;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      get<RepoDetail>(`/chef/github/repos/${owner}/${repo}`).then(setDetail),
      get<Branch[]>(`/chef/github/repos/${owner}/${repo}/branches`).then(setBranches),
      get<Commit[]>(`/chef/github/repos/${owner}/${repo}/commits`).then(setCommits),
    ])
      .finally(() => setLoading(false));
  }, [owner, repo]);

  // Lazy-load tab data only when that tab becomes active
  useEffect(() => {
    if (!owner || !repo) return;
    if (activeTab === 'prs' && prs.length === 0) {
      get<PRItem[]>(`/chef/github/repos/${owner}/${repo}/prs`).then(setPRs).catch(() => {});
    } else if (activeTab === 'runs' && workflows.length === 0) {
      get<WorkflowRun[]>(`/chef/github/repos/${owner}/${repo}/workflows`).then(setWorkflows).catch(() => {});
    } else if (activeTab === 'issues' && issues.length === 0) {
      get<IssueItem[]>(`/chef/github/repos/${owner}/${repo}/issues`).then(setIssues).catch(() => {});
    } else if (activeTab === 'releases' && releases.length === 0) {
      get<Release[]>(`/chef/github/repos/${owner}/${repo}/releases`).then(setReleases).catch(() => {});
    }
  }, [activeTab, owner, repo, prs.length, workflows.length, issues.length, releases.length]);

  if (error) {
    return (
      <div className="p-3">
        <p className="text-neo-red font-mono text-sm">[!] {error}</p>
        <button onClick={() => navigate('/comms')} className="mt-2 text-[10px] font-mono text-neo-text-disabled hover:text-neo-red">
          ← BACK
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full animate-fade-in">
      {/* Sidebar */}
      <aside className="w-48 border-r border-neo-border/30 bg-neo-bg-surface/60 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-neo-border/30">
          <button
            onClick={() => navigate('/comms')}
            className="text-[10px] font-mono text-neo-text-disabled hover:text-neo-red transition-colors mb-2"
          >
            ← REPOS
          </button>
          <div className="font-mono text-xs text-neo-text-primary truncate" title={`${owner}/${repo}`}>
            {owner}/{repo}
          </div>
          {detail?.private && (
            <span className="text-[9px] font-mono px-1 border border-neo-red/30 text-neo-red/60 uppercase mt-1 inline-block">PRIVATE</span>
          )}
        </div>

        {/* Navigation tabs */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {[
            { key: 'overview' as TabKey, label: 'OVERVIEW', icon: '◉' },
            { key: 'prs' as TabKey, label: 'PULL REQUESTS', icon: '⎇', count: prs.length },
            { key: 'runs' as TabKey, label: 'ACTIONS', icon: '▶', count: workflows.length },
            { key: 'issues' as TabKey, label: 'ISSUES', icon: '●', count: issues.length },
            { key: 'commits' as TabKey, label: 'COMMITS', icon: '◆' },
            { key: 'releases' as TabKey, label: 'RELEASES', icon: '◈' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full text-left px-3 py-2 text-[10px] font-mono uppercase transition-colors border-l-2 ${
                activeTab === tab.key
                  ? 'border-neo-red text-neo-red bg-neo-red/[0.05]'
                  : 'border-transparent text-neo-text-disabled hover:text-neo-text-secondary hover:bg-neo-bg-deep/40'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.count != null && tab.count > 0 && activeTab === tab.key && (
                <span className="ml-2 text-neo-red">({tab.count})</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer - GitHub link */}
        {detail?.url && (
          <div className="p-3 border-t border-neo-border/30">
            <a
              href={detail.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-neo-text-disabled hover:text-neo-red transition-colors flex items-center gap-1"
            >
              GITHUB ↗
            </a>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-3 overflow-y-auto">
        <div className="font-mono text-[10px] text-neo-red/40 px-1 mb-3">
          &gt; REPO_DETAIL // {owner}/{repo}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card title="Repository Info" loading={loading}>
              {detail && (
                <div className="space-y-2 font-mono text-[11px]">
                  {detail.description && (
                    <p className="text-neo-text-secondary">{detail.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                    <span className="text-neo-text-disabled">Language</span>
                    <span className="text-neo-text-primary">{detail.language ?? 'n/a'}</span>
                    <span className="text-neo-text-disabled">Stars</span>
                    <span className="text-neo-red">{detail.stars}</span>
                    <span className="text-neo-text-disabled">Forks</span>
                    <span className="text-neo-text-primary">{detail.forks}</span>
                    <span className="text-neo-text-disabled">Watchers</span>
                    <span className="text-neo-text-primary">{detail.watchers}</span>
                    <span className="text-neo-text-disabled">Open Issues</span>
                    <span className="text-neo-yellow">{detail.openIssues}</span>
                    <span className="text-neo-text-disabled">Default Branch</span>
                    <span className="text-neo-text-primary">{detail.defaultBranch}</span>
                    <span className="text-neo-text-disabled">License</span>
                    <span className="text-neo-text-primary">{detail.license ?? 'none'}</span>
                    <span className="text-neo-text-disabled">Visibility</span>
                    <span className="text-neo-text-primary uppercase">{detail.visibility}</span>
                    <span className="text-neo-text-disabled">Created</span>
                    <span className="text-neo-text-primary">{formatDate(detail.createdAt)}</span>
                    <span className="text-neo-text-disabled">Last Push</span>
                    <span className="text-neo-text-primary">{timeAgo(detail.pushedAt)}</span>
                  </div>
                  {detail.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {detail.topics.map((t) => (
                        <span key={t} className="px-1.5 py-px text-[9px] border border-neo-border text-neo-text-disabled">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card title="Branches">
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {branches.map((b) => (
                  <div key={b.name} className="flex items-center gap-2 px-2 py-1 font-mono text-[11px] hover:bg-neo-red/[0.03]">
                    <span className="w-1.5 h-1.5 rounded-full bg-neo-red/40 shrink-0" />
                    <span className="flex-1 text-neo-text-primary truncate">{b.name}</span>
                    {b.protected && (
                      <span className="text-[9px] text-neo-yellow border border-neo-yellow/30 px-1">PROT</span>
                    )}
                    <span className="text-neo-text-disabled text-[9px]">{b.sha.slice(0, 7)}</span>
                  </div>
                ))}
                {branches.length === 0 && !loading && (
                  <p className="text-[10px] font-mono text-neo-text-disabled px-2">No branches</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'commits' && (
          <Card title="Recent Commits">
            <div className="space-y-1">
              {commits.map((c) => (
                <a
                  key={c.sha}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 px-2 py-2 hover:bg-neo-red/[0.03] hover:border-neo-red/20 border border-transparent transition-colors group"
                >
                  <span className="font-mono text-[10px] text-neo-red shrink-0 w-14">{c.sha.slice(0, 7)}</span>
                  <span className="flex-1 text-sm text-neo-text-primary group-hover:text-neo-red transition-colors truncate">{c.message}</span>
                  <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">{c.author}</span>
                  <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">{timeAgo(c.date)}</span>
                </a>
              ))}
              {commits.length === 0 && (
                <p className="text-[10px] font-mono text-neo-text-disabled px-2 py-4 text-center">No commits loaded</p>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'prs' && (
          <Card title="Open Pull Requests">
            <div className="space-y-1">
              {prs.map((pr) => (
                <a
                  key={pr.number}
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-2 hover:bg-neo-red/[0.03] border border-transparent hover:border-neo-red/20 transition-colors"
                >
                  <span className="text-neo-red font-mono text-[10px] shrink-0">#{pr.number}</span>
                  <span className="flex-1 text-sm text-neo-text-primary truncate">{pr.title}</span>
                  {pr.draft && <span className="text-[9px] font-mono text-neo-text-disabled">DRAFT</span>}
                  {pr.ciStatus && (
                    <span className={`text-[9px] font-mono px-1 border ${conclusionBadge[pr.ciStatus] ?? 'border-neo-border text-neo-text-disabled'}`}>
                      {pr.ciStatus.toUpperCase()}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">{pr.author}</span>
                  <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">{timeAgo(pr.updatedAt)}</span>
                </a>
              ))}
              {prs.length === 0 && (
                <p className="text-[10px] font-mono text-neo-text-disabled px-2 py-4 text-center">No open PRs</p>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'runs' && (
          <Card title="Workflow Runs">
            <div className="space-y-1">
              {workflows.map((wf) => {
                const badge = conclusionBadge[wf.conclusion ?? wf.status ?? ''] ?? 'bg-neo-bg-elevated text-neo-text-disabled border-neo-border';
                return (
                  <a
                    key={wf.id}
                    href={wf.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-2 hover:bg-neo-red/[0.03] border border-transparent hover:border-neo-red/20 transition-colors font-mono text-[10px]"
                  >
                    <span className={`px-1 py-px border text-[9px] uppercase ${badge}`}>
                      {wf.conclusion ?? wf.status ?? '?'}
                    </span>
                    <span className="flex-1 text-neo-text-primary truncate">{wf.name}</span>
                    <span className="text-neo-text-disabled">{wf.branch}</span>
                    <span className="text-neo-text-disabled">{formatDuration(wf.createdAt)}</span>
                    <span className="text-neo-text-disabled">{timeAgo(wf.createdAt)}</span>
                  </a>
                );
              })}
              {workflows.length === 0 && (
                <p className="text-[10px] font-mono text-neo-text-disabled px-2 py-4 text-center">No workflow runs</p>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'issues' && (
          <Card title="Open Issues">
            <div className="space-y-1">
              {issues.map((issue) => (
                <a
                  key={issue.number}
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-2 hover:bg-neo-red/[0.03] border border-transparent hover:border-neo-red/20 transition-colors"
                >
                  <span className="text-neo-yellow font-mono text-[10px] shrink-0">#{issue.number}</span>
                  <span className="flex-1 text-sm text-neo-text-primary truncate">{issue.title}</span>
                  {issue.labels.length > 0 && (
                    <div className="flex gap-1">
                      {issue.labels.slice(0, 2).map((l) => (
                        <span key={l} className="text-[8px] font-mono px-1 border border-neo-border text-neo-text-disabled">{l}</span>
                      ))}
                    </div>
                  )}
                  <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">{issue.author}</span>
                  <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">{timeAgo(issue.createdAt)}</span>
                </a>
              ))}
              {issues.length === 0 && (
                <p className="text-[10px] font-mono text-neo-text-disabled px-2 py-4 text-center">No open issues</p>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'releases' && (
          <Card title="Releases">
            <div className="space-y-2">
              {releases.map((r) => (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-2 hover:bg-neo-red/[0.03] border border-transparent hover:border-neo-red/20 transition-colors group"
                >
                  <span className="text-neo-red font-mono text-[10px] shrink-0">{r.tagName}</span>
                  {r.name && <span className="flex-1 text-sm text-neo-text-primary truncate">{r.name}</span>}
                  {r.draft && <span className="text-[9px] font-mono border border-neo-border px-1 text-neo-text-disabled">DRAFT</span>}
                  {r.prerelease && <span className="text-[9px] font-mono border border-neo-yellow/30 px-1 text-neo-yellow">PRE</span>}
                  <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">{r.author}</span>
                  <span className="text-[10px] font-mono text-neo-text-disabled shrink-0">{timeAgo(r.publishedAt ?? r.createdAt)}</span>
                </a>
              ))}
              {releases.length === 0 && (
                <p className="text-[10px] font-mono text-neo-text-disabled px-2 py-4 text-center">No releases</p>
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
