import { useQuery } from '@tanstack/react-query';
import { unitsApi } from '../api/units';
import { DEFAULT_METER_TO_YARD } from '../lib/pos-math';

/**
 * The metre→yard factor the backend uses for roll deductions (Units →
 * conversions), so POS previews match the saved sale. Falls back to the
 * seeded value while loading or if the conversion is missing.
 */
export function useMeterToYardFactor(): string {
  const { data } = useQuery({
    queryKey: ['unit-conversions'],
    queryFn: () => unitsApi.getConversions().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const conv = data?.find((c) => c.fromUnit.abbreviation === 'm' && c.toUnit.abbreviation === 'yd');
  return conv?.factor ?? DEFAULT_METER_TO_YARD;
}
