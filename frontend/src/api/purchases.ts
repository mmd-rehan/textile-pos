import type { PurchaseAttachment, PurchaseOrder, SupplierPayment } from '../types';
import apiClient from './client';

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

export interface CreatePurchaseItemLineInput {
  productId: string;
  colorId?: string;
  designId?: string;
  quantity: number;
  purchasePricePerUnit: number;
  salePricePerUnit: number;
  barcodeValue?: string;
  unitId?: string;
  location?: string;
  description?: string;
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
  rolls?: CreatePurchaseRollInput[];
  items?: CreatePurchaseItemLineInput[];
}

export interface CreatePaymentInput {
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  notes?: string;
}

export const purchasesApi = {
  getAll: (params: PurchaseQuery = {}): Promise<{ data: PurchaseOrder[]; meta: any }> =>
    apiClient.get('/purchases', { params }),

  getOne: (id: string): Promise<{ data: PurchaseOrder }> =>
    apiClient.get(`/purchases/${id}`),

  create: (data: CreatePurchaseInput): Promise<{ data: PurchaseOrder }> =>
    apiClient.post('/purchases', data),

  getPayments: (purchaseId: string): Promise<{ data: SupplierPayment[] }> =>
    apiClient.get(`/purchases/${purchaseId}/payments`),

  createPayment: (purchaseId: string, data: CreatePaymentInput): Promise<{ data: PurchaseOrder }> =>
    apiClient.post(`/purchases/${purchaseId}/payments`, data),

  listAttachments: (purchaseId: string): Promise<{ data: PurchaseAttachment[] }> =>
    apiClient.get(`/purchases/${purchaseId}/attachments`),

  uploadAttachment: (purchaseId: string, file: File): Promise<{ data: PurchaseAttachment }> => {
    const formData = new FormData();
    formData.append('file', file);
    // The shared axios instance sets a default `Content-Type: application/json`
    // header. When sending FormData, XHR would normally compute a
    // `multipart/form-data; boundary=…` header itself, but only when no
    // Content-Type was explicitly set. We blank it out per-request so the
    // browser sets the correct multipart header with the right boundary.
    return apiClient.post(`/purchases/${purchaseId}/attachments`, formData, {
      headers: { 'Content-Type': undefined as unknown as string },
    });
  },

  attachmentDownloadUrl: (purchaseId: string, attachmentId: string): string =>
    `/api/v1/purchases/${purchaseId}/attachments/${attachmentId}/download`,

  downloadAttachment: async (purchaseId: string, attachmentId: string, filename: string) => {
    const raw = await apiClient.get(
      `/purchases/${purchaseId}/attachments/${attachmentId}/download`,
      { responseType: 'blob' },
    );
    // Blob bodies bypass the success-envelope unwrap, so `raw` is the full
    // axios response — pull the blob off `.data`.
    const blob: Blob = (raw as any).data ?? (raw as any);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
