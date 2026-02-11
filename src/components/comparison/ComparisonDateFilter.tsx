'use client';

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { DATE_RANGES, type DateRangeKey } from '@/lib/dateRanges';
import type { DateRange } from '@/lib/data/types';

const STORAGE_KEY = 'comparison_date_range';

interface ComparisonDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  defaultKey?: DateRangeKey;
  className?: string;
}

/**
 * Date filter สำหรับหน้าเปรียบเทียบ - จดจำค่าไว้ใน localStorage
 */
export function ComparisonDateFilter({
  value,
  onChange,
  defaultKey = 'THIS_MONTH',
  className = '',
}: ComparisonDateFilterProps) {
  const [selectedKey, setSelectedKey] = useState<DateRangeKey>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY + '_key');
      if (stored && stored in DATE_RANGES) {
        return stored as DateRangeKey;
      }
    }
    return defaultKey;
  });
  const [showCustom, setShowCustom] = useState(false);

  // Mount: load from localStorage or use default
  useEffect(() => {
    const storedKey = localStorage.getItem(STORAGE_KEY + '_key') as DateRangeKey | null;

    if (storedKey && storedKey !== 'CUSTOM' && storedKey in DATE_RANGES) {
      setSelectedKey(storedKey);
      const range = DATE_RANGES[storedKey].getValue();
      onChange(range);
    } else if (storedKey === 'CUSTOM') {
      const storedRange = localStorage.getItem(STORAGE_KEY + '_range');
      if (storedRange) {
        try {
          const parsed = JSON.parse(storedRange);
          setSelectedKey('CUSTOM');
          setShowCustom(true);
          onChange(parsed);
        } catch {
          const range = DATE_RANGES[defaultKey].getValue();
          onChange(range);
        }
      }
    } else {
      const range = DATE_RANGES[defaultKey].getValue();
      onChange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresetChange = (key: DateRangeKey) => {
    setSelectedKey(key);
    localStorage.setItem(STORAGE_KEY + '_key', key);

    if (key === 'CUSTOM') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      const range = DATE_RANGES[key].getValue();
      onChange(range);
      localStorage.setItem(STORAGE_KEY + '_range', JSON.stringify(range));
    }
  };

  const handleCustomStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRange = { start: e.target.value, end: value.end };
    onChange(newRange);
    localStorage.setItem(STORAGE_KEY + '_range', JSON.stringify(newRange));
  };

  const handleCustomEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRange = { start: value.start, end: e.target.value };
    onChange(newRange);
    localStorage.setItem(STORAGE_KEY + '_range', JSON.stringify(newRange));
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <select
          value={selectedKey}
          onChange={(e) => handlePresetChange(e.target.value as DateRangeKey)}
          className="bg-transparent text-sm font-medium outline-none cursor-pointer"
        >
          {Object.entries(DATE_RANGES).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.start}
            onChange={handleCustomStartChange}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm text-muted-foreground">ถึง</span>
          <input
            type="date"
            value={value.end}
            onChange={handleCustomEndChange}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}
