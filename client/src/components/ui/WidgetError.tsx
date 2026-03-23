/* ── WidgetError – inline error state for widgets ──────────── */

interface WidgetErrorProps {
  service?: string;
  message: string;
  compact?: boolean;
}

export function WidgetError({ service, message, compact = false }: WidgetErrorProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-neo-red/40 bg-neo-red/5">
        <span className="text-neo-red text-xl leading-none">⚠</span>
        <p className="text-xs font-mono text-neo-text-secondary flex-1">
          Failed to load{service && ` ${service}`} — {message}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-neo-red/40 bg-neo-red/5">
      <div className="flex items-start gap-3">
        <span className="text-neo-red text-2xl leading-none">⚠</span>
        <div className="flex-1">
          {service && (
            <h3 className="font-display text-xs uppercase tracking-[0.15em] text-neo-red mb-1">
              {service} Error
            </h3>
          )}
          <p className="text-xs font-mono text-neo-text-secondary">
            Failed to load — {message}
          </p>
        </div>
      </div>
    </div>
  );
}
