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

export interface ChefServer {
  name: string;
  url: string;
  apiKey: string;
}

export interface Config {
  port: number;
  apiKey: string;
  chefApiUrl: string;
  chefApiKey: string;
  lokiUrl: string;
  pollIntervals: PollIntervals;
  monitoredServices: string[];
  /** Configured chef-api servers. Always has at least one entry. */
  servers: ChefServer[];
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

/**
 * Parse CHEF_SERVERS env var into server list.
 * Format: "name1=url1,name2=url2"
 * Per-server API keys via CHEF_API_KEY_<NAME> (uppercase), falling back to global CHEF_API_KEY.
 */
function parseServers(globalApiKey: string): ChefServer[] {
  const raw = process.env['CHEF_SERVERS'];
  if (!raw) {
    // Single-server fallback
    return [{
      name: 'default',
      url: process.env['CHEF_API_URL'] ?? 'http://localhost:4242',
      apiKey: globalApiKey,
    }];
  }

  const servers: ChefServer[] = [];
  for (const pair of raw.split(',')) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    const url = trimmed.slice(eqIdx + 1).trim();
    if (!name || !url) continue;

    const envKeyName = `CHEF_API_KEY_${name.toUpperCase()}`;
    const apiKey = process.env[envKeyName] ?? globalApiKey;
    servers.push({ name, url, apiKey });
  }

  if (servers.length === 0) {
    // Malformed CHEF_SERVERS — fall back to single server
    return [{
      name: 'default',
      url: process.env['CHEF_API_URL'] ?? 'http://localhost:4242',
      apiKey: globalApiKey,
    }];
  }

  return servers;
}

const globalChefApiKey = requireEnv('CHEF_API_KEY');
const servers = parseServers(globalChefApiKey);

export const config: Config = {
  port: envInt('NEO_DOCK_PORT', 3000),
  apiKey: requireEnv('NEO_DOCK_API_KEY'),
  chefApiUrl: servers[0].url,
  chefApiKey: servers[0].apiKey,
  lokiUrl: process.env['LOKI_URL'] ?? 'http://localhost:3100',
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
  servers,
};
