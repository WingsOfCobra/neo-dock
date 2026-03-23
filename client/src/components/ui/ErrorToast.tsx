/* ── ErrorToast – fixed-position error notification ────────── */

import { useEffect, useState } from 'react';

export interface ErrorToastData {
  id: string;
  service: string;
  message: string;
  timestamp: number;
}

interface ErrorToastProps {
  errors: ErrorToastData[];
  onDismiss: (id: string) => void;
}

export function ErrorToast({ errors, onDismiss }: ErrorToastProps) {
  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2 max-w-md">
      {errors.map((error) => (
        <ErrorToastItem key={error.id} error={error} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ErrorToastItem({
  error,
  onDismiss,
}: {
  error: ErrorToastData;
  onDismiss: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(error.id), 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [error.id, onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(error.id), 300);
  };

  const time = new Date(error.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <div
      className={`
        bg-neo-bg-surface border border-neo-red/60 p-3
        transition-all duration-300
        ${exiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display text-[10px] uppercase tracking-[0.15em] text-neo-red">
              {error.service}
            </span>
            <span className="text-[10px] font-mono text-neo-text-disabled">
              {time}
            </span>
          </div>
          <p className="text-xs font-mono text-neo-text-secondary break-words">
            {error.message}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-neo-text-disabled hover:text-neo-red transition-colors text-sm"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
