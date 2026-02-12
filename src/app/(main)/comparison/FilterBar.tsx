'use client';

import { useState } from 'react';
import { Filter, TrendingDown, AlertTriangle, Package } from 'lucide-react';
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

    return (
        <div className="flex flex-wrap gap-2">
            {filters.map(filter => {
                const Icon = filter.icon;
                const isActive = activeFilter === filter.id;

                return (
                    <button
                        key={filter.id}
                        onClick={() => onFilterChange(filter.id)}
                        className={cn(
                            'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
                            isActive
                                ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary ring-offset-2'
                                : `${filter.color} hover:ring-2 hover:ring-offset-1 hover:ring-slate-300`
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{filter.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
