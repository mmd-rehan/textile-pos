import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import { getCurrency } from '../constants/currencies';

/**
 * Returns the shop's current base currency, read live from company settings.
 * Falls back to USD while loading or on error.
 * All new sales forms and POS screens should use this hook.
 * Saved historical records should display their own stored currencyCode.
 */
export function useBaseCurrency() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings-company'],
    queryFn: () => settingsApi.getCompany(),
    select: (r) => r.data,
    staleTime: 2 * 60 * 1000,
  });

  const code = settings?.company_currency ?? 'USD';
  const currency = getCurrency(code);

  return {
    code,
    symbol: currency.symbol,
    name: currency.name,
    isLoading,
  };
}
