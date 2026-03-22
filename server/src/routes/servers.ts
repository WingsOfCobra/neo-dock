import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

export async function serverRoutes(fastify: FastifyInstance): Promise<void> {
  /** Return the list of configured server names (not URLs or keys). */
  fastify.get('/api/servers', async () => {
    return {
      servers: config.servers.map((s) => s.name),
      default: config.servers[0]?.name ?? 'default',
    };
  });
}
