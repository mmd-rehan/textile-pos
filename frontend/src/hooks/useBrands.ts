import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandsApi } from '../api/brands';
import type { CreateBrandForm } from '../types';

export const BRANDS_KEY = ['brands'] as const;

export function useBrands(search?: string) {
  return useQuery({
    queryKey: [...BRANDS_KEY, search],
    queryFn: () => brandsApi.getAll(search),
    select: (res) => res.data,
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBrandForm) => brandsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: BRANDS_KEY }),
  });
}

export function useUpdateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBrandForm> & { isActive?: boolean } }) =>
      brandsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: BRANDS_KEY }),
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => brandsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: BRANDS_KEY }),
  });
}
