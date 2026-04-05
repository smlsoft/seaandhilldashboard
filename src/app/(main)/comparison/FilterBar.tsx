'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RadioGroup } from '@headlessui/react';
import { Filter, TrendingDown, AlertTriangle, Package, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FilterType = 'all' | 'lossMaking' | 'declining' | 'highInventory';

interface FilterBarProps {
  onFilterChange: (filter: FilterType) => void;
  activeFilter: FilterType;
}

export function FilterBar({ onFilterChange, activeFilter }: FilterBarProps) {
  const filters = [
    { id: 'all' as FilterType, label: 'All Branches', icon: Filter, color: 'bg-slate-100 text-slate-700' },
    { id: 'lossMaking' as FilterType, label: 'Negative Profit', icon: TrendingDown, color: 'bg-rose-100 text-rose-700' },
    { id: 'declining' as FilterType, label: 'Declining Sales', icon: AlertTriangle, color: 'bg-orange-100 text-orange-700' },
    { id: 'highInventory' as FilterType, label: 'High Dead Stock', icon: Package, color: 'bg-violet-100 text-violet-700' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <RadioGroup value={activeFilter} onChange={onFilterChange}>
      <motion.div
        className="flex flex-wrap gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;

          return (
            <motion.div
              key={filter.id}
              variants={itemVariants}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <RadioGroup.Option value={filter.id}>
                {({ checked }) => (
                  <motion.button
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all outline-none relative',
                      checked
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : `${filter.color} hover:shadow-sm`
                    )}
                    animate={checked ? { scale: 1.05 } : { scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileFocus={{ ring: 2 }}
                  >
                    {checked && (
                      <motion.div
                        className="absolute inset-0 rounded-lg bg-primary opacity-0"
                        layoutId="activeFilterBg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                    <motion.div
                      animate={checked ? { rotate: 0 } : { rotate: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Icon className="h-4 w-4" />
                    </motion.div>
                    <span>{filter.label}</span>
                    {checked && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
                        <CheckCircle2 className="h-4 w-4 ml-1" />
                      </motion.div>
                    )}
                  </motion.button>
                )}
              </RadioGroup.Option>
            </motion.div>
          );
        })}
      </motion.div>
    </RadioGroup>
  );
}
