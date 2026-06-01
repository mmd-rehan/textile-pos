import apiClient from './client';
import type { Color, Design, Product, CreateProductForm, CreateColorForm, CreateDesignForm } from '../types';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  productType?: string;
  categoryId?: string;
  brandId?: string;
}

export const productsApi = {
  getAll: (params: ProductQuery = {}): Promise<{ data: Product[]; meta: any }> =>
    apiClient.get('/products', { params }),

  getOne: (id: string): Promise<{ data: Product }> =>
    apiClient.get(`/products/${id}`),

  create: (data: CreateProductForm): Promise<{ data: Product }> =>
    apiClient.post('/products', data),

  update: (id: string, data: Partial<CreateProductForm> & { status?: string }): Promise<{ data: Product }> =>
    apiClient.put(`/products/${id}`, data),

  remove: (id: string): Promise<{ data: { id: string } }> =>
    apiClient.delete(`/products/${id}`),

  getColors: (productId: string): Promise<{ data: Array<{ id: string; color: Color }> }> =>
    apiClient.get(`/products/${productId}/colors`),

  addColor: (productId: string, colorId: string): Promise<{ data: any }> =>
    apiClient.post(`/products/${productId}/colors`, { colorId }),

  removeColor: (productId: string, colorId: string): Promise<{ data: any }> =>
    apiClient.delete(`/products/${productId}/colors/${colorId}`),

  getDesigns: (productId: string): Promise<{ data: Array<{ id: string; design: Design }> }> =>
    apiClient.get(`/products/${productId}/designs`),

  addDesign: (productId: string, designId: string): Promise<{ data: any }> =>
    apiClient.post(`/products/${productId}/designs`, { designId }),

  removeDesign: (productId: string, designId: string): Promise<{ data: any }> =>
    apiClient.delete(`/products/${productId}/designs/${designId}`),
};

export const colorsApi = {
  getAll: (params: { search?: string; activeOnly?: boolean } = {}): Promise<{ data: Color[] }> =>
    apiClient.get('/colors', { params: { search: params.search, activeOnly: params.activeOnly ? 'true' : undefined } }),

  getOne: (id: string): Promise<{ data: Color }> =>
    apiClient.get(`/colors/${id}`),

  create: (data: CreateColorForm): Promise<{ data: Color }> =>
    apiClient.post('/colors', data),

  update: (id: string, data: Partial<CreateColorForm> & { isActive?: boolean }): Promise<{ data: Color }> =>
    apiClient.patch(`/colors/${id}`, data),

  remove: (id: string): Promise<{ data: { id: string } }> =>
    apiClient.delete(`/colors/${id}`),
};

export const designsApi = {
  getAll: (params: { search?: string; activeOnly?: boolean } = {}): Promise<{ data: Design[] }> =>
    apiClient.get('/designs', { params: { search: params.search, activeOnly: params.activeOnly ? 'true' : undefined } }),

  getOne: (id: string): Promise<{ data: Design }> =>
    apiClient.get(`/designs/${id}`),

  create: (data: CreateDesignForm): Promise<{ data: Design }> =>
    apiClient.post('/designs', data),

  update: (id: string, data: Partial<CreateDesignForm> & { isActive?: boolean }): Promise<{ data: Design }> =>
    apiClient.patch(`/designs/${id}`, data),

  remove: (id: string): Promise<{ data: { id: string } }> =>
    apiClient.delete(`/designs/${id}`),
};
