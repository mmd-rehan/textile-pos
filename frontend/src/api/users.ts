import type { AdminUser } from '../types';
import apiClient from './client';

export const usersApi = {
  getAll: (): Promise<{ data: AdminUser[] }> =>
    apiClient.get('/users'),

  getOne: (id: string): Promise<{ data: AdminUser }> =>
    apiClient.get(`/users/${id}`),

  create: (data: {
    username: string;
    email: string;
    password: string;
    roleIds?: string[];
  }): Promise<{ data: AdminUser }> =>
    apiClient.post('/users', data),

  update: (id: string, data: { email?: string; status?: string }): Promise<{ data: AdminUser }> =>
    apiClient.put(`/users/${id}`, data),

  assignRoles: (id: string, roleIds: string[]): Promise<{ data: AdminUser }> =>
    apiClient.put(`/users/${id}/roles`, { roleIds }),

  changePassword: (id: string, password: string): Promise<{ data: { changed: boolean } }> =>
    apiClient.put(`/users/${id}/password`, { password }),

  remove: (id: string): Promise<{ data: { deleted: boolean } }> =>
    apiClient.delete(`/users/${id}`),
};
