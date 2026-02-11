'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useComparison } from '@/lib/ComparisonContext';
import { ComparisonDateFilter } from '@/components/comparison/ComparisonDateFilter';
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart, Package, BarChart3,
  Users, Award, Trophy, Medal, Building2, Percent, Layers, UserCheck,
  ArrowUpRight, ArrowDownRight, Minus, Receipt, CreditCard,
} from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import { cn } from '@/lib/utils';
import type { DateRange, SalesKPIs, TopProduct, SalesBySalesperson, TopCustomer, ARStatus, SalesTrendData } from '@/lib/data/types';

/* ─── Branch color palette ─── */
const BRANCH_PALETTE = [
  { gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-700', hex: '#6366f1', light: 'bg-indigo-500' },
  { gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', hex: '#10b981', light: 'bg-emerald-500' },
  { gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-700', hex: '#f59e0b', light: 'bg-amber-500' },
  { gradient: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', text: 'text-rose-700', hex: '#ef4444', light: 'bg-rose-500' },
  { gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', text: 'text-cyan-700', hex: '#06b6d4', light: 'bg-cyan-500' },
  { gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', text: 'text-violet-700', hex: '#8b5cf6', light: 'bg-violet-500' },
];

/* ─── Full branch data interface ─── */
interface BranchSalesData {
  branchKey: string;
  branchName: string;
  kpis: SalesKPIs | null;
  topProducts: TopProduct[];
  salesperson: SalesBySalesperson[];
  topCustomers: TopCustomer[];
  arStatus: ARStatus[];
  trendData: SalesTrendData[];
}

/* ═══════════════════════════════════════════════
   Helper sub-components
   ═══════════════════════════════════════════════ */

function GrowthBadge({ value }: { value?: number }) {
  if (value === undefined || value === null) return null;
  const isUp = value > 0;
  const isDown = value < 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md',
      isUp && 'bg-emerald-50 text-emerald-600',
      isDown && 'bg-rose-50 text-rose-600',
      !isUp && !isDown && 'bg-muted text-muted-foreground',
    )}>
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : isDown ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function SectionHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="px-6 pt-5 pb-3">
      <h2 className="text-base font-bold text-foreground flex items-center gap-2">{icon}{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}

function BranchDot({ idx }: { idx: number }) {
  return <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', BRANCH_PALETTE[idx % BRANCH_PALETTE.length].light)} />;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground truncate max-w-[120px]">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */

export default function SalesComparisonPage() {
  const { selectedBranches, availableBranches, isLoaded } = useComparison();
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BranchSalesData[]>([]);

  /* ─── Fetch ALL endpoints per branch ─── */
  const fetchData = useCallback(async () => {
    if (!isLoaded || selectedBranches.length === 0) return;
    setLoading(true);
    try {
      const branchKeys = selectedBranches.filter((k: string) => k !== 'ALL');

      // Fetch branches sequentially to avoid overwhelming the server
      const results: BranchSalesData[] = [];
      for (const branchKey of branchKeys) {
        const branchInfo = availableBranches.find((b: { key: string; name: string }) => b.key === branchKey);

        const params = new URLSearchParams({
          start_date: dateRange.start,
          end_date: dateRange.end,
        });
        params.append('branch', branchKey);

        try {
          const [kpisRes, productsRes, salespersonRes, customersRes, arRes, trendRes] = await Promise.all([
            fetch(`/api/sales/kpis?${params}`),
            fetch(`/api/sales/top-products?${params}`),
            fetch(`/api/sales/by-salesperson?${params}`),
            fetch(`/api/sales/top-customers?${params}`),
            fetch(`/api/sales/ar-status?${params}`),
            fetch(`/api/sales/trend?${params}`),
          ]);

          const [kpisJ, productsJ, salespersonJ, customersJ, arJ, trendJ] = await Promise.all([
            kpisRes.ok ? kpisRes.json() : { data: null },
            productsRes.ok ? productsRes.json() : { data: [] },
            salespersonRes.ok ? salespersonRes.json() : { data: [] },
            customersRes.ok ? customersRes.json() : { data: [] },
            arRes.ok ? arRes.json() : { data: [] },
            trendRes.ok ? trendRes.json() : { data: [] },
          ]);

          results.push({
            branchKey,
            branchName: branchInfo?.name || `กิจการ ${branchKey}`,
            kpis: kpisJ.data,
            topProducts: productsJ.data || [],
            salesperson: salespersonJ.data || [],
            topCustomers: customersJ.data || [],
            arStatus: arJ.data || [],
            trendData: trendJ.data || [],
          });
        } catch (branchErr) {
          console.warn(`Failed to fetch data for branch ${branchKey}:`, branchErr);
          results.push({
            branchKey,
            branchName: branchInfo?.name || `กิจการ ${branchKey}`,
            kpis: null,
            topProducts: [],
            salesperson: [],
            topCustomers: [],
            arStatus: [],
            trendData: [],
          });
        }
      }
      setData(results);
    } catch (err) {
      console.error('Error fetching sales comparison:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranches, availableBranches, dateRange, isLoaded]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Formatting ─── */
  const fmt = (v: number) => `฿${v.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
  const fmtShort = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `฿${(v / 1_000_000).toFixed(2)}M`;
    if (Math.abs(v) >= 1_000) return `฿${(v / 1_000).toFixed(1)}K`;
    return `฿${v.toFixed(0)}`;
  };
  const fmtK = (v: number) => Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : Math.abs(v) >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : v.toFixed(0);
  const fmtNum = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 0 });

  /* ─── Short branch name helper ─── */
  const shortName = (name: string) => name.replace(/บริษัท\s*|จำกัด/g, '').trim().substring(0, 20);

  /* ─── Computed: totals ─── */
  const totals = useMemo(() => {
    const sum = (fn: (d: BranchSalesData) => number) => data.reduce((s, d) => s + fn(d), 0);
    return {
      sales: sum(d => d.kpis?.totalSales?.value || 0),
      profit: sum(d => d.kpis?.grossProfit?.value || 0),
      orders: sum(d => d.kpis?.totalOrders?.value || 0),
      customers: sum(d => d.topCustomers.length),
      avgOrder: data.length > 0 ? sum(d => d.kpis?.avgOrderValue?.value || 0) / data.length : 0,
      arOutstanding: sum(d => d.arStatus.reduce((s, ar) => s + ar.totalOutstanding, 0)),
    };
  }, [data]);

  /* ─── Computed: ranked by sales ─── */
  const rankedData = useMemo(() =>
    [...data].sort((a, b) => (b.kpis?.totalSales?.value || 0) - (a.kpis?.totalSales?.value || 0)), [data]);

  /* ═══════════════════════════════════════════════
     CHART OPTIONS
     ═══════════════════════════════════════════════ */

  /* 1. Sales vs Profit - Grouped Bar Chart */
  const salesProfitChart = useMemo(() => ({
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
    xAxis: { type: 'category', data: rankedData.map(b => shortName(b.branchName)), axisLabel: { rotate: 20, fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `฿${fmtK(v)}` } },
    series: [
      { name: 'ยอดขาย', type: 'bar', data: rankedData.map(b => b.kpis?.totalSales?.value || 0), itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] } },
      { name: 'กำไรขั้นต้น', type: 'bar', data: rankedData.map(b => b.kpis?.grossProfit?.value || 0), itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
    ],
  }), [rankedData]);

  /* 2. Sales Share - Donut Pie */
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
      data: rankedData.map((b, i) => ({
        name: shortName(b.branchName),
        value: b.kpis?.totalSales?.value || 0,
        itemStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex },
      })),
    }],
  }), [rankedData]);

  /* 3. Margin & Growth - Bar + Line Combo */
  const marginGrowthChart = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 30, right: 60, bottom: 50, left: 50, containLabel: true },
    xAxis: { type: 'category', data: rankedData.map(b => shortName(b.branchName)), axisLabel: { rotate: 20, fontSize: 10 } },
    yAxis: [
      { type: 'value', name: 'Margin %', position: 'left', axisLabel: { formatter: '{value}%' } },
      { type: 'value', name: 'Growth %', position: 'right', axisLabel: { formatter: '{value}%' } },
    ],
    series: [
      { name: 'Gross Margin', type: 'bar', data: rankedData.map(b => b.kpis?.grossMarginPct || 0), itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] } },
      { name: 'Sales Growth', type: 'line', yAxisIndex: 1, data: rankedData.map(b => b.kpis?.totalSales?.growthPercentage || 0), lineStyle: { width: 3 }, itemStyle: { color: '#10b981' }, symbol: 'circle', symbolSize: 8 },
    ],
  }), [rankedData]);

  /* 4. Orders & Avg Order Value - Bar + Line */
  const ordersChart = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 30, right: 60, bottom: 50, left: 50, containLabel: true },
    xAxis: { type: 'category', data: rankedData.map(b => shortName(b.branchName)), axisLabel: { rotate: 20, fontSize: 10 } },
    yAxis: [
      { type: 'value', name: 'ออเดอร์', position: 'left' },
      { type: 'value', name: '฿/ออเดอร์', position: 'right', axisLabel: { formatter: (v: number) => `฿${fmtK(v)}` } },
    ],
    series: [
      { name: 'จำนวนออเดอร์', type: 'bar', data: rankedData.map(b => b.kpis?.totalOrders?.value || 0), itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
      { name: 'เฉลี่ยต่อบิล', type: 'line', yAxisIndex: 1, data: rankedData.map(b => b.kpis?.avgOrderValue?.value || 0), lineStyle: { width: 3 }, itemStyle: { color: '#06b6d4' }, symbol: 'circle', symbolSize: 8 },
    ],
  }), [rankedData]);

  /* 5. Sales Trend Multi-Line */
  const trendChart = useMemo(() => {
    const allDates = new Set<string>();
    data.forEach(d => d.trendData.forEach(t => allDates.add(t.date)));
    const dates = Array.from(allDates).sort();

    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      grid: { top: 30, right: 20, bottom: 50, left: 50, containLabel: true },
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `฿${fmtK(v)}` } },
      series: rankedData.map((b, i) => ({
        name: shortName(b.branchName),
        type: 'line',
        smooth: true,
        data: dates.map(d => {
          const found = b.trendData.find(t => t.date === d);
          return found ? found.sales : 0;
        }),
        lineStyle: { width: 2.5 },
        itemStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex },
        symbol: 'circle',
        symbolSize: 6,
      })),
    };
  }, [data, rankedData]);

  /* 6. AR Outstanding - Stacked Bar */
  const arChart = useMemo(() => {
    const statusMap: Record<string, string> = {
      'Paid': 'ชำระแล้ว',
      'Partial': 'ชำระบางส่วน',
      'Unpaid': 'ค้างชำระ',
      'Overdue': 'เกินกำหนด',
    };
    const allStatus = ['Paid', 'Partial', 'Unpaid', 'Overdue'];
    const colors = ['#10b981', '#f59e0b', '#ef4444', '#dc2626'];

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      grid: { top: 30, right: 20, bottom: 50, left: 50, containLabel: true },
      xAxis: { type: 'category', data: rankedData.map(b => shortName(b.branchName)), axisLabel: { rotate: 20, fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `฿${fmtK(v)}` } },
      series: allStatus.map((status, sIdx) => ({
        name: statusMap[status] || status,
        type: 'bar',
        stack: 'ar',
        data: rankedData.map(b => {
          const ar = b.arStatus.find(a => a.statusPayment === status);
          return ar ? ar.totalOutstanding : 0;
        }),
        itemStyle: { color: colors[sIdx], borderRadius: sIdx === allStatus.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0] },
      })),
    };
  }, [rankedData]);

  /* 7. Top Products Comparison - Horizontal Bar */
  const topProductsChart = useMemo(() => {
    const products: { name: string; sales: number; color: string }[] = [];
    rankedData.forEach((b, i) => {
      b.topProducts.slice(0, 2).forEach(p => {
        products.push({
          name: `${p.itemName.substring(0, 18)} (${shortName(b.branchName).substring(0, 8)})`,
          sales: p.totalSales,
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
  }, [rankedData]);

  /* 8. Customer Metrics - Radar Chart */
  const customerRadarChart = useMemo(() => {
    const maxCustomers = Math.max(...data.map(d => d.topCustomers.length), 1);
    const maxSpent = Math.max(...data.flatMap(d => d.topCustomers.map(c => c.totalSpent)), 1);
    const maxOrders = Math.max(...data.flatMap(d => d.topCustomers.map(c => c.orderCount)), 1);

    return {
      tooltip: {},
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      radar: {
        indicator: [
          { name: 'จำนวนลูกค้า', max: maxCustomers },
          { name: 'ยอดซื้อสูงสุด', max: maxSpent },
          { name: 'ออเดอร์สูงสุด', max: maxOrders },
        ],
        radius: '60%',
      },
      series: [{
        type: 'radar',
        data: rankedData.map((b, i) => {
          const topC = b.topCustomers[0];
          return {
            name: shortName(b.branchName),
            value: [b.topCustomers.length, topC?.totalSpent || 0, topC?.orderCount || 0],
            lineStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex },
            areaStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex, opacity: 0.15 },
            itemStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex },
          };
        }),
      }],
    };
  }, [data, rankedData]);

  /* ═══ Render ═══ */
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold mb-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            เปรียบเทียบกิจการ
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ยอดขาย ผลิตภัณฑ์ และลูกค้า</h1>
          <p className="text-sm text-muted-foreground mt-0.5">เปรียบเทียบข้อมูลการขาย สินค้า และลูกค้าทั้งหมดระหว่างกิจการ</p>
        </div>
        <ComparisonDateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Loading / Empty */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-muted/20 animate-pulse" />)}
          </div>
          {[...Array(4)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-muted/20 animate-pulse" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-semibold text-foreground">ไม่มีข้อมูลเปรียบเทียบ</p>
          <p className="text-sm text-muted-foreground mt-1">กรุณาเลือกกิจการจากปุ่มด้านบนเพื่อเปรียบเทียบ</p>
        </div>
      ) : (
        <>
          {/* ════════════════════════════════════════
             1) KPI Summary Cards
             ════════════════════════════════════════ */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { icon: <DollarSign className="h-5 w-5 text-indigo-600" />, label: 'ยอดขายรวม', value: totals.sales, format: fmtShort, color: 'bg-indigo-500', sub: `จาก ${data.length} กิจการ` },
              { icon: <TrendingUp className="h-5 w-5 text-emerald-600" />, label: 'กำไรขั้นต้นรวม', value: totals.profit, format: fmtShort, color: 'bg-emerald-500', sub: `${totals.sales > 0 ? ((totals.profit / totals.sales) * 100).toFixed(1) : 0}% margin` },
              { icon: <ShoppingCart className="h-5 w-5 text-amber-600" />, label: 'ออเดอร์รวม', value: totals.orders, format: fmtNum, color: 'bg-amber-500' },
              { icon: <Receipt className="h-5 w-5 text-sky-600" />, label: 'เฉลี่ยต่อบิล', value: totals.avgOrder, format: fmt, color: 'bg-sky-500' },
              { icon: <Users className="h-5 w-5 text-violet-600" />, label: 'ลูกค้า Top', value: totals.customers, format: fmtNum, color: 'bg-violet-500' },
              { icon: <CreditCard className="h-5 w-5 text-rose-600" />, label: 'AR ค้างชำระ', value: totals.arOutstanding, format: fmtShort, color: 'bg-rose-500' },
            ].map((card, i) => (
              <div key={i} className="rounded-2xl border bg-card p-5 relative overflow-hidden hover:shadow-lg transition-all">
                <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-bl-[80px] opacity-[0.07]', card.color)} />
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-muted/50">{card.icon}</div>
                  <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{card.format(card.value)}</p>
                {card.sub && <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>}
              </div>
            ))}
          </div>

          {/* ════════════════════════════════════════
             2) Hero - Top Performer
             ════════════════════════════════════════ 
          {rankedData[0] && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white shadow-xl shadow-indigo-500/25">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Award className="h-48 w-48 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-xl bg-white/20 p-2 backdrop-blur-sm">
                    <Trophy className="h-6 w-6 text-yellow-300" />
                  </div>
                  <span className="text-indigo-100 font-medium">กิจการยอดขายสูงสุด</span>
                </div>
                <h2 className="text-3xl font-bold mb-1">{rankedData[0].branchName}</h2>
                <p className="text-indigo-200 mb-8">
                  ทำยอดขายได้คิดเป็น {totals.sales > 0 ? (((rankedData[0].kpis?.totalSales?.value || 0) / totals.sales) * 100).toFixed(1) : 0}% ของทั้งหมด
                </p>
                <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">ยอดขาย</p>
                    <p className="text-2xl font-bold">{fmtShort(rankedData[0].kpis?.totalSales?.value || 0)}</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">กำไรขั้นต้น</p>
                    <p className="text-2xl font-bold text-emerald-300">{fmtShort(rankedData[0].kpis?.grossProfit?.value || 0)}</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">Margin</p>
                    <p className="text-2xl font-bold">{(rankedData[0].kpis?.grossMarginPct || 0).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">ออเดอร์</p>
                    <p className="text-2xl font-bold">{fmtNum(rankedData[0].kpis?.totalOrders?.value || 0)}</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">ต่อบิล</p>
                    <p className="text-2xl font-bold">{fmt(rankedData[0].kpis?.avgOrderValue?.value || 0)}</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-sm mb-1">Growth</p>
                    <p className="text-2xl font-bold text-yellow-300">{(rankedData[0].kpis?.totalSales?.growthPercentage || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}*/}

          {/* ════════════════════════════════════════
             3) Ranking Table
             ════════════════════════════════════════ */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <SectionHeader
              icon={<Trophy className="h-4 w-4 text-amber-500" />}
              title="อันดับยอดขายกิจการ"
              desc="จัดอันดับตามยอดขาย กำไร และประสิทธิภาพ"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-b border-border/50 bg-muted/30">
                    {['#', 'กิจการ', 'ยอดขาย', 'กำไรขั้นต้น', 'Margin', 'ออเดอร์', 'เฉลี่ย/บิล', 'Growth', 'Salesperson', 'ลูกค้า Top'].map((h, i) => (
                      <th key={i} className={cn('py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap', i <= 1 ? 'text-left' : 'text-right', i === 0 && 'pl-6 w-12', i === 9 && 'pr-6')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankedData.map((d, idx) => {
                    const sales = d.kpis?.totalSales?.value || 0;
                    const profit = d.kpis?.grossProfit?.value || 0;
                    const margin = d.kpis?.grossMarginPct || 0;
                    const orders = d.kpis?.totalOrders?.value || 0;
                    const avgOrder = d.kpis?.avgOrderValue?.value || 0;
                    const growth = d.kpis?.totalSales?.growthPercentage || 0;
                    const RankIcon = idx === 0 ? Trophy : idx === 1 ? Award : idx === 2 ? Medal : null;
                    const rankColors = ['text-amber-500', 'text-gray-400', 'text-orange-400'];
                    return (
                      <tr key={d.branchKey} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-3 pl-6 pr-4">
                          {RankIcon ? <RankIcon className={cn('h-5 w-5', rankColors[idx])} /> : <span className="text-muted-foreground font-medium">{idx + 1}</span>}
                        </td>
                        <td className="py-3 px-4"><div className="flex items-center gap-2"><BranchDot idx={idx} /><span className="font-semibold text-foreground">{d.branchName}</span></div></td>
                        <td className="py-3 px-4 text-right font-medium">{fmtShort(sales)} <GrowthBadge value={d.kpis?.totalSales?.growthPercentage} /></td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-600">{fmtShort(profit)}</td>
                        <td className="py-3 px-4 text-right"><span className={cn('text-xs font-semibold px-2 py-1 rounded-lg', margin >= 30 ? 'bg-emerald-50 text-emerald-700' : margin >= 15 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700')}>{margin.toFixed(1)}%</span></td>
                        <td className="py-3 px-4 text-right font-medium">{fmtNum(orders)}</td>
                        <td className="py-3 px-4 text-right font-medium">{fmt(avgOrder)}</td>
                        <td className="py-3 px-4 text-right"><span className={cn('text-xs font-semibold px-2 py-1 rounded-lg', growth >= 10 ? 'bg-emerald-50 text-emerald-700' : growth >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700')}>{growth.toFixed(1)}%</span></td>
                        <td className="py-3 px-4 text-right font-medium">{d.salesperson.length}</td>
                        <td className="py-3 pr-6 pl-4 text-right font-medium">{d.topCustomers.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ════════════════════════════════════════
             4) Sales vs Profit + Sales Share
             ════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<DollarSign className="h-4 w-4 text-indigo-600" />} title="ยอดขาย vs กำไรขั้นต้น" desc="เปรียบเทียบรายได้และกำไรแต่ละกิจการ" />
              <div className="px-6 pb-5">
                <ReactECharts option={salesProfitChart} style={{ height: 300 }} />
              </div>
            </div>

            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<Layers className="h-4 w-4 text-violet-600" />} title="สัดส่วนยอดขาย" desc="สัดส่วนยอดขายแต่ละกิจการ" />
              <div className="px-6 pb-5">
                <ReactECharts option={salesShareChart} style={{ height: 300 }} />
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════
             5) Margin & Growth + Orders
             ════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<Percent className="h-4 w-4 text-violet-600" />} title="Gross Margin & Sales Growth" desc="อัตรากำไรขั้นต้นและอัตราเติบโต" />
              <div className="px-6 pb-5">
                <ReactECharts option={marginGrowthChart} style={{ height: 300 }} />
              </div>
            </div>

            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<ShoppingCart className="h-4 w-4 text-amber-600" />} title="ออเดอร์ & เฉลี่ยต่อบิล" desc="จำนวนออเดอร์และมูลค่าเฉลี่ยต่อบิล" />
              <div className="px-6 pb-5">
                <ReactECharts option={ordersChart} style={{ height: 300 }} />
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════
             6) Sales Trend
             ════════════════════════════════════════ */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <SectionHeader icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} title="แนวโน้มยอดขาย" desc="เปรียบเทียบยอดขายรายวัน/รายเดือน" />
            <div className="px-6 pb-5">
              <ReactECharts option={trendChart} style={{ height: 320 }} />
            </div>
          </div>

          {/* ════════════════════════════════════════
             7) Top Products + Customer Metrics
             ════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<Package className="h-4 w-4 text-amber-600" />} title="สินค้าขายดี Top 10" desc="สินค้าที่ขายดีจากทุกกิจการ" />
              <div className="px-6 pb-5">
                <ReactECharts option={topProductsChart} style={{ height: 300 }} />
              </div>
            </div>

            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader icon={<Users className="h-4 w-4 text-violet-600" />} title="ตัวชี้วัดลูกค้า" desc="จำนวนลูกค้าและพฤติกรรมการซื้อ" />
              <div className="px-6 pb-5 flex items-center justify-center">
                <ReactECharts option={customerRadarChart} style={{ height: 300, width: '100%' }} />
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════
             8) AR Status
             ════════════════════════════════════════ */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <SectionHeader icon={<CreditCard className="h-4 w-4 text-rose-600" />} title="สถานะลูกหนี้ (AR)" desc="เปรียบเทียบสถานะการชำระเงินของลูกค้า" />
            <div className="px-6 pb-5">
              <ReactECharts option={arChart} style={{ height: 300 }} />
            </div>
          </div>

          {/* ════════════════════════════════════════
             9) Top Products per Branch
             ════════════════════════════════════════ */}
          <div className="rounded-2xl border bg-card shadow-sm p-6">
            <h3 className="font-bold text-lg mb-1">สินค้าขายดี Top 5 แต่ละกิจการ</h3>
            <p className="text-sm text-muted-foreground mb-6">เปรียบเทียบสินค้าที่ขายดีที่สุดในแต่ละกิจการ</p>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {rankedData.map((branch, idx) => (
                <div key={branch.branchKey} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: BRANCH_PALETTE[idx % BRANCH_PALETTE.length].hex }} />
                    <h4 className="font-semibold text-sm">{branch.branchName}</h4>
                  </div>
                  <div className="space-y-2">
                    {branch.topProducts.slice(0, 5).map((product, pIdx) => (
                      <div key={pIdx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground truncate max-w-[60%]">{pIdx + 1}. {product.itemName}</span>
                        <span className="font-semibold">{fmtShort(product.totalSales)}</span>
                      </div>
                    ))}
                    {branch.topProducts.length === 0 && <p className="text-sm text-muted-foreground py-2">ไม่พบข้อมูล</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════
             10) Salesperson Comparison
             ════════════════════════════════════════ */}
          <div className="rounded-2xl border bg-card shadow-sm p-6">
            <h3 className="font-bold text-lg mb-1">Top พนักงานขายแต่ละกิจการ</h3>
            <p className="text-sm text-muted-foreground mb-6">เปรียบเทียบพนักงานขายยอดเยี่ยม</p>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {rankedData.map((branch, idx) => (
                <div key={branch.branchKey} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: BRANCH_PALETTE[idx % BRANCH_PALETTE.length].hex }} />
                    <h4 className="font-semibold text-sm">{branch.branchName}</h4>
                  </div>
                  <div className="space-y-2">
                    {branch.salesperson.slice(0, 5).map((sp, sIdx) => (
                      <div key={sIdx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground truncate max-w-[55%]">{sIdx + 1}. {sp.saleName}</span>
                        <div className="text-right">
                          <span className="font-semibold">{fmtShort(sp.totalSales)}</span>
                          <span className="text-xs text-muted-foreground ml-1">({sp.orderCount} บิล)</span>
                        </div>
                      </div>
                    ))}
                    {branch.salesperson.length === 0 && <p className="text-sm text-muted-foreground py-2">ไม่พบข้อมูล</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════
             11) Top Customers Comparison
             ════════════════════════════════════════ */}
          <div className="rounded-2xl border bg-card shadow-sm p-6">
            <h3 className="font-bold text-lg mb-1">ลูกค้า Top 5 แต่ละกิจการ</h3>
            <p className="text-sm text-muted-foreground mb-6">เปรียบเทียบลูกค้าที่ซื้อมากที่สุด</p>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {rankedData.map((branch, idx) => (
                <div key={branch.branchKey} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: BRANCH_PALETTE[idx % BRANCH_PALETTE.length].hex }} />
                    <h4 className="font-semibold text-sm">{branch.branchName}</h4>
                  </div>
                  <div className="space-y-2">
                    {branch.topCustomers.slice(0, 5).map((c, cIdx) => (
                      <div key={cIdx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground truncate max-w-[55%]">{cIdx + 1}. {c.customerName}</span>
                        <div className="text-right">
                          <span className="font-semibold">{fmtShort(c.totalSpent)}</span>
                          <span className="text-xs text-muted-foreground ml-1">({c.orderCount} ครั้ง)</span>
                        </div>
                      </div>
                    ))}
                    {branch.topCustomers.length === 0 && <p className="text-sm text-muted-foreground py-2">ไม่พบข้อมูล</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════
             12) Branch Legend
             ════════════════════════════════════════ 
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-2">กิจการที่แสดง</p>
            <div className="flex flex-wrap gap-4">
              {rankedData.map((b, i) => (
                <LegendDot key={b.branchKey} color={BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex} label={b.branchName} />
              ))}
            </div>
          </div>*/}
        </>
      )}
    </div>
  );
}
