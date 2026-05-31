import apiClient from './client';
import type { PurchaseOrder } from '../types';

export interface PurchaseQuery {
  page?: number;
  limit?: number;
  search?: string;
  supplierId?: string;
  status?: string;
}

export interface CreatePurchaseRollInput {
  productId: string;
  colorId?: string;
  designId?: string;
  originalLengthYard: number;
  purchasePricePerYard: number;
  salePricePerYard: number;
  location?: string;
}

export interface CreatePurchaseInput {
  supplierId: string;
  currency?: string;
  exchangeRateToBaseCurrency?: number;
  batchId?: string;
  batchNumber?: string;
  batchNotes?: string;
  paidAmount?: number;
  paymentMethod?: string;
  orderDate?: string;
  deliveryDate?: string;
  notes?: string;
  rolls: CreatePurchaseRollInput[];
}

export const purchasesApi = {
  getAll: (params: PurchaseQuery = {}): Promise<{ data: PurchaseOrder[]; meta: any }> =>
    apiClient.get('/purchases', { params }),

  getOne: (id: string): Promise<{ data: PurchaseOrder }> =>
    apiClient.get(`/purchases/${id}`),

  create: (data: CreatePurchaseInput): Promise<{ data: PurchaseOrder }> =>
    apiClient.post('/purchases', data),
};
