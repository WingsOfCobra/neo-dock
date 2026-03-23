/* ── WidgetGrid – react-grid-layout dashboard grid with API persistence ── */

import { useEffect, useState, useCallback, useMemo, Component, type ReactNode } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type ReactGridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import {
  BREAKPOINTS,
  COLS,
  DEFAULT_LAYOUTS,
  WIDGET_CONFIGS,
  type Layouts,
} from '@/lib/constants';
import { get, post, put, del, ApiError } from '@/lib/api';
import type { Dashboard, ActiveDashboard, DashboardApiResponse } from '@/types/dashboard';

import { SystemOverview } from '@/components/widgets/SystemOverview';
import { DiskUsage } from '@/components/widgets/DiskUsage';
import { TopProcesses } from '@/components/widgets/TopProcesses';
import { NetworkMonitor } from '@/components/widgets/NetworkMonitor';
import { ServerMonitor } from '@/components/widgets/ServerMonitor';
import { DockerContainers } from '@/components/widgets/DockerContainers';
import { ServicesStatus } from '@/components/widgets/ServicesStatus';
import { GitHubDashboard } from '@/components/widgets/GitHubDashboard';
import { EmailInbox } from '@/components/widgets/EmailInbox';
import { TodoList } from '@/components/widgets/TodoList';
import { LogsViewer } from '@/components/widgets/LogsViewer';
import { CronJobs } from '@/components/widgets/CronJobs';
import { Card } from '@/components/ui/Card';

const ResponsiveGrid = WidthProvider(Responsive);

const WIDGET_MAP: Record<string, React.ComponentType> = {
  'system-overview': SystemOverview,
  'disk-usage': DiskUsage,
  'top-processes': TopProcesses,
  'network-monitor': NetworkMonitor,
  'server-monitor': ServerMonitor,
  'docker-containers': DockerContainers,
  'services-status': ServicesStatus,
  'github-dashboard': GitHubDashboard,
  'email-inbox': EmailInbox,
  'todo-list': TodoList,
  'logs-viewer': LogsViewer,
  'cron-jobs': CronJobs,
};

/* ── Per-widget error boundary ──────────────────────────────────── */

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WidgetErrorBoundary extends Component<
  { name: string; children: ReactNode },
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card title={this.props.name} status="error" glowColor="red">
          <div className="space-y-3 py-2">
            <p className="text-xs font-mono text-neo-red">
              Widget crashed: {this.state.error?.message ?? 'Unknown error'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-3 py-1.5 text-[10px] uppercase font-mono border border-neo-cyan text-neo-cyan hover:bg-neo-cyan/10 transition-colors"
            >
              Retry
            </button>
          </div>
        </Card>
      );
    }
    return this.props.children;
  }
}

/* ── Dashboard Toolbar ──────────────────────────────────────────── */

interface DashboardToolbarProps {
  dashboards: Dashboard[];
  activeDashboard: Dashboard | null;
  onSwitchDashboard: (id: number) => void;
  onCreateDashboard: () => void;
  onDeleteDashboard: (id: number) => void;
  onAddWidget: (widgetId: string) => void;
  availableWidgets: string[];
}

