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
<<<<<<< HEAD
<<<<<<< Updated upstream
=======
  const [customStartDisplay, setCustomStartDisplay] = useState('');
  const [customEndDisplay, setCustomEndDisplay] = useState('');
>>>>>>> main
  
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
<<<<<<< HEAD
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ทำงานครั้งเดียวตอน mount
=======
  const [customStartDisplay, setCustomStartDisplay] = useState('');
  const [customEndDisplay, setCustomEndDisplay] = useState('');

  // Debounce timer ref to prevent fetching on every keystroke
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

=======
    
>>>>>>> main
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
<<<<<<< HEAD
>>>>>>> Stashed changes
=======
>>>>>>> main

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

  const handleCustomStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
<<<<<<< HEAD
<<<<<<< Updated upstream
    onChange({
      start: e.target.value,
      end: value.end,
    });
  };

  const handleCustomEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      start: value.start,
      end: e.target.value,
    });
=======
    const displayValue = e.target.value;
    setCustomStartDisplay(displayValue);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Try to parse and update if valid, but with debounce
    const parsed = parseDateFromDDMMYYYY(displayValue);
    if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
      // Set new timer - only call onChange after 800ms of no typing
      debounceTimerRef.current = setTimeout(() => {
        console.log('📅 DateRangeFilter: Custom start changed to', parsed);
        onChange({
          start: parsed,
          end: value.end,
        });
      }, 800);
    }
  };

  const handleCustomEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const displayValue = e.target.value;
    setCustomEndDisplay(displayValue);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Try to parse and update if valid, but with debounce
    const parsed = parseDateFromDDMMYYYY(displayValue);
    if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
      // Set new timer - only call onChange after 800ms of no typing
      debounceTimerRef.current = setTimeout(() => {
        console.log('📅 DateRangeFilter: Custom end changed to', parsed);
        onChange({
          start: value.start,
          end: parsed,
        });
      }, 800);
    }
>>>>>>> Stashed changes
=======
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

  const handleCustomEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
>>>>>>> main
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
            type="text"
            value={customStartDisplay}
            onChange={handleCustomStartChange}
            placeholder="DD/MM/YYYY"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary w-32"
          />
          <span className="text-sm text-muted-foreground">ถึง</span>
          <input
            type="text"
            value={customEndDisplay}
            onChange={handleCustomEndChange}
            placeholder="DD/MM/YYYY"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary w-32"
          />
        </div>
      )}
    </div>
  );
}
