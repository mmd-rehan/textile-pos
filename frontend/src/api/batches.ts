import apiClient from './client';
import type { Batch, CreateBatchForm } from '../types';

export const batchesApi = {
  getAll: (params: { page?: number; limit?: number; search?: string } = {}): Promise<{ data: Batch[]; meta: any }> =>
    apiClient.get('/batches', { params }),

  getOne: (id: string): Promise<{ data: Batch }> =>
    apiClient.get(`/batches/${id}`),

  create: (data: CreateBatchForm): Promise<{ data: Batch }> =>
    apiClient.post('/batches', data),

  update: (id: string, data: Partial<CreateBatchForm>): Promise<{ data: Batch }> =>
    apiClient.put(`/batches/${id}`, data),

  remove: (id: string): Promise<{ data: { id: string } }> =>
    apiClient.delete(`/batches/${id}`),
};
