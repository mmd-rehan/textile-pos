import apiClient from './client';
import type { Roll } from '../types';

export interface RollQuery {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  batchId?: string;
  status?: string;
  colorId?: string;
}

export interface ReconcileRollPayload {
  physicalLengthYard: string;
  reason: string;
  remarks?: string;
  createRemnant?: boolean;
  remnantSalePrice?: string;
  remnantBarcode?: string;
}

export interface MarkFinishedPayload {
  reason: string;
}

export const rollsApi = {
  getAll: (params: RollQuery = {}): Promise<{ data: Roll[]; meta: any }> =>
    apiClient.get('/rolls', { params }),

  getOne: (id: string): Promise<{ data: Roll }> =>
    apiClient.get(`/rolls/${id}`),

  getByBarcode: (barcode: string): Promise<{ data: Roll }> =>
    apiClient.get(`/rolls/barcode/${barcode}`),

  reconcile: (id: string, payload: ReconcileRollPayload): Promise<{ data: any }> =>
    apiClient.post(`/rolls/${id}/reconcile`, payload),

  markFinished: (id: string, payload: MarkFinishedPayload): Promise<{ data: Roll }> =>
    apiClient.post(`/rolls/${id}/mark-finished`, payload),

  getReconciliations: (id: string, params: { page?: number; limit?: number } = {}): Promise<{ data: any[]; meta: any }> =>
    apiClient.get(`/rolls/${id}/reconciliations`, { params }),
};
