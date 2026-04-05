'use client';

import { useQuery } from '@tanstack/react-query';
import type { BranchComparisonData } from '@/lib/data/comparison';
import type { DateRange } from '@/lib/data/types';

interface UseComparisonDataOptions {
  dateRange: DateRange;
  branches: string[];
  enabled?: boolean;
}

export function useComparisonData({
  dateRange,
  branches,
  enabled = true,
}: UseComparisonDataOptions) {
  return useQuery({
    queryKey: ['comparison', dateRange.start, dateRange.end, branches.join(',')],
    queryFn: async () => {
      if (branches.length === 0) {
        return [];
      }

      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      branches.forEach((b) => params.append('branch', b));

      const res = await fetch(`/api/comparison?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch comparison data');
      }

      const json = await res.json();
      return (json.data || []) as BranchComparisonData[];
    },
    enabled: enabled && branches.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
