export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `/api${path}`;
  const headers: Record<string, string> = { ...options.headers as Record<string, string> };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    let errorMessage = 'Unknown error';
    let errorBody: unknown;

    try {
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorBody = await res.json();
        // Chef API returns { error: string, message?: string }
        if (typeof errorBody === 'object' && errorBody !== null) {
          const err = errorBody as Record<string, unknown>;
          errorMessage = (err.error as string) || (err.message as string) || errorMessage;
        }
      } else {
        const text = await res.text();
        errorMessage = text || errorMessage;
      }
    } catch {
      // Failed to parse error body, use default
    }

    throw new ApiError(res.status, errorMessage, errorBody);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>;
  }

  return undefined as T;
}

export function get<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' });
}

export function post<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function put<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function patch<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function del<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
