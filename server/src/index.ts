import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { authPreHandler } from './auth.js';
import { authRoutes } from './routes/auth.js';
import { proxyRoutes } from './routes/proxy.js';
import { layoutRoutes } from './routes/layout.js';
import { metricsRoutes } from './routes/metrics.js';
import { WsManager } from './ws/manager.js';
import { startPollers } from './ws/poller.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
  });

  // --- Plugins ---
  await fastify.register(fastifyCors, { origin: true, credentials: true });
  await fastify.register(fastifyCookie);

  // --- Auth preHandler for API routes ---
  fastify.addHook('preHandler', authPreHandler);

  // --- API Routes ---
  await fastify.register(authRoutes);
  await fastify.register(proxyRoutes);
  await fastify.register(layoutRoutes);
  await fastify.register(metricsRoutes);

  // --- Static file serving (production only) ---
  const isDev = process.env['NODE_ENV'] !== 'production';
  const clientDist = resolve(__dirname, '../../client/dist');

  if (!isDev && existsSync(clientDist)) {
    await fastify.register(fastifyStatic, {
      root: clientDist,
      wildcard: false,
    });

    // SPA fallback: serve index.html for non-API GET requests
    fastify.setNotFoundHandler(async (request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'Not Found' });
    });
  } else {
    fastify.setNotFoundHandler(async (request, reply) => {
      if (!request.url.startsWith('/api/')) {
        if (isDev) {
          return reply.code(200).send({ info: 'Dev mode — use Vite dev server for the UI' });
        }
        return reply.code(503).send({ error: 'Client not built yet. Run npm run build first.' });
      }
      return reply.code(404).send({ error: 'Not Found' });
    });
  }

  // --- Start server ---
  await fastify.listen({ port: config.port, host: '0.0.0.0' });

  // --- WebSocket manager (attach to underlying HTTP server) ---
  const httpServer = fastify.server;
  const wsManager = new WsManager(httpServer);
  fastify.log.info(`WebSocket server attached`);

  // --- Start pollers ---
  const pollerHandle = startPollers(wsManager);

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);
    pollerHandle.stop();
    wsManager.close();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => { shutdown('SIGTERM').catch(() => process.exit(1)); });
  process.on('SIGINT', () => { shutdown('SIGINT').catch(() => process.exit(1)); });

  fastify.log.info(`Neo-Dock server running on http://0.0.0.0:${config.port}`);
}

main().catch((err) => {
  console.error('Failed to start Neo-Dock server:', err);
  process.exit(1);
});
