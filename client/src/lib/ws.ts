export interface WsMessage {
  topic: string;
  data: unknown;
  timestamp: string;
}

export type WsMessageHandler = (msg: WsMessage) => void;
export type WsStateHandler = (connected: boolean) => void;

const MAX_BACKOFF = 30000;
const BASE_DELAY = 1000;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private intentionallyClosed = false;
  private onMessage: WsMessageHandler;
  private onStateChange: WsStateHandler;

  constructor(onMessage: WsMessageHandler, onStateChange: WsStateHandler) {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    this.url = `${protocol}://${location.host}/ws`;
    this.onMessage = onMessage;
    this.onStateChange = onStateChange;
  }

  connect(): void {
    this.intentionallyClosed = false;
    this.cleanup();

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.onStateChange(true);
      // Re-send subscription after reconnect
      if (this.pendingGroups.length > 0) {
        const msg: Record<string, unknown> = { type: 'subscribe', groups: this.pendingGroups };
        if (this.pendingServer) {
          msg['server'] = this.pendingServer;
        }
        this.send(msg);
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(String(event.data)) as WsMessage;
        this.onMessage(msg);
      } catch {
        // Ignore unparseable messages
      }
    };

    this.ws.onclose = () => {
      this.onStateChange(false);
      if (!this.intentionallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /** Tell the server which topic groups we want updates for. */
  subscribe(groups: string[], server?: string): void {
    this.pendingGroups = groups;
    this.pendingServer = server ?? '';
    const msg: Record<string, unknown> = { type: 'subscribe', groups };
    if (server) {
      msg['server'] = server;
    }
    this.send(msg);
  }

  private pendingGroups: string[] = [];
  private pendingServer = '';

  close(): void {
    this.intentionallyClosed = true;
    this.cleanup();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this.onStateChange(false);
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private scheduleReconnect(): void {
    if (this.intentionallyClosed) return;
    const delay = Math.min(BASE_DELAY * Math.pow(2, this.reconnectAttempt), MAX_BACKOFF);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private cleanup(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
