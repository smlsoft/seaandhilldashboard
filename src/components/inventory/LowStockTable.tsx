'use client';

import { PaginatedTable, type ColumnDef } from '../PaginatedTable';
import { AlertTriangle } from 'lucide-react';
import type { LowStockItem } from '@/lib/data/types';

interface LowStockTableProps {
  data: LowStockItem[];
  height?: string;
  itemsPerPage?: number;
}

export function LowStockTable({ data, height = 'auto', itemsPerPage = 10 }: LowStockTableProps) {
  // Use raw data since calculations are now done in the backend
  const transformedData = data;

  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getUrgencyColor = (daysOnHand: number): string => {
    if (daysOnHand <= 2) return 'text-red-600';
    if (daysOnHand <= 5) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const columns: ColumnDef<LowStockItem>[] = [
    {
      key: 'status',
      header: 'สถานะ',
      sortable: false,
      align: 'left',
      render: (item: LowStockItem) => (
        <AlertTriangle className={`h-4 w-4 ${getUrgencyColor(item.daysOnHand)}`} />
      ),
    },
    {
      key: 'itemName',
      header: 'สินค้า',
      sortable: true,
      align: 'left',
      render: (item: LowStockItem) => (
        <div>
          <div className="font-medium">{item.itemName}</div>
          <div className="text-xs text-muted-foreground">
            {item.brandName} • {item.categoryName}
          </div>
        </div>
      ),
    },
    {
      key: 'branchName',
      header: 'คลัง',
      sortable: true,
      align: 'left',
      render: (item: LowStockItem) => <span className="text-xs">{item.branchName}</span>,
    },
    {
      key: 'qtyOnHand',
      header: 'คงเหลือ',
      sortable: true,
      align: 'right',
      render: (item: LowStockItem) => formatNumber(item.qtyOnHand),
    },
    {
      key: 'avgDailySales',
      header: 'ยอดขาย/วัน',
      sortable: true,
      align: 'right',
      render: (item: LowStockItem) => formatNumber(item.avgDailySales),
    },
    {
      key: 'daysOnHand',
      header: 'เหลือขาย (วัน)',
      sortable: true,
      align: 'right',
      render: (item: LowStockItem) => (
        <span className={`font-medium ${getUrgencyColor(item.daysOnHand)}`}>
          {item.daysOnHand === 999999 ? '-' : formatNumber(item.daysOnHand)}
        </span>
      ),
    },
  ];

  return (
    <div style={{ height }} className="flex flex-col flex-1 min-h-0">
      <PaginatedTable
        data={transformedData}
        columns={columns}
        itemsPerPage={itemsPerPage}
        emptyMessage="ไม่มีสินค้าใกล้หมด"
        defaultSortKey="daysOnHand"
        defaultSortOrder="asc"
        keyExtractor={(item) => `${item.itemCode}-${item.branchName}`}
      />
    </div>
  );
}
