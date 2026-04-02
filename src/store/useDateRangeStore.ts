/**
 * useDateRangeStore - Zustand Store for Global Date Range Selection
 *
 * Persists the selected date range across all pages so user doesn't
 * need to re-select when navigating between menus.
 */

import { create } from 'zustand';
import { getDateRange } from '@/lib/dateRanges';
import type { DateRange } from '@/lib/data/types';

interface DateRangeStore {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

export const useDateRangeStore = create<DateRangeStore>()((set) => ({
  dateRange: getDateRange('THIS_MONTH'),
  setDateRange: (range) => set({ dateRange: range }),
}));
