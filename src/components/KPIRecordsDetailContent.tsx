'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

export interface KPIRecordsColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
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
  const visibleRows = rows.slice(0, rowLimit);
  const hasMoreRows = rows.length > rowLimit;

  const getAlignClass = (align: KPIRecordsColumn['align']) => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">{headerPrefix}{title}</p>
          <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            แสดง {visibleRows.length} จาก {rows.length} รายการ
          </span>
        </div>
        <Link
          href={reportHref}
          className="text-sm font-medium text-blue-600 underline underline-offset-4 hover:text-blue-700"
        >
          {linkLabel}
        </Link>
      </div>

      <div className="relative overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`py-2 px-2 font-semibold text-[hsl(var(--foreground))] ${getAlignClass(column.align)}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={`border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/30 transition-colors ${
                  hasMoreRows && rowIndex === visibleRows.length - 1 ? 'opacity-40' : ''
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={`${row.id}-${column.key}`}
                    className={`py-2 px-2 text-[hsl(var(--foreground))] ${getAlignClass(column.align)} ${column.align === 'right' ? 'font-medium' : ''}`}
                  >
                    {row.cells[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="text-center py-4 text-muted-foreground text-xs">{emptyPrefix}{title}</p>
        )}

        {hasMoreRows && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white/90 to-white/0 dark:from-[hsl(var(--card))] dark:to-transparent" />
        )}
      </div>
    </div>
  );
}
