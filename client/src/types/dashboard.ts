/* ── Dashboard API types – matched to chef-api.types.ts ─────────── */

import type { paths } from './chef-api.types';
import type { Layouts } from '@/lib/constants';

// Extract response types from the generated API schema
type DashboardListResponse = paths['/dashboards/']['get']['responses'][200]['content']['application/json'];
type DashboardItemResponse = DashboardListResponse[number];
type ActiveDashboardResponse = paths['/dashboards/active']['get']['responses'][200]['content']['application/json'];

// Dashboard item from API
// Note: API returns widgets as JSON (unknown[]), but we use it as Layouts
export interface DashboardApiResponse {
  id: number;
  name: string;
  widgets: unknown;  // JSON from API (will be Layouts)
  createdAt?: string;
  updatedAt?: string;
}

// Dashboard with typed widgets for app use
export interface Dashboard {
  id: number;
  name: string;
  widgets: Layouts;
  createdAt?: string;
  updatedAt?: string;
}

// Active dashboard response - API uses activeDashboardId, not activeId
export interface ActiveDashboard {
  activeDashboardId: number | null;
}

// Request bodies
export interface CreateDashboardRequest {
  name: string;
  widgets: Layouts;
}

export interface UpdateDashboardRequest {
  name: string;
  widgets: Layouts;
}
