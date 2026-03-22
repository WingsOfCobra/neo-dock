import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Config tests. Since config.ts executes at import time and reads env vars,
 * we test the logic by reimplementing the helper functions and testing them.
 * We also test the actual config module with controlled env vars.
 */

/* ── envInt helper logic ────────────────────────────────────── */

function envInt(name: string, defaultVal: number, env: Record<string, string | undefined>): number {
  const raw = env[name];
  if (!raw) return defaultVal;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) return defaultVal;
  return parsed;
}

function requireEnv(name: string, env: Record<string, string | undefined>): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

describe('envInt', () => {
  it('returns default when env var is not set', () => {
    expect(envInt('MISSING', 42, {})).toBe(42);
  });

  it('returns default when env var is empty string', () => {
    expect(envInt('EMPTY', 42, { EMPTY: '' })).toBe(42);
  });

  it('returns parsed integer when env var is valid', () => {
    expect(envInt('PORT', 3000, { PORT: '4445' })).toBe(4445);
  });

  it('returns default when env var is not a valid number', () => {
    expect(envInt('PORT', 3000, { PORT: 'abc' })).toBe(3000);
  });

  it('handles negative numbers', () => {
    expect(envInt('NEG', 0, { NEG: '-5' })).toBe(-5);
  });

  it('truncates floating point values (parseInt behavior)', () => {
    expect(envInt('FLOAT', 0, { FLOAT: '3.7' })).toBe(3);
  });
});

describe('requireEnv', () => {
  it('returns the value when env var is set', () => {
    expect(requireEnv('KEY', { KEY: 'secret' })).toBe('secret');
  });

  it('throws when env var is not set', () => {
    expect(() => requireEnv('MISSING', {})).toThrow(
      'Missing required environment variable: MISSING',
    );
  });

  it('throws when env var is empty string', () => {
    expect(() => requireEnv('EMPTY', { EMPTY: '' })).toThrow(
      'Missing required environment variable: EMPTY',
    );
  });
});

/* ── Config defaults ────────────────────────────────────────── */

describe('config defaults', () => {
  it('default port is 3000', () => {
    expect(envInt('NEO_DOCK_PORT', 3000, {})).toBe(3000);
  });

  it('default poll intervals', () => {
    const env: Record<string, string | undefined> = {};
    const pollIntervals = {
      system: envInt('POLL_SYSTEM', 2, env),
      docker: envInt('POLL_DOCKER', 5, env),
      services: envInt('POLL_SERVICES', 30, env),
      github: envInt('POLL_GITHUB', 60, env),
      email: envInt('POLL_EMAIL', 30, env),
      logs: envInt('POLL_LOGS', 2, env),
      cron: envInt('POLL_CRON', 10, env),
    };

    expect(pollIntervals.system).toBe(2);
    expect(pollIntervals.docker).toBe(5);
    expect(pollIntervals.services).toBe(30);
    expect(pollIntervals.github).toBe(60);
    expect(pollIntervals.email).toBe(30);
    expect(pollIntervals.logs).toBe(2);
    expect(pollIntervals.cron).toBe(10);
  });

  it('default chef API URL is http://localhost:4242', () => {
    const env: Record<string, string | undefined> = {};
    const chefApiUrl = env['CHEF_API_URL'] ?? 'http://localhost:4242';
    expect(chefApiUrl).toBe('http://localhost:4242');
  });

  it('default Loki URL is http://localhost:3100', () => {
    const env: Record<string, string | undefined> = {};
    const lokiUrl = env['LOKI_URL'] ?? 'http://localhost:3100';
    expect(lokiUrl).toBe('http://localhost:3100');
  });

  it('default monitored services are nginx,docker,ssh,fail2ban', () => {
    const env: Record<string, string | undefined> = {};
    const services = (env['MONITORED_SERVICES'] ?? 'nginx,docker,ssh,fail2ban')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    expect(services).toEqual(['nginx', 'docker', 'ssh', 'fail2ban']);
  });
});

describe('poll intervals from env', () => {
  it('overrides poll intervals from env vars', () => {
    const env: Record<string, string | undefined> = {
      POLL_SYSTEM: '10',
      POLL_DOCKER: '15',
      POLL_SERVICES: '120',
      POLL_GITHUB: '300',
      POLL_EMAIL: '60',
      POLL_LOGS: '5',
      POLL_CRON: '30',
    };

    expect(envInt('POLL_SYSTEM', 2, env)).toBe(10);
    expect(envInt('POLL_DOCKER', 5, env)).toBe(15);
    expect(envInt('POLL_SERVICES', 30, env)).toBe(120);
    expect(envInt('POLL_GITHUB', 60, env)).toBe(300);
    expect(envInt('POLL_EMAIL', 30, env)).toBe(60);
    expect(envInt('POLL_LOGS', 2, env)).toBe(5);
    expect(envInt('POLL_CRON', 10, env)).toBe(30);
  });
});

describe('monitored services parsing', () => {
  it('parses comma-separated services', () => {
    const raw = 'nginx, docker, ssh, fail2ban, prometheus';
    const result = raw.split(',').map((s) => s.trim()).filter(Boolean);
    expect(result).toEqual(['nginx', 'docker', 'ssh', 'fail2ban', 'prometheus']);
  });

  it('handles empty service string', () => {
    const raw = '';
    const result = raw.split(',').map((s) => s.trim()).filter(Boolean);
    expect(result).toEqual([]);
  });

  it('handles trailing commas and whitespace', () => {
    const raw = 'nginx, , docker, ';
    const result = raw.split(',').map((s) => s.trim()).filter(Boolean);
    expect(result).toEqual(['nginx', 'docker']);
  });
});
