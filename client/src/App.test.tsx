/**
 * Smoke tests for App-level logic.
 * Since App depends heavily on browser APIs, three.js, and complex routing,
 * we test the extractable pure logic: normalizeTodos and route-group mapping.
 */
import { describe, it, expect } from 'vitest';

/* ── Re-implement the pure functions from App.tsx for testing ─── */
/* These are copied from App.tsx since they are module-private.    */
/* If they are ever extracted to a shared module, import directly. */

interface TodoItem {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  source: 'db' | 'file';
  createdAt?: string;
  updatedAt?: string;
  fileSource?: string;
}

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  return [];
}

function asObj(data: unknown): Record<string, unknown> | null {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

function normalizeTodos(data: unknown): { items: TodoItem[]; total: number } {
  const obj = asObj(data);
  if (!obj) return { items: [], total: 0 };

  const items: TodoItem[] = [];

  const dbArr = asArray(obj['db']);
  for (const raw of dbArr) {
    const row = asObj(raw);
    if (!row) continue;
    items.push({
      id: Number(row['id'] ?? 0),
      title: String(row['title'] ?? ''),
      description: row['description'] as string | null | undefined,
      completed: row['completed'] === 1 || row['completed'] === true,
      source: 'db',
      createdAt: row['created_at'] as string | undefined,
      updatedAt: row['updated_at'] as string | undefined,
    });
  }

  const fileArr = asArray(obj['file']);
  for (const raw of fileArr) {
    const row = asObj(raw);
    if (!row) continue;
    items.push({
      id: Number(row['id'] ?? 0),
      title: String(row['title'] ?? ''),
      completed: row['completed'] === true || row['completed'] === 1,
      source: 'file',
      fileSource: row['source'] as string | undefined,
    });
  }

  return { items, total: Number(obj['total'] ?? items.length) };
}

const ALL_GROUPS = ['system', 'docker', 'services', 'github', 'email', 'cron', 'todos', 'loki'];

const ROUTE_GROUPS: Record<string, string[]> = {
  '/':       ALL_GROUPS,
  '/system': ['system', 'services'],
  '/docker': ['docker'],
  '/comms':  ['github', 'email'],
  '/tasks':  ['cron', 'todos'],
  '/logs':   ['loki'],
};

/* ── Tests ──────────────────────────────────────────────────────── */

describe('normalizeTodos', () => {
  it('returns empty items for null/undefined input', () => {
    expect(normalizeTodos(null)).toEqual({ items: [], total: 0 });
    expect(normalizeTodos(undefined)).toEqual({ items: [], total: 0 });
  });

  it('returns empty items for non-object input', () => {
    expect(normalizeTodos('string')).toEqual({ items: [], total: 0 });
    expect(normalizeTodos(42)).toEqual({ items: [], total: 0 });
    expect(normalizeTodos([])).toEqual({ items: [], total: 0 });
  });

  it('normalizes db todos with integer completed=1', () => {
    const result = normalizeTodos({
      db: [
        { id: 1, title: 'Buy groceries', completed: 1, created_at: '2024-01-01' },
        { id: 2, title: 'Clean house', completed: 0, description: 'deep clean' },
      ],
      total: 2,
    });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);

    expect(result.items[0]).toEqual({
      id: 1,
      title: 'Buy groceries',
      description: undefined,
      completed: true,
      source: 'db',
      createdAt: '2024-01-01',
      updatedAt: undefined,
    });

    expect(result.items[1]).toEqual({
      id: 2,
      title: 'Clean house',
      description: 'deep clean',
      completed: false,
      source: 'db',
      createdAt: undefined,
      updatedAt: undefined,
    });
  });

  it('normalizes db todos with boolean completed=true', () => {
    const result = normalizeTodos({
      db: [{ id: 1, title: 'Test', completed: true }],
    });
    expect(result.items[0].completed).toBe(true);
  });

  it('normalizes file todos', () => {
    const result = normalizeTodos({
      file: [
        { id: 0, title: 'Fix README', completed: false, source: 'TODO.md' },
      ],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: 0,
      title: 'Fix README',
      completed: false,
      source: 'file',
      fileSource: 'TODO.md',
    });
  });

  it('merges db and file todos', () => {
    const result = normalizeTodos({
      db: [{ id: 1, title: 'DB todo', completed: 0 }],
      file: [{ id: 1, title: 'File todo', completed: true, source: 'TODO.md' }],
      total: 5,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].source).toBe('db');
    expect(result.items[1].source).toBe('file');
    expect(result.total).toBe(5);
  });

  it('uses items.length as total when total is missing', () => {
    const result = normalizeTodos({
      db: [{ id: 1, title: 'A', completed: 0 }],
      file: [{ id: 2, title: 'B', completed: 1 }],
    });
    expect(result.total).toBe(2);
  });

  it('skips non-object entries in arrays', () => {
    const result = normalizeTodos({
      db: ['not an object', null, 42, { id: 1, title: 'Valid', completed: 0 }],
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Valid');
  });

  it('handles missing db/file keys gracefully', () => {
    const result = normalizeTodos({ total: 0 });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('ROUTE_GROUPS mapping', () => {
  it('dashboard subscribes to all groups', () => {
    expect(ROUTE_GROUPS['/']).toEqual(ALL_GROUPS);
    expect(ROUTE_GROUPS['/']).toHaveLength(8);
  });

  it('system page subscribes to system + services', () => {
    expect(ROUTE_GROUPS['/system']).toEqual(['system', 'services']);
  });

  it('docker page subscribes to docker only', () => {
    expect(ROUTE_GROUPS['/docker']).toEqual(['docker']);
  });

  it('comms page subscribes to github + email', () => {
    expect(ROUTE_GROUPS['/comms']).toEqual(['github', 'email']);
  });

  it('tasks page subscribes to cron + todos', () => {
    expect(ROUTE_GROUPS['/tasks']).toEqual(['cron', 'todos']);
  });

  it('logs page subscribes to loki only', () => {
    expect(ROUTE_GROUPS['/logs']).toEqual(['loki']);
  });
});

describe('asArray', () => {
  it('returns the array if input is an array', () => {
    expect(asArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('returns empty array for non-array input', () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray(undefined)).toEqual([]);
    expect(asArray('string')).toEqual([]);
    expect(asArray(42)).toEqual([]);
    expect(asArray({ key: 'value' })).toEqual([]);
  });
});

describe('asObj', () => {
  it('returns the object for object input', () => {
    const obj = { key: 'value' };
    expect(asObj(obj)).toBe(obj);
  });

  it('returns null for non-object input', () => {
    expect(asObj(null)).toBeNull();
    expect(asObj(undefined)).toBeNull();
    expect(asObj('string')).toBeNull();
    expect(asObj(42)).toBeNull();
    expect(asObj([])).toBeNull();
  });
});
