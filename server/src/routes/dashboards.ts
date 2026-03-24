import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Database from 'better-sqlite3';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data');

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(resolve(DATA_DIR, 'neo-dock.db'));

// ── Schema ─────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS dashboards (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL DEFAULT 'Dashboard',
    widgets    TEXT    NOT NULL DEFAULT '[]',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS active_dashboard (
    id                   INTEGER PRIMARY KEY CHECK (id = 1),
    active_dashboard_id  INTEGER REFERENCES dashboards(id) ON DELETE SET NULL
  );

  -- Ensure the singleton row exists
  INSERT OR IGNORE INTO active_dashboard (id, active_dashboard_id) VALUES (1, NULL);
`);

// ── Helpers ────────────────────────────────────────────────────────────────

function parseDashboard(row: Record<string, unknown>) {
  return {
    id: row['id'],
    name: row['name'],
    widgets: JSON.parse((row['widgets'] as string) || '[]'),
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {

  /** GET /api/chef/dashboards/active — return active dashboard id */
  fastify.get('/api/chef/dashboards/active', async (_req: FastifyRequest, reply: FastifyReply) => {
    const row = db
      .prepare('SELECT active_dashboard_id FROM active_dashboard WHERE id = 1')
      .get() as Record<string, unknown> | undefined;
    return reply.send({ activeDashboardId: row?.['active_dashboard_id'] ?? null });
  });

  /** GET /api/chef/dashboards — list all dashboards */
  fastify.get('/api/chef/dashboards', async (_req: FastifyRequest, reply: FastifyReply) => {
    const rows = db
      .prepare('SELECT * FROM dashboards ORDER BY id ASC')
      .all() as Record<string, unknown>[];
    return reply.send(rows.map(parseDashboard));
  });

  /** POST /api/chef/dashboards — create dashboard */
  fastify.post('/api/chef/dashboards', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const name = (body?.['name'] as string) || 'Dashboard';
    const widgets = body?.['widgets'];

    if (!Array.isArray(widgets)) {
      return reply.code(400).send({ error: 'widgets must be an array' });
    }

    const stmt = db.prepare(
      `INSERT INTO dashboards (name, widgets) VALUES (?, ?) RETURNING *`,
    );
    const row = stmt.get(name, JSON.stringify(widgets)) as Record<string, unknown>;
    return reply.code(201).send(parseDashboard(row));
  });

  /** PUT /api/chef/dashboards/:id — update dashboard */
  fastify.put('/api/chef/dashboards/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const name = (body?.['name'] as string) || 'Dashboard';
    const widgets = body?.['widgets'];

    if (!Array.isArray(widgets)) {
      return reply.code(400).send({ error: 'widgets must be an array' });
    }

    const stmt = db.prepare(
      `UPDATE dashboards SET name = ?, widgets = ?, updated_at = datetime('now')
       WHERE id = ? RETURNING *`,
    );
    const row = stmt.get(name, JSON.stringify(widgets), Number(id)) as
      | Record<string, unknown>
      | undefined;

    if (!row) return reply.code(404).send({ error: 'Dashboard not found' });
    return reply.send(parseDashboard(row));
  });

  /** DELETE /api/chef/dashboards/:id — delete dashboard */
  fastify.delete(
    '/api/chef/dashboards/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const result = db.prepare('DELETE FROM dashboards WHERE id = ?').run(Number(id));
      if (result.changes === 0) return reply.code(404).send({ error: 'Dashboard not found' });
      return reply.send({ ok: true });
    },
  );

  /** POST /api/chef/dashboards/:id/activate — set active dashboard */
  fastify.post(
    '/api/chef/dashboards/:id/activate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const row = db
        .prepare('SELECT id FROM dashboards WHERE id = ?')
        .get(Number(id)) as Record<string, unknown> | undefined;
      if (!row) return reply.code(404).send({ error: 'Dashboard not found' });

      db.prepare(
        `UPDATE active_dashboard SET active_dashboard_id = ? WHERE id = 1`,
      ).run(Number(id));

      return reply.send({ ok: true, activeDashboardId: Number(id) });
    },
  );
}
