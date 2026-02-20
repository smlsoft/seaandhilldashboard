'use client';

import React from 'react';

interface ReportFilterProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { label: string; value: string }[];
    allLabel?: string;
    className?: string;
}

export function ReportFilter({
    label,
    value,
    onChange,
    options,
    allLabel = 'ทั้งหมด',
    className = '',
}: ReportFilterProps) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <label className="text-sm text-muted-foreground">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="text-sm border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
                <option value="all">{allLabel}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
