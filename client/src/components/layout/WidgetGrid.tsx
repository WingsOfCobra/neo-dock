/* ── WidgetGrid – react-grid-layout dashboard grid ─────────── */

import { useEffect, useState, useCallback, useMemo, Component, type ReactNode } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type ReactGridLayout from 'react-grid-layout';
import {
  BREAKPOINTS,
  COLS,
  DEFAULT_LAYOUTS,
  WIDGET_CONFIGS,
  type Layouts,
} from '@/lib/constants';
import { get, put } from '@/lib/api';

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
  'server-monitor': ServerMonitor,
  'docker-containers': DockerContainers,
  'services-status': ServicesStatus,
  'github-dashboard': GitHubDashboard,
  'email-inbox': EmailInbox,
  'todo-list': TodoList,
  'logs-viewer': LogsViewer,
  'cron-jobs': CronJobs,
};

/* ── Per-widget error boundary ─────────────────────────────── */

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

/* ── Grid ──────────────────────────────────────────────────── */

const ROW_HEIGHT = 80;

export function WidgetGrid() {
  const [layouts, setLayouts] = useState<Layouts>(DEFAULT_LAYOUTS);
  const [loaded, setLoaded] = useState(false);

  // Load persisted layout
  useEffect(() => {
    get<{ layouts?: Layouts }>('/layout')
      .then((data) => {
        if (data?.layouts) setLayouts(data.layouts);
      })
      .catch(() => {
        // Use defaults
      })
      .finally(() => setLoaded(true));
  }, []);

  // Persist layout on change
  const handleLayoutChange = useCallback(
    (_currentLayout: ReactGridLayout.Layout[], allLayouts: ReactGridLayout.Layouts) => {
      setLayouts(allLayouts as unknown as Layouts);
      put('/layout', { layouts: allLayouts }).catch(() => {
        // Silent fail — layout will reset on next load
      });
    },
    [],
  );

  const widgets = useMemo(
    () =>
      WIDGET_CONFIGS.map((config) => {
        const WidgetComponent = WIDGET_MAP[config.type];
        if (!WidgetComponent) return null;

        return (
          <div key={config.id} data-widget-id={config.id}>
            <WidgetErrorBoundary name={config.title}>
              <WidgetComponent />
            </WidgetErrorBoundary>
          </div>
        );
      }),
    [],
  );

  if (!loaded) return null;

  return (
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
  );
}
