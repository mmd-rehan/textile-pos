import apiClient from './client';
import type { Supplier } from '../types';

export interface SupplierQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const suppliersApi = {
  getAll: (params: SupplierQuery = {}): Promise<{ data: Supplier[]; meta: any }> =>
    apiClient.get('/suppliers', { params }),

  getOne: (id: string): Promise<{ data: Supplier }> =>
    apiClient.get(`/suppliers/${id}`),

  create: (data: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
  }): Promise<{ data: Supplier }> =>
    apiClient.post('/suppliers', data),

  update: (
    id: string,
    data: {
      name?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
    },
  ): Promise<{ data: Supplier }> =>
    apiClient.put(`/suppliers/${id}`, data),

  remove: (id: string): Promise<{ data: { id: string } }> =>
    apiClient.delete(`/suppliers/${id}`),
};
