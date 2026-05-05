'use client';

import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { SalesBySalesperson } from '@/lib/data/types';

interface SalesBySalespersonTableProps {
  data: SalesBySalesperson[];
}

type SortField = 'saleName' | 'totalSales' | 'orderCount' | 'avgOrderValue' | 'customerCount';
type SortOrder = 'asc' | 'desc';

export function SalesBySalespersonTable({ data }: SalesBySalespersonTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalSales');
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
      case 'saleName':
        aVal = a.saleName;
        bVal = b.saleName;
        break;
      case 'totalSales':
        aVal = a.totalSales;
        bVal = b.totalSales;
        break;
      case 'orderCount':
        aVal = a.orderCount;
        bVal = b.orderCount;
        break;
      case 'avgOrderValue':
        aVal = a.avgOrderValue;
        bVal = b.avgOrderValue;
        break;
      case 'customerCount':
        aVal = a.customerCount;
        bVal = b.customerCount;
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        ไม่มีข้อมูลพนักงานขาย
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
              onClick={() => handleSort('saleName')}
            >
              <div className="flex items-center gap-1">
                พนักงานขาย
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-primary"
              onClick={() => handleSort('totalSales')}
            >
              <div className="flex items-center justify-end gap-1">
                ยอดขาย
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-primary"
              onClick={() => handleSort('orderCount')}
            >
              <div className="flex items-center justify-end gap-1">
                จำนวนออเดอร์
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-primary"
              onClick={() => handleSort('avgOrderValue')}
            >
              <div className="flex items-center justify-end gap-1">
                ค่าเฉลี่ย/ออเดอร์
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-primary"
              onClick={() => handleSort('customerCount')}
            >
              <div className="flex items-center justify-end gap-1">
                จำนวนลูกค้า
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => (
            <tr key={item.saleCode} className="border-b border-border/50 hover:bg-muted/50">
              <td className="py-2 px-2 text-muted-foreground">{index + 1}</td>
              <td className="py-2 px-2">
                <div className="font-medium">{item.saleName}</div>
                <div className="text-xs text-muted-foreground">{item.saleCode}</div>
              </td>
              <td className="py-2 px-2 text-right font-medium">
                ฿{formatCurrency(item.totalSales)}
              </td>
              <td className="py-2 px-2 text-right">
                {formatCurrency(item.orderCount)}
              </td>
              <td className="py-2 px-2 text-right">
                ฿{formatCurrency(item.avgOrderValue)}
              </td>
              <td className="py-2 px-2 text-right">
                {item.customerCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
