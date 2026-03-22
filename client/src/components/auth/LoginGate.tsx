/* ── LoginGate – Red terminal API key login ────────────────── */

import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function LoginGate() {
  const [key, setKey] = useState('');
  const { login, error } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!key.trim() || submitting) return;
    setSubmitting(true);
    await login(key.trim());
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-neo-bg-deep flex items-center justify-center p-4 scan-lines noise-overlay">
      {/* Decorative corner lines */}
      <div className="absolute top-8 left-8 w-16 h-16 border-t border-l border-neo-red/40" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-b border-r border-neo-red/40" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm bg-neo-bg-surface border border-neo-red/30 p-8 pulse-glow"
        style={{
          clipPath:
            'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        }}
      >
        {/* Scan-line overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,51,0.08) 2px, rgba(255,0,51,0.08) 4px)',
          }}
        />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neo-red/60 to-transparent" />

        {/* Title */}
        <div className="text-center mb-8">
          <h1
            className="glitch font-display text-2xl tracking-[0.3em] text-neo-red mb-2"
            data-text="NEO-DOCK"
          >
            NEO-DOCK
          </h1>
          <p className="text-[10px] uppercase tracking-[0.15em] text-neo-text-disabled font-mono terminal-cursor">
            &gt; AUTHORIZATION REQUIRED
          </p>
        </div>

        {/* Key input */}
        <div className="space-y-1 mb-6">
          <label
            htmlFor="api-key"
            className="text-[10px] uppercase tracking-[0.12em] text-neo-red/60 font-mono"
          >
            ACCESS_KEY
          </label>
          <input
            id="api-key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoFocus
            placeholder="Enter access key..."
            className="w-full bg-neo-bg-deep border border-neo-border px-3 py-2 text-sm font-mono text-neo-text-primary placeholder:text-neo-text-disabled focus:border-neo-red focus:outline-none transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-neo-red text-xs font-mono mb-4 animate-pulse">
            [!] {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !key.trim()}
          className="w-full py-2 text-xs uppercase tracking-[0.15em] font-mono border border-neo-red text-neo-red hover:bg-neo-red/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {submitting ? '> AUTHENTICATING...' : '> AUTHENTICATE'}
        </button>

        {/* Bottom accent line */}
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-neo-red/40 to-transparent" />
      </form>
    </div>
  );
}
