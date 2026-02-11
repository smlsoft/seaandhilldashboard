'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { DateRange } from '@/lib/data/types';
import { useCallback } from 'react';

export function ComparisonFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get current values from URL or default to empty (which means default in logic)
    const start = searchParams.get('from') || '';
    const end = searchParams.get('to') || '';

    const handleRangeChange = useCallback((range: DateRange) => {
        const params = new URLSearchParams(searchParams.toString());

        if (range.start) {
            params.set('from', range.start);
        } else {
            params.delete('from');
        }

        if (range.end) {
            params.set('to', range.end);
        } else {
            params.delete('to');
        }

        router.push(`/dashboard/comparison?${params.toString()}`);
    }, [router, searchParams]);

    const value: DateRange = {
        start,
        end
    };

    return (
        <DateRangeFilter
            value={value}
            onChange={handleRangeChange}
            defaultKey="THIS_MONTH"
            className="bg-card rounded-lg shadow-sm border border-border p-1"
        />
    );
}
