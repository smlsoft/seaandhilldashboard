'use client';

import { useState, useEffect, useRef } from 'react';
import { Listbox } from '@headlessui/react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown } from 'lucide-react';
import { DATE_RANGES, type DateRangeKey } from '@/lib/dateRanges';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import type { DateRange } from '@/lib/data/types';
import { cn } from '@/lib/utils';

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

interface ComparisonDateFilterProps {
  // Still accept optional props for backward compatibility,
  // but default to using the global store if not provided
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  defaultKey?: DateRangeKey;
  className?: string;
}

/**
 * Date filter สำหรับหน้าเปรียบเทียบ - ใช้ useQuery + Headless UI Listbox
 */
export function ComparisonDateFilter({
  value: valueProp,
  onChange: onChangeProp,
  defaultKey = 'THIS_MONTH',
  className = '',
}: ComparisonDateFilterProps) {
  const { dateRange: storeRange, setDateRange: setStoreRange } = useDateRangeStore();

  // Use store value unless prop is provided (for legacy usage)
  const value = valueProp ?? storeRange;
  const onChange = onChangeProp ?? setStoreRange;

  const [selectedKey, setSelectedKey] = useState<DateRangeKey>(defaultKey);
  const [showCustom, setShowCustom] = useState(false);
  const [customStartDisplay, setCustomStartDisplay] = useState('');
  const [customEndDisplay, setCustomEndDisplay] = useState('');
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  // Sync selectedKey when store value changes from another page
  useEffect(() => {
    let matched: DateRangeKey | null = null;
    for (const [key, preset] of Object.entries(DATE_RANGES)) {
      if (key === 'CUSTOM') continue;
      const range = preset.getValue();
      if (range.start === value.start && range.end === value.end) {
        matched = key as DateRangeKey;
        break;
      }
    }
    if (matched) {
      setSelectedKey(matched);
      setShowCustom(false);
    } else {
      setSelectedKey('CUSTOM');
      setShowCustom(true);
      setCustomStartDisplay(formatDateToDDMMYYYY(value.start));
      setCustomEndDisplay(formatDateToDDMMYYYY(value.end));
    }
  }, [value]);

  const handlePresetChange = (key: DateRangeKey) => {
    setSelectedKey(key);

    if (key === 'CUSTOM') {
      setShowCustom(true);
      setCustomStartDisplay(formatDateToDDMMYYYY(value.start));
      setCustomEndDisplay(formatDateToDDMMYYYY(value.end));
    } else {
      setShowCustom(false);
      const range = DATE_RANGES[key].getValue();
      onChange(range);
    }
  };

  const handleCustomStartTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const displayValue = e.target.value;
    setCustomStartDisplay(displayValue);

    const parsed = parseDateFromDDMMYYYY(displayValue);
    if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
      onChange({
        start: parsed,
        end: value.end,
      });
    }
  };

  const handleCustomEndTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const displayValue = e.target.value;
    setCustomEndDisplay(displayValue);

    const parsed = parseDateFromDDMMYYYY(displayValue);
    if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
      onChange({
        start: value.start,
        end: parsed,
      });
    }
  };

  const handleStartDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      setCustomStartDisplay(formatDateToDDMMYYYY(dateValue));
      onChange({
        start: dateValue,
        end: value.end,
      });
    }
  };

  const handleEndDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      setCustomEndDisplay(formatDateToDDMMYYYY(dateValue));
      onChange({
        start: value.start,
        end: dateValue,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-2 ${className}`}
    >
      <Listbox value={selectedKey} onChange={handlePresetChange}>
        <div className="relative">
          <Listbox.Button
            className={cn(
              'flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2',
              'text-sm font-medium outline-none transition-all',
              'hover:border-primary focus:ring-2 focus:ring-primary cursor-pointer'
            )}
          >
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {DATE_RANGES[selectedKey]?.label || 'เลือกวันที่'}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Listbox.Button>

          <motion.div layout>
            <Listbox.Options
              className={cn(
                'absolute z-50 mt-1 w-48 rounded-lg border border-border bg-background shadow-lg',
                'py-1 outline-none',
                'right-0'
              )}
            >
              {Object.entries(DATE_RANGES).map(([key, { label }], index) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Listbox.Option value={key as DateRangeKey}>
                    {({ active, selected }) => (
                      <motion.div
                        className={cn(
                          'px-3 py-2 text-sm cursor-pointer transition-colors',
                          active ? 'bg-primary/10 text-primary' : 'text-foreground',
                          selected && 'bg-primary/20 font-semibold'
                        )}
                        whileHover={{ paddingLeft: 16 }}
                      >
                        {label}
                      </motion.div>
                    )}
                  </Listbox.Option>
                </motion.div>
              ))}
            </Listbox.Options>
          </motion.div>
        </div>
      </Listbox>

      {/* Custom Date Inputs */}
      {showCustom && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <motion.input
              type="text"
              value={customStartDisplay}
              onChange={handleCustomStartTextChange}
              placeholder="DD/MM/YYYY"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm outline-none',
                'focus:ring-2 focus:ring-primary w-36 transition-all'
              )}
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
            <motion.input
              type="text"
              value={customEndDisplay}
              onChange={handleCustomEndTextChange}
              placeholder="DD/MM/YYYY"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm outline-none',
                'focus:ring-2 focus:ring-primary w-36 transition-all'
              )}
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
        </motion.div>
      )}
    </motion.div>
  );
}
