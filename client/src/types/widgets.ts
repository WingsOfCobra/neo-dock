export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  lastRun?: { timestamp: string; status: 'success' | 'failure'; duration: number };
  nextRun?: string;
}

export interface CronHistory {
  timestamp: string;
  status: 'success' | 'failure';
  duration: number;
  output?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
}

export interface LogFile {
  name: string;
  path: string;
  size: number;
}

export type WidgetType =
  | 'server-monitor'
  | 'docker-containers'
  | 'services-status'
  | 'github-dashboard'
  | 'email-inbox'
  | 'todo-list'
  | 'logs-viewer'
  | 'cron-jobs';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
}
