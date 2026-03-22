/* ── DockerPage – dedicated Docker view ───────────────────── */

import { DockerContainers } from '@/components/widgets/DockerContainers';

export function DockerPage() {
  return (
    <div className="p-3 space-y-3 animate-fade-in">
      <div className="font-mono text-[10px] text-neo-red/40 px-1">
        &gt; DOCKER_ENGINE // containers + stats
      </div>
      <DockerContainers />
    </div>
  );
}
