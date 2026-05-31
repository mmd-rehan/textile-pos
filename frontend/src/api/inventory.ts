import type { BarcodeLookupResult, InventoryMovement, StockSummaryItem } from '../types';
import apiClient from './client';

export interface MovementsQuery {
  page?: number;
  limit?: number;
  productId?: string;
  rollId?: string;
  movementType?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const inventoryApi = {
  lookupBarcode: (barcode: string): Promise<{ data: BarcodeLookupResult }> =>
    apiClient.get(`/barcodes/${encodeURIComponent(barcode)}/lookup`),

  getMovements: (params: MovementsQuery = {}): Promise<{ data: InventoryMovement[]; meta: any }> =>
    apiClient.get('/inventory/movements', { params }),

  getStockSummary: (): Promise<{ data: StockSummaryItem[] }> =>
    apiClient.get('/inventory/stock-summary'),

  getRollMovements: (
    rollId: string,
    params: { page?: number; limit?: number; movementType?: string; direction?: string } = {},
  ): Promise<{ data: InventoryMovement[]; meta: any }> =>
    apiClient.get(`/rolls/${rollId}/movements`, { params }),
};
