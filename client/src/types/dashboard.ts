/* ── Dashboard API types ──────────────────────────────────────── */

import type { Layouts } from '@/lib/constants';

export interface Dashboard {
  id: number;
  name: string;
  widgets: Layouts;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveDashboard {
  activeId: number | null;
}

export interface CreateDashboardRequest {
  name: string;
  widgets: Layouts;
}

export interface UpdateDashboardRequest {
  name?: string;
  widgets?: Layouts;
}
