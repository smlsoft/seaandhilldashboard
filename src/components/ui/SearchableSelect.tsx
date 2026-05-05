import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

export interface SearchableSelectOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'เลือกรายการ...',
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    const indexedOptions = options.map((opt, sourceIndex) => ({ opt, sourceIndex }));
    if (!search) return indexedOptions;
    const lowerSearch = search.toLowerCase();
    return indexedOptions.filter(({ opt }) => opt.label.toLowerCase().includes(lowerSearch));
  }, [options, search]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      return;
    }
    
    // Update dropdown position when opened
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownStyle({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
            width: rect.width
        });
    }

    const handleClickOutside = (event: MouseEvent) => {
      // Allow clicking inside portal (we check if target closest element has a special data attribute)
      const target = event.target as HTMLElement;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) && 
        !target.closest('[data-searchable-dropdown="true"]')
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const selectOption = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const dropdownPortal = isOpen ? createPortal(
    <div 
        data-searchable-dropdown="true"
        className="absolute z-[9999] mt-1 bg-white  border border-border rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        style={{ top: dropdownStyle.top, left: dropdownStyle.left, width: Math.max(dropdownStyle.width, 240) }}
    >
      <div className="flex items-center px-3 py-2 border-b border-border">
        <Search className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
        <input
          autoFocus
          className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
          placeholder="ค้นหา..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-60 overflow-y-auto w-full">
        {filteredOptions.length > 0 ? (
          filteredOptions.map(({ opt, sourceIndex }) => (
            <div
              key={`${opt.value}-${sourceIndex}`}
              className={cn(
                "w-full px-3 py-2 text-sm text-left cursor-pointer hover:bg-primary/10 hover:text-primary flex items-center justify-between transition-colors",
                value === opt.value ? "bg-primary text-white font-medium hover:bg-primary hover:text-white" : "text-foreground"
              )}
              onClick={() => selectOption(opt.value)}
            >
              <span className="truncate pr-2">{opt.label}</span>
              {value === opt.value && <Check className="w-4 h-4 shrink-0" />}
            </div>
          ))
        ) : (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            ไม่พบรายการ
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className={cn(
          "flex items-center justify-between w-full min-w-[200px] border border-border bg-background px-3 py-1.5 text-sm rounded-md hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors gap-2",
          className
        )}
      >
        <span className="truncate text-foreground">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {dropdownPortal}
    </div>
  );
}
