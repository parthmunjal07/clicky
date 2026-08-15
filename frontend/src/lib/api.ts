const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/auth` : '/auth';
const ADMIN_BASE = API_ORIGIN ? `${API_ORIGIN}/admin` : '/admin';

type FetchOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

let onAuthFailure: (() => void) | null = null;

export function configureAuth(config: {
  onAuthFailure: () => void;
}) {
  onAuthFailure = config.onAuthFailure;
}

// Ensure the refresh request itself sends cookies
async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    });

    if (!res.ok) {
      onAuthFailure?.();
      return false;
    }

    return true;
  } catch {
    onAuthFailure?.();
    return false;
  }
}

export async function apiRequest<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const normalizedUrl = url.startsWith('http') ? url : `${API_ORIGIN || ''}${url}`;

  let res = await fetch(normalizedUrl, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // ALways send cookies!
  });

  // If 401, attempt refresh (unless the request itself was a refresh or login)
  if (res.status === 401 && !url.includes('/refresh') && !url.includes('/login') && !url.includes('/signup') && !url.includes('/logout')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry the original request
      res = await fetch(normalizedUrl, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });
    }
  }

  const data = await res.json();

  if (!res.ok) {
    const message = data.error || data.message || 'Something went wrong';
    const details = data.details;
    throw new ApiError(message, res.status, details);
  }

  return data as T;
}

export class ApiError extends Error {
  status: number;
  details?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    status: number,
    details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// ─── Convenience methods ────────────────────────────────────────────

export const api = {
  get: <T>(url: string) => apiRequest<T>(url),
  post: <T>(url: string, body?: unknown) =>
    apiRequest<T>(url, { method: 'POST', body }),
  patch: <T>(url: string, body?: unknown) =>
    apiRequest<T>(url, { method: 'PATCH', body }),
  delete: <T>(url: string, body?: unknown) =>
    apiRequest<T>(url, { method: 'DELETE', body }),
};

export { API_BASE, ADMIN_BASE };
