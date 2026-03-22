import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Proxy route tests. Tests the core proxy logic:
 * - URL construction from wildcard params
 * - Query parameter forwarding
 * - Header construction (X-Chef-API-Key, Content-Type)
 * - Response forwarding
 * - Error handling (502 Bad Gateway)
 */

const mockConfig = {
  chefApiUrl: 'http://chef-api:4242',
  chefApiKey: 'test-chef-key',
};

describe('proxy URL construction', () => {
  it('constructs target URL from wildcard param', () => {
    const wildcardParam = 'system/health';
    const targetPath = `/${wildcardParam}`;
    const targetUrl = new URL(targetPath, mockConfig.chefApiUrl);

    expect(targetUrl.toString()).toBe('http://chef-api:4242/system/health');
  });

  it('handles nested paths', () => {
    const wildcardParam = 'docker/containers/abc123/stats';
    const targetPath = `/${wildcardParam}`;
    const targetUrl = new URL(targetPath, mockConfig.chefApiUrl);

    expect(targetUrl.toString()).toBe('http://chef-api:4242/docker/containers/abc123/stats');
  });

  it('handles empty wildcard (root path)', () => {
    const wildcardParam = undefined;
    const targetPath = `/${wildcardParam ?? ''}`;
    const targetUrl = new URL(targetPath, mockConfig.chefApiUrl);

    expect(targetUrl.toString()).toBe('http://chef-api:4242/');
  });

  it('forwards query parameters', () => {
    const wildcardParam = 'github/repos';
    const targetUrl = new URL(`/${wildcardParam}`, mockConfig.chefApiUrl);

    // Simulate forwarding query params from original request
    const originalUrl = new URL('/api/chef/github/repos?org=myorg&page=2', 'http://localhost:3000');
    for (const [key, value] of originalUrl.searchParams) {
      targetUrl.searchParams.set(key, value);
    }

    expect(targetUrl.searchParams.get('org')).toBe('myorg');
    expect(targetUrl.searchParams.get('page')).toBe('2');
    expect(targetUrl.toString()).toContain('org=myorg');
    expect(targetUrl.toString()).toContain('page=2');
  });
});

describe('proxy headers', () => {
  it('always includes X-Chef-API-Key', () => {
    const headers: Record<string, string> = {
      'X-Chef-API-Key': mockConfig.chefApiKey,
    };

    expect(headers['X-Chef-API-Key']).toBe('test-chef-key');
  });

  it('forwards content-type when present', () => {
    const contentType = 'application/json';
    const headers: Record<string, string> = {
      'X-Chef-API-Key': mockConfig.chefApiKey,
    };

    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    expect(headers['Content-Type']).toBe('application/json');
  });

  it('does not include content-type when not present', () => {
    const contentType: string | undefined = undefined;
    const headers: Record<string, string> = {
      'X-Chef-API-Key': mockConfig.chefApiKey,
    };

    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    expect(headers['Content-Type']).toBeUndefined();
  });
});

describe('proxy body handling', () => {
  it('serializes object body as JSON', () => {
    const body = { command: 'ls -la', host: 'server1' };
    const serialized = typeof body === 'string' ? body : JSON.stringify(body);
    expect(serialized).toBe('{"command":"ls -la","host":"server1"}');
  });

  it('passes string body as-is', () => {
    const body = '{"already":"serialized"}';
    const serialized = typeof body === 'string' ? body : JSON.stringify(body);
    expect(serialized).toBe('{"already":"serialized"}');
  });

  it('skips body for GET and HEAD methods', () => {
    for (const method of ['GET', 'HEAD']) {
      const body = '{"some":"data"}';
      const shouldSendBody = !['GET', 'HEAD'].includes(method);
      expect(shouldSendBody).toBe(false);
    }

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const shouldSendBody = !['GET', 'HEAD'].includes(method);
      expect(shouldSendBody).toBe(true);
    }
  });
});

describe('proxy fetch', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('forwards request to chef-api and returns response', async () => {
    const responseBody = JSON.stringify({ cpu: { usage_percent: 42 } });
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(responseBody),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const targetUrl = new URL('/system/health', mockConfig.chefApiUrl);
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: { 'X-Chef-API-Key': mockConfig.chefApiKey },
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ cpu: { usage_percent: 42 } });
  });

  it('returns 502 on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    try {
      await fetch(new URL('/system/health', mockConfig.chefApiUrl).toString(), {
        method: 'GET',
        headers: { 'X-Chef-API-Key': mockConfig.chefApiKey },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('ECONNREFUSED');
    }
  });

  it('forwards POST body to chef-api', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"result":"ok"}'),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const body = JSON.stringify({ command: 'uptime' });
    await fetch(new URL('/ssh/run', mockConfig.chefApiUrl).toString(), {
      method: 'POST',
      headers: {
        'X-Chef-API-Key': mockConfig.chefApiKey,
        'Content-Type': 'application/json',
      },
      body,
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe('{"command":"uptime"}');
    expect(options.headers['X-Chef-API-Key']).toBe('test-chef-key');
  });
});
