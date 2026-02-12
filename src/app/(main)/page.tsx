'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { KPICard } from '@/components/KPICard';
import { DataCard } from '@/components/DataCard';
import { AlertsCard } from '@/components/AlertsCard';
import { RecentSales } from '@/components/RecentSales';
import { DownloadReportButton } from '@/components/DownloadReportButton';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import { useBranchChange } from '@/lib/branch-events';
import { getDateRange } from '@/lib/dateRanges';
import type { DateRange } from '@/lib/data/types';
import { getSelectedBranch } from '@/app/actions/branch-actions';

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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('TODAY'));

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const branches = await getSelectedBranch();
      const params = new URLSearchParams();
      if (branches.length > 0 && !branches.includes('ALL')) {
        branches.forEach(b => params.append('branch', b));
      }
      
      // Add date range to params
      params.append('startDate', dateRange.start);
      params.append('endDate', dateRange.end);
      
      const queryParams = params.toString() ? `?${params.toString()}` : '';

      const [dashboardRes, salesChartRes, revenueRes] = await Promise.all([
        fetch(`/api/dashboard${queryParams}`),
        fetch(`/api/sales-chart${queryParams}`),
        fetch(`/api/revenue-expense${queryParams}`)
      ]);

      const dashboardData = await dashboardRes.json();
      const salesChartData = await salesChartRes.json();
      const revenueData = await revenueRes.json();

      setData({
        ...dashboardData,
        salesChart: Array.isArray(salesChartData) ? salesChartData : [],
        revenueChart: Array.isArray(revenueData) ? revenueData : []
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Listen for branch changes - wrap in useCallback to prevent unnecessary listener updates
  const handleBranchChange = useCallback(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end]);

  useBranchChange(handleBranchChange);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent"></div>
      </div>
    );
  }

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="ยอดขายรวม"
          value={`฿${data?.totalSales?.toLocaleString() || 0}`}
          icon={DollarSign}
          trend={data?.salesGrowth ? `${data.salesGrowth > 0 ? '+' : ''}${data.salesGrowth.toFixed(1)}%` : undefined}
          trendUp={data?.salesGrowth > 0}
          description="เทียบกับเดือนที่แล้ว"
          className="delay-100"
        />
        <KPICard
          title="คำสั่งซื้อ"
          value={data?.totalOrders?.toLocaleString() || 0}
          icon={ShoppingCart}
          trend={data?.ordersGrowth ? `${data.ordersGrowth > 0 ? '+' : ''}${data.ordersGrowth.toFixed(1)}%` : undefined}
          trendUp={data?.ordersGrowth > 0}
          description="เทียบกับเดือนที่แล้ว"
          className="delay-200"
        />
        <KPICard
          title="ลูกค้า"
          value={data?.totalCustomers?.toLocaleString() || 0}
          icon={Users}
          trend={data?.customersGrowth ? `${data.customersGrowth > 0 ? '+' : ''}${data.customersGrowth.toFixed(1)}%` : undefined}
          trendUp={data?.customersGrowth > 0}
          description="เทียบกับเดือนที่แล้ว"
          className="delay-300"
        />
        <KPICard
          title="มูลค่าเฉลี่ย"
          value={`฿${Math.round(data?.avgOrderValue || 0).toLocaleString()}`}
          icon={Package}
          trend={data?.avgOrderGrowth ? `${data.avgOrderGrowth > 0 ? '+' : ''}${data.avgOrderGrowth.toFixed(1)}%` : undefined}
          trendUp={data?.avgOrderGrowth > 0}
          description="ต่อคำสั่งซื้อ"
          className="delay-400"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-7">
        <DataCard title="แนวโน้มยอดขาย" className="lg:col-span-4 min-h-[400px]">
          <ReactECharts option={salesTrendOption} theme={theme} style={{ height: '100%', width: '100%' }} />
        </DataCard>
        <DataCard
          title="รายได้ vs ค่าใช้จ่าย"
          className="lg:col-span-3 min-h-[400px]"
        >
          <ReactECharts option={revenueOption} theme={theme} style={{ height: '100%', width: '100%' }} />
        </DataCard>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
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
      </div>
    </div>
  );
}
