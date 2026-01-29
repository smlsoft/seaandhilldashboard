'use client';

import { useState, useEffect } from 'react';
import { KPICard } from '@/components/KPICard';
import { DataCard } from '@/components/DataCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import { PurchaseTrendChart } from '@/components/purchase/PurchaseTrendChart';
import { HorizontalBarChart, type HorizontalBarItem } from '@/components/charts/HorizontalBarChart';
import { PurchaseByCategoryChart } from '@/components/purchase/PurchaseByCategoryChart';
import { PurchaseByBrandChart } from '@/components/purchase/PurchaseByBrandChart';
import { APOutstandingChart } from '@/components/purchase/APOutstandingChart';
import { ShoppingBag, Package, TrendingDown, FileText } from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import { formatGrowthPercentage } from '@/lib/comparison';
import type { DateRange, PurchaseKPIs, PurchaseTrendData, TopSupplier, PurchaseByCategory, PurchaseByBrand, APOutstanding } from '@/lib/data/types';
import {
  getTotalPurchasesQuery,
  getTotalItemsPurchasedQuery,
  getTotalOrdersQuery,
  getAvgOrderValueQuery,
  getPurchaseTrendQuery,
  getTopSuppliersQuery,
  getPurchaseByCategoryQuery,
  getPurchaseByBrandQuery,
  getAPOutstandingQuery,
} from '@/lib/data/purchase';

