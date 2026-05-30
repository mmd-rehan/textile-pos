import apiClient from './client';
import type { Unit, UnitConversion } from '../types';

export const unitsApi = {
  getAll: (): Promise<{ data: Unit[] }> =>
    apiClient.get('/units'),

  getConversions: (): Promise<{ data: UnitConversion[] }> =>
    apiClient.get('/units/conversions'),

  create: (data: { name: string; abbreviation: string }): Promise<{ data: Unit }> =>
    apiClient.post('/units', data),

  update: (id: string, data: Partial<{ name: string; abbreviation: string }>): Promise<{ data: Unit }> =>
    apiClient.put(`/units/${id}`, data),

  remove: (id: string): Promise<{ data: { id: string } }> =>
    apiClient.delete(`/units/${id}`),
};
