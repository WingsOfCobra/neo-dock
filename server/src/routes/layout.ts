import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data');
const LAYOUT_FILE = resolve(DATA_DIR, 'layout.json');

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function layoutRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/layout', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      await ensureDataDir();
      const raw = await readFile(LAYOUT_FILE, 'utf-8');
      const layout: unknown = JSON.parse(raw);
      return reply.send(layout);
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        return reply.send({ widgets: [], layouts: {} });
      }
      throw err;
    }
  });

  fastify.put('/api/layout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await ensureDataDir();
      const body = request.body;
      await writeFile(LAYOUT_FILE, JSON.stringify(body, null, 2), 'utf-8');
      return reply.send({ ok: true });
    } catch (err) {
      request.log.error({ err }, 'Failed to save layout');
      return reply.code(500).send({ error: 'Failed to save layout' });
    }
  });
}
