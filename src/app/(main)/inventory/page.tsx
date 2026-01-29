'use client';

import { useState, useEffect } from 'react';
import { KPICard } from '@/components/KPICard';
import { DataCard } from '@/components/DataCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import { StockMovementChart } from '@/components/inventory/StockMovementChart';
import { LowStockTable } from '@/components/inventory/LowStockTable';
import { OverstockTable } from '@/components/inventory/OverstockTable';
import { SlowMovingTable } from '@/components/inventory/SlowMovingTable';
import { InventoryTurnoverChart } from '@/components/inventory/InventoryTurnoverChart';
import { StockByBranchChart } from '@/components/inventory/StockByBranchChart';
import { Package, AlertTriangle, AlertCircle, TrendingDown } from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import type { DateRange, InventoryKPIs, StockMovement, LowStockItem, OverstockItem, SlowMovingItem, InventoryTurnover, StockByBranch } from '@/lib/data/types';
import {
  getInventoryKPIs,
  getStockMovement,
  getLowStockItems,
  getOverstockItems,
  getSlowMovingItems,
  getInventoryTurnover,
  getStockByBranch,
  // Query Functions for SQL popup
  getInventoryValueQuery,
  getTotalItemsQuery,
  getLowStockCountQuery,
  getOverstockCountQuery,
  getStockMovementQuery,
  getLowStockItemsQuery,
  getOverstockItemsQuery,
  getSlowMovingItemsQuery,
  getInventoryTurnoverQuery,
  getStockByBranchQuery,
} from '@/lib/data/inventory';

