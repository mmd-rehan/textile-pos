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

export const rollsApi = {
  getAll: (params: RollQuery = {}): Promise<{ data: Roll[]; meta: any }> =>
    apiClient.get('/rolls', { params }),

  getOne: (id: string): Promise<{ data: Roll }> =>
    apiClient.get(`/rolls/${id}`),

  getByBarcode: (barcode: string): Promise<{ data: Roll }> =>
    apiClient.get(`/rolls/barcode/${barcode}`),
};
