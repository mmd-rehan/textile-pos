import type { ReceiptData, SaleInvoice } from '../types';
import apiClient from './client';

export interface SaleLineInput {
  productId: string;
  rollId: string;
  billedQuantity: number;
  actualCutQuantity?: number;
  unit: 'YARD' | 'METER';
  unitPrice: number;
  discountAmount?: number;
}

export interface QuantitySaleLineInput {
  productId: string;
  productStockItemId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface SalePaymentInput {
  method: string;
  amount: number;
}

export interface CreateRetailSaleInput {
  customerId?: string;
  lines?: SaleLineInput[];
  quantityLines?: QuantitySaleLineInput[];
  payments: SalePaymentInput[];
  notes?: string;
}

export interface WholesaleSaleLineInput {
  productId: string;
  rollId: string;
  billedQuantity?: number;
  actualCutQuantity?: number;
  unit: 'YARD' | 'METER';
  unitPrice: number;
  discountAmount?: number;
  isFullRoll?: boolean;
}

export interface CreateWholesaleSaleInput {
  customerId: string;
  lines?: WholesaleSaleLineInput[];
  quantityLines?: QuantitySaleLineInput[];
  payments: SalePaymentInput[];
  notes?: string;
  deliveryChallanNumber?: string;
  deliveryAddress?: string;
}

export interface SalesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const salesApi = {
  createRetailSale: (
    data: CreateRetailSaleInput,
    idempotencyKey: string,
  ): Promise<{ data: SaleInvoice }> =>
    apiClient.post('/sales/retail', data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  createWholesaleSale: (
    data: CreateWholesaleSaleInput,
    idempotencyKey: string,
  ): Promise<{ data: SaleInvoice }> =>
    apiClient.post('/sales/wholesale', data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  getAll: (params: SalesQuery = {}): Promise<{ data: SaleInvoice[]; meta: any }> =>
    apiClient.get('/sales', { params }),

  getOne: (id: string): Promise<{ data: SaleInvoice }> =>
    apiClient.get(`/sales/${id}`),

  getReceipt: (id: string): Promise<{ data: ReceiptData }> =>
    apiClient.get(`/sales/${id}/receipt`),
};
