import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories';
import type { CreateCategoryForm } from '../types';

export const CATEGORIES_KEY = ['categories'] as const;

export function useCategories(search?: string) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, search],
    queryFn: () => categoriesApi.getAll(search),
    select: (res) => res.data,
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, id],
    queryFn: () => categoriesApi.getOne(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryForm) => categoriesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryForm> & { isActive?: boolean } }) =>
      categoriesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}
