'use client';

import { PaginatedTable, type ColumnDef } from '../PaginatedTable';
import { AlertTriangle } from 'lucide-react';
import type { LowStockItem } from '@/lib/data/types';

interface LowStockTableProps {
  data: LowStockItem[];
  height?: string;
  itemsPerPage?: number;
}

type ExtendedLowStockItem = LowStockItem & {
  shortage: number;
  shortagePercent: number;
};

export function LowStockTable({ data, height = 'auto', itemsPerPage = 10 }: LowStockTableProps) {
  // Transform data to calculate shortage
  const transformedData: ExtendedLowStockItem[] = data.map(item => ({
    ...item,
    shortage: item.reorderPoint - item.qtyOnHand,
    shortagePercent: ((item.reorderPoint - item.qtyOnHand) / item.reorderPoint) * 100,
  }));

  const formatNumber = (value: number) => {
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const getUrgencyColor = (shortagePercent: number): string => {
    if (shortagePercent >= 75) return 'text-red-600';
    if (shortagePercent >= 50) return 'text-orange-600';
    if (shortagePercent >= 25) return 'text-yellow-600';
    return 'text-green-600';
  };

  const columns: ColumnDef<ExtendedLowStockItem>[] = [
    {
      key: 'shortagePercent',
      header: 'สถานะ',
      sortable: false,
      align: 'left',
      render: (item: ExtendedLowStockItem) => (
        <AlertTriangle className={`h-4 w-4 ${getUrgencyColor(item.shortagePercent)}`} />
      ),
    },
    {
      key: 'itemName',
      header: 'สินค้า',
      sortable: true,
      align: 'left',
      render: (item: ExtendedLowStockItem) => (
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
      header: 'สาขา',
      sortable: true,
      align: 'left',
      render: (item: ExtendedLowStockItem) => <span className="text-xs">{item.branchName}</span>,
    },
    {
      key: 'qtyOnHand',
      header: 'คงเหลือ',
      sortable: true,
      align: 'right',
      render: (item: ExtendedLowStockItem) => formatNumber(item.qtyOnHand),
    },
    {
      key: 'reorderPoint',
      header: 'จุด Reorder',
      sortable: true,
      align: 'right',
      render: (item: ExtendedLowStockItem) => formatNumber(item.reorderPoint),
    },
    {
      key: 'shortage',
      header: 'ขาด',
      sortable: true,
      align: 'right',
      render: (item: ExtendedLowStockItem) => (
        <span className={`font-medium ${getUrgencyColor(item.shortagePercent)}`}>
          {formatNumber(item.shortage)}
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
        defaultSortKey="shortage"
        defaultSortOrder="desc"
        keyExtractor={(item) => `${item.itemCode}-${item.branchName}`}
      />
    </div>
  );
}
