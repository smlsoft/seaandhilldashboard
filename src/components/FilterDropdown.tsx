'use client';

import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'เลือก...',
  className = '',
}: FilterDropdownProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      
      <Listbox value={value} onChange={onChange}>
        <div className="relative mt-1">
          <ListboxButton className="relative w-full cursor-pointer rounded-lg border border-border bg-background py-2 pl-3 pr-10 text-left text-sm hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors">
            <span className={`block truncate ${!selectedOption ? 'text-muted-foreground' : ''}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </span>
          </ListboxButton>

          <ListboxOptions
            transition
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0"
          >
            <ListboxOption
               value=""
               className="group relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-900 data-[focus]:bg-primary/10 data-[focus]:text-primary"
            >
               <span className="block truncate font-normal group-data-[selected]:font-medium text-muted-foreground">
                  {placeholder}
               </span>
            </ListboxOption>
            
            {options.map((option) => (
              <ListboxOption
                key={option.value}
                className="group relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-900 data-[focus]:bg-primary/10 data-[focus]:text-primary"
                value={option.value}
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {option.label}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  );
}
