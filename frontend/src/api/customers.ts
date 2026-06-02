import type { Customer } from '../types';
import apiClient from './client';

export interface CustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  type?: 'RETAIL' | 'WHOLESALE';
}

export const customersApi = {
  getAll: (params: CustomerQuery = {}): Promise<{ data: Customer[]; meta: any }> =>
    apiClient.get('/customers', { params }),

  getOne: (id: string): Promise<{ data: Customer }> =>
    apiClient.get(`/customers/${id}`),

  create: (data: CreateCustomerInput): Promise<{ data: Customer }> =>
    apiClient.post('/customers', data),
};
