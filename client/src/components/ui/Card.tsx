/* ── Card – Red terminal widget wrapper ────────────────────── */

import { type ReactNode } from 'react';

interface CardProps {
  title?: string;
  status?: 'ok' | 'warning' | 'error';
  loading?: boolean;
  error?: string | null;
  children: ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'red' | 'yellow';
  actions?: ReactNode;
}

const statusDot: Record<string, string> = {
  ok: 'bg-neo-red shadow-[0_0_6px_rgba(255,0,51,0.6)]',
  warning: 'bg-neo-yellow',
  error: 'bg-neo-red animate-pulse',
};

export function Card({
  title,
  status,
  loading = false,
  error,
  children,
  className = '',
  actions,
}: CardProps) {
  return (
    <div
      className={`
        relative h-full bg-neo-bg-surface/90 border border-neo-border
        overflow-hidden pulse-glow
        ${className}
      `.trim()}
      style={{
        clipPath:
          'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
      }}
    >
      {/* Red scan-line overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,51,0.08) 2px, rgba(255,0,51,0.08) 4px)',
        }}
      />

      {/* Animated top border line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neo-red/50 to-transparent" />

      {/* Header — terminal style */}
      {title && (
        <div className="relative flex items-center gap-2 px-3 py-1.5 border-b border-neo-border bg-neo-bg-deep/50">
          {status && (
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${statusDot[status] ?? 'bg-neo-text-disabled'}`}
            />
          )}
          <span className="text-neo-red/40 font-mono text-[10px]">&gt;</span>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-neo-red">
            {title}
          </h3>
          <div className="flex-1" />
          {actions && <div className="flex items-center gap-1">{actions}</div>}
          <span className="text-neo-text-disabled font-mono text-[8px]">
            [{status === 'ok' ? 'ACTIVE' : status === 'error' ? 'ERROR' : 'STANDBY'}]
          </span>
        </div>
      )}

      {/* Body */}
      <div className="relative p-3">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-neo-red border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-mono text-neo-red/60 animate-pulse">LOADING...</span>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="text-neo-red text-xs font-mono flex items-center gap-2">
            <span className="text-neo-red animate-pulse">[!]</span>
            {error}
          </div>
        )}
        {!loading && !error && children}
      </div>
    </div>
  );
}
