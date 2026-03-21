import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try root .env first (from src/ → server/ → root), then CWD
const rootEnv = resolve(__dirname, '../../.env');
const cwdEnv = resolve(process.cwd(), '.env');
const serverEnv = resolve(__dirname, '../.env');

for (const envPath of [rootEnv, cwdEnv, serverEnv]) {
  if (existsSync(envPath)) {
    dotenvConfig({ path: envPath });
    break;
  }
}

interface PollIntervals {
  system: number;
  docker: number;
  services: number;
  github: number;
  email: number;
  logs: number;
  cron: number;
}

export interface Config {
  port: number;
  apiKey: string;
  chefApiUrl: string;
  chefApiKey: string;
  pollIntervals: PollIntervals;
  monitoredServices: string[];
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function envInt(name: string, defaultVal: number): number {
  const raw = process.env[name];
  if (!raw) return defaultVal;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) return defaultVal;
  return parsed;
}

export const config: Config = {
  port: envInt('NEO_DOCK_PORT', 3000),
  apiKey: requireEnv('NEO_DOCK_API_KEY'),
  chefApiUrl: process.env['CHEF_API_URL'] ?? 'http://localhost:4242',
  chefApiKey: requireEnv('CHEF_API_KEY'),
  pollIntervals: {
    system: envInt('POLL_SYSTEM', 2),
    docker: envInt('POLL_DOCKER', 5),
    services: envInt('POLL_SERVICES', 30),
    github: envInt('POLL_GITHUB', 60),
    email: envInt('POLL_EMAIL', 30),
    logs: envInt('POLL_LOGS', 2),
    cron: envInt('POLL_CRON', 10),
  },
  monitoredServices: (process.env['MONITORED_SERVICES'] ?? 'nginx,docker,ssh,fail2ban')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
