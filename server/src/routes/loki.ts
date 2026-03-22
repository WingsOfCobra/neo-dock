/* ── Loki routes — proxy to local Loki instance ────────────── */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

const LOKI = config.lokiUrl;

async function lokiFetch(path: string, query?: Record<string, string>): Promise<unknown> {
  const url = new URL(path, LOKI);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Loki ${path} returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export async function lokiRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/loki/labels — all label names
   * Used to populate category selectors
   */
  fastify.get('/api/loki/labels', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await lokiFetch('/loki/api/v1/labels');
      return reply.send(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Loki error';
      return reply.code(502).send({ error: 'Loki unreachable', message });
    }
  });

  /**
   * GET /api/loki/label/:name/values — values for a specific label
   * e.g. /api/loki/label/job/values → ["varlogs", "syslog", "nginx"]
   */
  fastify.get('/api/loki/label/:name/values', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string };
    try {
      const data = await lokiFetch(`/loki/api/v1/label/${encodeURIComponent(name)}/values`);
      return reply.send(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Loki error';
      return reply.code(502).send({ error: 'Loki unreachable', message });
    }
  });

  /**
   * GET /api/loki/query_range — LogQL range query
   * Query params: query, start, end, limit, direction
   */
  fastify.get('/api/loki/query_range', async (request: FastifyRequest, reply: FastifyReply) => {
    const qs = request.query as Record<string, string>;
    try {
      const data = await lokiFetch('/loki/api/v1/query_range', {
        query: qs['query'] ?? '{job=~".+"}',
        start: qs['start'] ?? '',
        end: qs['end'] ?? '',
        limit: qs['limit'] ?? '200',
        direction: qs['direction'] ?? 'backward',
      });
      return reply.send(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Loki error';
      return reply.code(502).send({ error: 'Loki unreachable', message });
    }
  });

  /**
   * GET /api/loki/query — instant query (latest logs)
   * Query params: query, limit, direction
   */
  fastify.get('/api/loki/query', async (request: FastifyRequest, reply: FastifyReply) => {
    const qs = request.query as Record<string, string>;
    try {
      const data = await lokiFetch('/loki/api/v1/query', {
        query: qs['query'] ?? '{job=~".+"}',
        limit: qs['limit'] ?? '100',
        direction: qs['direction'] ?? 'backward',
      });
      return reply.send(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Loki error';
      return reply.code(502).send({ error: 'Loki unreachable', message });
    }
  });
}
