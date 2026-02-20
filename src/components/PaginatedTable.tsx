'use client';

import { useState, ReactNode } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Database } from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  // เพิ่ม summary render function
  summaryRender?: (data: T[]) => ReactNode;
}

export interface ColumnGroup<T> {
  header: string;
  columns: (ColumnDef<T> | ColumnGroup<T>)[];
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export type TableColumn<T> = ColumnDef<T> | ColumnGroup<T>;

// เพิ่ม SummaryConfig type
export interface SummaryConfig<T> {
  label?: string;
  labelColSpan?: number;
  values: {
    [key: string]: (data: T[]) => ReactNode;
  };
}

// ... (imports)

interface PaginatedTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  itemsPerPage?: number;
  emptyMessage?: string;
  keyExtractor?: (item: T, index: number) => string;
  rowClassName?: (item: T, index: number) => string;
  defaultSortKey?: string;
  defaultSortOrder?: 'asc' | 'desc';
  showSummary?: boolean;
  summaryConfig?: SummaryConfig<T>;
<<<<<<< HEAD
<<<<<<< Updated upstream
=======
=======
>>>>>>> main
  // Server-side pagination props
  manualPagination?: boolean;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
<<<<<<< HEAD
  paginationClassName?: string;
>>>>>>> Stashed changes
=======
>>>>>>> main
}

export function PaginatedTable<T = any>({
  data,
  columns,
  itemsPerPage = 10,
  emptyMessage = 'ไม่มีข้อมูล',
  keyExtractor = (_, index) => `row-${index}`,
  rowClassName,
  defaultSortKey,
  defaultSortOrder = 'desc',
  showSummary = false,
  summaryConfig,
<<<<<<< HEAD
<<<<<<< Updated upstream
=======
=======
>>>>>>> main
  manualPagination = false,
  totalItems = 0,
  currentPage: externalPage = 1,
  onPageChange,
<<<<<<< HEAD
  paginationClassName,
>>>>>>> Stashed changes
=======
>>>>>>> main
}: PaginatedTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [internalPage, setInternalPage] = useState(1);

  // Use external page if manual, otherwise internal
  const currentPage = manualPagination ? externalPage : internalPage;

  // Sort handler
  const handleSort = (key: string) => {
    // ... (same sort logic)
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
    if (!manualPagination) setInternalPage(1);
  };

  // Sort data (only client-side sorting for now, applied to current page data if manual)
  const sortedData = sortKey
    ? [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal, 'th-TH')
          : bVal.localeCompare(aVal, 'th-TH');
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortOrder === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'th-TH')
        : String(bVal).localeCompare(String(aVal), 'th-TH');
    })
    : data;

  // Pagination Logic
  const totalPages = manualPagination
    ? Math.ceil(totalItems / itemsPerPage)
    : Math.ceil(sortedData.length / itemsPerPage);

  const startIndex = manualPagination
    ? (currentPage - 1) * itemsPerPage
    : (currentPage - 1) * itemsPerPage; // used for display 'Showing x-y'

  const endIndex = manualPagination
    ? Math.min(startIndex + itemsPerPage, totalItems)
    : startIndex + itemsPerPage;

  // If manual, data is already sliced (usually), but if we sorted client-side, using sortedData is fine (it's length 20).
  // If manual, do NOT slice.
  const paginatedData = manualPagination ? sortedData : sortedData.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    const targetPage = Math.max(1, Math.min(page, totalPages));
    if (manualPagination) {
      onPageChange?.(targetPage);
    } else {
      setInternalPage(targetPage);
    }
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPages = 5;

    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxPages - 1);

      if (end - start < maxPages - 1) {
        start = Math.max(1, end - maxPages + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-60 transition-opacity" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Database className="h-12 w-12 mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-full flex-1 min-h-0">
      {/* Table */}
      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
            <tr className="bg-muted/50 backdrop-blur-sm">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border ${getAlignClass(column.align)} ${column.className || ''} ${column.sortable ? 'cursor-pointer select-none group hover:bg-muted/80 transition-colors' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={`flex items-center gap-1.5 ${column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    <span>{column.header}</span>
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.map((item, index) => (
              <tr
                key={keyExtractor(item, startIndex + index)}
                className={`hover:bg-muted/30 transition-colors ${rowClassName ? rowClassName(item, startIndex + index) : ''}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 text-sm ${getAlignClass(column.align)} ${column.className || ''}`}
                  >
                    {column.render
                      ? column.render(item, startIndex + index)
                      : (item as any)[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* Summary Row */}
          {showSummary && summaryConfig && (
            <tfoot className="bg-muted/70 backdrop-blur-sm   ">
              <tr className="font-semibold">
                {columns.map((column, colIndex) => {
                  // Label column(s)
                  if (colIndex === 0) {
                    return (
                      <td
                        key={column.key}
                        colSpan={summaryConfig.labelColSpan || 1}
                        className={`px-4 py-3 text-sm font-bold ${getAlignClass(column.align)}`}
                      >
                        {summaryConfig.label || 'รวมทั้งหมด'}
                      </td>
                    );
                  }

                  // Skip columns covered by colspan
                  if (colIndex < (summaryConfig.labelColSpan || 1)) {
                    return null;
                  }

                  // Value columns
                  const summaryValue = summaryConfig.values[column.key];
                  return (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-sm ${getAlignClass(column.align)}`}
                    >
                      {summaryValue ? summaryValue(data) : ''}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between px-2 pr-16 py-3 border-t border-border bg-white sticky bottom-0 z-10 mt-auto ${paginationClassName || ''}`}>
          <div className="text-xs text-muted-foreground">
            แสดง {startIndex + 1}-{Math.min(endIndex, sortedData.length)} จาก {sortedData.length} รายการ
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-5 w-4" />
            </button>

            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
<<<<<<< HEAD
<<<<<<< Updated upstream
                className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
=======
                className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${currentPage === page
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
                  }`}
>>>>>>> Stashed changes
=======
                className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${currentPage === page
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                  }`}
>>>>>>> main
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
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
