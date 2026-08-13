const API_BASE = '/auth';
const ADMIN_BASE = '/admin';

type FetchOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

let getAccessToken: (() => string | null) | null = null;
let onTokenRefresh: ((accessToken: string, refreshToken: string) => void) | null = null;
let onAuthFailure: (() => void) | null = null;
let getRefreshToken: (() => string | null) | null = null;

export function configureAuth(config: {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokenRefresh: (accessToken: string, refreshToken: string) => void;
  onAuthFailure: () => void;
}) {
  getAccessToken = config.getAccessToken;
  getRefreshToken = config.getRefreshToken;
  onTokenRefresh = config.onTokenRefresh;
  onAuthFailure = config.onAuthFailure;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken?.();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      onAuthFailure?.();
      return false;
    }

    const data = await res.json();
    onTokenRefresh?.(data.accessToken, data.refreshToken);
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

  const token = getAccessToken?.();
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // If 401 and we have a refresh token, try refreshing
  if (res.status === 401 && getRefreshToken?.()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAccessToken?.();
      if (newToken) {
        requestHeaders['Authorization'] = `Bearer ${newToken}`;
      }
      res = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
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
  post: <T>(url: string, body: unknown) =>
    apiRequest<T>(url, { method: 'POST', body }),
};

export { API_BASE, ADMIN_BASE };
