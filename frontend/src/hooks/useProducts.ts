import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi, colorsApi, designsApi, type ProductQuery } from '../api/products';
import type { CreateProductForm } from '../types';

export const PRODUCTS_KEY = ['products'] as const;
export const COLORS_KEY = ['colors'] as const;
export const DESIGNS_KEY = ['designs'] as const;

export function useProducts(query: ProductQuery = {}) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, query],
    queryFn: () => productsApi.getAll(query),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id],
    queryFn: () => productsApi.getOne(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductForm) => productsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductForm> & { status?: string } }) =>
      productsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useColors(search?: string) {
  return useQuery({
    queryKey: [...COLORS_KEY, search],
    queryFn: () => colorsApi.getAll({ search }),
    select: (res) => res.data,
  });
}

export function useCreateColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; colorCode?: string }) => colorsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: COLORS_KEY }),
  });
}

export function useDesigns(search?: string) {
  return useQuery({
    queryKey: [...DESIGNS_KEY, search],
    queryFn: () => designsApi.getAll({ search }),
    select: (res) => res.data,
  });
}

export function useCreateDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; designCode?: string }) => designsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DESIGNS_KEY }),
  });
}
