'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Building2, TrendingUp, TrendingDown, Award,
  ShoppingCart, BarChart3, Package, Activity, AlertTriangle,
  Users, DollarSign, Percent, Receipt, Layers,
} from 'lucide-react';
import { useComparison } from '@/lib/ComparisonContext';
import { ComparisonDateFilter } from '@/components/comparison/ComparisonDateFilter';
import { getDateRange } from '@/lib/dateRanges';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/lib/data/types';
import type { BranchComparisonData } from '@/lib/data/comparison';
import { ComparisonTable } from './ComparisonTable';

/* ─── Branch color palette ─── */
const BRANCH_PALETTE = [
  { hex: '#6366f1', name: 'indigo' },
  { hex: '#10b981', name: 'emerald' },
  { hex: '#f59e0b', name: 'amber' },
  { hex: '#ef4444', name: 'rose' },
  { hex: '#06b6d4', name: 'cyan' },
  { hex: '#8b5cf6', name: 'violet' },
];

/* ─── Helper: SectionHeader ─── */
function SectionHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="px-6 pt-5 pb-3">
      <h2 className="text-base font-bold text-foreground flex items-center gap-2">{icon}{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}

/* ─── Helper: Legend Dot ─── */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground truncate max-w-[120px]">{label}</span>
    </div>
  );
}

