import apiClient from './client';

export interface TaxSettings {
  taxEnabled: boolean;
  taxRatePercent: string;
  taxLabel: string;
}

export const settingsApi = {
  getCompany: (): Promise<{ data: Record<string, string> }> =>
    apiClient.get('/settings/company'),

  updateCompany: (data: Record<string, string>): Promise<{ data: Record<string, string> }> =>
    apiClient.put('/settings/company', data),

  getApp: (): Promise<{ data: Record<string, string> }> =>
    apiClient.get('/settings/app'),

  updateApp: (data: Record<string, string>): Promise<{ data: Record<string, string> }> =>
    apiClient.put('/settings/app', data),

  getTax: (): Promise<{ data: TaxSettings }> =>
    apiClient.get('/settings/tax'),

  getFlags: (): Promise<{ data: Record<string, boolean> }> =>
    apiClient.get('/settings/flags'),

  updateFlag: (name: string, isEnabled: boolean): Promise<{ data: Record<string, boolean> }> =>
    apiClient.put(`/settings/flags/${name}`, { isEnabled }),
};
