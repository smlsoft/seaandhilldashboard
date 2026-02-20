'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { DATE_RANGES, type DateRangeKey } from '@/lib/dateRanges';
import type { DateRange } from '@/lib/data/types';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  defaultKey?: DateRangeKey;
  className?: string;
}

export function DateRangeFilter({ value, onChange, defaultKey = 'THIS_MONTH', className = '' }: DateRangeFilterProps) {
  const [selectedKey, setSelectedKey] = useState<DateRangeKey>(defaultKey);
  const [showCustom, setShowCustom] = useState(false);
<<<<<<< Updated upstream
  
  // เมื่อ component mount ให้ trigger onChange ด้วย preset ที่เลือก เพื่อให้ค่าตรงกัน
  useEffect(() => {
    if (selectedKey !== 'CUSTOM') {
      const range = DATE_RANGES[selectedKey].getValue();
      onChange(range);
    }
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
>>>>>>> Stashed changes

  const handlePresetChange = (key: DateRangeKey) => {
    setSelectedKey(key);

    if (key === 'CUSTOM') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      const range = DATE_RANGES[key].getValue();
      onChange(range);
    }
  };

  const handleCustomStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
