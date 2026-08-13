import { api, API_BASE, ADMIN_BASE } from './api';

// ─── Types ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt?: string;
  updatedAt?: string;
}

interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface TokenResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
}

interface ProfileResponse {
  user: User;
}

interface PaginatedUsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Auth API ───────────────────────────────────────────────────────

export const authApi = {
  signup: (data: { username: string; email: string; password: string }) =>
    api.post<AuthResponse>(`${API_BASE}/signup`, data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>(`${API_BASE}/login`, data),

  refresh: (refreshToken: string) =>
    api.post<TokenResponse>(`${API_BASE}/refresh`, { refreshToken }),

  logout: (refreshToken: string) =>
    api.post<{ message: string }>(`${API_BASE}/logout`, { refreshToken }),

  getProfile: () => api.get<ProfileResponse>(`${API_BASE}/me`),

  listUsers: (page = 1, limit = 20) =>
    api.get<PaginatedUsersResponse>(
      `${ADMIN_BASE}/users?page=${page}&limit=${limit}`,
    ),
};
