import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colorsApi } from '../api/products';
import type { CreateColorForm } from '../types';

export const COLORS_KEY = ['colors'] as const;

export function useColors(search?: string, activeOnly?: boolean) {
  return useQuery({
    queryKey: [...COLORS_KEY, search, activeOnly],
    queryFn: () => colorsApi.getAll({ search, activeOnly }),
    select: (res) => res.data,
  });
}

export function useCreateColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateColorForm) => colorsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: COLORS_KEY }),
  });
}

export function useUpdateColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateColorForm> & { isActive?: boolean } }) =>
      colorsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: COLORS_KEY }),
  });
}

export function useDeleteColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => colorsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: COLORS_KEY }),
  });
}
