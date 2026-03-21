import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

interface VerifyBody {
  key: string;
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/auth/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Partial<VerifyBody> | null;

    if (!body || typeof body.key !== 'string') {
      return reply.code(400).send({ error: 'Missing key in request body' });
    }

    if (body.key !== config.apiKey) {
      return reply.code(401).send({ error: 'Invalid API key' });
    }

    reply.setCookie('neo_dock_key', body.key, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return reply.send({ ok: true });
  });

  fastify.get('/api/auth/check', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ authenticated: true });
  });
}
