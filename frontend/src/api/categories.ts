import apiClient from './client';
import type { Category, CreateCategoryForm } from '../types';

export const categoriesApi = {
  getAll: (search?: string): Promise<{ data: Category[] }> =>
    apiClient.get('/categories', { params: { search } }),

  getOne: (id: string): Promise<{ data: Category }> =>
    apiClient.get(`/categories/${id}`),

  create: (data: CreateCategoryForm): Promise<{ data: Category }> =>
    apiClient.post('/categories', data),

  update: (id: string, data: Partial<CreateCategoryForm> & { isActive?: boolean }): Promise<{ data: Category }> =>
    apiClient.put(`/categories/${id}`, data),

  remove: (id: string): Promise<{ data: { id: string } }> =>
    apiClient.delete(`/categories/${id}`),
};
