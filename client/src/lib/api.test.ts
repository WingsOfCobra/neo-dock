import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { apiFetch, get, post, patch, del, ApiError } from './api';

// Mock global fetch
const mockFetch = vi.fn() as Mock;

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function textResponse(text: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: () => Promise.reject(new Error('not JSON')),
    text: () => Promise.resolve(text),
  };
}

function noContentResponse() {
  return {
    ok: true,
    status: 204,
    headers: new Headers(),
    json: () => Promise.reject(new Error('no content')),
    text: () => Promise.resolve(''),
  };
}

describe('apiFetch', () => {
  it('makes a request to /api prefix', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
    await apiFetch('/test');
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/test');
    expect(options.credentials).toBe('include');
  });

  it('sets Content-Type when body is present', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
    await apiFetch('/test', { method: 'POST', body: '{"a":1}' });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('does not set Content-Type when no body', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
    await apiFetch('/test', { method: 'GET' });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  it('returns parsed JSON for JSON responses', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ hello: 'world' }));
    const result = await apiFetch('/test');
    expect(result).toEqual({ hello: 'world' });
  });

  it('returns undefined for 204 responses', async () => {
    mockFetch.mockResolvedValue(noContentResponse());
    const result = await apiFetch('/test');
    expect(result).toBeUndefined();
  });

  it('returns undefined for non-JSON content types', async () => {
    mockFetch.mockResolvedValue(textResponse('plain text'));
    const result = await apiFetch('/test');
    expect(result).toBeUndefined();
  });

  it('throws ApiError for non-ok responses', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
      text: () => Promise.resolve('Not Found'),
    });
    await expect(apiFetch('/test')).rejects.toThrow(ApiError);
    try {
      await apiFetch('/test');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
      expect((err as ApiError).message).toBe('Not Found');
    }
  });

  it('ApiError has correct name', () => {
    const err = new ApiError(500, 'Internal Server Error');
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(500);
    expect(err.message).toBe('Internal Server Error');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('get', () => {
  it('makes a GET request', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: 'test' }));
    const result = await get('/items');
    expect(result).toEqual({ data: 'test' });
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/items');
    expect(options.method).toBe('GET');
  });
});

describe('post', () => {
  it('makes a POST request with JSON body', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: 1 }));
    const result = await post('/items', { name: 'test' });
    expect(result).toEqual({ id: 1 });
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/items');
    expect(options.method).toBe('POST');
    expect(options.body).toBe('{"name":"test"}');
  });

  it('makes a POST request without body', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
    await post('/action');
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBeUndefined();
  });
});

describe('patch', () => {
  it('makes a PATCH request with JSON body', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ updated: true }));
    const result = await patch('/items/1', { name: 'updated' });
    expect(result).toEqual({ updated: true });
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/items/1');
    expect(options.method).toBe('PATCH');
    expect(options.body).toBe('{"name":"updated"}');
  });
});

describe('del', () => {
  it('makes a DELETE request', async () => {
    mockFetch.mockResolvedValue(noContentResponse());
    const result = await del('/items/1');
    expect(result).toBeUndefined();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/items/1');
    expect(options.method).toBe('DELETE');
  });
});
