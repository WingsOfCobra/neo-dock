import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { systemMetricsBuffer, containerMetricsBuffer } from '../services/metricsBuffer.js';

interface MetricsQuery {
  from?: string;
  to?: string;
}

interface ContainerParams {
  id: string;
}

export async function metricsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/metrics/system', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as MetricsQuery;
    const from = query.from ? Number(query.from) : undefined;
    const to = query.to ? Number(query.to) : undefined;

    const data = systemMetricsBuffer.getRange(from, to);
    return reply.send(data);
  });

  fastify.get('/api/metrics/containers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as ContainerParams;
    const query = request.query as MetricsQuery;
    const from = query.from ? Number(query.from) : undefined;
    const to = query.to ? Number(query.to) : undefined;

    const buffer = containerMetricsBuffer.get(params.id);
    if (!buffer) {
      return reply.send([]);
    }

    const data = buffer.getRange(from, to);
    return reply.send(data);
  });
}
