'use client';

import { useState, useEffect } from 'react';
import { KPICard } from '@/components/KPICard';
import { DataCard } from '@/components/DataCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import { PermissionGuard } from '@/components/PermissionGuard';
import { SalesTrendChart } from '@/components/sales/SalesTrendChart';
import { TopProductsTable } from '@/components/sales/TopProductsTable';
import { SalesByBranchChart } from '@/components/sales/SalesByBranchChart';
import { SalesBySalespersonTable } from '@/components/sales/SalesBySalespersonTable';
import { TopCustomersTable } from '@/components/sales/TopCustomersTable';
import { ARStatusChart } from '@/components/sales/ARStatusChart';
import { ShoppingCart, DollarSign, TrendingUp, Package } from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import { formatGrowthPercentage } from '@/lib/comparison';
import type { DateRange, SalesKPIs, SalesTrendData, TopProduct, SalesByBranch, SalesBySalesperson, TopCustomer, ARStatus } from '@/lib/data/types';
import {
  getTotalSalesQuery,
  getGrossProfitQuery,
  getTotalOrdersQuery,
  getAvgOrderValueQuery,
  getSalesTrendQuery,
  getTopProductsQuery,
  getSalesByBranchQuery,
  getSalesBySalespersonQuery,
  getTopCustomersQuery,
  getARStatusQuery,
} from '@/lib/data/sales';
export default function SalesPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [kpis, setKpis] = useState<SalesKPIs | null>(null);
  const [trendData, setTrendData] = useState<SalesTrendData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesByBranch, setSalesByBranch] = useState<SalesByBranch[]>([]);
  const [salesBySalesperson, setSalesBySalesperson] = useState<SalesBySalesperson[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [arStatus, setArStatus] = useState<ARStatus[]>([]);

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
      });

      // Fetch all data in parallel
      const [
        kpisRes,
        trendRes,
        productsRes,
        branchRes,
        salespersonRes,
        customersRes,
        arRes,
      ] = await Promise.all([
        fetch(`/api/sales/kpis?${params}`),
        fetch(`/api/sales/trend?${params}`),
        fetch(`/api/sales/top-products?${params}`),
        fetch(`/api/sales/by-branch?${params}`),
        fetch(`/api/sales/by-salesperson?${params}`),
        fetch(`/api/sales/top-customers?${params}`),
        fetch(`/api/sales/ar-status?${params}`),
      ]);

      if (!kpisRes.ok) throw new Error('Failed to fetch KPIs');
      if (!trendRes.ok) throw new Error('Failed to fetch trend data');
      if (!productsRes.ok) throw new Error('Failed to fetch top products');
      if (!branchRes.ok) throw new Error('Failed to fetch sales by branch');
      if (!salespersonRes.ok) throw new Error('Failed to fetch sales by salesperson');
      if (!customersRes.ok) throw new Error('Failed to fetch top customers');
      if (!arRes.ok) throw new Error('Failed to fetch AR status');

      const [kpisData, trendDataRes, productsData, branchData, salespersonData, customersData, arData] = await Promise.all([
        kpisRes.json(),
        trendRes.json(),
        productsRes.json(),
        branchRes.json(),
        salespersonRes.json(),
        customersRes.json(),
        arRes.json(),
      ]);

      setKpis(kpisData.data);
      setTrendData(trendDataRes.data);
      setTopProducts(productsData.data);
      setSalesByBranch(branchData.data);
      setSalesBySalesperson(salespersonData.data);
      setTopCustomers(customersData.data);
      setArStatus(arData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      console.error('Error fetching sales data:', err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            ยอดขายและลูกค้า
          </h1>
          <p className="text-muted-foreground mt-1">
            ภาพรวมยอดขาย ผลิตภัณฑ์ และข้อมูลลูกค้า
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Error Display */}
      {error && (
        <ErrorDisplay error={error} onRetry={fetchAllData} />
      )}

      {/* KPI Cards */}
      <PermissionGuard componentKey="sales.kpis">
        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </div>
        ) : kpis ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="ยอดขายรวม"
              value={formatCurrency(kpis.totalSales.value)}
              trend={formatGrowthPercentage(kpis.totalSales.growthPercentage || 0)}
              trendUp={kpis.totalSales.trend === 'up'}
              icon={DollarSign}
              queryInfo={{
                query: getTotalSalesQuery(dateRange.start, dateRange.end),
                format: 'JSONEachRow',
              }}
            />
            <KPICard
              title="กำไรขั้นต้น"
              value={formatCurrency(kpis.grossProfit.value)}
              trend={formatGrowthPercentage(kpis.grossProfit.growthPercentage || 0)}
              trendUp={kpis.grossProfit.trend === 'up'}
              icon={TrendingUp}
              subtitle={`Margin: ${(kpis.grossMarginPct ?? 0).toFixed(1)}%`}
              queryInfo={{
                query: getGrossProfitQuery(dateRange.start, dateRange.end),
                format: 'JSONEachRow',
              }}
            />
            <KPICard
              title="จำนวนออเดอร์"
              value={kpis.totalOrders.value.toLocaleString('th-TH')}
              trend={formatGrowthPercentage(kpis.totalOrders.growthPercentage || 0)}
              trendUp={kpis.totalOrders.trend === 'up'}
              icon={ShoppingCart}
              queryInfo={{
                query: getTotalOrdersQuery(dateRange.start, dateRange.end),
                format: 'JSONEachRow',
              }}
            />
            <KPICard
              title="ค่าเฉลี่ยต่อออเดอร์"
              value={formatCurrency(kpis.avgOrderValue.value)}
              trend={formatGrowthPercentage(kpis.avgOrderValue.growthPercentage || 0)}
              trendUp={kpis.avgOrderValue.trend === 'up'}
              icon={Package}
              queryInfo={{
                query: getAvgOrderValueQuery(dateRange.start, dateRange.end),
                format: 'JSONEachRow',
              }}
            />
          </div>
        ) : null}
      </PermissionGuard>

      {/* Sales Trend Chart */}
      <PermissionGuard componentKey="sales.trend">
        <ErrorBoundary>
          <DataCard
            title="แนวโน้มยอดขาย"
            description="ยอดขายและจำนวนออเดอร์รายวัน"
            linkTo="/reports/sales#sales-trend"
            queryInfo={{
              query: getSalesTrendQuery(dateRange.start, dateRange.end),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <SalesTrendChart data={trendData} />
            )}
          </DataCard>
        </ErrorBoundary>
      </PermissionGuard>

      {/* Top Products & Sales by Branch */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <PermissionGuard componentKey="sales.top_products">
          <ErrorBoundary>
            <DataCard
              title="สินค้าขายดี Top 10"
              description="รายการสินค้าที่มียอดขายสูงสุด"
              linkTo="/reports/sales#top-products"
              queryInfo={{
                query: getTopProductsQuery(dateRange.start, dateRange.end),
                format: 'JSONEachRow'
              }}
            >
              {loading ? (
                <TableSkeleton rows={10} />
              ) : (
                <TopProductsTable data={topProducts} />
              )}
            </DataCard>
          </ErrorBoundary>
        </PermissionGuard>

        <PermissionGuard componentKey="sales.by_branch">
          <ErrorBoundary>
            <DataCard
              title="ยอดขายแยกตามสาขา"
              description="เปรียบเทียบยอดขายของแต่ละสาขา"
              linkTo="/reports/sales#sales-by-branch"
              queryInfo={{
                query: getSalesByBranchQuery(dateRange.start, dateRange.end),
                format: 'JSONEachRow'
              }}
            >
              {loading ? (
                <ChartSkeleton />
              ) : (
                <SalesByBranchChart data={salesByBranch} />
              )}
            </DataCard>
          </ErrorBoundary>
        </PermissionGuard>
      </div>

      {/* Sales by Salesperson */}
      <PermissionGuard componentKey="sales.by_salesperson">
        <ErrorBoundary>
          <DataCard
            title="ยอดขายตามพนักงานขาย"
            description="ผลงานพนักงานขายแต่ละคน"
            linkTo="/reports/sales#sales-by-salesperson"
            queryInfo={{
              query: getSalesBySalespersonQuery(dateRange.start, dateRange.end),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <TableSkeleton rows={10} />
            ) : (
              <SalesBySalespersonTable data={salesBySalesperson} />
            )}
          </DataCard>
        </ErrorBoundary>
      </PermissionGuard>

      {/* Top Customers & AR Status */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <PermissionGuard componentKey="sales.top_customers">
          <ErrorBoundary>
            <DataCard
              title="ลูกค้า VIP Top 20"
              description="ลูกค้าที่มียอดซื้อสูงสุด"
              linkTo="/reports/sales#top-customers"
              queryInfo={{
                query: getTopCustomersQuery(dateRange.start, dateRange.end),
                format: 'JSONEachRow'
              }}
            >
              {loading ? (
                <TableSkeleton rows={10} />
              ) : (
                <TopCustomersTable data={topCustomers} />
              )}
            </DataCard>
          </ErrorBoundary>
        </PermissionGuard>

        <PermissionGuard componentKey="sales.ar_status">
          <ErrorBoundary>
            <DataCard
              title="สถานะลูกหนี้การค้า"
              description="สรุปยอดลูกหนี้ตามสถานะการชำระเงิน"
              linkTo="/reports/sales#ar-status"
              queryInfo={{
                query: getARStatusQuery(dateRange.start, dateRange.end),
                format: 'JSONEachRow'
              }}
            >
              {loading ? (
                <ChartSkeleton height="350px" />
              ) : (
                <ARStatusChart data={arStatus} height="350px" />
              )}
            </DataCard>
          </ErrorBoundary>
        </PermissionGuard>
      </div>
    </div>
  );
}
