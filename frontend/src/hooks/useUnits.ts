import { useQuery } from '@tanstack/react-query';
import { unitsApi } from '../api/units';

export const UNITS_KEY = ['units'] as const;

export function useUnits() {
  return useQuery({
    queryKey: UNITS_KEY,
    queryFn: () => unitsApi.getAll(),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUnitConversions() {
  return useQuery({
    queryKey: [...UNITS_KEY, 'conversions'],
    queryFn: () => unitsApi.getConversions(),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  });
}
