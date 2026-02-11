'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useComparison } from '@/lib/ComparisonContext';
import { ComparisonDateFilter } from '@/components/comparison/ComparisonDateFilter';
import {
  ShoppingBag, Package, FileText, TrendingDown, BarChart3, CreditCard,
  Users, Building2, Trophy, Medal, Award, TrendingUp, Layers, Wallet,
  ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, Clock,
} from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import { cn } from '@/lib/utils';
import type { DateRange, PurchaseKPIs, TopSupplier, PurchaseTrendData, PurchaseByCategory, PurchaseByBrand, APOutstanding } from '@/lib/data/types';

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
interface BranchPurchaseData {
  branchKey: string;
  branchName: string;
  kpis: PurchaseKPIs | null;
  trendData: PurchaseTrendData[];
  topSuppliers: TopSupplier[];
  byCategory: PurchaseByCategory[];
  byBrand: PurchaseByBrand[];
  apOutstanding: APOutstanding[];
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

export default function PurchaseComparisonPage() {
  const { selectedBranches, availableBranches, isLoaded } = useComparison();
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BranchPurchaseData[]>([]);

  /* ─── Fetch ALL endpoints per branch ─── */
  const fetchData = useCallback(async () => {
    if (!isLoaded || selectedBranches.length === 0) return;
    setLoading(true);
    try {
      const branchKeys = selectedBranches.filter((k: string) => k !== 'ALL');

      // Fetch branches sequentially to avoid overwhelming the server
      const results: BranchPurchaseData[] = [];
      for (const branchKey of branchKeys) {
        const branchInfo = availableBranches.find((b: { key: string; name: string }) => b.key === branchKey);

        const params = new URLSearchParams({
          start_date: dateRange.start,
          end_date: dateRange.end,
        });
        params.append('branch', branchKey);

        try {
          const [kpisRes, trendRes, suppliersRes, categoryRes, brandRes, apRes] = await Promise.all([
            fetch(`/api/purchase/kpis?${params}`),
            fetch(`/api/purchase/trend?${params}`),
            fetch(`/api/purchase/top-suppliers?${params}`),
            fetch(`/api/purchase/by-category?${params}`),
            fetch(`/api/purchase/by-brand?${params}`),
            fetch(`/api/purchase/ap-outstanding?${params}`),
          ]);

          const [kpisJ, trendJ, suppliersJ, categoryJ, brandJ, apJ] = await Promise.all([
            kpisRes.ok ? kpisRes.json() : { data: null },
            trendRes.ok ? trendRes.json() : { data: [] },
            suppliersRes.ok ? suppliersRes.json() : { data: [] },
            categoryRes.ok ? categoryRes.json() : { data: [] },
            brandRes.ok ? brandRes.json() : { data: [] },
            apRes.ok ? apRes.json() : { data: [] },
          ]);

          results.push({
            branchKey,
            branchName: branchInfo?.name || `กิจการ ${branchKey}`,
            kpis: kpisJ.data,
            trendData: trendJ.data || [],
            topSuppliers: suppliersJ.data || [],
            byCategory: categoryJ.data || [],
            byBrand: brandJ.data || [],
            apOutstanding: apJ.data || [],
          });
        } catch (branchErr) {
          console.warn(`Failed to fetch data for branch ${branchKey}:`, branchErr);
          results.push({
            branchKey,
            branchName: branchInfo?.name || `กิจการ ${branchKey}`,
            kpis: null,
            trendData: [],
            topSuppliers: [],
            byCategory: [],
            byBrand: [],
            apOutstanding: [],
          });
        }
      }
      setData(results);
    } catch (err) {
      console.error('Error fetching purchase comparison:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranches, availableBranches, dateRange, isLoaded]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Formatters ─── */
  const formatCurrency = (value: number) =>
    `฿${value.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;

  const formatShort = (value: number) => {
    if (Math.abs(value) >= 1000000) return `฿${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `฿${(value / 1000).toFixed(0)}K`;
    return `฿${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => value.toLocaleString('th-TH');

  /* ═══════════════════════════════════════════════
     Section 1: KPI Summary Cards
     ═══════════════════════════════════════════════ */
  const kpiCards = useMemo(() => {
    if (data.length === 0) return null;

    const metrics = [
      {
        key: 'totalPurchases',
        label: 'ยอดซื้อรวม',
        icon: <ShoppingBag className="h-5 w-5" />,
        getValue: (d: BranchPurchaseData) => d.kpis?.totalPurchases?.value || 0,
        getGrowth: (d: BranchPurchaseData) => d.kpis?.totalPurchases?.growthPercentage,
        format: formatShort,
        gradient: 'from-indigo-500 to-indigo-600',
      },
      {
        key: 'totalItems',
        label: 'จำนวนสินค้าที่ซื้อ',
        icon: <Package className="h-5 w-5" />,
        getValue: (d: BranchPurchaseData) => d.kpis?.totalItemsPurchased?.value || 0,
        getGrowth: (d: BranchPurchaseData) => d.kpis?.totalItemsPurchased?.growthPercentage,
        format: formatNumber,
        gradient: 'from-emerald-500 to-emerald-600',
      },
      {
        key: 'totalOrders',
        label: 'จำนวนออเดอร์',
        icon: <FileText className="h-5 w-5" />,
        getValue: (d: BranchPurchaseData) => d.kpis?.totalOrders?.value || 0,
        getGrowth: (d: BranchPurchaseData) => d.kpis?.totalOrders?.growthPercentage,
        format: formatNumber,
        gradient: 'from-amber-500 to-amber-600',
      },
      {
        key: 'avgOrderValue',
        label: 'ค่าเฉลี่ยต่อออเดอร์',
        icon: <TrendingDown className="h-5 w-5" />,
        getValue: (d: BranchPurchaseData) => d.kpis?.avgOrderValue?.value || 0,
        getGrowth: (d: BranchPurchaseData) => d.kpis?.avgOrderValue?.growthPercentage,
        format: formatCurrency,
        gradient: 'from-violet-500 to-violet-600',
      },
    ];

    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const total = m.key === 'avgOrderValue'
            ? data.reduce((s, d) => s + m.getValue(d), 0) / data.length
            : data.reduce((s, d) => s + m.getValue(d), 0);
          const sorted = [...data].sort((a, b) => m.getValue(b) - m.getValue(a));
          return (
            <div key={m.key} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <div className={cn('h-1.5 w-full bg-gradient-to-r', m.gradient)} />
              <div className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  {m.icon}
                  <span className="text-sm font-medium">{m.label}</span>
                </div>
                <div className="text-2xl font-bold mb-3">{m.format(total)}</div>
                <div className="space-y-1.5">
                  {sorted.map((d, idx) => (
                    <div key={d.branchKey} className="flex items-center gap-2 text-sm">
                      <BranchDot idx={data.indexOf(d)} />
                      <span className="truncate flex-1 text-muted-foreground">{d.branchName}</span>
                      <span className="font-semibold">{m.format(m.getValue(d))}</span>
                      <GrowthBadge value={m.getGrowth(d)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 2: Ranking Table  
     ═══════════════════════════════════════════════ */
  const rankingTable = useMemo(() => {
    if (data.length === 0) return null;

    // Sort by total purchases
    const sorted = [...data].sort((a, b) => 
      (b.kpis?.totalPurchases?.value || 0) - (a.kpis?.totalPurchases?.value || 0)
    );

    const medals = [
      <Trophy key="1" className="h-5 w-5 text-amber-500" />,
      <Medal key="2" className="h-5 w-5 text-slate-400" />,
      <Award key="3" className="h-5 w-5 text-amber-700" />,
    ];

    // Calculate total AP per branch
    const getTotalAP = (d: BranchPurchaseData) => 
      d.apOutstanding.reduce((sum, ap) => sum + (ap.totalOutstanding || 0), 0);

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
          title="อันดับการจัดซื้อกิจการ"
          desc="เปรียบเทียบยอดซื้อ จำนวนออเดอร์ ซัพพลายเออร์ และยอดเจ้าหนี้"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">กิจการ</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">ยอดซื้อ</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">ออเดอร์</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">เฉลี่ย/ออเดอร์</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">ซัพพลายเออร์</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">ยอด AP ค้างชำระ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((d, idx) => {
                const originalIdx = data.indexOf(d);
                const totalAP = getTotalAP(d);
                return (
                  <tr key={d.branchKey} className={cn(idx === 0 && 'bg-amber-50/30')}>
                    <td className="px-4 py-3">
                      {idx < 3 ? medals[idx] : <span className="text-muted-foreground">{idx + 1}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BranchDot idx={originalIdx} />
                        <span className="font-medium">{d.branchName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatShort(d.kpis?.totalPurchases?.value || 0)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(d.kpis?.totalOrders?.value || 0)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(d.kpis?.avgOrderValue?.value || 0)}</td>
                    <td className="px-4 py-3 text-right">{d.topSuppliers.length}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        totalAP > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      )}>
                        {formatShort(totalAP)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 3: Purchase Value Comparison (Grouped Bar Chart)
     ═══════════════════════════════════════════════ */
  const purchaseValueChart = useMemo(() => {
    if (data.length === 0) return null;

    const categories = ['ยอดซื้อ (ล้านบาท)', 'จำนวนออเดอร์', 'เฉลี่ย/ออเดอร์ (พัน)'];
    const series = data.map((d, idx) => ({
      name: d.branchName,
      type: 'bar' as const,
      data: [
        (d.kpis?.totalPurchases?.value || 0) / 1000000,
        d.kpis?.totalOrders?.value || 0,
        (d.kpis?.avgOrderValue?.value || 0) / 1000,
      ],
      itemStyle: { color: BRANCH_PALETTE[idx % BRANCH_PALETTE.length].hex, borderRadius: [4, 4, 0, 0] },
      barMaxWidth: 40,
    }));

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        textStyle: { color: '#374151', fontSize: 12 },
      },
      legend: { show: false },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      series,
    };

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<ShoppingBag className="h-4 w-4 text-primary" />}
          title="เปรียบเทียบภาพรวมการจัดซื้อ"
          desc="ยอดซื้อ จำนวนออเดอร์ และค่าเฉลี่ยต่อออเดอร์"
        />
        <div className="px-6 pb-6">
          <ReactECharts option={option} style={{ height: 320 }} />
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 4: Purchase Trend Chart (Multi-Line)
     ═══════════════════════════════════════════════ */
  const trendChart = useMemo(() => {
    if (data.length === 0) return null;

    // Merge all months from all branches
    const allMonths = new Set<string>();
    data.forEach((d) => d.trendData.forEach((t) => allMonths.add(t.month)));
    const months = Array.from(allMonths).sort();

    if (months.length === 0) return null;

    const series = data.map((d, idx) => ({
      name: d.branchName,
      type: 'line' as const,
      data: months.map((m) => d.trendData.find((t) => t.month === m)?.totalPurchases || 0),
      itemStyle: { color: BRANCH_PALETTE[idx % BRANCH_PALETTE.length].hex },
      lineStyle: { width: 3 },
      symbol: 'circle',
      symbolSize: 8,
      smooth: true,
    }));

    const option = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        textStyle: { color: '#374151', fontSize: 12 },
        formatter: (params: Array<{ seriesName: string; value: number; color: string; axisValue?: string }>) => {
          let html = `<div style="font-weight:600;margin-bottom:8px">${params[0]?.axisValue || ''}</div>`;
          params.forEach((p) => {
            html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <div style="width:10px;height:10px;border-radius:50%;background:${p.color}"></div>
              <span>${p.seriesName}: <b>฿${p.value.toLocaleString()}</b></span>
            </div>`;
          });
          return html;
        },
      },
      legend: { show: false },
      grid: { left: 60, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { 
          color: '#6b7280', 
          fontSize: 11,
          formatter: (v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v,
        },
      },
      series,
    };

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          title="แนวโน้มการจัดซื้อ"
          desc="เปรียบเทียบยอดซื้อรายเดือนระหว่างกิจการ"
        />
        <div className="px-6 pb-6">
          <ReactECharts option={option} style={{ height: 320 }} />
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 5: Purchase by Category (Donut Charts)
     ═══════════════════════════════════════════════ */
  const categoryChart = useMemo(() => {
    if (data.length === 0) return null;

    const categoryColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16'];

    const charts = data.map((d, idx) => {
      const top5 = d.byCategory.slice(0, 5);
      const total = top5.reduce((sum, c) => sum + c.totalPurchaseValue, 0);

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: ฿{c} ({d}%)',
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: '#e5e7eb',
          textStyle: { color: '#374151', fontSize: 12 },
        },
        legend: { show: false },
        series: [{
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          data: top5.map((c, i) => ({
            value: c.totalPurchaseValue,
            name: c.categoryName,
            itemStyle: { color: categoryColors[i % categoryColors.length] },
          })),
        }],
        graphic: [{
          type: 'text',
          left: 'center',
          top: 'center',
          style: {
            text: formatShort(total),
            fontSize: 14,
            fontWeight: 'bold',
            fill: '#374151',
          },
        }],
      };

      return (
        <div key={d.branchKey} className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BranchDot idx={idx} />
            <span className="font-semibold text-sm">{d.branchName}</span>
          </div>
          <ReactECharts option={option} style={{ height: 180 }} />
        </div>
      );
    });

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<Layers className="h-4 w-4 text-violet-600" />}
          title="การซื้อตามหมวดสินค้า"
          desc="สัดส่วนการซื้อแยกตามหมวดหมู่ Top 5"
        />
        <div className="px-6 pb-6">
          <div className={cn('grid gap-6', data.length === 1 ? 'grid-cols-1' : data.length === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3')}>
            {charts}
          </div>
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 6: Top Suppliers Comparison (Horizontal Bar)
     ═══════════════════════════════════════════════ */
  const suppliersChart = useMemo(() => {
    if (data.length === 0) return null;

    // Get unique top suppliers across all branches
    const allSuppliers = new Map<string, { name: string; values: number[] }>();
    data.forEach((d, idx) => {
      d.topSuppliers.slice(0, 5).forEach((s) => {
        if (!allSuppliers.has(s.supplierCode)) {
          allSuppliers.set(s.supplierCode, { name: s.supplierName, values: Array(data.length).fill(0) });
        }
        allSuppliers.get(s.supplierCode)!.values[idx] = s.totalPurchases;
      });
    });

    const supplierList = Array.from(allSuppliers.entries())
      .map(([code, info]) => ({ code, ...info, total: info.values.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    if (supplierList.length === 0) return null;

    const series = data.map((d, idx) => ({
      name: d.branchName,
      type: 'bar' as const,
      stack: 'total',
      data: supplierList.map((s) => s.values[idx]),
      itemStyle: { color: BRANCH_PALETTE[idx % BRANCH_PALETTE.length].hex },
      barMaxWidth: 25,
    }));

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        textStyle: { color: '#374151', fontSize: 12 },
        formatter: (params: Array<{ seriesName: string; value: number; color: string; axisValue?: string }>) => {
          const supplierName = params[0]?.axisValue || '';
          let html = `<div style="font-weight:600;margin-bottom:8px">${supplierName}</div>`;
          let total = 0;
          params.forEach((p) => {
            if (p.value > 0) {
              total += p.value;
              html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <div style="width:10px;height:10px;border-radius:50%;background:${p.color}"></div>
                <span>${p.seriesName}: <b>฿${p.value.toLocaleString()}</b></span>
              </div>`;
            }
          });
          html += `<div style="border-top:1px solid #e5e7eb;margin-top:6px;padding-top:6px;font-weight:600">รวม: ฿${total.toLocaleString()}</div>`;
          return html;
        },
      },
      legend: { show: false },
      grid: { left: 140, right: 20, top: 20, bottom: 20 },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { 
          color: '#6b7280', 
          fontSize: 11,
          formatter: (v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v,
        },
      },
      yAxis: {
        type: 'category',
        data: supplierList.map((s) => s.name),
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280', fontSize: 11, width: 120, overflow: 'truncate' },
        inverse: true,
      },
      series,
    };

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<Users className="h-4 w-4 text-cyan-600" />}
          title="Top 10 ซัพพลายเออร์ รวมทุกกิจการ"
          desc="เปรียบเทียบยอดซื้อจากซัพพลายเออร์หลักระหว่างกิจการ"
        />
        <div className="px-6 pb-6">
          <ReactECharts option={option} style={{ height: Math.max(300, supplierList.length * 35) }} />
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 7: AP Outstanding Comparison (Stacked Bar)
     ═══════════════════════════════════════════════ */
  const apChart = useMemo(() => {
    if (data.length === 0) return null;

    const branchNames = data.map((d) => d.branchName);
    
    // Calculate totals for each branch
    const totalOutstanding = data.map((d) => 
      d.apOutstanding.reduce((sum, ap) => sum + (ap.totalOutstanding || 0), 0)
    );
    const totalOverdue = data.map((d) => 
      d.apOutstanding.reduce((sum, ap) => sum + (ap.overdueAmount || 0), 0)
    );

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        textStyle: { color: '#374151', fontSize: 12 },
      },
      legend: {
        data: ['ยอดค้างชำระ', 'เกินกำหนด'],
        bottom: 0,
        textStyle: { fontSize: 11 },
      },
      grid: { left: 60, right: 20, top: 20, bottom: 50 },
      xAxis: {
        type: 'category',
        data: branchNames,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { 
          color: '#6b7280', 
          fontSize: 11,
          formatter: (v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v,
        },
      },
      series: [
        {
          name: 'ยอดค้างชำระ',
          type: 'bar',
          stack: 'ap',
          data: totalOutstanding.map((v, i) => ({
            value: v,
            itemStyle: { color: BRANCH_PALETTE[i % BRANCH_PALETTE.length].hex, borderRadius: [0, 0, 0, 0] },
          })),
          barMaxWidth: 50,
        },
        {
          name: 'เกินกำหนด',
          type: 'bar',
          stack: 'ap',
          data: totalOverdue.map((v) => ({
            value: v,
            itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] },
          })),
          barMaxWidth: 50,
        },
      ],
    };

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<Wallet className="h-4 w-4 text-rose-600" />}
          title="สถานะเจ้าหนี้การค้า (AP)"
          desc="เปรียบเทียบยอดเจ้าหนี้ค้างชำระและเกินกำหนดระหว่างกิจการ"
        />
        <div className="px-6 pb-6">
          <ReactECharts option={option} style={{ height: 300 }} />
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 8: Radar Chart
     ═══════════════════════════════════════════════ */
  const radarChart = useMemo(() => {
    if (data.length === 0) return null;

    // Normalize values to 0-100 scale
    const maxPurchases = Math.max(...data.map((d) => d.kpis?.totalPurchases?.value || 0));
    const maxOrders = Math.max(...data.map((d) => d.kpis?.totalOrders?.value || 0));
    const maxItems = Math.max(...data.map((d) => d.kpis?.totalItemsPurchased?.value || 0));
    const maxAvgOrder = Math.max(...data.map((d) => d.kpis?.avgOrderValue?.value || 0));
    const maxSuppliers = Math.max(...data.map((d) => d.topSuppliers.length));
    const maxAP = Math.max(...data.map((d) => d.apOutstanding.reduce((sum, ap) => sum + (ap.totalOutstanding || 0), 0)));

    const indicator = [
      { name: 'ยอดซื้อ', max: 100 },
      { name: 'จำนวนออเดอร์', max: 100 },
      { name: 'สินค้าที่ซื้อ', max: 100 },
      { name: 'เฉลี่ย/ออเดอร์', max: 100 },
      { name: 'ซัพพลายเออร์', max: 100 },
      { name: 'ยอด AP', max: 100 },
    ];

    const seriesData = data.map((d, idx) => ({
      name: d.branchName,
      value: [
        maxPurchases > 0 ? ((d.kpis?.totalPurchases?.value || 0) / maxPurchases) * 100 : 0,
        maxOrders > 0 ? ((d.kpis?.totalOrders?.value || 0) / maxOrders) * 100 : 0,
        maxItems > 0 ? ((d.kpis?.totalItemsPurchased?.value || 0) / maxItems) * 100 : 0,
        maxAvgOrder > 0 ? ((d.kpis?.avgOrderValue?.value || 0) / maxAvgOrder) * 100 : 0,
        maxSuppliers > 0 ? (d.topSuppliers.length / maxSuppliers) * 100 : 0,
        maxAP > 0 ? (d.apOutstanding.reduce((sum, ap) => sum + (ap.totalOutstanding || 0), 0) / maxAP) * 100 : 0,
      ],
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.15 },
      itemStyle: { color: BRANCH_PALETTE[idx % BRANCH_PALETTE.length].hex },
    }));

    const option = {
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        textStyle: { color: '#374151', fontSize: 12 },
      },
      radar: {
        indicator,
        shape: 'polygon',
        splitNumber: 4,
        axisName: { color: '#6b7280', fontSize: 11 },
        splitLine: { lineStyle: { color: '#e5e7eb' } },
        splitArea: { show: true, areaStyle: { color: ['#fafafa', '#ffffff'] } },
      },
      series: [{
        type: 'radar',
        data: seriesData,
      }],
    };

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<Layers className="h-4 w-4 text-violet-600" />}
          title="ภาพรวมการจัดซื้อ (Radar)"
          desc="เปรียบเทียบมิติต่างๆ ของการจัดซื้อระหว่างกิจการ"
        />
        <div className="px-6 pb-6">
          <ReactECharts option={option} style={{ height: 350 }} />
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 9: Top Suppliers per Branch
     ═══════════════════════════════════════════════ */
  const suppliersSection = useMemo(() => {
    if (data.length === 0) return null;

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<Users className="h-4 w-4 text-indigo-600" />}
          title="ซัพพลายเออร์ยอดนิยม แต่ละกิจการ"
          desc="Top 5 ซัพพลายเออร์ที่มียอดซื้อสูงสุด"
        />
        <div className="px-6 pb-6">
          <div className={cn('grid gap-6', data.length === 1 ? 'grid-cols-1' : data.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
            {data.map((branch, idx) => (
              <div key={branch.branchKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BranchDot idx={idx} />
                    <h4 className="font-semibold text-sm">{branch.branchName}</h4>
                  </div>
                  <span className="text-xs text-indigo-600 font-medium">{branch.topSuppliers.length} ซัพพลายเออร์</span>
                </div>
                <div className="space-y-2">
                  {branch.topSuppliers.slice(0, 5).map((supplier, sIdx) => (
                    <div key={sIdx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground truncate max-w-[55%]">
                        {sIdx + 1}. {supplier.supplierName}
                      </span>
                      <div className="text-right">
                        <span className="font-semibold">{formatShort(supplier.totalPurchases)}</span>
                        <span className="text-xs text-muted-foreground ml-1">({supplier.poCount} PO)</span>
                      </div>
                    </div>
                  ))}
                  {branch.topSuppliers.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">ไม่พบข้อมูล</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 10: AP Outstanding per Branch
     ═══════════════════════════════════════════════ */
  const apSection = useMemo(() => {
    if (data.length === 0) return null;

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<CreditCard className="h-4 w-4 text-rose-600" />}
          title="รายละเอียดเจ้าหนี้ แต่ละกิจการ"
          desc="Top 5 ซัพพลายเออร์ที่มียอดค้างชำระสูงสุด"
        />
        <div className="px-6 pb-6">
          <div className={cn('grid gap-6', data.length === 1 ? 'grid-cols-1' : data.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
            {data.map((branch, idx) => {
              const sortedAP = [...branch.apOutstanding]
                .sort((a, b) => (b.totalOutstanding || 0) - (a.totalOutstanding || 0))
                .slice(0, 5);

              return (
                <div key={branch.branchKey} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BranchDot idx={idx} />
                      <h4 className="font-semibold text-sm">{branch.branchName}</h4>
                    </div>
                    <span className="text-xs text-rose-600 font-medium">
                      {formatShort(branch.apOutstanding.reduce((sum, ap) => sum + (ap.totalOutstanding || 0), 0))}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sortedAP.map((ap, aIdx) => (
                      <div key={aIdx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground truncate max-w-[55%]">
                          {aIdx + 1}. {ap.supplierName}
                        </span>
                        <div className="text-right text-xs">
                          <span className="font-semibold">{formatShort(ap.totalOutstanding || 0)}</span>
                          {(ap.overdueAmount || 0) > 0 && (
                            <span className="text-rose-600 ml-1">(เกิน {formatShort(ap.overdueAmount || 0)})</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {branch.apOutstanding.length === 0 && (
                      <p className="text-sm text-emerald-600 py-2">ไม่มียอดเจ้าหนี้ค้างชำระ</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 11: Purchase by Brand per Branch
     ═══════════════════════════════════════════════ */
  const brandSection = useMemo(() => {
    if (data.length === 0) return null;

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<Package className="h-4 w-4 text-amber-600" />}
          title="Top 5 แบรนด์ที่ซื้อ แต่ละกิจการ"
          desc="แบรนด์สินค้าที่มียอดซื้อสูงสุด"
        />
        <div className="px-6 pb-6">
          <div className={cn('grid gap-6', data.length === 1 ? 'grid-cols-1' : data.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
            {data.map((branch, idx) => (
              <div key={branch.branchKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BranchDot idx={idx} />
                    <h4 className="font-semibold text-sm">{branch.branchName}</h4>
                  </div>
                  <span className="text-xs text-amber-600 font-medium">{branch.byBrand.length} แบรนด์</span>
                </div>
                <div className="space-y-2">
                  {branch.byBrand.slice(0, 5).map((brand, bIdx) => (
                    <div key={bIdx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground truncate max-w-[55%]">
                        {bIdx + 1}. {brand.brandName || 'ไม่ระบุ'}
                      </span>
                      <span className="font-semibold">{formatShort(brand.totalPurchaseValue)}</span>
                    </div>
                  ))}
                  {branch.byBrand.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">ไม่พบข้อมูล</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 12: Branch Legend
     ═══════════════════════════════════════════════ */
  const branchLegend = useMemo(() => {
    if (data.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center justify-center gap-4 py-4 px-6 rounded-2xl bg-muted/30">
        {data.map((d, idx) => (
          <LegendDot key={d.branchKey} color={BRANCH_PALETTE[idx % BRANCH_PALETTE.length].hex} label={d.branchName} />
        ))}
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════ */
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-wider font-semibold mb-1">
              <ShoppingBag className="h-4 w-4" />
              <span>เปรียบเทียบกิจการ</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">เปรียบเทียบการจัดซื้อ</h1>
            <p className="text-muted-foreground mt-1">เปรียบเทียบยอดซื้อ ซัพพลายเออร์ และยอดเจ้าหนี้ระหว่างกิจการ</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ComparisonDateFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted/20 animate-pulse" />
            ))}
          </div>
          <div className="h-80 rounded-2xl bg-muted/20 animate-pulse" />
          <div className="h-80 rounded-2xl bg-muted/20 animate-pulse" />
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground rounded-2xl border bg-card">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">กรุณาเลือกกิจการเพื่อเปรียบเทียบ</p>
        </div>
      ) : (
        <>
          {/* Section 1: KPI Cards */}
          {kpiCards}

          {/* Section 2: Ranking Table */}
          {rankingTable}

          {/* Section 3-4: Purchase Value + Trend Charts (side by side on large screens) */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {purchaseValueChart}
            {trendChart}
          </div>

          {/* Section 5-6: Category + Suppliers Charts */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {categoryChart}
            {suppliersChart}
          </div>

          {/* Section 7-8: AP Chart + Radar */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {apChart}
            {radarChart}
          </div>

          {/* Section 9-10: Suppliers + AP Lists */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {suppliersSection}
            {apSection}
          </div>

          {/* Section 11: Brand Section */}
          {brandSection}

          {/* Section 12: Branch Legend */}
          {branchLegend}
        </>
      )}
    </div>
  );
}
