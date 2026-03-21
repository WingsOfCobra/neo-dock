import type { WidgetConfig, WidgetType } from '@/types/widgets';

export const BREAKPOINTS = { lg: 1200, md: 996, sm: 768 } as const;
export const COLS = { lg: 12, md: 8, sm: 4 } as const;

export const WIDGET_CONFIGS: WidgetConfig[] = [
  { id: 'server-monitor', type: 'server-monitor', title: 'SERVER MONITOR' },
  { id: 'docker-containers', type: 'docker-containers', title: 'DOCKER' },
  { id: 'services-status', type: 'services-status', title: 'SERVICES' },
  { id: 'github-dashboard', type: 'github-dashboard', title: 'GITHUB' },
  { id: 'email-inbox', type: 'email-inbox', title: 'EMAIL' },
  { id: 'todo-list', type: 'todo-list', title: 'TODO' },
  { id: 'logs-viewer', type: 'logs-viewer', title: 'LOGS' },
  { id: 'cron-jobs', type: 'cron-jobs', title: 'CRON JOBS' },
];

export const WIDGET_LABELS: Record<WidgetType, string> = {
  'server-monitor': 'SRV',
  'docker-containers': 'DCK',
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
    { i: 'server-monitor', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'docker-containers', x: 6, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'services-status', x: 0, y: 4, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'github-dashboard', x: 3, y: 4, w: 5, h: 4, minW: 3, minH: 3 },
    { i: 'email-inbox', x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'todo-list', x: 0, y: 8, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'logs-viewer', x: 4, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'cron-jobs', x: 8, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
  ],
  md: [
    { i: 'server-monitor', x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'docker-containers', x: 4, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'services-status', x: 0, y: 4, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'github-dashboard', x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'email-inbox', x: 0, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'todo-list', x: 4, y: 8, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'logs-viewer', x: 0, y: 12, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'cron-jobs', x: 4, y: 12, w: 4, h: 4, minW: 3, minH: 3 },
  ],
  sm: [
    { i: 'server-monitor', x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'docker-containers', x: 0, y: 4, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'services-status', x: 0, y: 8, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'github-dashboard', x: 0, y: 12, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'email-inbox', x: 0, y: 16, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'todo-list', x: 0, y: 20, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'logs-viewer', x: 0, y: 24, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'cron-jobs', x: 0, y: 28, w: 4, h: 4, minW: 2, minH: 3 },
  ],
};
