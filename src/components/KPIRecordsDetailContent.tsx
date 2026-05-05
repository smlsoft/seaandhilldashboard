'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface KPIRecordsColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

export interface KPIRecordsRow {
  id: string;
  cells: Record<string, ReactNode>;
}

interface KPIRecordsDetailContentProps {
  title: string;
  columns: KPIRecordsColumn[];
  rows: KPIRecordsRow[];
  reportHref: string;
  rowLimit?: number;
  linkLabel?: string;
  headerPrefix?: string;
  emptyPrefix?: string;
}

type SortDir = 'asc' | 'desc' | null;

/** Extract a comparable primitive from a cell which may be a ReactNode (JSX). */
function extractSortValue(cell: ReactNode): string | number {
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'string') {
    const stripped = cell.replace(/^฿/, '').replace(/,/g, '').replace(/%$/, '');
    const n = parseFloat(stripped);
    if (!isNaN(n)) return n;
    return cell;
  }
  return '';
}

export function KPIRecordsDetailContent({
  title,
  columns,
  rows,
  reportHref,
  rowLimit = 8,
  linkLabel = 'ดูข้อมูลเพิ่มเติม',
  headerPrefix = 'รายชื่อ',
  emptyPrefix = 'ไม่พบข้อมูล',
}: KPIRecordsDetailContentProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [showAll, setShowAll] = useState(false);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const sortedRows =
    sortKey && sortDir
      ? [...rows].sort((a, b) => {
          const av = extractSortValue(a.cells[sortKey]);
          const bv = extractSortValue(b.cells[sortKey]);
          let cmp = 0;
          if (typeof av === 'number' && typeof bv === 'number') {
            cmp = av - bv;
          } else {
            cmp = String(av).localeCompare(String(bv), 'th');
          }
          return sortDir === 'asc' ? cmp : -cmp;
        })
      : rows;

  const hasMoreRows = rows.length > rowLimit;
  const visibleRows = showAll ? sortedRows : sortedRows.slice(0, rowLimit);

  const getAlignClass = (align: KPIRecordsColumn['align']) => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  const isColSortable = (col: KPIRecordsColumn) => col.sortable !== false;

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey || !sortDir)
      return <ChevronsUpDown className="inline w-3 h-3 ml-0.5 opacity-35" />;
    if (sortDir === 'asc') return <ChevronUp className="inline w-3 h-3 ml-0.5 text-blue-500" />;
    return <ChevronDown className="inline w-3 h-3 ml-0.5 text-blue-500" />;
  };

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
            {headerPrefix}{title}
          </p>
          <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            แสดง {visibleRows.length} จาก {rows.length} รายการ
          </span>
        </div>
        <Link
          href={reportHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 underline underline-offset-4 hover:text-blue-700"
        >
          {linkLabel}
        </Link>
      </div>

      {/* Table with sticky header + optional scroll */}
      <div className="rounded-md border border-[hsl(var(--border))] overflow-hidden">
        <div className={showAll ? 'max-h-[340px] overflow-y-auto' : 'overflow-x-auto'}>
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[hsl(var(--card))] shadow-[0_1px_0_0_hsl(var(--border))]">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => isColSortable(col) && handleSort(col.key)}
                    className={`py-2 px-2 font-semibold whitespace-nowrap text-[hsl(var(--foreground))] ${getAlignClass(col.align)} ${
                      isColSortable(col)
                        ? 'cursor-pointer select-none hover:bg-[hsl(var(--muted))]/70 transition-colors'
                        : ''
                    }`}
                  >
                    {col.label}
                    {isColSortable(col) && <SortIcon colKey={col.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/30 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={`${row.id}-${col.key}`}
                      className={`py-2 px-2 text-[hsl(var(--foreground))] ${getAlignClass(col.align)} ${col.align === 'right' ? 'font-medium' : ''}`}
                    >
                      {row.cells[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && (
            <p className="text-center py-4 text-muted-foreground text-xs">
              {emptyPrefix}{title}
            </p>
          )}
        </div>
      </div>

      {/* Show-all toggle button */}
      {hasMoreRows && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 w-full py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-md transition-colors border border-dashed border-blue-200 dark:border-blue-800"
        >
          {showAll
            ? 'ย่อรายการ ↑'
            : `ดูทั้งหมด ${rows.length} รายการ ↓`}
        </button>
      )}
    </div>
  );
}
