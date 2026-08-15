import { api } from './api';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const adminApi = {
  getUsers: (page: number, limit: number, search?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    return api.get<AdminUsersResponse>(`/admin/users?${params.toString()}`);
  },

  getUserHistory: (userId: string) =>
    api.get<any>(`/admin/users/${userId}/history`),

  unlockUser: (userId: string) =>
    api.post<{ user: AdminUser }>(`/admin/users/${userId}/unlock`, {}),
};
