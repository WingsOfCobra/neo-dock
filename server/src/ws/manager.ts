import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { config } from '../config.js';

/* ── Topic → group mapping ─────────────────────────────────── */

const TOPIC_GROUP: Record<string, string> = {
  'system:health': 'system',
  'system:disk': 'system',
  'docker:containers': 'docker',
  'docker:stats': 'docker',
  'services:status': 'services',
  'github:repos': 'github',
  'github:notifications': 'github',
  'email:unread': 'email',
  'cron:jobs': 'cron',
  'todo:list': 'todos',
  'loki:logs': 'loki',
  'loki:labels': 'loki',
};

type TaggedWs = WebSocket & {
  isAlive: boolean;
  subscribedGroups: Set<string>;
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
      this.clients.add(tagged);

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(String(raw)) as { type?: string; groups?: string[] };
          if (msg.type === 'subscribe' && Array.isArray(msg.groups)) {
            tagged.subscribedGroups = new Set(msg.groups);
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
   * Returns true if at least one connected client is subscribed to the group.
   * Used by pollers to skip unnecessary API calls.
   */
  hasSubscribers(group: string): boolean {
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN && ws.subscribedGroups.has(group)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Broadcast a message only to clients subscribed to the topic's group.
   */
  broadcast(topic: string, data: unknown): void {
    const group = TOPIC_GROUP[topic];
    const message = JSON.stringify({ topic, data, timestamp: Date.now() });

    for (const ws of this.clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      // If we know the group, only send to subscribers. Unknown topics go to everyone.
      if (group && !ws.subscribedGroups.has(group)) continue;
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
