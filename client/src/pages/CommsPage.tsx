/* ── CommsPage – GitHub + Email combined view ─────────────── */

import { GitHubDashboard } from '@/components/widgets/GitHubDashboard';
import { EmailInbox } from '@/components/widgets/EmailInbox';

export function CommsPage() {
  return (
    <div className="p-3 space-y-3 animate-fade-in">
      <div className="font-mono text-[10px] text-neo-red/40 px-1">
        &gt; COMMS_TERMINAL // github + email feeds
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GitHubDashboard />
        <EmailInbox />
      </div>
    </div>
  );
}
