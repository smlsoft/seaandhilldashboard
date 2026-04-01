'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useBranchStore } from '@/store/useBranchStore';
import { KPICard } from '@/components/KPICard';
import { DataCard } from '@/components/DataCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import { PaginatedTable } from '@/components/PaginatedTable';
import { PurchaseTrendChart } from '@/components/purchase/PurchaseTrendChart';
import { HorizontalBarChart, type HorizontalBarItem } from '@/components/charts/HorizontalBarChart';
import { PurchaseByCategoryChart } from '@/components/purchase/PurchaseByCategoryChart';
import { PurchaseByBrandChart } from '@/components/purchase/PurchaseByBrandChart';
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
} from '@/lib/data/purchase-queries';

export default function PurchasePage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const selectedBranches = useBranchStore((s) => s.selectedBranches);

  // Reset category filter when date range changes
  useEffect(() => {
    setSelectedCategory('ALL');
  }, [dateRange]);

  const { data, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['purchaseData', dateRange, selectedBranches],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      if (!selectedBranches.includes('ALL')) {
        selectedBranches.forEach((b) => params.append('branch', b));
      }

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

      return {
        kpis: kpisData.data as PurchaseKPIs,
        trendData: trendDataRes.data as PurchaseTrendData[],
        topSuppliers: suppliersData.data as TopSupplier[],
        purchaseByCategory: categoryData.data as PurchaseByCategory[],
        purchaseByBrand: brandData.data as PurchaseByBrand[],
        apOutstanding: apData.data as APOutstanding[],
      };
    }
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? 'เกิดข้อผิดพลาดในการโหลดข้อมูล' : null;
  const kpis = data?.kpis;
  const trendData = data?.trendData || [];
  const topSuppliers = data?.topSuppliers || [];
  const purchaseByCategory = data?.purchaseByCategory || [];
  const purchaseByBrand = data?.purchaseByBrand || [];
  const apOutstanding = data?.apOutstanding || [];

  // Framer motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
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

  // Aggregate purchase by category data for Pie Chart (sum all items per category)
  const aggregatedPurchaseByCategory = (() => {
    const categoryMap = new Map<string, PurchaseByCategory>();
    
    purchaseByCategory.forEach(item => {
      const key = item.categoryCode;
      const existing = categoryMap.get(key);
      
      if (existing) {
        existing.totalQty += item.totalQty;
        existing.totalPurchaseValue += item.totalPurchaseValue;
      } else {
        categoryMap.set(key, {
          categoryCode: item.categoryCode,
          categoryName: item.categoryName,
          itemCode: '', // Not used in aggregated data
          itemName: '', // Not used in aggregated data
          totalQty: item.totalQty,
          totalPurchaseValue: item.totalPurchaseValue,
          uniqueItems: item.uniqueItems,
        });
      }
    });
    
    return Array.from(categoryMap.values());
  })();

  // Calculate unique categories and filtered data
  const uniqueCategories = Array.from(
    new Set(purchaseByCategory.map(item => JSON.stringify({ code: item.categoryCode, name: item.categoryName })))
  )
    .map(str => JSON.parse(str))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const filteredPurchaseByCategory = selectedCategory === 'ALL'
    ? purchaseByCategory
    : purchaseByCategory.filter(item => item.categoryCode === selectedCategory);

  // Column definitions for purchase by category
  const purchaseByCategoryColumns = [
    {
      key: 'itemCode',
      header: 'รหัสสินค้า',
      render: (item: PurchaseByCategory) => (
        <span className="font-mono text-xs">{item.itemCode}</span>
      ),
    },
    {
      key: 'itemName',
      header: 'ชื่อสินค้า',
      render: (item: PurchaseByCategory) => (
        <span className="font-medium">{item.itemName}</span>
      ),
    },
    {
      key: 'totalQty',
      header: 'จำนวนที่ซื้อ',
      align: 'right' as const,
      render: (item: PurchaseByCategory) => formatNumber(item.totalQty),
    },
    {
      key: 'totalPurchaseValue',
      header: 'มูลค่าทั้งหมด',
      align: 'right' as const,
      render: (item: PurchaseByCategory) => formatCurrency(item.totalPurchaseValue),
    },
  ];

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            การจัดซื้อและซัพพลายเออร์
          </h1>
          <p className="text-muted-foreground mt-1">
            ภาพรวมการจัดซื้อ ซัพพลายเออร์ และยอดเจ้าหนี้
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div variants={itemVariants}><ErrorDisplay error={error} onRetry={() => refetch()} /></motion.div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <motion.div variants={itemVariants} className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </motion.div>
      ) : kpis ? (
        <motion.div variants={itemVariants} className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
        </motion.div>
      ) : null}

      {/* Purchase Trend Chart */}
      <motion.div variants={itemVariants}>
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
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6 grid-cols-1 lg:grid-cols-2">


        {/* Top Suppliers */}
        <ErrorBoundary>
          <DataCard
            className="h-full"
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
                height="500px"
              //  gridLeft={35}
                gridRight={90}
                yAxisLabelMargin={270}
                tooltipFormatter={(item, percentage) => {
                  const poCount = item.extraData?.poCount || 0;
                  const avgPOValue = item.extraData?.avgPOValue || 0;
                  const lastDate = item.extraData?.lastPurchaseDate
                    ? new Date(item.extraData.lastPurchaseDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
                    : '-';
                  return `
                  <div style="padding: 8px;">
                    <div style="font-weight: 6000; margin-bottom: 6px;">อันดับ ${item.rank}: ${item.name}</div>
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

        <ErrorBoundary>
          <DataCard
            className="h-full"
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
              <PurchaseByCategoryChart data={aggregatedPurchaseByCategory} />
            )}
          </DataCard>
        </ErrorBoundary>
      </motion.div>

      {/* Purchase by Category & Brand */}
      <motion.div variants={itemVariants} className="grid gap-6">

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
      </motion.div>

      {/* Purchase Items by Category - Detailed Table */}
      <motion.div variants={itemVariants}>
      <ErrorBoundary>
        <DataCard
          title="รายละเอียดสินค้าแยกตามหมวดหมู่"
          description="รายการสินค้าทั้งหมดในแต่ละหมวดหมู่"
          linkTo="/reports/purchase#by-category"
          queryInfo={{
            query: getPurchaseByCategoryQuery(dateRange),
            format: 'JSONEachRow'
          }}
          headerExtra={
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-sm border border-border rounded-md bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">ทุกหมวดหมู่</option>
              {uniqueCategories.map(cat => (
                <option key={cat.code} value={cat.code}>
                  {cat.name}
                </option>
              ))}
            </select>
          }
        >
          {loading ? (
            <TableSkeleton />
          ) : (
            <PaginatedTable
              data={filteredPurchaseByCategory}
              columns={purchaseByCategoryColumns}
              keyExtractor={(item, index) => `${item.categoryCode}-${item.itemCode}-${index}`}
              itemsPerPage={15}
              emptyMessage="ไม่พบข้อมูลสินค้า"
            />
          )}
        </DataCard>
      </ErrorBoundary>
      </motion.div>

      {/* AP Outstanding */}
      <motion.div variants={itemVariants}>
      <ErrorBoundary>
        <DataCard
          title="สถานะเจ้าหนี้การค้า (AP) Top 20"
          description="ซัพพลายเออร์ที่มียอดค้างชำระสูงสุด"
          linkTo="/reports/purchase#ap-outstanding"
          queryInfo={{
            query: getAPOutstandingQuery(dateRange),
            format: 'JSONEachRow'
          }}
        >
          {loading ? (
            <ChartSkeleton height="600px" />
          ) : (
            <HorizontalBarChart
              data={apOutstanding.map((ap, index) => ({
                rank: index + 1,
                name: ap.supplierName,
                value: ap.totalOutstanding,
                subLabel: ap.supplierCode,
                extraData: {
                  overdueAmount: ap.overdueAmount,
                  notOverdueAmount: ap.totalOutstanding - ap.overdueAmount,
                  docCount: ap.docCount,
                  overduePercent: ap.totalOutstanding > 0
                    ? ((ap.overdueAmount / ap.totalOutstanding) * 100).toFixed(1)
                    : '0',
                },
              }))}
              height="500px"
              gridLeft={350}
              gridRight={40}
              yAxisLabelMargin={340}
              showRank={true}
              showLegend={false}
              getBarColor={(rank) => {
                // ใช้ gradient amber-orange สำหรับ AP (warning theme)
                const intensity = 0.9 - (rank - 1) * 0.04;
                return `rgba(245, 158, 11, ${Math.max(0.4, intensity)})`;
              }}
              tooltipFormatter={(item, percentage) => {
                const overdueAmount = item.extraData?.overdueAmount || 0;
                const notOverdueAmount = item.extraData?.notOverdueAmount || 0;
                const docCount = item.extraData?.docCount || 0;
                const overduePercent = item.extraData?.overduePercent || '0';
                const overduePercentNum = parseFloat(overduePercent);

                return `
                  <div style="padding: 10px; min-width: 300px;">
                    <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">อันดับ ${item.rank}: ${item.name}</div>
                    <div style="color: #6b7280; font-size: 11px; margin-bottom: 10px;">${item.subLabel}</div>
                    
                    <div style="margin-bottom: 8px; padding: 8px; background: #fef3c7; border-radius: 6px;">
                      <div style="color: #92400e; font-size: 11px; margin-bottom: 2px;">ยอดค้างชำระทั้งหมด</div>
                      <div style="font-size: 18px; font-weight: 700; color: #d97706;">฿${item.value.toLocaleString('th-TH')}</div>
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-bottom: 10px;">
                      <div style="flex: 1; padding: 6px; background: #dbeafe; border-radius: 4px;">
                        <div style="display: flex; align-items: center; margin-bottom: 2px;">
                          <span style="display: inline-block; width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; margin-right: 6px;"></span>
                          <span style="font-size: 10px; color: #1e40af;">ยังไม่ครบกำหนด</span>
                        </div>
                        <div style="font-weight: 600; color: #1e3a8a; font-size: 13px;">฿${notOverdueAmount.toLocaleString('th-TH')}</div>
                      </div>
                      
                      <div style="flex: 1; padding: 6px; background: #fee2e2; border-radius: 4px;">
                        <div style="display: flex; align-items: center; margin-bottom: 2px;">
                          <span style="display: inline-block; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; margin-right: 6px;"></span>
                          <span style="font-size: 10px; color: #991b1b;">เกินกำหนด</span>
                        </div>
                        <div style="font-weight: 600; color: #991b1b; font-size: 13px;">฿${overdueAmount.toLocaleString('th-TH')}</div>
                      </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid #e5e7eb;">
                      <span style="font-size: 11px; color: #6b7280;">สัดส่วนเกินกำหนด</span>
                      <span style="font-weight: 700; font-size: 13px; color: ${overduePercentNum > 50 ? '#dc2626' : overduePercentNum > 30 ? '#f59e0b' : '#10b981'};">${overduePercent}%</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                      <span style="font-size: 11px; color: #6b7280;">จำนวนบิล</span>
                      <span style="font-weight: 600; color: #374151; font-size: 12px;">${docCount} รายการ</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid #e5e7eb;">
                      <span style="font-size: 11px; color: #6b7280;">สัดส่วนจากยอดค้างทั้งหมด</span>
                      <span style="font-weight: 600; color: #f59e0b; font-size: 12px;">${percentage}%</span>
                    </div>
                  </div>
                `;
              }}
            />
          )}
        </DataCard>
      </ErrorBoundary>
      </motion.div>
    </motion.div>
  );
}
