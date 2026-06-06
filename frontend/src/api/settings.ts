import apiClient from './client';

export const settingsApi = {
  getCompany: (): Promise<{ data: Record<string, string> }> =>
    apiClient.get('/settings/company'),

  updateCompany: (data: Record<string, string>): Promise<{ data: Record<string, string> }> =>
    apiClient.put('/settings/company', data),

  getApp: (): Promise<{ data: Record<string, string> }> =>
    apiClient.get('/settings/app'),

  updateApp: (data: Record<string, string>): Promise<{ data: Record<string, string> }> =>
    apiClient.put('/settings/app', data),

  getFlags: (): Promise<{ data: Record<string, boolean> }> =>
    apiClient.get('/settings/flags'),

  updateFlag: (name: string, isEnabled: boolean): Promise<{ data: Record<string, boolean> }> =>
    apiClient.put(`/settings/flags/${name}`, { isEnabled }),
};