export default function PurchasePage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [kpis, setKpis] = useState<PurchaseKPIs | null>(null);
  const [trendData, setTrendData] = useState<PurchaseTrendData[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [purchaseByCategory, setPurchaseByCategory] = useState<PurchaseByCategory[]>([]);
  const [purchaseByBrand, setPurchaseByBrand] = useState<PurchaseByBrand[]>([]);
  const [apOutstanding, setApOutstanding] = useState<APOutstanding[]>([]);

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
        suppliersRes,
        categoryRes,
        brandRes,
        apRes,
      ] = await Promise.all([
        fetch(`/api/purchase/kpis?${params}`),
        fetch(`/api/purchase/trend?${params}`),
        fetch(`/api/purchase/top-suppliers?${params}`),
        fetch(`/api/purchase/by-category?${params}`),
        fetch(`/api/purchase/by-brand?${params}`),
        fetch(`/api/purchase/ap-outstanding?${params}`),
      ]);

      if (!kpisRes.ok) throw new Error('Failed to fetch KPIs');
      if (!trendRes.ok) throw new Error('Failed to fetch trend data');
      if (!suppliersRes.ok) throw new Error('Failed to fetch top suppliers');
      if (!categoryRes.ok) throw new Error('Failed to fetch purchase by category');
      if (!brandRes.ok) throw new Error('Failed to fetch purchase by brand');
      if (!apRes.ok) throw new Error('Failed to fetch AP outstanding');

      const [kpisData, trendDataRes, suppliersData, categoryData, brandData, apData] = await Promise.all([
        kpisRes.json(),
        trendRes.json(),
        suppliersRes.json(),
        categoryRes.json(),
        brandRes.json(),
        apRes.json(),
      ]);

      setKpis(kpisData.data);
      setTrendData(trendDataRes.data);
      setTopSuppliers(suppliersData.data);
      setPurchaseByCategory(categoryData.data);
      setPurchaseByBrand(brandData.data);
      setApOutstanding(apData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      console.error('Error fetching purchase data:', err);
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
            การจัดซื้อและซัพพลายเออร์
          </h1>
          <p className="text-muted-foreground mt-1">
            ภาพรวมการจัดซื้อ ซัพพลายเออร์ และยอดเจ้าหนี้
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
            title="ยอดซื้อรวม"
            value={formatCurrency(kpis.totalPurchases.value)}
            trend={formatGrowthPercentage(kpis.totalPurchases.growthPercentage || 0)}
            trendUp={kpis.totalPurchases.trend === 'down'} // Down is good for purchases (cost reduction)
            icon={ShoppingBag}
            queryInfo={{
              query: getTotalPurchasesQuery(dateRange),
              format: 'JSONEachRow'
            }}
          />
          <KPICard
            title="จำนวนสินค้าที่ซื้อ"
            value={formatNumber(kpis.totalItemsPurchased.value)}
            trend={formatGrowthPercentage(kpis.totalItemsPurchased.growthPercentage || 0)}
            trendUp={kpis.totalItemsPurchased.trend === 'up'}
            icon={Package}
            queryInfo={{
              query: getTotalItemsPurchasedQuery(dateRange),
              format: 'JSONEachRow'
            }}
          />
          <KPICard
            title="จำนวนออเดอร์"
            value={formatNumber(kpis.totalOrders.value)}
            trend={formatGrowthPercentage(kpis.totalOrders.growthPercentage || 0)}
            trendUp={kpis.totalOrders.trend === 'up'}
            icon={FileText}
            queryInfo={{
              query: getTotalOrdersQuery(dateRange),
              format: 'JSONEachRow'
            }}
          />
          <KPICard
            title="ค่าเฉลี่ยต่อออเดอร์"
            value={formatCurrency(kpis.avgOrderValue.value)}
            trend={formatGrowthPercentage(kpis.avgOrderValue.growthPercentage || 0)}
            trendUp={kpis.avgOrderValue.trend === 'down'} // Down is good for avg order (efficiency)
            icon={TrendingDown}
            queryInfo={{
              query: getAvgOrderValueQuery(dateRange),
              format: 'JSONEachRow'
            }}
          />
        </div>
      ) : null}

      {/* Purchase Trend Chart */}
      <div className="grid gap-5 ">
        <ErrorBoundary>
          <DataCard
            title="แนวโน้มการจัดซื้อ"
            description="ยอดซื้อและจำนวนออเดอร์รายวัน"
            linkTo="/reports/purchase#trend"
            queryInfo={{
              query: getPurchaseTrendQuery(dateRange),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <PurchaseTrendChart data={trendData} />
            )}
          </DataCard>
        </ErrorBoundary>

        {/* Top Suppliers */}
        <ErrorBoundary>
          <DataCard
            title="ซัพพลายเออร์ยอดนิยม Top 20"
            description="รายการซัพพลายเออร์ที่มียอดซื้อสูงสุด"
            linkTo="/reports/purchase#top-suppliers"
            queryInfo={{
              query: getTopSuppliersQuery(dateRange),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <ChartSkeleton height="600px" />
            ) : (
              <HorizontalBarChart
                data={topSuppliers.map((supplier, index) => ({
                  rank: index + 1,
                  name: supplier.supplierName,
                  value: supplier.totalPurchases,
                  subLabel: supplier.supplierCode,
                  extraData: {
                    poCount: supplier.poCount,
                    avgPOValue: supplier.avgPOValue,
                    lastPurchaseDate: supplier.lastPurchaseDate,
                  },
                }))}
                height="600px"
                tooltipFormatter={(item, percentage) => {
                  const poCount = item.extraData?.poCount || 0;
                  const avgPOValue = item.extraData?.avgPOValue || 0;
                  const lastDate = item.extraData?.lastPurchaseDate
                    ? new Date(item.extraData.lastPurchaseDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
                    : '-';
                  return `
                  <div style="padding: 8px;">
                    <div style="font-weight: 600; margin-bottom: 6px;">อันดับ ${item.rank}: ${item.name}</div>
                    <div style="color: #666; font-size: 12px; margin-bottom: 8px;">${item.subLabel}</div>
                    <div>ยอดซื้อ: <b style="color: #3b82f6;">฿${item.value.toLocaleString('th-TH')}</b></div>
                    <div>จำนวน PO: <b>${poCount} รายการ</b></div>
                    <div>เฉลี่ยต่อ PO: <b>฿${avgPOValue.toLocaleString('th-TH')}</b></div>
                    <div>ซื้อล่าสุด: <b>${lastDate}</b></div>
                    <div>สัดส่วน: <b>${percentage}%</b></div>
                  </div>
                `;
                }}
              />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>
      {/* Purchase by Category & Brand */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ErrorBoundary>
          <DataCard
            title="การซื้อตามหมวดสินค้า"
            description="สัดส่วนการซื้อแยกตามหมวดหมู่"
            linkTo="/reports/purchase#by-category"
            queryInfo={{
              query: getPurchaseByCategoryQuery(dateRange),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <PurchaseByCategoryChart data={purchaseByCategory} />
            )}
          </DataCard>
        </ErrorBoundary>

        <ErrorBoundary>
          <DataCard
            title="การซื้อตามแบรนด์"
            description="Top 10 แบรนด์ที่ซื้อมากที่สุด"
            linkTo="/reports/purchase#by-brand"
            queryInfo={{
              query: getPurchaseByBrandQuery(dateRange),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <PurchaseByBrandChart data={purchaseByBrand} />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>

      {/* AP Outstanding */}
      <ErrorBoundary>
        <DataCard
          title="สถานะเจ้าหนี้การค้า (AP)"
          description="สรุปยอดเจ้าหนี้ตามสถานะการชำระเงิน"
          linkTo="/reports/purchase#ap-outstanding"
          queryInfo={{
            query: getAPOutstandingQuery(dateRange),
            format: 'JSONEachRow'
          }}
        >
          {loading ? (
            <ChartSkeleton height="350px" />
          ) : (
            <APOutstandingChart data={apOutstanding} height="350px" />
          )}
        </DataCard>
      </ErrorBoundary>
    </div>
  );
}
