import apiClient from './client';

export interface RemnantQuery {
  page?: number;
  limit?: number;
  rollId?: string;
  productId?: string;
  status?: string;
  search?: string;
}

export interface CreateRemnantPayload {
  rollId: string;
  lengthYard: string;
  reason: string;
  barcode?: string;
  salePrice?: string;
}

export const remnantsApi = {
  getAll: (params: RemnantQuery = {}): Promise<{ data: any[]; meta: any }> =>
    apiClient.get('/remnants', { params }),

  create: (payload: CreateRemnantPayload): Promise<{ data: any }> =>
    apiClient.post('/remnants', payload),
};
