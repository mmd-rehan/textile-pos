import apiClient from './client';

export interface CurrencyRecord {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isBaseCurrency: boolean;
  isActive: boolean;
}

export interface ExchangeRate {
  id: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: string;
  isCurrent: boolean;
  effectiveFrom: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const currenciesApi = {
  getAll: (): Promise<{ data: CurrencyRecord[] }> =>
    apiClient.get('/currencies'),

  getActive: (): Promise<{ data: CurrencyRecord[] }> =>
    apiClient.get('/currencies/active'),

  toggleStatus: (code: string, isActive: boolean): Promise<{ data: CurrencyRecord }> =>
    apiClient.put(`/currencies/${code}/status`, { isActive }),

  getExchangeRates: (to?: string): Promise<{ data: ExchangeRate[] }> =>
    apiClient.get('/currencies/exchange-rates', { params: to ? { to } : {} }),

  upsertExchangeRate: (data: {
    fromCurrencyCode: string;
    toCurrencyCode: string;
    rate: string;
    notes?: string;
  }): Promise<{ data: ExchangeRate }> =>
    apiClient.post('/currencies/exchange-rates', data),
};
