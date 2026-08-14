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
  getUsers: (page: number, limit: number) =>
    api.get<AdminUsersResponse>(`/admin/users?page=${page}&limit=${limit}`),
};
