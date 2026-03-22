/* ── TasksPage – Todos + Cron Jobs combined view ─────────── */

import { TodoList } from '@/components/widgets/TodoList';
import { CronJobs } from '@/components/widgets/CronJobs';

export function TasksPage() {
  return (
    <div className="p-3 space-y-3 animate-fade-in">
      <div className="font-mono text-[10px] text-neo-red/40 px-1">
        &gt; TASK_SCHEDULER // todo + cron management
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TodoList />
        <CronJobs />
      </div>
    </div>
  );
}
