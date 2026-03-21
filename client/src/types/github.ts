export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  updated_at: string;
  private: boolean;
}

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  draft: boolean;
  head: { ref: string };
  base: { ref: string };
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string };
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  updated_at: string;
}

export interface GitHubNotification {
  id: string;
  unread: boolean;
  reason: string;
  subject: { title: string; type: string; url: string };
  repository: { full_name: string };
  updated_at: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  head_branch: string;
}
