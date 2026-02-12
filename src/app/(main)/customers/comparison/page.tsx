'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useComparison } from '@/lib/ComparisonContext';
import { ComparisonDateFilter } from '@/components/comparison/ComparisonDateFilter';
import { SimpleKPICard, KPIGrid } from '@/components/comparison/SimpleKPICard';
import {
  Users, ShoppingCart, DollarSign, UserCheck, TrendingUp, BarChart3,
  Receipt, CreditCard, Award, Trophy, Medal, Building2,
  ArrowUpRight, ArrowDownRight, Minus, Star, Activity, Percent,
} from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import { cn } from '@/lib/utils';
import type { DateRange, TopCustomer, SalesKPIs, ARStatus } from '@/lib/data/types';

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
interface BranchCustomerData {
  branchKey: string;
  branchName: string;
  kpis: SalesKPIs | null;
  topCustomers: TopCustomer[];
  arStatus: ARStatus[];
  totalCustomers: number;
  activeCustomers: number;
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  revenuePerCustomer: number;
  ordersPerCustomer: number;
  arOutstanding: number;
  avgDaysSinceLastOrder: number;
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

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */

export default function CustomersComparisonPage() {
  const { selectedBranches, availableBranches, isLoaded } = useComparison();
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BranchCustomerData[]>([]);

  /* ─── Fetch ALL endpoints per branch ─── */
  const fetchData = useCallback(async () => {
    if (!isLoaded || selectedBranches.length === 0) return;
    setLoading(true);
    try {
      const branchKeys = selectedBranches.filter((k: string) => k !== 'ALL');
      const results: BranchCustomerData[] = [];

      for (const branchKey of branchKeys) {
        const branchInfo = availableBranches.find((b: { key: string; name: string }) => b.key === branchKey);

        const params = new URLSearchParams({
          start_date: dateRange.start,
          end_date: dateRange.end,
        });
        params.append('branch', branchKey);

        try {
          const [kpisRes, customersRes, arRes] = await Promise.all([
            fetch(`/api/sales/kpis?${params}`),
            fetch(`/api/sales/top-customers?${params}`),
            fetch(`/api/sales/ar-status?${params}`),
          ]);

          const [kpisJ, customersJ, arJ] = await Promise.all([
            kpisRes.ok ? kpisRes.json() : { data: null },
            customersRes.ok ? customersRes.json() : { data: [] },
            arRes.ok ? arRes.json() : { data: [] },
          ]);

          const kpis = kpisJ.data as SalesKPIs | null;
          const topCustomers = (customersJ.data || []) as TopCustomer[];
          const arStatus = (arJ.data || []) as ARStatus[];

          const totalCustomers = topCustomers.length;
          const activeCustomers = topCustomers.filter((c: TopCustomer) => c.daysSinceLastOrder <= 90).length;
          const totalSales = kpis?.totalSales?.value || 0;
          const totalOrders = kpis?.totalOrders?.value || 0;
          const avgOrderValue = kpis?.avgOrderValue?.value || 0;
          const revenuePerCustomer = totalCustomers > 0 ? totalSales / totalCustomers : 0;
          const ordersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0;
          const arOutstanding = arStatus.reduce((s: number, ar: ARStatus) => s + ar.totalOutstanding, 0);
          const avgDaysSinceLastOrder = totalCustomers > 0 
            ? topCustomers.reduce((s: number, c: TopCustomer) => s + c.daysSinceLastOrder, 0) / totalCustomers 
            : 0;

          results.push({
            branchKey,
            branchName: branchInfo?.name || `กิจการ ${branchKey}`,
            kpis,
            topCustomers,
            arStatus,
            totalCustomers,
            activeCustomers,
            totalSales,
            totalOrders,
            avgOrderValue,
            revenuePerCustomer,
            ordersPerCustomer,
            arOutstanding,
            avgDaysSinceLastOrder,
          });
        } catch (branchErr) {
          console.warn(`Failed to fetch data for branch ${branchKey}:`, branchErr);
          results.push({
            branchKey,
            branchName: branchInfo?.name || `กิจการ ${branchKey}`,
            kpis: null,
            topCustomers: [],
            arStatus: [],
            totalCustomers: 0,
            activeCustomers: 0,
            totalSales: 0,
            totalOrders: 0,
            avgOrderValue: 0,
            revenuePerCustomer: 0,
            ordersPerCustomer: 0,
            arOutstanding: 0,
            avgDaysSinceLastOrder: 0,
          });
        }
      }
      setData(results);
    } catch (err) {
      console.error('Error fetching customers comparison:', err);
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
  const fmtNum = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 0 });
  const shortName = (name: string) => name.replace(/บริษัท\s*|จำกัด/g, '').trim().substring(0, 25);

  /* ─── Computed: totals ─── */
  const totals = useMemo(() => ({
    totalCustomers: data.reduce((s, d) => s + d.totalCustomers, 0),
    activeCustomers: data.reduce((s, d) => s + d.activeCustomers, 0),
    totalSales: data.reduce((s, d) => s + d.totalSales, 0),
    totalOrders: data.reduce((s, d) => s + d.totalOrders, 0),
    avgOrderValue: data.length > 0 ? data.reduce((s, d) => s + d.avgOrderValue, 0) / data.length : 0,
    arOutstanding: data.reduce((s, d) => s + d.arOutstanding, 0),
  }), [data]);

  const avgRevenuePerCustomer = totals.totalCustomers > 0 ? totals.totalSales / totals.totalCustomers : 0;
  const avgOrdersPerCustomer = totals.totalCustomers > 0 ? totals.totalOrders / totals.totalCustomers : 0;

  /* ─── Computed: ranked by revenue per customer ─── */
  const rankedData = useMemo(() =>
    [...data].sort((a, b) => b.revenuePerCustomer - a.revenuePerCustomer), [data]);

  /* ─── Best performer (highest revenue per customer) ─── */
  const bestPerformer = rankedData[0];

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ลูกค้า</h1>
          <p className="text-sm text-muted-foreground mt-0.5">เปรียบเทียบข้อมูลลูกค้าและความภักดีระหว่างกิจการ</p>
        </div>
        <ComparisonDateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Loading / Empty */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
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
             1) KPI Summary Cards (6 cards)
             ════════════════════════════════════════ */}
          <KPIGrid
            columns={6}
            cards={[
              { icon: Users, iconColor: 'text-indigo-600', label: 'ลูกค้าทั้งหมด', value: totals.totalCustomers, barColor: 'bg-indigo-500', subText: `จาก ${data.length} กิจการ`, format: 'number' },
              { icon: UserCheck, iconColor: 'text-emerald-600', label: 'ลูกค้าที่ซื้อบ่อย', value: totals.activeCustomers, barColor: 'bg-emerald-500', subText: `${totals.totalCustomers > 0 ? ((totals.activeCustomers / totals.totalCustomers) * 100).toFixed(0) : 0}% ของทั้งหมด`, format: 'number' },
              { icon: DollarSign, iconColor: 'text-amber-600', label: 'รายได้ต่อลูกค้า', value: avgRevenuePerCustomer, barColor: 'bg-amber-500', format: 'money' },
              { icon: Receipt, iconColor: 'text-violet-600', label: 'ยอดเฉลี่ยต่อบิล', value: totals.avgOrderValue, barColor: 'bg-violet-500', format: 'money' },
              { icon: ShoppingCart, iconColor: 'text-cyan-600', label: 'ออเดอร์ต่อลูกค้า', value: avgOrdersPerCustomer, barColor: 'bg-cyan-500', subText: 'ครั้ง/คน', format: 'decimal' },
              { icon: CreditCard, iconColor: 'text-rose-600', label: 'AR ค้างชำระ', value: totals.arOutstanding, barColor: 'bg-rose-500', format: 'money' },
            ]}
          />
{/* ════════════════════════════════════════
             8) Ranking Table
             ════════════════════════════════════════ */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <SectionHeader
              icon={<Trophy className="h-4 w-4 text-amber-500" />}
              title="อันดับคุณภาพลูกค้า"
              desc="จัดอันดับตามรายได้ต่อลูกค้า พร้อมตัวชี้วัดสำคัญ"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-b border-border/50 bg-muted/30">
                    {['#', 'กิจการ', 'รายได้/ลูกค้า', 'จำนวนลูกค้า', 'ลูกค้าซื้อบ่อย', 'ออเดอร์/คน', 'ยอดเฉลี่ย/บิล', 'AR ค้างชำระ'].map((h, i) => (
                      <th key={i} className={cn('py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap', i <= 1 ? 'text-left' : 'text-right', i === 0 && 'pl-6 w-12', i === 7 && 'pr-6')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankedData.map((d, idx) => {
                    const RankIcon = idx === 0 ? Trophy : idx === 1 ? Award : idx === 2 ? Medal : null;
                    const rankColors = ['text-amber-500', 'text-gray-400', 'text-orange-400'];
                    const activePercent = d.totalCustomers > 0 ? (d.activeCustomers / d.totalCustomers) * 100 : 0;
                    return (
                      <tr key={d.branchKey} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-3 pl-6 pr-4">
                          {RankIcon ? <RankIcon className={cn('h-5 w-5', rankColors[idx])} /> : <span className="text-muted-foreground font-medium">{idx + 1}</span>}
                        </td>
                        <td className="py-3 px-4"><div className="flex items-center gap-2"><BranchDot idx={idx} /><span className="font-semibold text-foreground">{d.branchName}</span></div></td>
                        <td className="py-3 px-4 text-right font-bold text-amber-600">{fmtShort(d.revenuePerCustomer)}</td>
                        <td className="py-3 px-4 text-right font-medium">{fmtNum(d.totalCustomers)} คน</td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn('text-xs font-semibold px-2 py-1 rounded-lg', activePercent >= 70 ? 'bg-emerald-50 text-emerald-700' : activePercent >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700')}>
                            {fmtNum(d.activeCustomers)} ({activePercent.toFixed(0)}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{d.ordersPerCustomer.toFixed(1)}x</td>
                        <td className="py-3 px-4 text-right font-medium">{fmtShort(d.avgOrderValue)}</td>
                        <td className="py-3 pr-6 pl-4 text-right font-medium">{fmtShort(d.arOutstanding)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* ════════════════════════════════════════
             2) Best Performer Hero Card
             ════════════════════════════════════════ 
          {bestPerformer && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white shadow-xl shadow-indigo-500/25">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Trophy className="h-48 w-48 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-xl bg-white/20 p-2 backdrop-blur-sm">
                    <Star className="h-6 w-6 text-yellow-300" />
                  </div>
                  <span className="text-sm font-semibold uppercase tracking-wider opacity-90">กิจการที่มีลูกค้าคุณภาพสูงสุด</span>
                </div>
                <h3 className="text-3xl font-bold mb-6">{bestPerformer.branchName}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs opacity-75 mb-1">รายได้ต่อลูกค้า</p>
                    <p className="text-2xl font-bold">{fmtShort(bestPerformer.revenuePerCustomer)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75 mb-1">จำนวนลูกค้า</p>
                    <p className="text-2xl font-bold">{fmtNum(bestPerformer.totalCustomers)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75 mb-1">ออเดอร์ต่อลูกค้า</p>
                    <p className="text-2xl font-bold">{bestPerformer.ordersPerCustomer.toFixed(1)}x</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75 mb-1">ยอดเฉลี่ยต่อบิล</p>
                    <p className="text-2xl font-bold">{fmtShort(bestPerformer.avgOrderValue)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}*/}

          {/* ════════════════════════════════════════
             3) Customer Count Comparison (Bar Chart)
             ════════════════════════════════════════ */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <SectionHeader
              icon={<Users className="h-4 w-4 text-indigo-500" />}
              title="จำนวนลูกค้าเปรียบเทียบ"
              desc="เปรียบเทียบจำนวนลูกค้าทั้งหมดและลูกค้าที่ซื้อบ่อยของแต่ละกิจการ"
            />
            <div className="px-6 pb-5">
              {(() => {
                const option = {
                  tooltip: {
                    trigger: 'axis' as const,
                    axisPointer: { type: 'shadow' as const },
                    backgroundColor: '#fff',
                    borderColor: '#e2e8f0',
                    textStyle: { color: '#1e293b', fontSize: 12 },
                    extraCssText: 'box-shadow: 0 4px 12px rgb(0 0 0 / 0.08); border-radius: 8px;',
                  },
                  legend: { bottom: 0, textStyle: { color: '#64748b', fontSize: 11 }, itemWidth: 12, itemHeight: 8, itemGap: 16 },
                  grid: { top: 16, right: 16, bottom: 40, left: 16, containLabel: true },
                  xAxis: {
                    type: 'category' as const,
                    data: rankedData.map(d => shortName(d.branchName)),
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: { color: '#475569', fontSize: 11, rotate: 15, fontWeight: 500 },
                  },
                  yAxis: {
                    type: 'value' as const,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    splitLine: { lineStyle: { color: '#f1f5f9' } },
                    axisLabel: { color: '#94a3b8', fontSize: 11 },
                  },
                  series: [
                    {
                      name: 'ลูกค้าทั้งหมด',
                      type: 'bar' as const,
                      data: rankedData.map((d, i) => ({
                        value: d.totalCustomers,
                        itemStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex, borderRadius: [4, 4, 0, 0] },
                      })),
                      barMaxWidth: 36,
                    },
                    {
                      name: 'ลูกค้าที่ซื้อบ่อย',
                      type: 'bar' as const,
                      data: rankedData.map(d => d.activeCustomers),
                      itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
                      barMaxWidth: 36,
                    },
                  ],
                };
                return <ReactECharts option={option} style={{ height: 300 }} opts={{ renderer: 'svg' }} />;
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ════════════════════════════════════════
               4) Revenue per Customer (Bar + Line)
               ════════════════════════════════════════ */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader
                icon={<DollarSign className="h-4 w-4 text-amber-500" />}
                title="รายได้ต่อลูกค้า"
                desc="เปรียบเทียบมูลค่าเฉลี่ยต่อลูกค้าของแต่ละกิจการ"
              />
              <div className="px-6 pb-5">
                {(() => {
                  const option = {
                    tooltip: {
                      trigger: 'axis' as const,
                      axisPointer: { type: 'cross' as const },
                      backgroundColor: '#fff',
                      borderColor: '#e2e8f0',
                      textStyle: { color: '#1e293b', fontSize: 12 },
                      extraCssText: 'box-shadow: 0 4px 12px rgb(0 0 0 / 0.08); border-radius: 8px;',
                    },
                    legend: { bottom: 0, textStyle: { color: '#64748b', fontSize: 11 }, itemWidth: 12, itemHeight: 8, itemGap: 16 },
                    grid: { top: 16, right: 50, bottom: 40, left: 50, containLabel: true },
                    xAxis: {
                      type: 'category' as const,
                      data: rankedData.map(d => shortName(d.branchName)),
                      axisLabel: { color: '#475569', fontSize: 10, rotate: 15 },
                    },
                    yAxis: [
                      {
                        type: 'value' as const,
                        name: 'รายได้ต่อลูกค้า',
                        position: 'left' as const,
                        axisLabel: { color: '#94a3b8', fontSize: 11, formatter: (v: number) => fmtShort(v) },
                        splitLine: { lineStyle: { color: '#f1f5f9' } },
                      },
                      {
                        type: 'value' as const,
                        name: 'ออเดอร์/คน',
                        position: 'right' as const,
                        axisLabel: { color: '#94a3b8', fontSize: 11 },
                      },
                    ],
                    series: [
                      {
                        name: 'รายได้ต่อลูกค้า',
                        type: 'bar' as const,
                        data: rankedData.map(d => d.revenuePerCustomer),
                        itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
                        barMaxWidth: 32,
                      },
                      {
                        name: 'ออเดอร์ต่อลูกค้า',
                        type: 'line' as const,
                        yAxisIndex: 1,
                        data: rankedData.map(d => d.ordersPerCustomer),
                        lineStyle: { width: 3 },
                        itemStyle: { color: '#06b6d4' },
                        symbol: 'circle',
                        symbolSize: 8,
                      },
                    ],
                  };
                  return <ReactECharts option={option} style={{ height: 280 }} opts={{ renderer: 'svg' }} />;
                })()}
              </div>
            </div>

            {/* ════════════════════════════════════════
               5) Top 3 Customers per Branch
               ════════════════════════════════════════ */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader
                icon={<Star className="h-4 w-4 text-violet-500" />}
                title="ลูกค้าชั้นนำของแต่ละกิจการ"
                desc="แสดง Top 3 ลูกค้าที่มียอดซื้อสูงสุด"
              />
              <div className="px-6 pb-5 space-y-4">
                {rankedData.slice(0, 3).map((branch, bIdx) => (
                  <div key={branch.branchKey}>
                    <div className="flex items-center gap-2 mb-2">
                      <BranchDot idx={bIdx} />
                      <span className="text-sm font-semibold text-foreground">{shortName(branch.branchName)}</span>
                    </div>
                    <div className="space-y-1.5 ml-4">
                      {branch.topCustomers.slice(0, 3).map((customer, cIdx) => (
                        <div key={customer.customerCode} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-muted-foreground font-medium w-4">{cIdx + 1}.</span>
                            <span className="truncate text-foreground">{customer.customerName}</span>
                          </div>
                          <div className="flex items-center gap-3 ml-2">
                            <span className="font-semibold text-foreground">{fmtShort(customer.totalSpent)}</span>
                            <span className="text-muted-foreground text-[10px]">{customer.orderCount} ออเดอร์</span>
                          </div>
                        </div>
                      ))}
                      {branch.topCustomers.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">ไม่มีข้อมูล</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ════════════════════════════════════════
               6) AR Outstanding Comparison
               ════════════════════════════════════════ */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader
                icon={<CreditCard className="h-4 w-4 text-rose-500" />}
                title="ลูกหนี้ค้างชำระ (AR)"
                desc="เปรียบเทียบยอดลูกหนี้ค้างชำระของแต่ละกิจการ"
              />
              <div className="px-6 pb-5">
                {(() => {
                  const option = {
                    tooltip: {
                      trigger: 'axis' as const,
                      axisPointer: { type: 'shadow' as const },
                      backgroundColor: '#fff',
                      borderColor: '#e2e8f0',
                      textStyle: { color: '#1e293b', fontSize: 12 },
                      extraCssText: 'box-shadow: 0 4px 12px rgb(0 0 0 / 0.08); border-radius: 8px;',
                      formatter: (params: any) => {
                        const p = params[0];
                        return `<div class="font-semibold mb-1">${p.name}</div><div>AR ค้างชำระ: ${fmtShort(p.value)}</div>`;
                      },
                    },
                    grid: { top: 16, right: 16, bottom: 40, left: 16, containLabel: true },
                    xAxis: {
                      type: 'category' as const,
                      data: rankedData.map(d => shortName(d.branchName)),
                      axisLabel: { color: '#475569', fontSize: 10, rotate: 15 },
                    },
                    yAxis: {
                      type: 'value' as const,
                      axisLabel: { color: '#94a3b8', fontSize: 11, formatter: (v: number) => fmtShort(v) },
                      splitLine: { lineStyle: { color: '#f1f5f9' } },
                    },
                    series: [{
                      name: 'AR ค้างชำระ',
                      type: 'bar' as const,
                      data: rankedData.map((d, i) => ({
                        value: d.arOutstanding,
                        itemStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex, borderRadius: [4, 4, 0, 0] },
                      })),
                      barMaxWidth: 36,
                    }],
                  };
                  return <ReactECharts option={option} style={{ height: 280 }} opts={{ renderer: 'svg' }} />;
                })()}
              </div>
            </div>

            {/* ════════════════════════════════════════
               7) Customer Loyalty (Days Since Last Order)
               ════════════════════════════════════════ */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <SectionHeader
                icon={<Activity className="h-4 w-4 text-emerald-500" />}
                title="ความภักดีของลูกค้า"
                desc="วันเฉลี่ยนับจากออเดอร์ล่าสุด (ยิ่งน้อยยิ่งดี)"
              />
              <div className="px-6 pb-5">
                {(() => {
                  const option = {
                    tooltip: {
                      trigger: 'axis' as const,
                      axisPointer: { type: 'shadow' as const },
                      backgroundColor: '#fff',
                      borderColor: '#e2e8f0',
                      textStyle: { color: '#1e293b', fontSize: 12 },
                      extraCssText: 'box-shadow: 0 4px 12px rgb(0 0 0 / 0.08); border-radius: 8px;',
                      formatter: (params: any) => {
                        const p = params[0];
                        return `<div class="font-semibold mb-1">${p.name}</div><div>เฉลี่ย: ${p.value.toFixed(0)} วัน</div>`;
                      },
                    },
                    grid: { top: 16, right: 16, bottom: 40, left: 16, containLabel: true },
                    xAxis: {
                      type: 'category' as const,
                      data: rankedData.map(d => shortName(d.branchName)),
                      axisLabel: { color: '#475569', fontSize: 10, rotate: 15 },
                    },
                    yAxis: {
                      type: 'value' as const,
                      name: 'วัน',
                      axisLabel: { color: '#94a3b8', fontSize: 11 },
                      splitLine: { lineStyle: { color: '#f1f5f9' } },
                    },
                    series: [{
                      name: 'วันนับจากออเดอร์ล่าสุด',
                      type: 'bar' as const,
                      data: rankedData.map(d => ({
                        value: d.avgDaysSinceLastOrder,
                        itemStyle: { 
                          color: d.avgDaysSinceLastOrder <= 30 ? '#10b981' : d.avgDaysSinceLastOrder <= 60 ? '#f59e0b' : '#ef4444',
                          borderRadius: [4, 4, 0, 0] 
                        },
                      })),
                      barMaxWidth: 36,
                    }],
                  };
                  return <ReactECharts option={option} style={{ height: 280 }} opts={{ renderer: 'svg' }} />;
                })()}
              </div>
            </div>
          </div>

          
        </>
      )}
    </div>
  );
}
