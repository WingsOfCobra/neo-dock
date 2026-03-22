/* ── DashboardPage – overview with all widgets in fixed grid ── */

import { ServerMonitor } from '@/components/widgets/ServerMonitor';
import { DockerContainers } from '@/components/widgets/DockerContainers';
import { ServicesStatus } from '@/components/widgets/ServicesStatus';
import { GitHubDashboard } from '@/components/widgets/GitHubDashboard';
import { EmailInbox } from '@/components/widgets/EmailInbox';
import { TodoList } from '@/components/widgets/TodoList';
import { LogsViewer } from '@/components/widgets/LogsViewer';
import { CronJobs } from '@/components/widgets/CronJobs';

export function DashboardPage() {
  return (
    <div className="p-3 space-y-3 animate-fade-in">
      {/* Row 1: System overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ServerMonitor />
        <DockerContainers compact />
      </div>

      {/* Row 2: Services + Comms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ServicesStatus compact />
        <GitHubDashboard compact />
        <EmailInbox compact />
      </div>

      {/* Row 3: Tasks + Logs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TodoList compact />
        <LogsViewer />
        <CronJobs compact />
      </div>
    </div>
  );
}
