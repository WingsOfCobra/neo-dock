import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

export async function proxyRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.all('/api/chef/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const wildcardParam = (request.params as Record<string, string>)['*'];
    const targetPath = `/${wildcardParam ?? ''}`;
    const targetUrl = new URL(targetPath, config.chefApiUrl);

    // Forward query params
    const originalUrl = new URL(request.url, `http://${request.hostname}`);
    for (const [key, value] of originalUrl.searchParams) {
      targetUrl.searchParams.set(key, value);
    }

    const headers: Record<string, string> = {
      'X-Chef-API-Key': config.chefApiKey,
    };

    // Forward content-type if present
    const contentType = request.headers['content-type'];
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    let body: string | undefined;
    if (request.body !== undefined && request.body !== null) {
      body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    }

    try {
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : body,
      });

      const responseBody = await response.text();
      reply.code(response.status);

      // Forward relevant response headers
      const respContentType = response.headers.get('content-type');
      if (respContentType) {
        reply.header('content-type', respContentType);
      }

      return reply.send(responseBody);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown proxy error';
      request.log.error({ err }, 'Chef API proxy error');
      return reply.code(502).send({ error: 'Bad Gateway', message });
    }
  });
}
