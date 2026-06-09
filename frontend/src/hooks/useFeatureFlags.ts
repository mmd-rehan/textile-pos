import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';

export function useFeatureFlags() {
  const { data: flags = {}, isLoading } = useQuery({
    queryKey: ['settings-flags'],
    queryFn: () => settingsApi.getFlags().then((r) => r.data),
    staleTime: 30_000,
  });

  return { flags, isLoading };
}

export function useFeatureFlag(flagKey: string) {
  const { flags, isLoading } = useFeatureFlags();
  return { enabled: flags[flagKey] ?? false, isLoading };
}
