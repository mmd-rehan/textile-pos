import apiClient from './client';

export interface WastageQuery {
  page?: number;
  limit?: number;
  userId?: string;
  rollId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const wastageApi = {
  getAll: (params: WastageQuery = {}): Promise<{ data: any[]; meta: any }> =>
    apiClient.get('/wastage', { params }),

  getUserReport: (params: { dateFrom?: string; dateTo?: string } = {}): Promise<{ data: any[] }> =>
    apiClient.get('/wastage/report/by-user', { params }),
};
