/* ── DashboardPage – overview with all widgets in fixed grid ── */

import { SystemOverview } from '@/components/widgets/SystemOverview';
import { DiskUsage } from '@/components/widgets/DiskUsage';
import { TopProcesses } from '@/components/widgets/TopProcesses';
import { DockerContainers } from '@/components/widgets/DockerContainers';
import { ServicesStatus } from '@/components/widgets/ServicesStatus';
import { GitHubDashboard } from '@/components/widgets/GitHubDashboard';
import { EmailInbox } from '@/components/widgets/EmailInbox';
import { TodoList } from '@/components/widgets/TodoList';
import { LogsViewer } from '@/components/widgets/LogsViewer';
import { CronJobs } from '@/components/widgets/CronJobs';
import { NetworkMonitor } from '@/components/widgets/NetworkMonitor';

export function DashboardPage() {
  return (
    <div className="p-3 space-y-3 animate-fade-in">
      {/* Row 1: System vitals + Docker + Network */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        <SystemOverview />
        <DockerContainers compact />
        <NetworkMonitor compact />
      </div>

      {/* Row 2: Disk + Processes + Services */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
        <DiskUsage />
        <TopProcesses />
        <ServicesStatus compact />
      </div>

      {/* Row 3: Comms + Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
        <GitHubDashboard compact />
        <EmailInbox compact />
        <TodoList compact />
      </div>

      {/* Row 4: Logs + Cron */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        <LogsViewer />
        <CronJobs compact />
      </div>
    </div>
  );
}
