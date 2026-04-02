'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { DATE_RANGES, type DateRangeKey } from '@/lib/dateRanges';
import type { DateRange } from '@/lib/data/types';

// Helper functions to convert between YYYY-MM-DD and DD/MM/YYYY
function formatDateToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function parseDateFromDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  defaultKey?: DateRangeKey;
  className?: string;
}

export function DateRangeFilter({ value, onChange, defaultKey = 'THIS_MONTH', className = '' }: DateRangeFilterProps) {
  const [selectedKey, setSelectedKey] = useState<DateRangeKey>(defaultKey);
  const [showCustom, setShowCustom] = useState(false);
  const [customStartDisplay, setCustomStartDisplay] = useState('');
  const [customEndDisplay, setCustomEndDisplay] = useState('');
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  // Sync selectedKey กับ value จากภายนอก
  useEffect(() => {
    // หาว่า value ปัจจุบันตรงกับ preset ไหน
    let matchedKey: DateRangeKey | null = null;

    for (const [key, preset] of Object.entries(DATE_RANGES)) {
      if (key === 'CUSTOM') continue;
      const range = preset.getValue();
      if (range.start === value.start && range.end === value.end) {
        matchedKey = key as DateRangeKey;
        break;
      }
    }

    if (matchedKey) {
      setSelectedKey(matchedKey);
      setShowCustom(false);
    } else {
      // ถ้าไม่ตรงกับ preset ไหนเลย แสดงว่าเป็น custom
      setSelectedKey('CUSTOM');
      setShowCustom(true);
      setCustomStartDisplay(formatDateToDDMMYYYY(value.start));
      setCustomEndDisplay(formatDateToDDMMYYYY(value.end));
    }
  }, [value]);

  const handlePresetChange = (key: DateRangeKey) => {
    console.log('📅 DateRangeFilter: Changing to', key);
    setSelectedKey(key);

    if (key === 'CUSTOM') {
      setShowCustom(true);
      // Initialize with current values
      setCustomStartDisplay(formatDateToDDMMYYYY(value.start));
      setCustomEndDisplay(formatDateToDDMMYYYY(value.end));
    } else {
      setShowCustom(false);
      const range = DATE_RANGES[key].getValue();
      console.log('📅 DateRangeFilter: New range', range);
      onChange(range);
    }
  };

  const handleCustomStartTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const displayValue = e.target.value;
    setCustomStartDisplay(displayValue);

    // Try to parse and update if valid
    const parsed = parseDateFromDDMMYYYY(displayValue);
    if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
      console.log('📅 DateRangeFilter: Custom start changed to', parsed);
      onChange({
        start: parsed,
        end: value.end,
      });
    }
  };

  const handleCustomEndTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const displayValue = e.target.value;
    setCustomEndDisplay(displayValue);

    // Try to parse and update if valid
    const parsed = parseDateFromDDMMYYYY(displayValue);
    if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
      console.log('📅 DateRangeFilter: Custom end changed to', parsed);
      onChange({
        start: value.start,
        end: parsed,
      });
    }
  };

  const handleStartDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value; // YYYY-MM-DD from date input
    if (dateValue) {
      setCustomStartDisplay(formatDateToDDMMYYYY(dateValue));
      onChange({
        start: dateValue,
        end: value.end,
      });
    }
  };

  const handleEndDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value; // YYYY-MM-DD from date input
    if (dateValue) {
      setCustomEndDisplay(formatDateToDDMMYYYY(dateValue));
      onChange({
        start: value.start,
        end: dateValue,
      });
    }
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
          <div className="relative">
            <input
              type="text"
              value={customStartDisplay}
              onChange={handleCustomStartTextChange}
              placeholder="DD/MM/YYYY"
              className="rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary w-36"
            />
            <button
              type="button"
              onClick={() => startDateInputRef.current?.showPicker()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </button>
            <input
              ref={startDateInputRef}
              type="date"
              value={value.start}
              onChange={handleStartDatePickerChange}
              className="absolute opacity-0 pointer-events-none"
              tabIndex={-1}
            />
          </div>
          <span className="text-sm text-muted-foreground">ถึง</span>
          <div className="relative">
            <input
              type="text"
              value={customEndDisplay}
              onChange={handleCustomEndTextChange}
              placeholder="DD/MM/YYYY"
              className="rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary w-36"
            />
            <button
              type="button"
              onClick={() => endDateInputRef.current?.showPicker()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </button>
            <input
              ref={endDateInputRef}
              type="date"
              value={value.end}
              onChange={handleEndDatePickerChange}
              className="absolute opacity-0 pointer-events-none"
              tabIndex={-1}
            />
          </div>
        </div>
      )}
    </div>
  );
}
