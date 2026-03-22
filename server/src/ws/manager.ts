import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { config } from '../config.js';

/* ── Topic → group mapping ─────────────────────────────────── */

const TOPIC_GROUP: Record<string, string> = {
  'system:health': 'system',
  'system:disk': 'system',
  'system:processes': 'system',
  'docker:containers': 'docker',
  'docker:containerStats': 'docker',
  'docker:overview': 'docker',
  'services:status': 'services',
  'github:repos': 'github',
  'github:notifications': 'github',
  'email:unread': 'email',
  'cron:jobs': 'cron',
  'cron:health': 'cron',
  'todo:list': 'todos',
  'loki:logs': 'loki',
  'loki:labels': 'loki',
};

type TaggedWs = WebSocket & {
  isAlive: boolean;
  subscribedGroups: Set<string>;
  /** Which chef-api server this client is viewing. Empty string = default/first server. */
  subscribedServer: string;
};

export class WsManager {
  private wss: WebSocketServer;
  private clients: Set<TaggedWs> = new Set();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket, req) => {
      if (!this.authenticate(req)) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      const tagged = ws as TaggedWs;
      tagged.isAlive = true;
      // Default: subscribe to nothing until client tells us
      tagged.subscribedGroups = new Set();
      tagged.subscribedServer = '';
      this.clients.add(tagged);

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(String(raw)) as { type?: string; groups?: string[]; server?: string };
          if (msg.type === 'subscribe' && Array.isArray(msg.groups)) {
            tagged.subscribedGroups = new Set(msg.groups);
            tagged.subscribedServer = msg.server ?? '';
          }
        } catch {
          // ignore non-JSON or malformed
        }
      });

      ws.on('pong', () => {
        tagged.isAlive = true;
      });

      ws.on('close', () => {
        this.clients.delete(tagged);
      });

      ws.on('error', () => {
        this.clients.delete(tagged);
      });
    });

    this.startHeartbeat();
  }

  private authenticate(req: IncomingMessage): boolean {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const queryKey = url.searchParams.get('key');
    if (queryKey === config.apiKey) return true;

    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = parseCookieHeader(cookieHeader);
      if (cookies['neo_dock_key'] === config.apiKey) return true;
    }

    return false;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const ws of this.clients) {
        if (!ws.isAlive) {
          ws.terminate();
          this.clients.delete(ws);
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }, 30000);
  }

  /**
   * Returns true if at least one connected client is subscribed to the group
   * for a given server. Used by pollers to skip unnecessary API calls.
   */
  hasSubscribers(group: string, serverName?: string): boolean {
    for (const ws of this.clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      if (!ws.subscribedGroups.has(group)) continue;
      // If serverName is provided, only match clients viewing that server
      if (serverName !== undefined && ws.subscribedServer !== serverName) continue;
      return true;
    }
    return false;
  }

  /**
   * Broadcast a message only to clients subscribed to the topic's group
   * and viewing the specified server.
   * @param topic  - the WS topic name (e.g. 'system:health')
   * @param data   - payload
   * @param serverName - which server this data came from (empty string = default)
   */
  broadcast(topic: string, data: unknown, serverName?: string): void {
    const group = TOPIC_GROUP[topic];
    const message = JSON.stringify({ topic, data, timestamp: Date.now() });

    for (const ws of this.clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      // If we know the group, only send to subscribers. Unknown topics go to everyone.
      if (group && !ws.subscribedGroups.has(group)) continue;
      // If serverName is specified, only send to clients viewing that server
      if (serverName !== undefined && ws.subscribedServer !== serverName) continue;
      ws.send(message);
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }

  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const ws of this.clients) {
      ws.terminate();
    }
    this.clients.clear();
    this.wss.close();
  }
}

function parseCookieHeader(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}
