/* ── Card – Neo Militarism widget wrapper ─────────────────── */

import { type ReactNode } from 'react';

interface CardProps {
  title?: string;
  status?: 'ok' | 'warning' | 'error';
  loading?: boolean;
  error?: string | null;
  children: ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'red' | 'yellow';
}

const glowMap: Record<string, string> = {
  cyan: 'shadow-[0_0_20px_rgba(85,234,212,0.15)]',
  red: 'shadow-[0_0_20px_rgba(197,0,60,0.15)]',
  yellow: 'shadow-[0_0_20px_rgba(243,230,0,0.15)]',
};

const statusDot: Record<string, string> = {
  ok: 'bg-neo-cyan',
  warning: 'bg-neo-yellow',
  error: 'bg-neo-red',
};

export function Card({
  title,
  status,
  loading = false,
  error,
  children,
  className = '',
  glowColor,
}: CardProps) {
  const glow = glowColor ? glowMap[glowColor] ?? '' : '';

  return (
    <div
      className={`
        relative bg-neo-bg-surface border border-neo-border
        overflow-hidden
        ${glow}
        ${className}
      `.trim()}
      style={{
        clipPath:
          'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
      }}
    >
      {/* Scan-line overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
        }}
      />

      {/* Header */}
      {title && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-neo-border">
          {status && (
            <span
              className={`inline-block w-2 h-2 rounded-full ${statusDot[status] ?? 'bg-neo-text-disabled'}`}
            />
          )}
          <h3 className="font-display text-xs uppercase tracking-[0.15em] text-neo-text-secondary">
            {title}
          </h3>
        </div>
      )}

      {/* Body */}
      <div className="relative p-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-neo-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="text-neo-red text-sm font-mono">{error}</div>
        )}
        {!loading && !error && children}
      </div>
    </div>
  );
}
