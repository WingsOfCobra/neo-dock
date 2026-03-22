import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * WsManager tests. Since WsManager depends on ws.WebSocketServer and
 * http.Server, we test the core logic by mocking the WebSocket layer.
 * We re-implement the topic-group mapping logic and test broadcast filtering.
 */

/* ── Topic-group mapping (mirrored from manager.ts) ─────────── */

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

describe('topic-group mapping', () => {
  it('maps system topics to system group', () => {
    expect(TOPIC_GROUP['system:health']).toBe('system');
    expect(TOPIC_GROUP['system:disk']).toBe('system');
    expect(TOPIC_GROUP['system:processes']).toBe('system');
  });

  it('maps docker topics to docker group', () => {
    expect(TOPIC_GROUP['docker:containers']).toBe('docker');
    expect(TOPIC_GROUP['docker:containerStats']).toBe('docker');
    expect(TOPIC_GROUP['docker:overview']).toBe('docker');
  });

  it('maps services topic to services group', () => {
    expect(TOPIC_GROUP['services:status']).toBe('services');
  });

  it('maps github topics to github group', () => {
    expect(TOPIC_GROUP['github:repos']).toBe('github');
    expect(TOPIC_GROUP['github:notifications']).toBe('github');
  });

  it('maps email topic to email group', () => {
    expect(TOPIC_GROUP['email:unread']).toBe('email');
  });

  it('maps cron topics to cron group', () => {
    expect(TOPIC_GROUP['cron:jobs']).toBe('cron');
    expect(TOPIC_GROUP['cron:health']).toBe('cron');
  });

  it('maps todo topic to todos group', () => {
    expect(TOPIC_GROUP['todo:list']).toBe('todos');
  });

  it('maps loki topics to loki group', () => {
    expect(TOPIC_GROUP['loki:logs']).toBe('loki');
    expect(TOPIC_GROUP['loki:labels']).toBe('loki');
  });

  it('returns undefined for unknown topics', () => {
    expect(TOPIC_GROUP['unknown:topic']).toBeUndefined();
  });
});

/* ── Broadcast filtering logic ──────────────────────────────── */

interface MockClient {
  readyState: number;
  subscribedGroups: Set<string>;
  sent: string[];
  send(data: string): void;
}

const WS_OPEN = 1;
const WS_CLOSED = 3;

function createMockClient(groups: string[], readyState = WS_OPEN): MockClient {
  const sent: string[] = [];
  return {
    readyState,
    subscribedGroups: new Set(groups),
    sent,
    send(data: string) {
      sent.push(data);
    },
  };
}

/**
 * Reimplements the broadcast logic from WsManager.broadcast()
 * to test it in isolation without needing a real HTTP server.
 */
function broadcast(clients: Set<MockClient>, topic: string, data: unknown) {
  const group = TOPIC_GROUP[topic];
  const message = JSON.stringify({ topic, data, timestamp: Date.now() });

  for (const ws of clients) {
    if (ws.readyState !== WS_OPEN) continue;
    if (group && !ws.subscribedGroups.has(group)) continue;
    ws.send(message);
  }
}

describe('broadcast filtering', () => {
  let clients: Set<MockClient>;

  beforeEach(() => {
    clients = new Set();
  });

  it('sends to clients subscribed to the matching group', () => {
    const systemClient = createMockClient(['system']);
    const dockerClient = createMockClient(['docker']);
    clients.add(systemClient);
    clients.add(dockerClient);

    broadcast(clients, 'system:health', { cpu: 50 });

    expect(systemClient.sent).toHaveLength(1);
    expect(dockerClient.sent).toHaveLength(0);
  });

  it('sends to all subscribed clients for the same group', () => {
    const client1 = createMockClient(['system']);
    const client2 = createMockClient(['system', 'docker']);
    clients.add(client1);
    clients.add(client2);

    broadcast(clients, 'system:disk', [{ device: '/dev/sda1' }]);

    expect(client1.sent).toHaveLength(1);
    expect(client2.sent).toHaveLength(1);
  });

  it('does not send to clients not subscribed to the group', () => {
    const emailClient = createMockClient(['email']);
    clients.add(emailClient);

    broadcast(clients, 'docker:containers', []);
    expect(emailClient.sent).toHaveLength(0);
  });

  it('does not send to closed connections', () => {
    const closedClient = createMockClient(['system'], WS_CLOSED);
    clients.add(closedClient);

    broadcast(clients, 'system:health', {});
    expect(closedClient.sent).toHaveLength(0);
  });

  it('sends unknown topics to all open clients', () => {
    const client1 = createMockClient(['system']);
    const client2 = createMockClient(['docker']);
    clients.add(client1);
    clients.add(client2);

    broadcast(clients, 'unknown:topic', { data: 'test' });

    expect(client1.sent).toHaveLength(1);
    expect(client2.sent).toHaveLength(1);
  });

  it('sends correct JSON message format', () => {
    const client = createMockClient(['system']);
    clients.add(client);

    broadcast(clients, 'system:health', { cpu: 42 });

    const msg = JSON.parse(client.sent[0]);
    expect(msg.topic).toBe('system:health');
    expect(msg.data).toEqual({ cpu: 42 });
    expect(msg.timestamp).toBeTypeOf('number');
  });

  it('handles empty client set', () => {
    expect(() => broadcast(clients, 'system:health', {})).not.toThrow();
  });

  it('multi-group client receives messages for all subscribed groups', () => {
    const allClient = createMockClient(['system', 'docker', 'github', 'loki']);
    clients.add(allClient);

    broadcast(clients, 'system:health', {});
    broadcast(clients, 'docker:containers', []);
    broadcast(clients, 'github:repos', []);
    broadcast(clients, 'email:unread', {});
    broadcast(clients, 'loki:logs', []);

    // Should receive system, docker, github, loki but NOT email
    expect(allClient.sent).toHaveLength(4);
  });
});

/* ── hasSubscribers logic ───────────────────────────────────── */

function hasSubscribers(clients: Set<MockClient>, group: string): boolean {
  for (const ws of clients) {
    if (ws.readyState === WS_OPEN && ws.subscribedGroups.has(group)) {
      return true;
    }
  }
  return false;
}

describe('hasSubscribers', () => {
  let clients: Set<MockClient>;

  beforeEach(() => {
    clients = new Set();
  });

  it('returns true when a client is subscribed', () => {
    clients.add(createMockClient(['system']));
    expect(hasSubscribers(clients, 'system')).toBe(true);
  });

  it('returns false when no client is subscribed', () => {
    clients.add(createMockClient(['docker']));
    expect(hasSubscribers(clients, 'system')).toBe(false);
  });

  it('returns false for closed clients even if subscribed', () => {
    clients.add(createMockClient(['system'], WS_CLOSED));
    expect(hasSubscribers(clients, 'system')).toBe(false);
  });

  it('returns false for empty client set', () => {
    expect(hasSubscribers(clients, 'system')).toBe(false);
  });
});
