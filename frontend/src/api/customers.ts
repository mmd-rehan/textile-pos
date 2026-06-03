import type { Customer, CustomerLedgerEntry, CustomerOutstanding, CustomerPayment } from '../types';
import apiClient from './client';

export interface CustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'RETAIL' | 'WHOLESALE' | 'CREDIT';
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  type?: 'RETAIL' | 'WHOLESALE' | 'CREDIT';
  status?: 'ACTIVE' | 'INACTIVE';
  creditLimit?: number | null;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {}

export interface CreateCustomerPaymentInput {
  amount: number;
  paymentMethod: string;
  idempotencyKey?: string;
  notes?: string;
}

export const customersApi = {
  getAll: (params: CustomerQuery = {}): Promise<{ data: Customer[]; meta: any }> =>
    apiClient.get('/customers', { params }),

  getOne: (id: string): Promise<{ data: Customer }> =>
    apiClient.get(`/customers/${id}`),

  create: (data: CreateCustomerInput): Promise<{ data: Customer }> =>
    apiClient.post('/customers', data),

  update: (id: string, data: UpdateCustomerInput): Promise<{ data: Customer }> =>
    apiClient.put(`/customers/${id}`, data),

  getLedger: (
    id: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<{ data: CustomerLedgerEntry[]; meta: any }> =>
    apiClient.get(`/customers/${id}/ledger`, { params }),

  recordPayment: (
    id: string,
    data: CreateCustomerPaymentInput,
  ): Promise<{ data: CustomerPayment }> =>
    apiClient.post(`/customers/${id}/payments`, data),

  getOutstanding: (id: string): Promise<{ data: CustomerOutstanding }> =>
    apiClient.get(`/customers/${id}/outstanding`),
};
