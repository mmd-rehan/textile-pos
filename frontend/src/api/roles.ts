import type { AdminRole } from '../types';
import apiClient from './client';

export const rolesApi = {
  getAll: (): Promise<{ data: AdminRole[] }> =>
    apiClient.get('/roles'),

  getOne: (id: string): Promise<{ data: AdminRole }> =>
    apiClient.get(`/roles/${id}`),

  getPermissions: (): Promise<{ data: Array<{ id: string; name: string; description: string | null }> }> =>
    apiClient.get('/roles/permissions'),
};
