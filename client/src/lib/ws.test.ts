import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketClient, type WsMessage, type WsMessageHandler, type WsStateHandler } from './ws';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Auto-open on next tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.({});
    }, 0);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({});
  }

  // Test helper to simulate incoming message
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  // Test helper to simulate error
  simulateError() {
    this.onerror?.({});
  }
}

// Store all created mock instances
let mockInstances: MockWebSocket[] = [];

beforeEach(() => {
  mockInstances = [];
  vi.useFakeTimers();

  // Mock location for WebSocketClient constructor
  vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:3000' });

  // Mock WebSocket
  vi.stubGlobal('WebSocket', class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      mockInstances.push(this);
    }

    static override CONNECTING = 0;
    static override OPEN = 1;
    static override CLOSING = 2;
    static override CLOSED = 3;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('WebSocketClient', () => {
  let onMessage: WsMessageHandler;
  let onStateChange: WsStateHandler;

  beforeEach(() => {
    onMessage = vi.fn();
    onStateChange = vi.fn();
  });

  it('constructs with correct WebSocket URL', () => {
    const client = new WebSocketClient(onMessage, onStateChange);
    client.connect();
    expect(mockInstances).toHaveLength(1);
    expect(mockInstances[0].url).toBe('ws://localhost:3000/ws');
  });

  it('uses wss when location protocol is https', () => {
    vi.stubGlobal('location', { protocol: 'https:', host: 'example.com' });
    const client = new WebSocketClient(onMessage, onStateChange);
    client.connect();
    expect(mockInstances[0].url).toBe('wss://example.com/ws');
  });

  it('calls onStateChange(true) when connected', async () => {
    const client = new WebSocketClient(onMessage, onStateChange);
    client.connect();
    await vi.advanceTimersByTimeAsync(10);
    expect(onStateChange).toHaveBeenCalledWith(true);
  });

  it('calls onStateChange(false) when closed', async () => {
    const client = new WebSocketClient(onMessage, onStateChange);
    client.connect();
    await vi.advanceTimersByTimeAsync(10);
    client.close();
    expect(onStateChange).toHaveBeenCalledWith(false);
  });

  it('reports connected = true when WebSocket is open', async () => {
    const client = new WebSocketClient(onMessage, onStateChange);
    expect(client.connected).toBe(false);
    client.connect();
    await vi.advanceTimersByTimeAsync(10);
    expect(client.connected).toBe(true);
  });

  it('reports connected = false after close', async () => {
    const client = new WebSocketClient(onMessage, onStateChange);
    client.connect();
    await vi.advanceTimersByTimeAsync(10);
    client.close();
    expect(client.connected).toBe(false);
  });

  it('parses incoming messages and calls onMessage', async () => {
    const client = new WebSocketClient(onMessage, onStateChange);
    client.connect();
    await vi.advanceTimersByTimeAsync(10);

    const wsMsg: WsMessage = { topic: 'system:health', data: { cpu: 50 }, timestamp: '12345' };
    mockInstances[0].simulateMessage(wsMsg);
    expect(onMessage).toHaveBeenCalledWith(wsMsg);
  });

  it('ignores unparseable messages', async () => {
    const client = new WebSocketClient(onMessage, onStateChange);
    client.connect();
    await vi.advanceTimersByTimeAsync(10);

    // Simulate a non-JSON message directly
    mockInstances[0].onmessage?.({ data: 'not json{{{' });
    expect(onMessage).not.toHaveBeenCalled();
  });

  describe('subscribe', () => {
    it('sends subscribe message when connected', async () => {
      const client = new WebSocketClient(onMessage, onStateChange);
      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      client.subscribe(['system', 'docker']);
      expect(mockInstances[0].sentMessages).toHaveLength(1);
      const sent = JSON.parse(mockInstances[0].sentMessages[0]);
      expect(sent).toEqual({ type: 'subscribe', groups: ['system', 'docker'] });
    });

    it('re-sends pending groups on reconnect', async () => {
      const client = new WebSocketClient(onMessage, onStateChange);
      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      client.subscribe(['system', 'loki']);

      // Force a close (not intentional) to trigger reconnect
      mockInstances[0].readyState = MockWebSocket.CLOSED;
      mockInstances[0].onclose?.({});

      // Wait for reconnect timer (1000ms base delay)
      await vi.advanceTimersByTimeAsync(1100);

      // New WebSocket should have been created
      expect(mockInstances).toHaveLength(2);

      // Simulate open on the new WS
      await vi.advanceTimersByTimeAsync(10);

      // The subscribe message should have been re-sent
      const sent = mockInstances[1].sentMessages;
      expect(sent.length).toBeGreaterThanOrEqual(1);
      const lastSent = JSON.parse(sent[sent.length - 1]);
      expect(lastSent).toEqual({ type: 'subscribe', groups: ['system', 'loki'] });
    });
  });

  describe('reconnect behavior', () => {
    it('schedules reconnect on unexpected close', async () => {
      const client = new WebSocketClient(onMessage, onStateChange);
      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      // Simulate unexpected close
      mockInstances[0].readyState = MockWebSocket.CLOSED;
      mockInstances[0].onclose?.({});

      expect(mockInstances).toHaveLength(1);

      // After base delay (1000ms), should reconnect
      await vi.advanceTimersByTimeAsync(1100);
      expect(mockInstances).toHaveLength(2);
    });

    it('does not reconnect on intentional close', async () => {
      const client = new WebSocketClient(onMessage, onStateChange);
      client.connect();
      await vi.advanceTimersByTimeAsync(10);

      client.close();

      // Wait well beyond reconnect delay
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockInstances).toHaveLength(1);
    });

    it('increases delay between reconnect attempts', async () => {
      const client = new WebSocketClient(onMessage, onStateChange);
      client.connect();
      await vi.advanceTimersByTimeAsync(10);
      expect(mockInstances).toHaveLength(1);

      // Close unexpectedly (attempt 0 → schedules reconnect with 1s delay)
      mockInstances[0].readyState = MockWebSocket.CLOSED;
      mockInstances[0].onclose?.({});

      // Not reconnected yet at 500ms
      await vi.advanceTimersByTimeAsync(500);
      expect(mockInstances).toHaveLength(1);

      // Reconnected at 1000ms
      await vi.advanceTimersByTimeAsync(600);
      expect(mockInstances).toHaveLength(2);

      // Clean up to avoid further reconnects
      client.close();
    });
  });
});
