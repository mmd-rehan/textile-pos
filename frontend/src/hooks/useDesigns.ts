import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { designsApi } from '../api/products';
import type { CreateDesignForm } from '../types';

export const DESIGNS_KEY = ['designs'] as const;

export function useDesigns(search?: string, activeOnly?: boolean) {
  return useQuery({
    queryKey: [...DESIGNS_KEY, search, activeOnly],
    queryFn: () => designsApi.getAll({ search, activeOnly }),
    select: (res) => res.data,
  });
}

export function useCreateDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDesignForm) => designsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DESIGNS_KEY }),
  });
}

export function useUpdateDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDesignForm> & { isActive?: boolean } }) =>
      designsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DESIGNS_KEY }),
  });
}

export function useDeleteDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => designsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DESIGNS_KEY }),
  });
}
