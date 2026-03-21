import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from './config.js';

export async function authPreHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Skip auth for the verify endpoint
  if (request.url === '/api/auth/verify' && request.method === 'POST') {
    return;
  }

  // Skip auth for static files (non-API routes)
  if (!request.url.startsWith('/api/')) {
    return;
  }

  const headerKey = request.headers['x-neo-dock-key'] as string | undefined;
  const cookieKey = (request.cookies as Record<string, string | undefined>)['neo_dock_key'];

  const providedKey = headerKey ?? cookieKey;

  if (!providedKey || providedKey !== config.apiKey) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
}
