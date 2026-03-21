import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { parse as parseCookie } from 'node:querystring';
import { config } from '../config.js';

export class WsManager {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws, req) => {
      if (!this.authenticate(req)) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      this.clients.add(ws);
      (ws as WebSocket & { isAlive: boolean }).isAlive = true;

      ws.on('pong', () => {
        (ws as WebSocket & { isAlive: boolean }).isAlive = true;
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });

    this.startHeartbeat();
  }

  private authenticate(req: IncomingMessage): boolean {
    // Check query param
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const queryKey = url.searchParams.get('key');
    if (queryKey === config.apiKey) return true;

    // Check cookie
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
        const tagged = ws as WebSocket & { isAlive: boolean };
        if (!tagged.isAlive) {
          ws.terminate();
          this.clients.delete(ws);
          continue;
        }
        tagged.isAlive = false;
        ws.ping();
      }
    }, 30000);
  }

  broadcast(topic: string, data: unknown): void {
    const message = JSON.stringify({
      topic,
      data,
      timestamp: Date.now(),
    });

    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
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
