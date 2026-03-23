import type { WidgetConfig, WidgetType } from '@/types';

export const BREAKPOINTS = { lg: 1200, md: 996, sm: 768 } as const;
export const COLS = { lg: 12, md: 8, sm: 4 } as const;

export const WIDGET_CONFIGS: WidgetConfig[] = [
  { id: 'system-overview', type: 'system-overview', title: 'SYSTEM OVERVIEW' },
  { id: 'server-monitor', type: 'server-monitor', title: 'SERVER MONITOR' },
  { id: 'docker-containers', type: 'docker-containers', title: 'DOCKER' },
  { id: 'disk-usage', type: 'disk-usage', title: 'DISK USAGE' },
  { id: 'top-processes', type: 'top-processes', title: 'TOP PROCESSES' },
  { id: 'network-monitor', type: 'network-monitor', title: 'NETWORK' },
  { id: 'services-status', type: 'services-status', title: 'SERVICES' },
  { id: 'github-dashboard', type: 'github-dashboard', title: 'GITHUB' },
  { id: 'email-inbox', type: 'email-inbox', title: 'EMAIL' },
  { id: 'todo-list', type: 'todo-list', title: 'TODO' },
  { id: 'logs-viewer', type: 'logs-viewer', title: 'LOGS' },
  { id: 'cron-jobs', type: 'cron-jobs', title: 'CRON JOBS' },
];

export const WIDGET_LABELS: Record<WidgetType, string> = {
  'system-overview': 'SYS',
  'server-monitor': 'SRV',
  'docker-containers': 'DCK',
  'disk-usage': 'DSK',
  'top-processes': 'PRC',
  'network-monitor': 'NET',
  'services-status': 'SVC',
  'github-dashboard': 'GIT',
  'email-inbox': 'EML',
  'todo-list': 'TDO',
  'logs-viewer': 'LOG',
  'cron-jobs': 'CRN',
};

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface Layouts {
  [key: string]: LayoutItem[];
  lg: LayoutItem[];
  md: LayoutItem[];
  sm: LayoutItem[];
}

export const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: 'system-overview', x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
    { i: 'docker-containers', x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
    { i: 'network-monitor', x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
    { i: 'disk-usage', x: 0, y: 3, w: 4, h: 3, minW: 2, minH: 3 },
    { i: 'top-processes', x: 4, y: 3, w: 4, h: 3, minW: 3, minH: 3 },
    { i: 'services-status', x: 8, y: 3, w: 4, h: 3, minW: 2, minH: 3 },
    { i: 'github-dashboard', x: 0, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'email-inbox', x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'todo-list', x: 8, y: 6, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'logs-viewer', x: 0, y: 10, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'cron-jobs', x: 6, y: 10, w: 6, h: 4, minW: 3, minH: 3 },
  ],
  md: [
    { i: 'system-overview', x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
    { i: 'docker-containers', x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
    { i: 'network-monitor', x: 0, y: 3, w: 4, h: 3, minW: 3, minH: 3 },
    { i: 'disk-usage', x: 4, y: 3, w: 4, h: 3, minW: 2, minH: 3 },
    { i: 'top-processes', x: 0, y: 6, w: 4, h: 3, minW: 3, minH: 3 },
    { i: 'services-status', x: 4, y: 6, w: 4, h: 3, minW: 2, minH: 3 },
    { i: 'github-dashboard', x: 0, y: 9, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'email-inbox', x: 4, y: 9, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'todo-list', x: 0, y: 13, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'logs-viewer', x: 4, y: 13, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'cron-jobs', x: 0, y: 17, w: 8, h: 4, minW: 3, minH: 3 },
  ],
  sm: [
    { i: 'system-overview', x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 3 },
    { i: 'docker-containers', x: 0, y: 3, w: 4, h: 3, minW: 2, minH: 3 },
    { i: 'network-monitor', x: 0, y: 6, w: 4, h: 3, minW: 2, minH: 3 },
    { i: 'disk-usage', x: 0, y: 9, w: 4, h: 3, minW: 2, minH: 3 },
    { i: 'top-processes', x: 0, y: 12, w: 4, h: 3, minW: 2, minH: 3 },
    { i: 'services-status', x: 0, y: 15, w: 4, h: 3, minW: 2, minH: 3 },
    { i: 'github-dashboard', x: 0, y: 18, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'email-inbox', x: 0, y: 22, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'todo-list', x: 0, y: 26, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'logs-viewer', x: 0, y: 30, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'cron-jobs', x: 0, y: 34, w: 4, h: 4, minW: 2, minH: 3 },
  ],
};
