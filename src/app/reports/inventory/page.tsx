'use client';

import { useState, useEffect } from 'react';
import { DataCard } from '@/components/DataCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { PaginatedTable, type ColumnDef } from '@/components/PaginatedTable';
import { AlertCircle, AlertTriangle, TrendingDown, Package } from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import type { 
  DateRange, 
  StockMovement,
  LowStockItem, 
  OverstockItem, 
  SlowMovingItem,
  InventoryTurnover,
  StockByBranch,
} from '@/lib/data/types';
import { 
  getStockMovementQuery,
  getLowStockItemsQuery,
  getOverstockItemsQuery,
  getSlowMovingItemsQuery,
  getInventoryTurnoverQuery,
  getStockByBranchQuery,
} from '@/lib/data/inventory';

export default function InventoryReportPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [stockMovement, setStockMovement] = useState<StockMovement[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [overstockItems, setOverstockItems] = useState<OverstockItem[]>([]);
  const [slowMovingItems, setSlowMovingItems] = useState<SlowMovingItem[]>([]);
  const [inventoryTurnover, setInventoryTurnover] = useState<InventoryTurnover[]>([]);
  const [stockByBranch, setStockByBranch] = useState<StockByBranch[]>([]);

  const asOfDate = new Date().toISOString().split('T')[0];

  // Scroll to hash element after loading
  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash) {
        const element = document.querySelector(hash);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    }
  }, [loading]);

  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
        as_of_date: asOfDate,
      });

      const asOfParams = new URLSearchParams({ as_of_date: asOfDate });

      const [
        movementRes,
        lowStockRes,
        overstockRes,
        slowMovingRes,
        turnoverRes,
        branchRes,
      ] = await Promise.all([
        fetch(`/api/inventory/stock-movement?${new URLSearchParams({ start_date: dateRange.start, end_date: dateRange.end })}`),
        fetch(`/api/inventory/low-stock?${asOfParams}`),
        fetch(`/api/inventory/overstock?${asOfParams}`),
        fetch(`/api/inventory/slow-moving?${params}`),
        fetch(`/api/inventory/turnover?${params}`),
        fetch(`/api/inventory/by-branch?${asOfParams}`),
      ]);

      if (!movementRes.ok) throw new Error('Failed to fetch stock movement');
      if (!lowStockRes.ok) throw new Error('Failed to fetch low stock items');
      if (!overstockRes.ok) throw new Error('Failed to fetch overstock items');
      if (!slowMovingRes.ok) throw new Error('Failed to fetch slow moving items');
      if (!turnoverRes.ok) throw new Error('Failed to fetch inventory turnover');
      if (!branchRes.ok) throw new Error('Failed to fetch stock by branch');

      const [movementData, lowStockData, overstockData, slowMovingData, turnoverData, branchData] = await Promise.all([
        movementRes.json(),
        lowStockRes.json(),
        overstockRes.json(),
        slowMovingRes.json(),
        turnoverRes.json(),
        branchRes.json(),
      ]);

      setStockMovement(movementData.data);
      setLowStockItems(lowStockData.data);
      setOverstockItems(overstockData.data);
      setSlowMovingItems(slowMovingData.data);
      setInventoryTurnover(turnoverData.data);
      setStockByBranch(branchData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format helpers
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  };

  // Column definitions for Stock Movement
  const stockMovementColumns: ColumnDef<StockMovement>[] = [
    {
      key: 'date',
      header: 'วันที่',
      sortable: true,
      align: 'left',
      render: (item: StockMovement) => formatDate(item.date),
    },
    {
      key: 'qtyIn',
      header: 'รับเข้า',
      sortable: true,
      align: 'right',
      render: (item: StockMovement) => (
        <span className="text-green-600 font-medium">{formatNumber(item.qtyIn)}</span>
      ),
    },
    {
      key: 'qtyOut',
      header: 'จ่ายออก',
      sortable: true,
      align: 'right',
      render: (item: StockMovement) => (
        <span className="text-red-600 font-medium">{formatNumber(item.qtyOut)}</span>
      ),
    },
    {
      key: 'net',
      header: 'สุทธิ',
      sortable: false,
      align: 'right',
      render: (item: StockMovement) => {
        const net = item.qtyIn - item.qtyOut;
        return (
          <span className={`font-semibold ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {net >= 0 ? '+' : ''}{formatNumber(net)}
          </span>
        );
      },
    },
  ];

  // Column definitions for Low Stock Items
  const lowStockColumns: ColumnDef<LowStockItem>[] = [
    {
      key: 'status',
      header: 'สถานะ',
      sortable: false,
      align: 'center',
      render: () => (
        <AlertTriangle className="h-4 w-4 text-yellow-600 mx-auto" />
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
          <div className="text-xs text-muted-foreground">{item.itemCode}</div>
        </div>
      ),
    },
    {
      key: 'brandName',
      header: 'แบรนด์',
      sortable: true,
      align: 'left',
    },
    {
      key: 'branchName',
      header: 'สาขา',
      sortable: true,
      align: 'left',
    },
    {
      key: 'qtyOnHand',
      header: 'คงเหลือ',
      sortable: true,
      align: 'right',
      render: (item: LowStockItem) => (
        <span className="text-yellow-600 font-medium">{formatNumber(item.qtyOnHand)}</span>
      ),
    },
    {
      key: 'reorderPoint',
      header: 'จุด Reorder',
      sortable: true,
      align: 'right',
      render: (item: LowStockItem) => formatNumber(item.reorderPoint),
    },
    {
      key: 'stockValue',
      header: 'มูลค่า',
      sortable: true,
      align: 'right',
      render: (item: LowStockItem) => (
        <span className="font-medium">฿{formatCurrency(item.stockValue)}</span>
      ),
    },
  ];

  // Column definitions for Overstock Items
  const overstockColumns: ColumnDef<OverstockItem>[] = [
    {
      key: 'status',
      header: 'สถานะ',
      sortable: false,
      align: 'center',
      render: (item: OverstockItem) => {
        const excessPercent = item.maxStockLevel > 0 
          ? ((item.qtyOnHand - item.maxStockLevel) / item.maxStockLevel) * 100 
          : 0;
        const color = excessPercent >= 50 ? 'text-red-600' : excessPercent >= 25 ? 'text-yellow-600' : 'text-blue-600';
        return <AlertCircle className={`h-4 w-4 ${color} mx-auto`} />;
      },
    },
    {
      key: 'itemName',
      header: 'สินค้า',
      sortable: true,
      align: 'left',
      render: (item: OverstockItem) => (
        <div>
          <div className="font-medium">{item.itemName}</div>
          <div className="text-xs text-muted-foreground">{item.itemCode}</div>
        </div>
      ),
    },
    {
      key: 'brandName',
      header: 'แบรนด์',
      sortable: true,
      align: 'left',
    },
    {
      key: 'qtyOnHand',
      header: 'คงเหลือ',
      sortable: true,
      align: 'right',
      render: (item: OverstockItem) => formatNumber(item.qtyOnHand),
    },
    {
      key: 'maxStockLevel',
      header: 'สูงสุด',
      sortable: true,
      align: 'right',
      render: (item: OverstockItem) => formatNumber(item.maxStockLevel),
    },
    {
      key: 'excessPercent',
      header: 'เกิน %',
      sortable: true,
      align: 'right',
      render: (item: OverstockItem) => {
        const excessPercent = item.maxStockLevel > 0 
          ? ((item.qtyOnHand - item.maxStockLevel) / item.maxStockLevel) * 100 
          : 0;
        const color = excessPercent >= 50 ? 'text-red-600' : excessPercent >= 25 ? 'text-yellow-600' : 'text-blue-600';
        return <span className={`font-medium ${color}`}>{excessPercent.toFixed(1)}%</span>;
      },
    },
    {
      key: 'valueExcess',
      header: 'มูลค่าส่วนเกิน',
      sortable: true,
      align: 'right',
      render: (item: OverstockItem) => (
        <span className="font-medium text-red-600">฿{formatCurrency(item.valueExcess)}</span>
      ),
    },
  ];

  // Column definitions for Slow Moving Items
  const slowMovingColumns: ColumnDef<SlowMovingItem>[] = [
    {
      key: 'status',
      header: 'สถานะ',
      sortable: false,
      align: 'center',
      render: () => (
        <TrendingDown className="h-4 w-4 text-orange-600 mx-auto" />
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
          <div className="text-xs text-muted-foreground">{item.itemCode}</div>
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'หมวดหมู่',
      sortable: true,
      align: 'left',
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
      key: 'daysOfStock',
      header: 'วันสต็อก',
      sortable: true,
      align: 'right',
      render: (item: SlowMovingItem) => (
        <span className={`font-medium ${item.daysOfStock > 180 ? 'text-red-600' : 'text-orange-600'}`}>
          {item.daysOfStock > 900 ? '999+' : formatNumber(item.daysOfStock)} วัน
        </span>
      ),
    },
    {
      key: 'stockValue',
      header: 'มูลค่า',
      sortable: true,
      align: 'right',
      render: (item: SlowMovingItem) => (
        <span className="font-medium">฿{formatCurrency(item.stockValue)}</span>
      ),
    },
  ];

  // Column definitions for Inventory Turnover
  const turnoverColumns: ColumnDef<InventoryTurnover>[] = [
    {
      key: 'itemName',
      header: 'หมวดหมู่',
      sortable: true,
      align: 'left',
      render: (item: InventoryTurnover) => (
        <span className="font-medium">{item.itemName}</span>
      ),
    },
    {
      key: 'avgInventoryValue',
      header: 'มูลค่าสต็อกเฉลี่ย',
      sortable: true,
      align: 'right',
      render: (item: InventoryTurnover) => (
        <span>฿{formatCurrency(item.avgInventoryValue)}</span>
      ),
    },
    {
      key: 'totalCOGS',
      header: 'ต้นทุนขาย',
      sortable: true,
      align: 'right',
      render: (item: InventoryTurnover) => (
        <span>฿{formatCurrency(item.totalCOGS)}</span>
      ),
    },
    {
      key: 'turnoverRatio',
      header: 'อัตราหมุนเวียน',
      sortable: true,
      align: 'right',
      render: (item: InventoryTurnover) => (
        <span className={`font-medium ${item.turnoverRatio >= 4 ? 'text-green-600' : item.turnoverRatio >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
          {item.turnoverRatio.toFixed(2)} รอบ
        </span>
      ),
    },
    {
      key: 'daysToSell',
      header: 'วันขายหมด',
      sortable: true,
      align: 'right',
      render: (item: InventoryTurnover) => (
        <span className="text-muted-foreground">
          {item.daysToSell > 0 ? `${formatNumber(Math.round(item.daysToSell))} วัน` : '-'}
        </span>
      ),
    },
  ];

  // Column definitions for Stock By Branch
  const stockByBranchColumns: ColumnDef<StockByBranch>[] = [
    {
      key: 'branchCode',
      header: 'รหัสสาขา',
      sortable: true,
      align: 'left',
      render: (item: StockByBranch) => (
        <span className="font-mono text-xs">{item.branchCode}</span>
      ),
    },
    {
      key: 'branchName',
      header: 'ชื่อสาขา',
      sortable: true,
      align: 'left',
      render: (item: StockByBranch) => (
        <span className="font-medium">{item.branchName}</span>
      ),
    },
    {
      key: 'itemCount',
      header: 'จำนวนรายการ',
      sortable: true,
      align: 'right',
      render: (item: StockByBranch) => formatNumber(item.itemCount),
    },
    {
      key: 'qtyOnHand',
      header: 'จำนวนสินค้า',
      sortable: true,
      align: 'right',
      render: (item: StockByBranch) => formatNumber(item.qtyOnHand || 0),
    },
    {
      key: 'inventoryValue',
      header: 'มูลค่าสินค้า',
      sortable: true,
      align: 'right',
      render: (item: StockByBranch) => (
        <span className="font-medium text-blue-600">฿{formatCurrency(item.inventoryValue)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            รายงานสินค้าคงคลัง
          </h1>
          <p className="text-muted-foreground mt-1">
            ข้อมูลรายงานคลังสินค้าและสต็อกในรูปแบบตาราง
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Error Display */}
      {error && (
        <ErrorDisplay error={error} onRetry={fetchAllData} />
      )}

      {/* Stock Movement Table */}
      <ErrorBoundary>
        <DataCard
          id="stock-movement"
          title="การเคลื่อนไหวสต็อก"
          description="รายการรับเข้าและจ่ายออกสินค้ารายวัน"
          queryInfo={{
            query: getStockMovementQuery(dateRange.start, dateRange.end),
            format: 'JSONEachRow'
          }}
        >
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            <PaginatedTable
              data={stockMovement}
              columns={stockMovementColumns}
              itemsPerPage={15}
              emptyMessage="ไม่มีข้อมูลการเคลื่อนไหวสต็อก"
              defaultSortKey="date"
              defaultSortOrder="desc"
              keyExtractor={(item: StockMovement) => item.date}
            />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* Low Stock & Overstock Tables */}
      <div className="grid gap-6 ">
        <ErrorBoundary>
          <DataCard
            id="low-stock"
            title="สินค้าใกล้หมด"
            description="รายการสินค้าที่ต่ำกว่าจุดสั่งซื้อ"
            queryInfo={{
              query: getLowStockItemsQuery(asOfDate),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <PaginatedTable
                data={lowStockItems}
                columns={lowStockColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีสินค้าใกล้หมด"
                defaultSortKey="qtyOnHand"
                defaultSortOrder="asc"
                keyExtractor={(item: LowStockItem) => item.itemCode}
              />
            )}
          </DataCard>
        </ErrorBoundary>

        <ErrorBoundary>
          <DataCard
            id="overstock"
            title="สินค้าเกินคลัง"
            description="รายการสินค้าที่เกินระดับสูงสุด"
            queryInfo={{
              query: getOverstockItemsQuery(asOfDate),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <PaginatedTable
                data={overstockItems}
                columns={overstockColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีสินค้าเกินคลัง"
                defaultSortKey="valueExcess"
                defaultSortOrder="desc"
                keyExtractor={(item: OverstockItem) => item.itemCode}
              />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>

      {/* Slow Moving Items Table */}
      <ErrorBoundary>
        <DataCard
          id="slow-moving"
          title="สินค้าขายช้า"
          description="รายการสินค้าที่มีอัตราการขายต่ำ (สต็อกเกิน 90 วัน)"
          queryInfo={{
            query: getSlowMovingItemsQuery(dateRange.start, dateRange.end, asOfDate),
            format: 'JSONEachRow'
          }}
        >
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            <PaginatedTable
              data={slowMovingItems}
              columns={slowMovingColumns}
              itemsPerPage={15}
              emptyMessage="ไม่มีสินค้าขายช้า"
              defaultSortKey="stockValue"
              defaultSortOrder="desc"
              keyExtractor={(item: SlowMovingItem) => item.itemCode}
            />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* Inventory Turnover & Stock By Branch */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ErrorBoundary>
          <DataCard
            id="turnover"
            title="อัตราหมุนเวียนสินค้า"
            description="อัตราหมุนเวียนสินค้าตามหมวดหมู่"
            queryInfo={{
              query: getInventoryTurnoverQuery(dateRange.start, dateRange.end, asOfDate),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <PaginatedTable
                data={inventoryTurnover}
                columns={turnoverColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีข้อมูลอัตราหมุนเวียน"
                defaultSortKey="turnoverRatio"
                defaultSortOrder="desc"
                keyExtractor={(item: InventoryTurnover) => item.itemName}
              />
            )}
          </DataCard>
        </ErrorBoundary>

        <ErrorBoundary>
          <DataCard
            id="by-branch"
            title="สต็อกตามสาขา"
            description="มูลค่าสินค้าคงคลังแยกตามสาขา/คลัง"
            queryInfo={{
              query: getStockByBranchQuery(asOfDate),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <PaginatedTable
                data={stockByBranch}
                columns={stockByBranchColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีข้อมูลสาขา"
                defaultSortKey="inventoryValue"
                defaultSortOrder="desc"
                keyExtractor={(item: StockByBranch) => item.branchCode}
              />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>
    </div>
  );
}
