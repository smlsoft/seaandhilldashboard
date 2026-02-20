'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Database, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { cn } from '@/lib/utils';

/* ─── Branch color palette (consistent with ReportComparisonTable) ─── */
const BRANCH_PALETTE = [
    { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-300', headerBg: 'bg-indigo-100/50 dark:bg-indigo-900/20' },
    { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', headerBg: 'bg-emerald-100/50 dark:bg-emerald-900/20' },
    { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', headerBg: 'bg-amber-100/50 dark:bg-amber-900/20' },
    { bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-300', headerBg: 'bg-rose-100/50 dark:bg-rose-900/20' },
    { bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-300', headerBg: 'bg-cyan-100/50 dark:bg-cyan-900/20' },
    { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300', headerBg: 'bg-violet-100/50 dark:bg-violet-900/20' },
];

export interface BranchInfo {
    key: string;
    name: string;
}

export interface ComparisonColumnDef<T> {
    key: string;
    header: string;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    render?: (item: T, branchKey?: string, index?: number) => React.ReactNode;
    className?: string;
    width?: string;
}

export interface UnifiedRow<T> {
    key: string;
    baseItem: T;
    branches: Record<string, T | undefined>;
}

export interface UnifiedComparisonTableProps<T> {
    branches: BranchInfo[];
    dateRange: { start: string; end: string };
    buildEndpoint: (branchKey: string, dateRange: { start: string; end: string }) => string;
    extractData?: (json: Record<string, unknown>) => T[];
    baseColumns: ComparisonColumnDef<T>[];
    compareColumns: ComparisonColumnDef<T>[];
    keyExtractor: (item: T) => string;
    defaultSortKey?: string;
    defaultSortOrder?: 'asc' | 'desc';
    emptyMessage?: string;
    itemsPerPage?: number;
    refreshKey?: number;
    groupByKey?: string; // Field name to group rows by (inserts category header rows)
    filterKey?: string;  // Field name to filter rows by
    filterValue?: string; // Value to filter by (empty string or 'all' = show all)
}

export function UnifiedComparisonTable<T>({
    branches,
    dateRange,
    buildEndpoint,
    extractData,
    baseColumns,
    compareColumns,
    keyExtractor,
    defaultSortKey,
    defaultSortOrder = 'desc',
    emptyMessage = 'ไม่มีข้อมูล',
    itemsPerPage = 15,
    refreshKey = 0,
    groupByKey,
    filterKey,
    filterValue,
}: UnifiedComparisonTableProps<T>) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rawData, setRawData] = useState<Record<string, T[]>>({});

    // Sorting state
    const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch data
    const fetchAll = useCallback(async () => {
        if (branches.length === 0) return;
        setLoading(true);
        setError(null);

        try {
            const results: Record<string, T[]> = {};
            await Promise.all(
                branches.map(async (branch) => {
                    const endpoint = buildEndpoint(branch.key, dateRange);
                    const res = await fetch(endpoint);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const json = await res.json();
                    results[branch.key] = extractData ? extractData(json) : (json.data ?? []);
                })
            );
            setRawData(results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setLoading(false);
        }
    }, [branches, dateRange, buildEndpoint, extractData, refreshKey]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Merge logic
    const mergedData = useMemo(() => {
        const rowMap = new Map<string, UnifiedRow<T>>();

        branches.forEach(branch => {
            const data = rawData[branch.key] || [];
            data.forEach(item => {
                const key = keyExtractor(item);
                if (!rowMap.has(key)) {
                    rowMap.set(key, {
                        key,
                        baseItem: item, // Use the first encounter as base
                        branches: {}
                    });
                }
                const row = rowMap.get(key)!;
                row.branches[branch.key] = item;
            });
        });

        return Array.from(rowMap.values());
    }, [rawData, branches, keyExtractor]);

    // Client-side filter (e.g. by category)
    const filteredData = useMemo(() => {
        if (!filterKey || !filterValue || filterValue === 'all') return mergedData;
        return mergedData.filter(row => {
            const val = String((row.baseItem as any)[filterKey] ?? '');
            return val === filterValue;
        });
    }, [mergedData, filterKey, filterValue]);

    // If groupByKey is set, sort by that key first (empty/null groups go last), then by sortKey
    const sortedData = useMemo(() => {
        let data = [...filteredData];

        const UNGROUPED_LABELS = ['ไม่ระบุหมวดหมู่', 'ไม่ระบุ', ''];

        if (groupByKey) {
            data.sort((a, b) => {
                const aGroup = String((a.baseItem as any)[groupByKey] ?? '');
                const bGroup = String((b.baseItem as any)[groupByKey] ?? '');

                // Push unspecified/empty groups to the end
                const aIsEmpty = UNGROUPED_LABELS.includes(aGroup);
                const bIsEmpty = UNGROUPED_LABELS.includes(bGroup);
                if (aIsEmpty && !bIsEmpty) return 1;
                if (!aIsEmpty && bIsEmpty) return -1;

                const groupCmp = aGroup.localeCompare(bGroup, 'th-TH');
                if (groupCmp !== 0) return groupCmp;
                if (!sortKey) return 0;
                const aVal = (a.baseItem as any)[sortKey];
                const bVal = (b.baseItem as any)[sortKey];
                if (aVal === bVal) return 0;
                if (typeof aVal === 'string' && typeof bVal === 'string')
                    return sortOrder === 'asc' ? aVal.localeCompare(bVal, 'th-TH') : bVal.localeCompare(aVal, 'th-TH');
                if (typeof aVal === 'number' && typeof bVal === 'number')
                    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
                return 0;
            });
        } else if (sortKey) {
            data.sort((a, b) => {
                const aVal = (a.baseItem as any)[sortKey];
                const bVal = (b.baseItem as any)[sortKey];
                if (aVal === bVal) return 0;
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                if (typeof aVal === 'string' && typeof bVal === 'string')
                    return sortOrder === 'asc' ? aVal.localeCompare(bVal, 'th-TH') : bVal.localeCompare(aVal, 'th-TH');
                if (typeof aVal === 'number' && typeof bVal === 'number')
                    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
                return 0;
            });
        }
        return data;
    }, [filteredData, sortKey, sortOrder, groupByKey]);

    // Pagination logic
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, sortedData.length);
    const currentData = sortedData.slice(startIndex, endIndex);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('desc');
        }
    };

    // Sort Icon helper
    const getSortIcon = (columnKey: string) => {
        if (sortKey !== columnKey) {
            return <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-60 transition-opacity" />;
        }
        return sortOrder === 'asc'
            ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
            : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
    };

    const getPageNumbers = () => {
        const pages: number[] = [];
        const maxPages = 5;
        if (totalPages <= maxPages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, start + maxPages - 1);
            if (end - start < maxPages - 1) start = Math.max(1, end - maxPages + 1);
            for (let i = start; i <= end; i++) pages.push(i);
        }
        return pages;
    };

    if (loading && Object.keys(rawData).length === 0) {
        return <TableSkeleton rows={10} />;
    }

    if (error) {
        return <div className="text-red-500 text-center py-10">⚠️ {error}</div>;
    }

    if (branches.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">กรุณาเลือกสาขา</div>;
    }

    return (
        <div className="w-full flex flex-col h-full flex-1 min-h-0 ">
            <div className="overflow-auto flex-1 w-full">
                <table className="w-full text-sm border-collapse min-w-max">
                    <thead className="sticky top-0 z-20 bg-white shadow-sm">
                        {/* Top Header Row: Base Columns (rowSpan=2, centered) + Branch Names */}
                        <tr className="bg-muted/30">
                            {/* Base column headers — span both header rows so they sit centered */}
                            {baseColumns.map((col) => (
                                <th
                                    key={col.key}
                                    rowSpan={2}
                                    className={cn(
                                        "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border bg-gray-50/50 align-middle",
                                        col.sortable && "cursor-pointer hover:bg-muted/50 transition-colors group",
                                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-center',
                                        col.width && `w-[${col.width}]`
                                    )}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <div className={cn(
                                        "flex items-center gap-1.5 justify-center"
                                    )}>
                                        {col.header}
                                        {col.sortable && getSortIcon(col.key)}
                                    </div>
                                </th>
                            ))}

                            {/* Branch Headers */}
                            {branches.map((branch) => (
                                <th
                                    key={branch.key}
                                    colSpan={compareColumns.length}
                                    className="px-4 py-2 text-center border-r border-border font-semibold text-foreground bg-muted/30"
                                >
                                    {branch.name}
                                </th>
                            ))}
                        </tr>

                        {/* Bottom Header Row: Compare metric names only (base cols handled by rowSpan above) */}
                        <tr className="bg-white border-b border-border shadow-sm">
                            {/* Compare Column Headers repeated for each branch */}
                            {branches.map((branch) => (
                                <React.Fragment key={branch.key}>
                                    {compareColumns.map((col, colIdx) => (
                                        <th
                                            key={`${branch.key}-${col.key}`}
                                            className={cn(
                                                "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border last:border-r-0",
                                                colIdx === compareColumns.length - 1 && "border-r-2 border-r-border/50",
                                                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                                            )}
                                        >
                                            {col.header}
                                        </th>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>


                    <tbody className="divide-y divide-border">
                        {currentData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={baseColumns.length + (branches.length * compareColumns.length)}
                                    className="px-4 py-8 text-center text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (() => {
                            // Render rows with optional category group headers
                            const rows: React.ReactNode[] = [];
                            let lastGroup: string | null = null;

                            currentData.forEach((row, rowIndex) => {
                                // Insert group header if groupByKey is set and group changed
                                if (groupByKey) {
                                    const groupVal = String((row.baseItem as any)[groupByKey] ?? '');
                                    if (groupVal !== lastGroup) {
                                        // Count items in this group across all sorted data
                                        const groupCount = sortedData.filter(
                                            r => String((r.baseItem as any)[groupByKey] ?? '') === groupVal
                                        ).length;
                                        lastGroup = groupVal;
                                        rows.push(
                                            <tr key={`group-${groupVal}`} className="bg-muted/60 border-y border-border">
                                                <td
                                                    colSpan={baseColumns.length + (branches.length * compareColumns.length)}
                                                    className="px-4 py-2"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-semibold text-foreground">▌ {groupVal}</span>
                                                        <span className="text-xs text-muted-foreground bg-background border border-border rounded-full px-2 py-0.5">
                                                            {groupCount} รายการ
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                }

                                rows.push(
                                    <tr key={row.key} className="hover:bg-muted/20 transition-colors group">
                                        {/* Base Data Cells */}
                                        {baseColumns.map((col) => (
                                            <td
                                                key={col.key}
                                                className={cn(
                                                    "px-4 py-3 text-sm border-r border-border bg-white group-hover:bg-muted/20",
                                                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                                                    "font-medium"
                                                )}
                                            >
                                                {col.render ? col.render(row.baseItem, undefined, startIndex + rowIndex + 1) : (row.baseItem as any)[col.key]}
                                            </td>
                                        ))}

                                        {/* Branch Data Cells */}
                                        {branches.map((branch, bIdx) => {
                                            const branchItem = row.branches[branch.key];
                                            const palette = BRANCH_PALETTE[bIdx % BRANCH_PALETTE.length];

                                            return (
                                                <React.Fragment key={branch.key}>
                                                    {compareColumns.map((col, cIdx) => (
                                                        <td
                                                            key={`${branch.key}-${col.key}`}
                                                            className={cn(
                                                                "px-4 py-3 text-sm border-r border-border group-hover:bg-muted/20",
                                                                cIdx === compareColumns.length - 1 && "border-r-2 border-r-border/50",
                                                                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                                                                !branchItem && "text-muted-foreground/30 italic"
                                                            )}
                                                        >
                                                            {branchItem ? (
                                                                col.render ? col.render(branchItem, branch.key) : (branchItem as any)[col.key]
                                                            ) : '–'}
                                                        </td>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tr>
                                );
                            });

                            return rows;
                        })()}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pr-16 py-3 border-t bg-white sticky bottom-0 z-10 w-full mt-auto">
                    <div className="text-xs text-muted-foreground">
                        แสดง {startIndex + 1}-{Math.min(endIndex, sortedData.length)} จาก {sortedData.length} รายการ
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="h-5 w-4" />
                        </button>

                        {getPageNumbers().map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${currentPage === page
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