export default function InventoryPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [kpis, setKpis] = useState<InventoryKPIs | null>(null);
  const [stockMovement, setStockMovement] = useState<StockMovement[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [overstockItems, setOverstockItems] = useState<OverstockItem[]>([]);
  const [slowMovingItems, setSlowMovingItems] = useState<SlowMovingItem[]>([]);
  const [inventoryTurnover, setInventoryTurnover] = useState<InventoryTurnover[]>([]);
  const [stockByBranch, setStockByBranch] = useState<StockByBranch[]>([]);

  // Get as_of_date (today by default)
  const asOfDate = new Date().toISOString().split('T')[0];

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

      const kpisParams = new URLSearchParams({ as_of_date: asOfDate });
      const asOfParams = new URLSearchParams({ as_of_date: asOfDate });

      // Fetch all data in parallel
      const [
        kpisRes,
        movementRes,
        lowStockRes,
        overstockRes,
        slowMovingRes,
        turnoverRes,
        branchRes,
      ] = await Promise.all([
        fetch(`/api/inventory/kpis?${kpisParams}`),
        fetch(`/api/inventory/stock-movement?${new URLSearchParams({ start_date: dateRange.start, end_date: dateRange.end })}`),
        fetch(`/api/inventory/low-stock?${asOfParams}`),
        fetch(`/api/inventory/overstock?${asOfParams}`),
        fetch(`/api/inventory/slow-moving?${params}`),
        fetch(`/api/inventory/turnover?${params}`),
        fetch(`/api/inventory/by-branch?${asOfParams}`),
      ]);

      if (!kpisRes.ok) throw new Error('Failed to fetch KPIs');
      if (!movementRes.ok) throw new Error('Failed to fetch stock movement');
      if (!lowStockRes.ok) throw new Error('Failed to fetch low stock items');
      if (!overstockRes.ok) throw new Error('Failed to fetch overstock items');
      if (!slowMovingRes.ok) throw new Error('Failed to fetch slow moving items');
      if (!turnoverRes.ok) throw new Error('Failed to fetch inventory turnover');
      if (!branchRes.ok) throw new Error('Failed to fetch stock by branch');

      const [kpisData, movementData, lowStockData, overstockData, slowMovingData, turnoverData, branchData] = await Promise.all([
        kpisRes.json(),
        movementRes.json(),
        lowStockRes.json(),
        overstockRes.json(),
        slowMovingRes.json(),
        turnoverRes.json(),
        branchRes.json(),
      ]);

      setKpis(kpisData.data);
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

  const formatCurrency = (value: number) => {
    return `฿${value.toLocaleString('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            คลังสินค้าและสต็อก
          </h1>
          <p className="text-muted-foreground mt-1">
            ภาพรวมสินค้าคงคลัง การเคลื่อนไหว และการจัดการสต็อก
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Error Display */}
      {error && (
        <ErrorDisplay error={error} onRetry={fetchAllData} />
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : kpis ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="มูลค่าสินค้าคงคลัง"
            value={formatCurrency(kpis.totalInventoryValue.value)}
            icon={Package}
            queryInfo={{
              query: getInventoryValueQuery(asOfDate),
              format: 'JSONEachRow',
            }}
          />
          <KPICard
            title="จำนวนรายการสินค้า"
            value={formatNumber(kpis.totalItemsInStock.value)}
            icon={Package}
            queryInfo={{
              query: getTotalItemsQuery(asOfDate),
              format: 'JSONEachRow',
            }}
          />
          <KPICard
            title="สินค้าใกล้หมด"
            value={formatNumber(kpis.lowStockAlerts.value)}
            icon={AlertTriangle}
            trendUp={false}
            className={kpis.lowStockAlerts.value > 0 ? 'border-yellow-500/50' : ''}
            queryInfo={{
              query: getLowStockCountQuery(asOfDate),
              format: 'JSONEachRow',
            }}
          />
          <KPICard
            title="สินค้าเกินคลัง"
            value={formatNumber(kpis.overstockAlerts.value)}
            icon={AlertCircle}
            trendUp={false}
            className={kpis.overstockAlerts.value > 0 ? 'border-orange-500/50' : ''}
            queryInfo={{
              query: getOverstockCountQuery(asOfDate),
              format: 'JSONEachRow',
            }}
          />
        </div>
      ) : null}

      {/* Stock Movement Chart */}
      <ErrorBoundary>
        <DataCard
          title="การเคลื่อนไหวสต็อก"
          description="จำนวนสินค้ารับเข้าและจ่ายออกรายวัน"
          linkTo="/reports/inventory#stock-movement"
          queryInfo={{
            query: getStockMovementQuery(dateRange.start, dateRange.end),
            format: 'JSONEachRow',
          }}
        >
          {loading ? (
            <ChartSkeleton />
          ) : (
            <StockMovementChart data={stockMovement} />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* Low Stock & Overstock */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ErrorBoundary>
          <DataCard
            title="สินค้าใกล้หมด"
            description="รายการสินค้าที่ต่ำกว่าจุด Reorder Point"
            linkTo="/reports/inventory#low-stock"
            queryInfo={{
              query: getLowStockItemsQuery(asOfDate),
              format: 'JSONEachRow',
            }}
          >
            {loading ? (
              <TableSkeleton rows={10} />
            ) : (
              <LowStockTable data={lowStockItems} height="500px" />
            )}
          </DataCard>
        </ErrorBoundary>

        <ErrorBoundary>
          <DataCard
            title="สินค้าเกินคลัง"
            description="รายการสินค้าที่เกินระดับสูงสุด"
            linkTo="/reports/inventory#overstock"
            queryInfo={{
              query: getOverstockItemsQuery(asOfDate),
              format: 'JSONEachRow',
            }}
          >
            {loading ? (
              <TableSkeleton rows={10} />
            ) : (
              <OverstockTable data={overstockItems} height="450px" />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>

      {/* Slow Moving Items */}
      <ErrorBoundary>
        <DataCard
          title="สินค้าหมุนเวียนช้า"
          description="รายการสินค้าที่มีสต็อกคงค้างนานกว่า 90 วัน"
          linkTo="/reports/inventory#slow-moving"
          queryInfo={{
            query: getSlowMovingItemsQuery(dateRange.start, dateRange.end, asOfDate),
            format: 'JSONEachRow',
          }}
        >
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            <SlowMovingTable data={slowMovingItems} height="710px" />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* Inventory Turnover & Stock by Branch */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ErrorBoundary>
          <DataCard
            title="อัตราหมุนเวียนสินค้า"
            description="การหมุนเวียนและวันขายหมดตามหมวดสินค้า"
            linkTo="/reports/inventory#turnover"
            queryInfo={{
              query: getInventoryTurnoverQuery(dateRange.start, dateRange.end, asOfDate),
              format: 'JSONEachRow',
            }}
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <InventoryTurnoverChart data={inventoryTurnover} />
            )}
          </DataCard>
        </ErrorBoundary>

        <ErrorBoundary>
          <DataCard
            title="สต็อกแยกตามสาขา"
            description="มูลค่าและจำนวนรายการสินค้าในแต่ละสาขา"
            linkTo="/reports/inventory#by-branch"
            queryInfo={{
              query: getStockByBranchQuery(asOfDate),
              format: 'JSONEachRow',
            }}
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <StockByBranchChart data={stockByBranch} />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>
    </div>
  );
}