export default function ComparisonPage() {
  const { selectedBranches, isLoaded } = useComparison();
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchComparisonData[]>([]);

  /* ─── Fetch comparison data ─── */
  const fetchData = useCallback(async () => {
    if (!isLoaded || selectedBranches.length === 0) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      selectedBranches.forEach((b: string) => params.append('branch', b));

      const res = await fetch(`/api/comparison?${params}`);
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching comparison data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranches, dateRange, isLoaded]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Formatting helpers ─── */
  const fmtM = (v: number) => `฿${(v / 1_000_000).toFixed(2)}M`;
  const fmtK = (v: number) => Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : Math.abs(v) >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : v.toFixed(0);
  const fmtP = (v: number) => `${v.toFixed(1)}%`;

  /* ─── Computed ─── */
  const topBranch = branches[0] || null;
  const totalRevenueAll = useMemo(() => branches.reduce((sum, b) => sum + b.totalSales, 0), [branches]);
  const totalExpenseAll = useMemo(() => branches.reduce((sum, b) => sum + b.totalExpense, 0), [branches]);
  const totalProfitAll = useMemo(() => branches.reduce((sum, b) => sum + b.netProfit, 0), [branches]);
  const totalOrdersAll = useMemo(() => branches.reduce((sum, b) => sum + b.totalOrders, 0), [branches]);
  const totalCustomersAll = useMemo(() => branches.reduce((sum, b) => sum + b.uniqueCustomers, 0), [branches]);
  const totalInventoryAll = useMemo(() => branches.reduce((sum, b) => sum + b.inventoryValue, 0), [branches]);
  const totalDeadStockAll = useMemo(() => branches.reduce((sum, b) => sum + b.deadStockValue, 0), [branches]);

  /* ─── Short branch name helper ─── */
  const shortName = (name: string) => name.replace(/บริษัท\s*|จำกัด/g, '').trim().substring(0, 20);

  /* ─══════════════════════════════════════════════════════════════════
     CHART OPTIONS
     ══════════════════════════════════════════════════════════════════ */

  /* 1. Sales vs Expense vs Profit - Grouped Bar Chart */
  const salesExpenseProfitChart = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const name = params[0]?.axisValue || '';
        let html = `<div class="font-semibold mb-1">${name}</div>`;
        params.forEach((p: any) => {
          html += `<div class="flex items-center gap-2"><span style="background:${p.color};width:10px;height:10px;border-radius:2px;display:inline-block;"></span>${p.seriesName}: ฿${fmtK(p.value)}</div>`;
        });
        return html;
      },
    },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 30, right: 20, bottom: 50, left: 50, containLabel: true },
    xAxis: { type: 'category', data: branches.map(b => shortName(b.branchName)), axisLabel: { rotate: 20, fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `฿${fmtK(v)}` } },
    series: [
      { name: 'ยอดขาย', type: 'bar', data: branches.map(b => b.totalSales), itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] } },
      { name: 'ค่าใช้จ่าย', type: 'bar', data: branches.map(b => b.totalExpense), itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
      { name: 'กำไร', type: 'bar', data: branches.map(b => b.netProfit), itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
    ],
  }), [branches]);

  /* 2. Profit Margin & Growth - Bar + Line Combo */
  const marginGrowthChart = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 30, right: 60, bottom: 50, left: 50, containLabel: true },
    xAxis: { type: 'category', data: branches.map(b => shortName(b.branchName)), axisLabel: { rotate: 20, fontSize: 10 } },
    yAxis: [
      { type: 'value', name: 'Margin %', position: 'left', axisLabel: { formatter: '{value}%' } },
      { type: 'value', name: 'Growth %', position: 'right', axisLabel: { formatter: '{value}%' } },
    ],
    series: [
      { name: 'Profit Margin', type: 'bar', data: branches.map(b => b.profitMargin), itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] } },
      { name: 'Sales Growth', type: 'line', yAxisIndex: 1, data: branches.map(b => b.salesGrowth), lineStyle: { width: 3 }, itemStyle: { color: '#10b981' }, symbol: 'circle', symbolSize: 8 },
    ],
  }), [branches]);

  /* 3. Sales Share - Pie Chart */
  const salesShareChart = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: ฿{c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: branches.map((b, i) => ({
        name: shortName(b.branchName),
        value: b.totalSales,
        itemStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex },
      })),
    }],
  }), [branches]);

  /* 4. Inventory Comparison - Stacked Bar (Stock Value + Dead Stock) */
  const inventoryChart = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 30, right: 20, bottom: 50, left: 50, containLabel: true },
    xAxis: { type: 'category', data: branches.map(b => shortName(b.branchName)), axisLabel: { rotate: 20, fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `฿${fmtK(v)}` } },
    series: [
      { name: 'มูลค่าสต็อก', type: 'bar', stack: 'inv', data: branches.map(b => b.inventoryValue - b.deadStockValue), itemStyle: { color: '#06b6d4', borderRadius: [0, 0, 0, 0] } },
      { name: 'Dead Stock', type: 'bar', stack: 'inv', data: branches.map(b => b.deadStockValue), itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] } },
    ],
  }), [branches]);

  /* 5. Inventory Turnover - Horizontal Bar */
  const turnoverChart = useMemo(() => ({
    tooltip: { trigger: 'axis', formatter: (params: any) => `${params[0].name}: ${params[0].value.toFixed(2)}x` },
    grid: { top: 10, right: 40, bottom: 20, left: 10, containLabel: true },
    xAxis: { type: 'value', axisLabel: { formatter: '{value}x' } },
    yAxis: { type: 'category', data: branches.map(b => shortName(b.branchName)).reverse(), axisLabel: { fontSize: 10 } },
    series: [{
      type: 'bar',
      data: [...branches].reverse().map((b, i) => ({
        value: b.inventoryTurnover,
        itemStyle: { color: BRANCH_PALETTE[(branches.length - 1 - i) % BRANCH_PALETTE.length].hex, borderRadius: [0, 4, 4, 0] },
      })),
      barWidth: '60%',
    }],
  }), [branches]);

  /* 6. Customer Metrics - Radar Chart */
  const customerRadarChart = useMemo(() => {
    const maxCustomers = Math.max(...branches.map(b => b.uniqueCustomers), 1);
    const maxTransactions = Math.max(...branches.map(b => b.totalTransactions), 1);
    return {
      tooltip: {},
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      radar: {
        indicator: [
          { name: 'ลูกค้า', max: maxCustomers },
          { name: 'Repeat %', max: 100 },
          { name: 'Transactions', max: maxTransactions },
        ],
        radius: '60%',
      },
      series: [{
        type: 'radar',
        data: branches.map((b, i) => ({
          name: shortName(b.branchName),
          value: [b.uniqueCustomers, b.repeatCustomerRate, b.totalTransactions],
          lineStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex },
          areaStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex, opacity: 0.15 },
          itemStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex },
        })),
      }],
    };
  }, [branches]);

  /* 7. Monthly Sales Trend - Multi-Line */
  const monthlyTrendChart = useMemo(() => {
    // Collect all unique months
    const allMonths = new Set<string>();
    branches.forEach(b => b.monthlySales.forEach(m => allMonths.add(m.month)));
    const months = Array.from(allMonths).sort();

    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      grid: { top: 30, right: 20, bottom: 50, left: 50, containLabel: true },
      xAxis: { type: 'category', data: months, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `฿${fmtK(v)}` } },
      series: branches.map((b, i) => ({
        name: shortName(b.branchName),
        type: 'line',
        smooth: true,
        data: months.map(m => {
          const found = b.monthlySales.find(ms => ms.month === m);
          return found ? found.sales : 0;
        }),
        lineStyle: { width: 2.5 },
        itemStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex },
        symbol: 'circle',
        symbolSize: 6,
      })),
    };
  }, [branches]);

  /* 8. Top Products Comparison - Horizontal Grouped Bar */
  const topProductsChart = useMemo(() => {
    // Get top product from each branch
    const products: { name: string; branch: string; sales: number; color: string }[] = [];
    branches.forEach((b, i) => {
      b.topProducts.slice(0, 2).forEach(p => {
        products.push({
          name: p.productName.substring(0, 20),
          branch: shortName(b.branchName),
          sales: p.sales,
          color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex,
        });
      });
    });
    products.sort((a, b) => b.sales - a.sales);
    const top10 = products.slice(0, 10);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 10, right: 40, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: 'value', axisLabel: { formatter: (v: number) => `฿${fmtK(v)}` } },
      yAxis: { type: 'category', data: top10.map(p => p.name).reverse(), axisLabel: { fontSize: 10 } },
      series: [{
        type: 'bar',
        data: top10.reverse().map(p => ({ value: p.sales, itemStyle: { color: p.color, borderRadius: [0, 4, 4, 0] } })),
        barWidth: '60%',
      }],
    };
  }, [branches]);

  /* ═══ Render ═══ */
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-wider font-semibold">
            <BarChart3 className="h-4 w-4" />
            <span>Comparison Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            เปรียบเทียบผลการดำเนินงาน
          </h1>
        </div>
        <ComparisonDateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-6">
          <div className="h-64 rounded-3xl bg-muted/20 animate-pulse" />
          <div className="grid gap-6 md:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted/20 animate-pulse" />)}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(2)].map((_, i) => <div key={i} className="h-80 rounded-xl bg-muted/20 animate-pulse" />)}
          </div>
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-semibold text-foreground">ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
          <p className="text-sm text-muted-foreground mt-1">กรุณาเลือกกิจการจากแถบด้านบนเพื่อเปรียบเทียบ</p>
        </div>
      ) : (
        <div className="space-y-6 pb-10">
          {/* ─────────────────────────────────────────────────────────
              SECTION 1: Overview KPI Cards
              ───────────────────────────────────────────────────────── 
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-xl border bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">ยอดขายรวม</span>
              </div>
              <p className="text-xl font-bold text-foreground">{fmtM(totalRevenueAll)}</p>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <Receipt className="h-4 w-4" />
                <span className="text-xs font-medium">ค่าใช้จ่ายรวม</span>
              </div>
              <p className="text-xl font-bold text-foreground">{fmtM(totalExpenseAll)}</p>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">กำไรสุทธิ</span>
              </div>
              <p className={cn('text-xl font-bold', totalProfitAll >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{fmtM(totalProfitAll)}</p>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sky-600 mb-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs font-medium">บิลรวม</span>
              </div>
              <p className="text-xl font-bold text-foreground">{totalOrdersAll.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-violet-600 mb-2">
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium">ลูกค้ารวม</span>
              </div>
              <p className="text-xl font-bold text-foreground">{totalCustomersAll.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-rose-600 mb-2">
                <Package className="h-4 w-4" />
                <span className="text-xs font-medium">มูลค่าสต็อก</span>
              </div>
              <p className="text-xl font-bold text-foreground">{fmtM(totalInventoryAll)}</p>
            </div>
          </div>*/}

          {/* ─────────────────────────────────────────────────────────
              SECTION 2: Hero - Top Performer
              ───────────────────────────────────────────────────────── */}
          {topBranch && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white shadow-xl shadow-indigo-500/25">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Award className="h-48 w-48 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-xl bg-white/20 p-2 backdrop-blur-sm">
                    <Award className="h-6 w-6 text-yellow-300" />
                  </div>
                  <span className="text-indigo-100 font-medium">กิจการยอดขายสูงสุด</span>
                </div>
                <h2 className="text-3xl font-bold mb-1">{topBranch.branchName}</h2>
                <p className="text-indigo-200 mb-8">
                  ทำยอดขายได้คิดเป็น {totalRevenueAll > 0 ? ((topBranch.totalSales / totalRevenueAll) * 100).toFixed(1) : 0}% ของทั้งหมด
                </p>
                <div className="grid gap-6 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">ยอดขาย</p>
                    <p className="text-2xl font-bold">{fmtM(topBranch.totalSales)}</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">กำไรสุทธิ</p>
                    <p className="text-2xl font-bold text-emerald-300">{fmtM(topBranch.netProfit)}</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">Margin</p>
                    <p className="text-2xl font-bold">{topBranch.profitMargin.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">ต่อบิล</p>
                    <p className="text-2xl font-bold">฿{Math.round(topBranch.avgTicketSize).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">ลูกค้า</p>
                    <p className="text-2xl font-bold">{topBranch.uniqueCustomers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">Turnover</p>
                    <p className="text-2xl font-bold">{topBranch.inventoryTurnover.toFixed(2)}x</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
              SECTION 3: Sales vs Expense vs Profit (Grouped Bar)
              ───────────────────────────────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<DollarSign className="h-4 w-4 text-indigo-600" />} title="ยอดขาย vs ค่าใช้จ่าย vs กำไร" desc="เปรียบเทียบรายได้ ค่าใช้จ่าย และกำไรแต่ละกิจการ" />
              <div className="px-4 pb-4">
                <ReactECharts option={salesExpenseProfitChart} style={{ height: 320 }} />
              </div>
            </div>

            {/* Sales Share Pie */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<Layers className="h-4 w-4 text-violet-600" />} title="สัดส่วนยอดขาย" desc="สัดส่วนยอดขายแต่ละกิจการ" />
              <div className="px-4 pb-4">
                <ReactECharts option={salesShareChart} style={{ height: 320 }} />
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              SECTION 4: Margin & Growth + Monthly Trend
              ───────────────────────────────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<Percent className="h-4 w-4 text-violet-600" />} title="Profit Margin & Sales Growth" desc="อัตรากำไรและอัตราเติบโตของยอดขาย" />
              <div className="px-4 pb-4">
                <ReactECharts option={marginGrowthChart} style={{ height: 300 }} />
              </div>
            </div>

            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} title="แนวโน้มยอดขายรายเดือน" desc="เปรียบเทียบยอดขายย้อนหลัง 6 เดือน" />
              <div className="px-4 pb-4">
                <ReactECharts option={monthlyTrendChart} style={{ height: 300 }} />
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              SECTION 5: Inventory Health
              ───────────────────────────────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<Package className="h-4 w-4 text-cyan-600" />} title="มูลค่าสต็อก & Dead Stock" desc="เปรียบเทียบมูลค่าสินค้าคงคลังและสินค้าไม่เคลื่อนไหว" />
              <div className="px-4 pb-4">
                <ReactECharts option={inventoryChart} style={{ height: 300 }} />
              </div>
            </div>

            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<Activity className="h-4 w-4 text-emerald-600" />} title="อัตราหมุนเวียนสต็อก" desc="Inventory Turnover แต่ละกิจการ" />
              <div className="px-4 pb-4">
                <ReactECharts option={turnoverChart} style={{ height: 300 }} />
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              SECTION 6: Customer Metrics + Top Products
              ───────────────────────────────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<Users className="h-4 w-4 text-violet-600" />} title="ตัวชี้วัดลูกค้า" desc="จำนวนลูกค้า, Repeat Rate, Transactions" />
              <div className="px-4 pb-4 flex items-center justify-center">
                <ReactECharts option={customerRadarChart} style={{ height: 300, width: '100%' }} />
              </div>
            </div>

            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<BarChart3 className="h-4 w-4 text-amber-600" />} title="สินค้าขายดี" desc="Top 10 สินค้าจากทุกกิจการ" />
              <div className="px-4 pb-4">
                <ReactECharts option={topProductsChart} style={{ height: 300 }} />
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              SECTION 7: Inventory Summary Cards
              ───────────────────────────────────────────────────────── 
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold">มูลค่าสต็อกรวม</h3>
              </div>
              <p className="text-3xl font-bold text-foreground">{fmtM(totalInventoryAll)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                คิดเป็น {totalRevenueAll > 0 ? ((totalInventoryAll / totalRevenueAll) * 100).toFixed(1) : 0}% ของยอดขาย
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold">อัตราหมุนเวียนเฉลี่ย</h3>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {branches.length > 0 ? (branches.reduce((sum, b) => sum + b.inventoryTurnover, 0) / branches.length).toFixed(2) : '0.00'}x
              </p>
              <p className="text-sm text-emerald-600 mt-1">สต็อกหมุนเวียนดี</p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h3 className="font-semibold">Dead Stock รวม</h3>
              </div>
              <p className="text-3xl font-bold text-rose-600">{fmtM(totalDeadStockAll)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {branches.filter(b => b.deadStockValue > 0).length} กิจการมีสินค้าไม่ขยับ
              </p>
            </div>
          </div>*/}

          {/* ─────────────────────────────────────────────────────────
              SECTION 8: Branch Legend
              ───────────────────────────────────────────────────────── 
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-2">กิจการที่แสดง</p>
            <div className="flex flex-wrap gap-4">
              {branches.map((b, i) => (
                <LegendDot key={b.branchKey} color={BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex} label={b.branchName} />
              ))}
            </div>
          </div>*/}

          {/* ─────────────────────────────────────────────────────────
              SECTION 9: Enhanced Comparison Table
              ───────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="font-bold text-xl mb-1">อันดับประสิทธิภาพกิจการ</h3>
              <p className="text-muted-foreground text-sm">
                เปรียบเทียบยอดขาย กำไร สต็อก ลูกค้า และแนวโน้ม
              </p>
            </div>
            <ComparisonTable data={branches} />
          </div>
        </div>
      )}
    </div>
  );
}
