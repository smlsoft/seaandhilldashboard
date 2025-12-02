'use client';

import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { TopSupplier } from '@/lib/data/types';

interface TopSuppliersTableProps {
  data: TopSupplier[];
}

type SortField = 'supplierName' | 'totalPurchases' | 'poCount' | 'avgPOValue' | 'lastPurchaseDate';
type SortOrder = 'asc' | 'desc';

export function TopSuppliersTable({ data }: TopSuppliersTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalPurchases');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    switch (sortField) {
      case 'supplierName':
        aVal = a.supplierName;
        bVal = b.supplierName;
        break;
      case 'totalPurchases':
        aVal = a.totalPurchases;
        bVal = b.totalPurchases;
        break;
      case 'poCount':
        aVal = a.poCount;
        bVal = b.poCount;
        break;
      case 'avgPOValue':
        aVal = a.avgPOValue;
        bVal = b.avgPOValue;
        break;
      case 'lastPurchaseDate':
        aVal = new Date(a.lastPurchaseDate).getTime();
        bVal = new Date(b.lastPurchaseDate).getTime();
        break;
    }

    if (typeof aVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal);
    }

    return sortOrder === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        ไม่มีข้อมูลซัพพลายเออร์
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-2 font-medium">ลำดับ</th>
            <th
              className="text-left py-3 px-2 font-medium cursor-pointer hover:text-primary"
              onClick={() => handleSort('supplierName')}
            >
              <div className="flex items-center gap-1">
                ซัพพลายเออร์
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-primary"
              onClick={() => handleSort('totalPurchases')}
            >
              <div className="flex items-center justify-end gap-1">
                ยอดซื้อสะสม
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-primary"
              onClick={() => handleSort('poCount')}
            >
              <div className="flex items-center justify-end gap-1">
                จำนวน PO
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-primary"
              onClick={() => handleSort('avgPOValue')}
            >
              <div className="flex items-center justify-end gap-1">
                ค่าเฉลี่ย/PO
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-primary"
              onClick={() => handleSort('lastPurchaseDate')}
            >
              <div className="flex items-center justify-end gap-1">
                ซื้อล่าสุด
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => (
            <tr key={item.supplierCode} className="border-b border-border/50 hover:bg-muted/50">
              <td className="py-2 px-2 text-muted-foreground">{index + 1}</td>
              <td className="py-2 px-2">
                <div className="font-medium">{item.supplierName}</div>
                <div className="text-xs text-muted-foreground">{item.supplierCode}</div>
              </td>
              <td className="py-2 px-2 text-right font-medium">
                ฿{formatCurrency(item.totalPurchases)}
              </td>
              <td className="py-2 px-2 text-right">
                {item.poCount}
              </td>
              <td className="py-2 px-2 text-right">
                ฿{formatCurrency(item.avgPOValue)}
              </td>
              <td className="py-2 px-2 text-right">
                <div className="text-xs">{formatDate(item.lastPurchaseDate)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
