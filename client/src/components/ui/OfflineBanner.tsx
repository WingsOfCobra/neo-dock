/* ── OfflineBanner – cached data warning bar ─────────────── */

interface OfflineBannerProps {
  cacheTimestamp: number | null;
}

function formatAge(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

export function OfflineBanner({ cacheTimestamp }: OfflineBannerProps) {
  if (cacheTimestamp === null) return null;

  return (
    <div className="relative h-7 bg-neo-warn/10 border-b border-neo-warn/30 flex items-center justify-center px-4 shrink-0 z-40">
      <span className="font-mono text-[10px] text-neo-warn tracking-wider uppercase">
        {'> '}OPERATING ON CACHED DATA &mdash; last updated{' '}
        {formatAge(cacheTimestamp)}
      </span>
    </div>
  );
}
