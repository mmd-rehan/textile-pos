import apiClient from './client';

export type WastageSourceType = 'SALE_OVERCUT' | 'MANUAL_DAMAGE' | 'MANUAL_WASTAGE' | 'RECONCILIATION_LOSS';

export interface WastageQuery {
  page?: number;
  limit?: number;
  userId?: string;
  responsibleUserId?: string;
  rollId?: string;
  productId?: string;
  sourceType?: WastageSourceType;
  dateFrom?: string;
  dateTo?: string;
}

export interface ManualWastagePayload {
  rollId: string;
  quantity: string;
  unit: string;
  sourceType: 'MANUAL_DAMAGE' | 'MANUAL_WASTAGE';
  reason: string;
  responsibleUserId?: string;
}

export const wastageApi = {
  getAll: (params: WastageQuery = {}): Promise<{ data: any[]; meta: any }> =>
    apiClient.get('/wastage', { params }),

  getSummary: (
    params: { dateFrom?: string; dateTo?: string; sourceType?: WastageSourceType } = {},
  ): Promise<{ data: any }> => apiClient.get('/wastage/summary', { params }),

  getUserReport: (
    params: { dateFrom?: string; dateTo?: string; sourceType?: WastageSourceType } = {},
  ): Promise<{ data: any[] }> => apiClient.get('/wastage/report/by-user', { params }),

  createManual: (payload: ManualWastagePayload): Promise<{ data: any }> =>
    apiClient.post('/wastage/manual', payload),

  getByRoll: (rollId: string): Promise<{ data: any[] }> =>
    apiClient.get(`/rolls/${rollId}/wastage`),
};