function DashboardToolbar({
  dashboards,
  activeDashboard,
  onSwitchDashboard,
  onCreateDashboard,
  onDeleteDashboard,
  onAddWidget,
  availableWidgets,
}: DashboardToolbarProps) {
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);

  return (
    <div className="flex items-center gap-3 mb-3 p-2 bg-neo-bg-surface border border-neo-border">
      {/* Dashboard switcher */}
      <div className="relative">
        <button
          onClick={() => setShowDashboardMenu(!showDashboardMenu)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono border border-neo-red text-neo-red hover:bg-neo-red/10 transition-colors uppercase"
        >
          <span>◆</span>
          <span>{activeDashboard?.name ?? 'No Dashboard'}</span>
          <span className="text-[8px]">▼</span>
        </button>
        {showDashboardMenu && (
          <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-neo-bg-elevated border border-neo-border z-50 shadow-lg">
            {dashboards.map((dash) => (
              <button
                key={dash.id}
                onClick={() => {
                  onSwitchDashboard(dash.id);
                  setShowDashboardMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-mono hover:bg-neo-red/10 transition-colors ${
                  dash.id === activeDashboard?.id ? 'text-neo-red' : 'text-neo-text-secondary'
                }`}
              >
                {dash.name}
              </button>
            ))}
            <div className="border-t border-neo-border my-1" />
            <button
              onClick={() => {
                onCreateDashboard();
                setShowDashboardMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-xs font-mono text-neo-cyan hover:bg-neo-cyan/10 transition-colors"
            >
              <span className="mr-2">◈</span>New Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Delete dashboard button */}
      {activeDashboard && dashboards.length > 1 && (
        <button
          onClick={() => {
            if (confirm(`Delete dashboard "${activeDashboard.name}"?`)) {
              onDeleteDashboard(activeDashboard.id);
            }
          }}
          className="px-3 py-1.5 text-xs font-mono border border-neo-red/50 text-neo-red/50 hover:bg-neo-red/10 transition-colors"
          title="Delete Dashboard"
        >
          ✕
        </button>
      )}

      {/* Add widget button */}
      <div className="relative ml-auto">
        <button
          onClick={() => setShowWidgetMenu(!showWidgetMenu)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono border border-neo-cyan text-neo-cyan hover:bg-neo-cyan/10 transition-colors uppercase"
          disabled={availableWidgets.length === 0}
        >
          <span>◈</span>
          <span>Add Widget</span>
        </button>
        {showWidgetMenu && availableWidgets.length > 0 && (
          <div className="absolute top-full right-0 mt-1 min-w-[200px] max-h-[400px] overflow-y-auto bg-neo-bg-elevated border border-neo-border z-50 shadow-lg">
            {availableWidgets.map((widgetId) => {
              const config = WIDGET_CONFIGS.find((w) => w.id === widgetId);
              if (!config) return null;
              return (
                <button
                  key={widgetId}
                  onClick={() => {
                    onAddWidget(widgetId);
                    setShowWidgetMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-mono text-neo-text-secondary hover:bg-neo-cyan/10 hover:text-neo-cyan transition-colors"
                >
                  {config.title}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Grid ───────────────────────────────────────────────────────── */

const ROW_HEIGHT = 80;
const LOCALSTORAGE_KEY = 'neo-dock-dashboard';
const SAVE_DEBOUNCE_MS = 500;

export function WidgetGrid() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeDashboardId, setActiveDashboardId] = useState<number | null>(null);
  const [layouts, setLayouts] = useState<Layouts>(DEFAULT_LAYOUTS);
  const [loaded, setLoaded] = useState(false);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [saveTimeoutId, setSaveTimeoutId] = useState<number | null>(null);

  const activeDashboard = useMemo(
    () => dashboards.find((d) => d.id === activeDashboardId) ?? null,
    [dashboards, activeDashboardId],
  );

  const currentWidgetIds = useMemo(() => {
    return layouts.lg?.map((item) => item.i) ?? [];
  }, [layouts]);

  const availableWidgets = useMemo(() => {
    return WIDGET_CONFIGS.map((w) => w.id).filter((id) => !currentWidgetIds.includes(id));
  }, [currentWidgetIds]);

  // Load dashboards on mount
  useEffect(() => {
    loadDashboards();
  }, []);

  async function loadDashboards() {
    try {
      // Try to get active dashboard
      const activeData = await get<ActiveDashboard>('/chef/dashboards/active');
      const dashboardsDataRaw = await get<DashboardApiResponse[]>('/chef/dashboards');

      // Convert API response to typed dashboards
      const dashboardsData: Dashboard[] = dashboardsDataRaw.map((d) => ({
        ...d,
        widgets: d.widgets as Layouts, // API returns JSON, cast to Layouts
      }));

      if (dashboardsData.length === 0) {
        // No dashboards exist, create default
        const defaultDashboardRaw = await post<DashboardApiResponse>('/chef/dashboards', {
          name: 'Default',
          widgets: DEFAULT_LAYOUTS,
        });
        const defaultDashboard: Dashboard = {
          ...defaultDashboardRaw,
          widgets: defaultDashboardRaw.widgets as Layouts,
        };
        setDashboards([defaultDashboard]);
        await post(`/chef/dashboards/${defaultDashboard.id}/activate`, {});
        setActiveDashboardId(defaultDashboard.id);
        setLayouts(defaultDashboard.widgets);
      } else {
        setDashboards(dashboardsData);
        // Fix: API returns activeDashboardId, not activeId
        const activeId = activeData.activeDashboardId ?? dashboardsData[0].id;
        setActiveDashboardId(activeId);
        const active = dashboardsData.find((d) => d.id === activeId);
        if (active) {
          setLayouts(active.widgets);
        }
      }
      setUseLocalStorage(false);
    } catch (err) {
      // Fall back to localStorage
      console.warn('Dashboard API not available, using localStorage:', err);
      setUseLocalStorage(true);
      const stored = localStorage.getItem(LOCALSTORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { layouts: Layouts };
          setLayouts(parsed.layouts);
        } catch {
          // Invalid data, use defaults
        }
      }
    } finally {
      setLoaded(true);
    }
  }

  // Debounced save
  const saveLayouts = useCallback(
    (newLayouts: Layouts) => {
      if (saveTimeoutId !== null) {
        clearTimeout(saveTimeoutId);
      }

      const timeoutId = window.setTimeout(() => {
        if (useLocalStorage) {
          localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ layouts: newLayouts }));
        } else if (activeDashboardId !== null) {
          put(`/chef/dashboards/${activeDashboardId}`, { widgets: newLayouts }).catch((err) => {
            console.error('Failed to save dashboard:', err);
          });
        }
      }, SAVE_DEBOUNCE_MS);

      setSaveTimeoutId(timeoutId);
    },
    [saveTimeoutId, useLocalStorage, activeDashboardId],
  );

  // Handle layout change
  const handleLayoutChange = useCallback(
    (_currentLayout: ReactGridLayout.Layout[], allLayouts: ReactGridLayout.Layouts) => {
      const newLayouts = allLayouts as unknown as Layouts;
      setLayouts(newLayouts);
      saveLayouts(newLayouts);
    },
    [saveLayouts],
  );

  // Switch dashboard
  const handleSwitchDashboard = useCallback(
    async (id: number) => {
      try {
        await post(`/chef/dashboards/${id}/activate`, {});
        setActiveDashboardId(id);
        const dash = dashboards.find((d) => d.id === id);
        if (dash) {
          setLayouts(dash.widgets);
        }
      } catch (err) {
        console.error('Failed to switch dashboard:', err);
      }
    },
    [dashboards],
  );

  // Create new dashboard
  const handleCreateDashboard = useCallback(async () => {
    const name = prompt('Dashboard name:');
    if (!name) return;

    try {
      const newDashboardRaw = await post<DashboardApiResponse>('/chef/dashboards', {
        name,
        widgets: DEFAULT_LAYOUTS,
      });
      const newDashboard: Dashboard = {
        ...newDashboardRaw,
        widgets: newDashboardRaw.widgets as Layouts,
      };
      setDashboards((prev) => [...prev, newDashboard]);
      await post(`/chef/dashboards/${newDashboard.id}/activate`, {});
      setActiveDashboardId(newDashboard.id);
      setLayouts(newDashboard.widgets);
    } catch (err) {
      console.error('Failed to create dashboard:', err);
      alert('Failed to create dashboard. Using localStorage mode.');
    }
  }, []);

  // Delete dashboard
  const handleDeleteDashboard = useCallback(
    async (id: number) => {
      try {
        await del(`/chef/dashboards/${id}`);
        setDashboards((prev) => prev.filter((d) => d.id !== id));
        
        // Switch to first remaining dashboard
        const remaining = dashboards.filter((d) => d.id !== id);
        if (remaining.length > 0) {
          await handleSwitchDashboard(remaining[0].id);
        }
      } catch (err) {
        console.error('Failed to delete dashboard:', err);
      }
    },
    [dashboards, handleSwitchDashboard],
  );

  // Add widget
  const handleAddWidget = useCallback(
    (widgetId: string) => {
      const config = WIDGET_CONFIGS.find((w) => w.id === widgetId);
      if (!config) return;

      // Find a good position (top-right corner or next available spot)
      const maxY = Math.max(...layouts.lg.map((item) => item.y + item.h), 0);
      
      const newLayouts: Layouts = {
        lg: [...layouts.lg, { i: widgetId, x: 0, y: maxY, w: 4, h: 4, minW: 2, minH: 3 }],
        md: [...layouts.md, { i: widgetId, x: 0, y: maxY, w: 4, h: 4, minW: 2, minH: 3 }],
        sm: [...layouts.sm, { i: widgetId, x: 0, y: maxY * 2, w: 4, h: 4, minW: 2, minH: 3 }],
      };

      setLayouts(newLayouts);
      saveLayouts(newLayouts);
    },
    [layouts, saveLayouts],
  );

  // Remove widget
  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      const newLayouts: Layouts = {
        lg: layouts.lg.filter((item) => item.i !== widgetId),
        md: layouts.md.filter((item) => item.i !== widgetId),
        sm: layouts.sm.filter((item) => item.i !== widgetId),
      };

      setLayouts(newLayouts);
      saveLayouts(newLayouts);
    },
    [layouts, saveLayouts],
  );

  const widgets = useMemo(
    () =>
      currentWidgetIds.map((widgetId) => {
        const config = WIDGET_CONFIGS.find((w) => w.id === widgetId);
        const WidgetComponent = WIDGET_MAP[widgetId];
        if (!WidgetComponent || !config) return null;

        return (
          <div key={widgetId} data-widget-id={widgetId} className="relative group">
            <WidgetErrorBoundary name={config.title}>
              <WidgetComponent />
            </WidgetErrorBoundary>
            {/* Remove button - visible on hover */}
            <button
              onClick={() => handleRemoveWidget(widgetId)}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-neo-bg-elevated border border-neo-red/50 text-neo-red/50 hover:bg-neo-red/20 hover:text-neo-red hover:border-neo-red opacity-0 group-hover:opacity-100 transition-opacity z-10 text-xs"
              title="Remove widget"
            >
              ✕
            </button>
          </div>
        );
      }),
    [currentWidgetIds, handleRemoveWidget],
  );

  if (!loaded) return null;

  return (
    <div className="p-3 animate-fade-in">
      <DashboardToolbar
        dashboards={dashboards}
        activeDashboard={activeDashboard}
        onSwitchDashboard={handleSwitchDashboard}
        onCreateDashboard={handleCreateDashboard}
        onDeleteDashboard={handleDeleteDashboard}
        onAddWidget={handleAddWidget}
        availableWidgets={availableWidgets}
      />
      <ResponsiveGrid
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".react-grid-item"
        compactType="vertical"
        margin={[12, 12]}
        containerPadding={[12, 12]}
        isResizable
        isDraggable
        useCSSTransforms
      >
        {widgets}
      </ResponsiveGrid>
    </div>
  );
}
