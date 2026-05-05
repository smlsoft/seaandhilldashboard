'use client';

import { PaginatedTable, type ColumnDef } from '../PaginatedTable';
import type { SlowMovingItem } from '@/lib/data/types';

interface SlowMovingTableProps {
  data: SlowMovingItem[];
  height?: string;
}

export function SlowMovingTable({ data, height = 'auto' }: SlowMovingTableProps) {

  const formatNumber = (value: number) => {
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const columns: ColumnDef<SlowMovingItem>[] = [
    {
      key: 'index',
      header: 'ลำดับ',
      sortable: false,
      align: 'left',
      render: (_: SlowMovingItem, index: number) => (
        <span className="text-muted-foreground">{index + 1}</span>
      ),
    },
    {
      key: 'itemName',
      header: 'สินค้า',
      sortable: true,
      align: 'left',
      render: (item: SlowMovingItem) => (
        <div>
          <div className="font-medium">{item.itemName}</div>
          <div className="text-xs text-muted-foreground">
            {item.brandName} • {item.categoryName}
          </div>
        </div>
      ),
    },
    {
      key: 'qtyOnHand',
      header: 'คงเหลือ',
      sortable: true,
      align: 'right',
      render: (item: SlowMovingItem) => formatNumber(item.qtyOnHand),
    },
    {
      key: 'qtySold',
      header: 'ขายได้',
      sortable: true,
      align: 'right',
      render: (item: SlowMovingItem) => formatNumber(item.qtySold),
    },
    {
      key: 'inventoryValue',
      header: 'มูลค่าคงคลัง',
      sortable: true,
      align: 'right',
      render: (item: SlowMovingItem) => (
        <span className="font-medium">฿{formatCurrency(item.inventoryValue)}</span>
      ),
    },
  ];

  return (
    <div style={{ height }}className="flex flex-col">
      <PaginatedTable
        data={data}
        columns={columns}
        itemsPerPage={10}
        emptyMessage="ไม่มีสินค้าหมุนเวียนช้า"
        defaultSortKey="inventoryValue"
        defaultSortOrder="desc"
        keyExtractor={(item: SlowMovingItem) => item.itemCode}
      />
    </div>
  );
}
