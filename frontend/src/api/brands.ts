import apiClient from './client';
import type { Brand, CreateBrandForm } from '../types';

export const brandsApi = {
  getAll: (search?: string): Promise<{ data: Brand[] }> =>
    apiClient.get('/brands', { params: { search } }),

  getOne: (id: string): Promise<{ data: Brand }> =>
    apiClient.get(`/brands/${id}`),

  create: (data: CreateBrandForm): Promise<{ data: Brand }> =>
    apiClient.post('/brands', data),

  update: (id: string, data: Partial<CreateBrandForm> & { isActive?: boolean }): Promise<{ data: Brand }> =>
    apiClient.put(`/brands/${id}`, data),

  remove: (id: string): Promise<{ data: { id: string } }> =>
    apiClient.delete(`/brands/${id}`),
};
