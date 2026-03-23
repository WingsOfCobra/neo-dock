/* ── useApiError – fetch wrapper with error tracking ──────── */

import { useState, useCallback } from 'react';
import { ApiError } from '@/lib/api';
import { useErrorStore } from '@/stores/errorStore';

export interface ApiErrorInfo {
  service: string;
  message: string;
  statusCode?: number;
}

interface UseApiErrorResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiErrorInfo | null;
  execute: () => Promise<void>;
  reset: () => void;
}

interface UseApiErrorOptions {
  service: string;
  showToast?: boolean; // Whether to show global toast on error (default true)
  onError?: (error: ApiErrorInfo) => void;
}

/**
 * Hook for API calls with structured error handling
 * 
 * @example
 * const { data, loading, error, execute } = useApiError(
 *   () => get<Container[]>('/docker/containers'),
 *   { service: 'docker' }
 * );
 */
export function useApiError<T>(
  fetcher: () => Promise<T>,
  options: UseApiErrorOptions,
): UseApiErrorResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const addError = useErrorStore((state) => state.addError);
  const setApiUnreachable = useErrorStore((state) => state.setApiUnreachable);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      setLoading(false);
      // Clear API unreachable flag on success
      setApiUnreachable(false);
    } catch (err: unknown) {
      let errorInfo: ApiErrorInfo;
      let isNetworkError = false;

      if (err instanceof ApiError) {
        // Chef API error response (already parsed in apiFetch)
        errorInfo = {
          service: options.service,
          message: err.message,
          statusCode: err.status,
        };
      } else if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        // Network error - API unreachable
        isNetworkError = true;
        errorInfo = {
          service: options.service,
          message: 'API unreachable — check connection',
          statusCode: 0,
        };
        setApiUnreachable(true);
      } else if (err instanceof Error) {
        errorInfo = {
          service: options.service,
          message: err.message,
        };
      } else {
        errorInfo = {
          service: options.service,
          message: 'Unknown error occurred',
        };
      }

      setError(errorInfo);
      setLoading(false);

      // Show global toast unless explicitly disabled
      if (options.showToast !== false) {
        addError(errorInfo.service, errorInfo.message);
      }

      if (options.onError) {
        options.onError(errorInfo);
      }
    }
  }, [fetcher, options, addError, setApiUnreachable]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}
