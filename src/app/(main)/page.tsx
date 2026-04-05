'use client';

import React from 'react';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { KPICard } from '@/components/KPICard';
import { DataCard } from '@/components/DataCard';
import { AlertsCard } from '@/components/AlertsCard';
import { RecentSales } from '@/components/RecentSales';
import { DownloadReportButton } from '@/components/DownloadReportButton';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useBranchStore } from '@/store/useBranchStore';
import { getDateRange } from '@/lib/dateRanges';
import type { DateRange } from '@/lib/data/types';

// Custom ECharts Theme
const theme = {
  color: [
    '#6366f1', // Indigo
    '#0ea5e9', // Sky
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#f43f5e', // Rose
  ],
  textStyle: {
    fontFamily: 'Inter, sans-serif',
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: '#e2e8f0',
    textStyle: {
      color: '#1e293b',
    },
    padding: 12,
  },
  grid: {
    top: 40,
    right: 20,
    bottom: 20,
    left: 40,
    containLabel: true,
  },
};

export default function Dashboard() {
  const { dateRange, setDateRange } = useDateRangeStore();
  const selectedBranches = useBranchStore((s) => s.selectedBranches);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['dashboardData', dateRange, selectedBranches],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (!selectedBranches.includes('ALL')) {
        selectedBranches.forEach((b) => params.append('branch', b));
      }
      params.append('startDate', dateRange.start);
      params.append('endDate', dateRange.end);
      const queryParams = params.toString() ? `?${params.toString()}` : '';

      const [dashboardRes, salesChartRes, revenueRes] = await Promise.all([
        fetch(`/api/dashboard${queryParams}`),
        fetch(`/api/sales-chart${queryParams}`),
        fetch(`/api/revenue-expense${queryParams}`),
      ]);

      const dashboardData = await dashboardRes.json();
      const salesChartData = await salesChartRes.json();
      const revenueData = await revenueRes.json();

      return {
        ...dashboardData,
        salesChart: Array.isArray(salesChartData) ? salesChartData : [],
        revenueChart: Array.isArray(revenueData) ? revenueData : [],
      };
    },
  });

  // Framer motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  // Chart Options
  const salesTrendOption = {
    tooltip: {
      trigger: 'axis',
      className: 'glass',
      borderWidth: 0,
      shadowBlur: 10,
      shadowColor: 'rgba(0,0,0,0.1)',
    },
    grid: { left: '2%', right: '2%', bottom: '0%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data?.salesChart?.map((item: any) => item.date) || [],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' },
    },
    series: [
      {
        name: 'ยอดขาย',
        type: 'line',
        smooth: true,
        showSymbol: false,
        itemStyle: { color: '#6366f1' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99, 102, 241, 0.2)' },
              { offset: 1, color: 'rgba(99, 102, 241, 0)' }
            ]
          }
        },
        data: data?.salesChart?.map((item: any) => item.amount) || [],
      },
    ],
  };

  const revenueOption = {
    tooltip: {
      trigger: 'axis',
      className: 'glass',
      borderWidth: 0,
    },
    legend: { bottom: 0, icon: 'circle', itemGap: 20 },
    grid: { left: '2%', right: '2%', bottom: '10%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data?.revenueChart?.map((item: any) => item.month) || [],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' },
    },
    series: [
      {
        name: 'รายได้',
        type: 'bar',
        barWidth: 12,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#10b981' },
        data: data?.revenueChart?.map((item: any) => item.revenue) || [],
      },
      {
        name: 'ค่าใช้จ่าย',
        type: 'bar',
        barWidth: 12,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#f43f5e' },
        data: data?.revenueChart?.map((item: any) => item.expense) || [],
      },
    ],
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            ภาพรวมธุรกิจ
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">
            สรุปข้อมูลสำคัญและแนวโน้มประจำวันนี้
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            defaultKey="TODAY"
          />
          <DownloadReportButton />
        </div>
      </motion.div>

      {/* KPI Grid */}
      <motion.div variants={itemVariants} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="ยอดขายรวม"
          value={`฿${data?.totalSales?.toLocaleString() || 0}`}
          icon={DollarSign}
          trend={data?.salesGrowth ? `${data.salesGrowth > 0 ? '+' : ''}${data.salesGrowth.toFixed(1)}%` : undefined}
          trendUp={data?.salesGrowth > 0}
          description="เทียบกับเดือนที่แล้ว"
          detailTitle="รายละเอียดยอดขายรวม"
          detailItems={[
            { label: 'ช่วงวันที่', value: `${dateRange.start} ถึง ${dateRange.end}` },
            { label: 'การเติบโต', value: data?.salesGrowth !== undefined ? `${data.salesGrowth.toFixed(1)}%` : '-' },
          ]}
        />
        <KPICard
          title="คำสั่งซื้อ"
          value={data?.totalOrders?.toLocaleString() || 0}
          icon={ShoppingCart}
          trend={data?.ordersGrowth ? `${data.ordersGrowth > 0 ? '+' : ''}${data.ordersGrowth.toFixed(1)}%` : undefined}
          trendUp={data?.ordersGrowth > 0}
          description="เทียบกับเดือนที่แล้ว"
          detailTitle="รายละเอียดจำนวนคำสั่งซื้อ"
          detailItems={[
            { label: 'ช่วงวันที่', value: `${dateRange.start} ถึง ${dateRange.end}` },
            { label: 'การเติบโต', value: data?.ordersGrowth !== undefined ? `${data.ordersGrowth.toFixed(1)}%` : '-' },
          ]}
        />
        <KPICard
          title="ลูกค้า"
          value={data?.totalCustomers?.toLocaleString() || 0}
          icon={Users}
          trend={data?.customersGrowth ? `${data.customersGrowth > 0 ? '+' : ''}${data.customersGrowth.toFixed(1)}%` : undefined}
          trendUp={data?.customersGrowth > 0}
          description="เทียบกับเดือนที่แล้ว"
          detailTitle="รายละเอียดจำนวนลูกค้า"
          detailItems={[
            { label: 'ช่วงวันที่', value: `${dateRange.start} ถึง ${dateRange.end}` },
            { label: 'การเติบโต', value: data?.customersGrowth !== undefined ? `${data.customersGrowth.toFixed(1)}%` : '-' },
          ]}
        />
        <KPICard
          title="มูลค่าเฉลี่ย"
          value={`฿${Math.round(data?.avgOrderValue || 0).toLocaleString()}`}
          icon={Package}
          trend={data?.avgOrderGrowth ? `${data.avgOrderGrowth > 0 ? '+' : ''}${data.avgOrderGrowth.toFixed(1)}%` : undefined}
          trendUp={data?.avgOrderGrowth > 0}
          description="ต่อคำสั่งซื้อ"
          detailTitle="รายละเอียดมูลค่าเฉลี่ยต่อออเดอร์"
          detailItems={[
            { label: 'ช่วงวันที่', value: `${dateRange.start} ถึง ${dateRange.end}` },
            { label: 'การเติบโต', value: data?.avgOrderGrowth !== undefined ? `${data.avgOrderGrowth.toFixed(1)}%` : '-' },
          ]}
        />
      </motion.div>

      {/* Charts Section */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-7">
        {loading ? (
          // Skeleton loading for charts
          <>
            <div className="lg:col-span-4 rounded-xl border border-border bg-card p-6 h-[400px] animate-pulse">
              <div className="h-5 bg-muted rounded w-32 mb-4"></div>
              <div className="h-[320px] bg-muted rounded"></div>
            </div>
            <div className="lg:col-span-3 rounded-xl border border-border bg-card p-6 h-[400px] animate-pulse">
              <div className="h-5 bg-muted rounded w-32 mb-4"></div>
              <div className="h-[320px] bg-muted rounded"></div>
            </div>
          </>
        ) : (
          <>
            <DataCard title="แนวโน้มยอดขาย" className="lg:col-span-4 h-[400px]">
              <ReactECharts option={salesTrendOption} theme={theme} style={{ height: '350px', width: '100%' }} />
            </DataCard>
            <DataCard
              title="รายได้ vs ค่าใช้จ่าย"
              className="lg:col-span-3 h-[400px]"
            >
              <ReactECharts option={revenueOption} theme={theme} style={{ height: '350px', width: '100%' }} />
            </DataCard>
          </>
        )}
      </motion.div >

      {/* Bottom Section */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3" >
        {
          loading ? (
            // Skeleton loading for bottom section
            <>
              <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-32 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-24 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="lg:col-span-2">
                <DataCard
                  title="รายการขายล่าสุด"
                  action={
                    <button className="text-xs font-medium text-[hsl(var(--primary))] hover:underline">
                      ดูทั้งหมด
                    </button>
                  }
                  className="lg:col-span-2"
                >
                  <RecentSales sales={data?.recentSales || []} />
                </DataCard>
              </div>
              <div>
                <AlertsCard alerts={data?.alerts || []} />
              </div>
            </>
          )}
      </motion.div >
    </motion.div >
  );
}
