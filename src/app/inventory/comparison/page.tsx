'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useComparison } from '@/lib/ComparisonContext';
import { ComparisonDateFilter } from '@/components/comparison/ComparisonDateFilter';
import {
  Package, AlertTriangle, AlertCircle, BarChart3, Activity, Layers,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus,
  RefreshCw, Archive, Box, Warehouse, RotateCcw, Clock, Boxes,
  Building2, Trophy, Medal, Award,
} from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import { cn } from '@/lib/utils';
import type { DateRange, InventoryKPIs, LowStockItem, OverstockItem, SlowMovingItem, StockMovement, InventoryTurnover } from '@/lib/data/types';

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
interface BranchInventoryData {
  branchKey: string;
  branchName: string;
  kpis: InventoryKPIs | null;
  stockMovement: StockMovement[];
  lowStock: LowStockItem[];
  overstock: OverstockItem[];
  slowMoving: SlowMovingItem[];
  turnover: InventoryTurnover[];
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

export default function InventoryComparisonPage() {
  const { selectedBranches, availableBranches, isLoaded } = useComparison();
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BranchInventoryData[]>([]);

  const asOfDate = new Date().toISOString().split('T')[0];

  /* ─── Fetch ALL endpoints per branch ─── */
  const fetchData = useCallback(async () => {
    if (!isLoaded || selectedBranches.length === 0) return;
    setLoading(true);
    try {
      const branchKeys = selectedBranches.filter((k: string) => k !== 'ALL');

      // Fetch branches sequentially to avoid overwhelming the server
      const results: BranchInventoryData[] = [];
      for (const branchKey of branchKeys) {
        const branchInfo = availableBranches.find((b: { key: string; name: string }) => b.key === branchKey);

        const kpisParams = new URLSearchParams({ as_of_date: asOfDate });
        kpisParams.append('branch', branchKey);

        const movementParams = new URLSearchParams({
          start_date: dateRange.start,
          end_date: dateRange.end,
          as_of_date: asOfDate,
        });
        movementParams.append('branch', branchKey);

        try {
          const [kpisRes, movementRes, lowStockRes, overstockRes, slowMovingRes, turnoverRes] = await Promise.all([
            fetch(`/api/inventory/kpis?${kpisParams}`),
            fetch(`/api/inventory/stock-movement?${movementParams}`),
            fetch(`/api/inventory/low-stock?${kpisParams}`),
            fetch(`/api/inventory/overstock?${kpisParams}`),
            fetch(`/api/inventory/slow-moving?${movementParams}`),
            fetch(`/api/inventory/turnover?${movementParams}`),
          ]);

          const [kpisJ, movementJ, lowStockJ, overstockJ, slowMovingJ, turnoverJ] = await Promise.all([
            kpisRes.ok ? kpisRes.json() : { data: null },
            movementRes.ok ? movementRes.json() : { data: [] },
            lowStockRes.ok ? lowStockRes.json() : { data: [] },
            overstockRes.ok ? overstockRes.json() : { data: [] },
            slowMovingRes.ok ? slowMovingRes.json() : { data: [] },
            turnoverRes.ok ? turnoverRes.json() : { data: [] },
          ]);

          results.push({
            branchKey,
            branchName: branchInfo?.name || `กิจการ ${branchKey}`,
            kpis: kpisJ.data,
            stockMovement: movementJ.data || [],
            lowStock: lowStockJ.data || [],
            overstock: overstockJ.data || [],
            slowMoving: slowMovingJ.data || [],
            turnover: turnoverJ.data || [],
          });
        } catch (branchErr) {
          console.warn(`Failed to fetch data for branch ${branchKey}:`, branchErr);
          results.push({
            branchKey,
            branchName: branchInfo?.name || `กิจการ ${branchKey}`,
            kpis: null,
            stockMovement: [],
            lowStock: [],
            overstock: [],
            slowMoving: [],
            turnover: [],
          });
        }
      }
      setData(results);
    } catch (err) {
      console.error('Error fetching inventory comparison:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranches, availableBranches, dateRange, isLoaded, asOfDate]);

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

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  /* ═══════════════════════════════════════════════
     Section 1: KPI Summary Cards
     ═══════════════════════════════════════════════ */
  const kpiCards = useMemo(() => {
    if (data.length === 0) return null;

    const metrics = [
      {
        key: 'stockValue',
        label: 'มูลค่าสินค้าคงคลัง',
        icon: <Package className="h-5 w-5" />,
        getValue: (d: BranchInventoryData) => d.kpis?.totalInventoryValue?.value || 0,
        getGrowth: (d: BranchInventoryData) => d.kpis?.totalInventoryValue?.growth,
        format: formatShort,
        gradient: 'from-indigo-500 to-indigo-600',
      },
      {
        key: 'totalItems',
        label: 'จำนวนรายการสินค้า',
        icon: <Boxes className="h-5 w-5" />,
        getValue: (d: BranchInventoryData) => d.kpis?.totalItemsInStock?.value || 0,
        getGrowth: (d: BranchInventoryData) => d.kpis?.totalItemsInStock?.growth,
        format: formatNumber,
        gradient: 'from-emerald-500 to-emerald-600',
      },
      {
        key: 'lowStock',
        label: 'สินค้าใกล้หมด',
        icon: <AlertTriangle className="h-5 w-5" />,
        getValue: (d: BranchInventoryData) => d.kpis?.lowStockAlerts?.value || 0,
        getGrowth: (d: BranchInventoryData) => d.kpis?.lowStockAlerts?.growth,
        format: formatNumber,
        gradient: 'from-amber-500 to-amber-600',
        isNegative: true,
      },
      {
        key: 'overstock',
        label: 'สินค้าเกินคลัง',
        icon: <AlertCircle className="h-5 w-5" />,
        getValue: (d: BranchInventoryData) => d.kpis?.overstockAlerts?.value || 0,
        getGrowth: (d: BranchInventoryData) => d.kpis?.overstockAlerts?.growth,
        format: formatNumber,
        gradient: 'from-rose-500 to-rose-600',
        isNegative: true,
      },
    ];

    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const total = data.reduce((s, d) => s + m.getValue(d), 0);
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

    // Sort by stock value
    const sorted = [...data].sort((a, b) => 
      (b.kpis?.totalInventoryValue?.value || 0) - (a.kpis?.totalInventoryValue?.value || 0)
    );

    const medals = [
      <Trophy key="1" className="h-5 w-5 text-amber-500" />,
      <Medal key="2" className="h-5 w-5 text-slate-400" />,
      <Award key="3" className="h-5 w-5 text-amber-700" />,
    ];

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
          title="อันดับสถานะคลังสินค้า"
          desc="เปรียบเทียบมูลค่าสต็อกและสถานะคลังสินค้าระหว่างกิจการ"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">กิจการ</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">มูลค่าสต็อก</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">จำนวนรายการ</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">ใกล้หมด</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">เกินคลัง</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">หมุนเวียนช้า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((d, idx) => {
                const originalIdx = data.indexOf(d);
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
                    <td className="px-4 py-3 text-right font-semibold">{formatShort(d.kpis?.totalInventoryValue?.value || 0)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(d.kpis?.totalItemsInStock?.value || 0)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        (d.kpis?.lowStockAlerts?.value || 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      )}>
                        {formatNumber(d.kpis?.lowStockAlerts?.value || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        (d.kpis?.overstockAlerts?.value || 0) > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      )}>
                        {formatNumber(d.kpis?.overstockAlerts?.value || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-muted-foreground">{d.slowMoving.length}</span>
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
     Section 3: Stock Value Comparison (Grouped Bar Chart)
     ═══════════════════════════════════════════════ */
  const stockValueChart = useMemo(() => {
    if (data.length === 0) return null;

    const categories = ['มูลค่าสต็อก (ล้านบาท)', 'จำนวนรายการ (พัน)', 'ใกล้หมด', 'เกินคลัง'];
    const series = data.map((d, idx) => ({
      name: d.branchName,
      type: 'bar' as const,
      data: [
        (d.kpis?.totalInventoryValue?.value || 0) / 1000000,
        (d.kpis?.totalItemsInStock?.value || 0) / 1000,
        d.kpis?.lowStockAlerts?.value || 0,
        d.kpis?.overstockAlerts?.value || 0,
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
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
          title="เปรียบเทียบสถานะสินค้าคงคลัง"
          desc="มูลค่าสต็อก จำนวนรายการ และสถานะแจ้งเตือน"
        />
        <div className="px-6 pb-6">
          <ReactECharts option={option} style={{ height: 320 }} />
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 4: Stock Movement Chart (Bar+Line Combo)
     ═══════════════════════════════════════════════ */
  const stockMovementChart = useMemo(() => {
    if (data.length === 0) return null;

    // Merge all dates from all branches
    const allDates = new Set<string>();
    data.forEach((d) => d.stockMovement.forEach((m) => allDates.add(m.date)));
    const dates = Array.from(allDates).sort();

    if (dates.length === 0) return null;

    const series: Array<{
      name: string;
      type: 'bar' | 'line';
      stack?: string;
      yAxisIndex?: number;
      data: number[];
      itemStyle?: { color: string; borderRadius?: number[] };
      lineStyle?: { width: number };
      symbol?: string;
      symbolSize?: number;
      smooth?: boolean;
    }> = [];

    data.forEach((d, idx) => {
      const inData = dates.map((date) => d.stockMovement.find((m) => m.date === date)?.qtyIn || 0);
      const outData = dates.map((date) => d.stockMovement.find((m) => m.date === date)?.qtyOut || 0);

      series.push({
        name: `${d.branchName} (รับเข้า)`,
        type: 'bar',
        stack: d.branchKey,
        data: inData,
        itemStyle: { color: BRANCH_PALETTE[idx % BRANCH_PALETTE.length].hex, borderRadius: [2, 2, 0, 0] },
      });
      series.push({
        name: `${d.branchName} (จ่ายออก)`,
        type: 'line',
        yAxisIndex: 1,
        data: outData,
        itemStyle: { color: BRANCH_PALETTE[idx % BRANCH_PALETTE.length].hex },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 6,
        smooth: true,
      });
    });

    const option = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        textStyle: { color: '#374151', fontSize: 12 },
      },
      legend: { show: false },
      grid: { left: 60, right: 60, top: 20, bottom: 50 },
      xAxis: {
        type: 'category',
        data: dates.map((d) => d.slice(5)),
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280', fontSize: 10, rotate: 45 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'รับเข้า',
          axisLine: { show: false },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
          axisLabel: { color: '#6b7280', fontSize: 11 },
        },
        {
          type: 'value',
          name: 'จ่ายออก',
          axisLine: { show: false },
          splitLine: { show: false },
          axisLabel: { color: '#6b7280', fontSize: 11 },
        },
      ],
      series,
    };

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<RefreshCw className="h-4 w-4 text-emerald-600" />}
          title="การเคลื่อนไหวสินค้าคงคลัง"
          desc="เปรียบเทียบปริมาณรับเข้า-จ่ายออก แต่ละวัน"
        />
        <div className="px-6 pb-6">
          <ReactECharts option={option} style={{ height: 320 }} />
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 5: Inventory Health (Donut Charts)
     ═══════════════════════════════════════════════ */
  const inventoryHealthChart = useMemo(() => {
    if (data.length === 0) return null;

    const charts = data.map((d, idx) => {
      const healthy = Math.max(0, (d.kpis?.totalItemsInStock?.value || 0) - (d.kpis?.lowStockAlerts?.value || 0) - (d.kpis?.overstockAlerts?.value || 0));
      const lowStock = d.kpis?.lowStockAlerts?.value || 0;
      const overstock = d.kpis?.overstockAlerts?.value || 0;
      const total = healthy + lowStock + overstock;

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: '#e5e7eb',
          textStyle: { color: '#374151', fontSize: 12 },
        },
        legend: { show: false },
        series: [{
          type: 'pie',
          radius: ['50%', '75%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          data: [
            { value: healthy, name: 'ปกติ', itemStyle: { color: '#10b981' } },
            { value: lowStock, name: 'ใกล้หมด', itemStyle: { color: '#f59e0b' } },
            { value: overstock, name: 'เกินคลัง', itemStyle: { color: '#ef4444' } },
          ],
        }],
        graphic: [{
          type: 'text',
          left: 'center',
          top: 'center',
          style: {
            text: formatNumber(total),
            fontSize: 16,
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
          <div className="flex justify-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" />ปกติ</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" />ใกล้หมด</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" />เกินคลัง</span>
          </div>
        </div>
      );
    });

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<Activity className="h-4 w-4 text-emerald-600" />}
          title="สุขภาพสินค้าคงคลัง"
          desc="สัดส่วนสินค้าปกติ ใกล้หมด และเกินคลัง"
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
     Section 6: Turnover Rate Comparison (Horizontal Bar)
     ═══════════════════════════════════════════════ */
  const turnoverChart = useMemo(() => {
    if (data.length === 0) return null;

    // Get average turnover ratio for each branch
    const branchTurnover = data.map((d, idx) => {
      const avgTurnover = d.turnover.length > 0
        ? d.turnover.reduce((sum, t) => sum + (t.turnoverRatio || 0), 0) / d.turnover.length
        : 0;
      return { ...d, avgTurnover, idx };
    }).sort((a, b) => b.avgTurnover - a.avgTurnover);

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ name: string; value: number }>) => {
          const p = params[0];
          return `${p.name}<br/>อัตราหมุนเวียน: ${p.value.toFixed(2)} รอบ`;
        },
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        textStyle: { color: '#374151', fontSize: 12 },
      },
      grid: { left: 120, right: 40, top: 20, bottom: 20 },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: branchTurnover.map((d) => d.branchName),
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      series: [{
        type: 'bar',
        data: branchTurnover.map((d) => ({
          value: d.avgTurnover,
          itemStyle: { 
            color: BRANCH_PALETTE[d.idx % BRANCH_PALETTE.length].hex,
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barMaxWidth: 30,
        label: {
          show: true,
          position: 'right',
          formatter: (params: { value: number }) => params.value.toFixed(2),
          fontSize: 11,
          color: '#6b7280',
        },
      }],
    };

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<RotateCcw className="h-4 w-4 text-cyan-600" />}
          title="อัตราหมุนเวียนสินค้าเฉลี่ย"
          desc="เปรียบเทียบอัตราหมุนเวียนสินค้าคงคลังระหว่างกิจการ"
        />
        <div className="px-6 pb-6">
          <ReactECharts option={option} style={{ height: Math.max(200, data.length * 50) }} />
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 7: Inventory Radar Chart
     ═══════════════════════════════════════════════ */
  const radarChart = useMemo(() => {
    if (data.length === 0) return null;

    // Normalize values to 0-100 scale for radar
    const maxStockValue = Math.max(...data.map((d) => d.kpis?.totalInventoryValue?.value || 0));
    const maxItems = Math.max(...data.map((d) => d.kpis?.totalItemsInStock?.value || 0));
    const maxLowStock = Math.max(...data.map((d) => d.kpis?.lowStockAlerts?.value || 0));
    const maxOverstock = Math.max(...data.map((d) => d.kpis?.overstockAlerts?.value || 0));
    const maxSlowMoving = Math.max(...data.map((d) => d.slowMoving.length));
    const maxTurnover = Math.max(...data.map((d) => {
      return d.turnover.length > 0
        ? d.turnover.reduce((sum, t) => sum + (t.turnoverRatio || 0), 0) / d.turnover.length
        : 0;
    }));

    const indicator = [
      { name: 'มูลค่าสต็อก', max: 100 },
      { name: 'จำนวนรายการ', max: 100 },
      { name: 'สินค้าใกล้หมด', max: 100 },
      { name: 'สินค้าเกินคลัง', max: 100 },
      { name: 'หมุนเวียนช้า', max: 100 },
      { name: 'อัตราหมุนเวียน', max: 100 },
    ];

    const seriesData = data.map((d, idx) => {
      const avgTurnover = d.turnover.length > 0
        ? d.turnover.reduce((sum, t) => sum + (t.turnoverRatio || 0), 0) / d.turnover.length
        : 0;

      return {
        name: d.branchName,
        value: [
          maxStockValue > 0 ? ((d.kpis?.totalInventoryValue?.value || 0) / maxStockValue) * 100 : 0,
          maxItems > 0 ? ((d.kpis?.totalItemsInStock?.value || 0) / maxItems) * 100 : 0,
          maxLowStock > 0 ? ((d.kpis?.lowStockAlerts?.value || 0) / maxLowStock) * 100 : 0,
          maxOverstock > 0 ? ((d.kpis?.overstockAlerts?.value || 0) / maxOverstock) * 100 : 0,
          maxSlowMoving > 0 ? (d.slowMoving.length / maxSlowMoving) * 100 : 0,
          maxTurnover > 0 ? (avgTurnover / maxTurnover) * 100 : 0,
        ],
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: BRANCH_PALETTE[idx % BRANCH_PALETTE.length].hex },
      };
    });

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
          title="ภาพรวมสินค้าคงคลัง (Radar)"
          desc="เปรียบเทียบมิติต่างๆ ของสินค้าคงคลังระหว่างกิจการ"
        />
        <div className="px-6 pb-6">
          <ReactECharts option={option} style={{ height: 350 }} />
        </div>
      </div>
    );
  }, [data]);

  /* ═══════════════════════════════════════════════
     Section 8: Low Stock Items per Branch
     ═══════════════════════════════════════════════ */
  const lowStockSection = useMemo(() => {
    if (data.length === 0) return null;

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          title="สินค้าใกล้หมด แต่ละกิจการ"
          desc="Top 5 สินค้าที่ต้องสั่งซื้อเพิ่ม"
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
                  <span className="text-xs text-amber-600 font-medium">{branch.lowStock.length} รายการ</span>
                </div>
                <div className="space-y-2">
                  {branch.lowStock.slice(0, 5).map((item, iIdx) => (
                    <div key={iIdx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground truncate max-w-[60%]">
                        {iIdx + 1}. {item.itemName}
                      </span>
                      <span className="font-semibold text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        เหลือ {item.qtyOnHand ?? item.currentStock ?? 0}
                      </span>
                    </div>
                  ))}
                  {branch.lowStock.length === 0 && (
                    <p className="text-sm text-emerald-600 py-2">ไม่มีสินค้าใกล้หมด</p>
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
     Section 9: Overstock Items per Branch
     ═══════════════════════════════════════════════ */
  const overstockSection = useMemo(() => {
    if (data.length === 0) return null;

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<AlertCircle className="h-4 w-4 text-rose-600" />}
          title="สินค้าเกินคลัง แต่ละกิจการ"
          desc="Top 5 สินค้าที่มีสต็อกเกินระดับสูงสุด"
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
                  <span className="text-xs text-rose-600 font-medium">{branch.overstock.length} รายการ</span>
                </div>
                <div className="space-y-2">
                  {branch.overstock.slice(0, 5).map((item, iIdx) => (
                    <div key={iIdx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground truncate max-w-[55%]">
                        {iIdx + 1}. {item.itemName}
                      </span>
                      <div className="text-right text-xs">
                        <span className="font-semibold text-rose-600">{item.qtyOnHand ?? item.currentStock ?? 0}</span>
                        <span className="text-muted-foreground ml-1">/ {item.maxStockLevel}</span>
                      </div>
                    </div>
                  ))}
                  {branch.overstock.length === 0 && (
                    <p className="text-sm text-emerald-600 py-2">ไม่มีสินค้าเกินคลัง</p>
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
     Section 10: Slow Moving Items per Branch
     ═══════════════════════════════════════════════ */
  const slowMovingSection = useMemo(() => {
    if (data.length === 0) return null;

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<Clock className="h-4 w-4 text-violet-600" />}
          title="สินค้าหมุนเวียนช้า แต่ละกิจการ"
          desc="Top 5 สินค้าที่ค้างสต็อกนานที่สุด"
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
                  <span className="text-xs text-violet-600 font-medium">{branch.slowMoving.length} รายการ</span>
                </div>
                <div className="space-y-2">
                  {branch.slowMoving.slice(0, 5).map((item, sIdx) => (
                    <div key={sIdx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground truncate max-w-[55%]">
                        {sIdx + 1}. {item.itemName}
                      </span>
                      <div className="text-right text-xs">
                        <span className="font-semibold">{formatShort(item.stockValue || item.inventoryValue || 0)}</span>
                        <span className="text-muted-foreground ml-1">({item.daysSinceLastSale || item.daysOfStock || 0} วัน)</span>
                      </div>
                    </div>
                  ))}
                  {branch.slowMoving.length === 0 && (
                    <p className="text-sm text-emerald-600 py-2">ไม่มีสินค้าหมุนเวียนช้า</p>
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
     Section 11: Top Turnover Items per Branch
     ═══════════════════════════════════════════════ */
  const turnoverItemsSection = useMemo(() => {
    if (data.length === 0) return null;

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <SectionHeader
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          title="สินค้าหมุนเวียนดี แต่ละกิจการ"
          desc="Top 5 สินค้าที่มีอัตราหมุนเวียนสูงสุด"
        />
        <div className="px-6 pb-6">
          <div className={cn('grid gap-6', data.length === 1 ? 'grid-cols-1' : data.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
            {data.map((branch, idx) => {
              const topTurnover = [...branch.turnover]
                .sort((a, b) => (b.turnoverRatio || 0) - (a.turnoverRatio || 0))
                .slice(0, 5);

              return (
                <div key={branch.branchKey} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BranchDot idx={idx} />
                      <h4 className="font-semibold text-sm">{branch.branchName}</h4>
                    </div>
                    <span className="text-xs text-emerald-600 font-medium">{branch.turnover.length} รายการ</span>
                  </div>
                  <div className="space-y-2">
                    {topTurnover.map((item, tIdx) => (
                      <div key={tIdx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground truncate max-w-[55%]">
                          {tIdx + 1}. {item.itemName}
                        </span>
                        <div className="text-right text-xs">
                          <span className="font-semibold text-emerald-600">{(item.turnoverRatio || 0).toFixed(2)}</span>
                          <span className="text-muted-foreground ml-1">รอบ</span>
                        </div>
                      </div>
                    ))}
                    {branch.turnover.length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">ไม่มีข้อมูลหมุนเวียน</p>
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
              <Warehouse className="h-4 w-4" />
              <span>เปรียบเทียบกิจการ</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">เปรียบเทียบสินค้าคงคลัง</h1>
            <p className="text-muted-foreground mt-1">เปรียบเทียบมูลค่าสต็อก จำนวนสินค้า การเคลื่อนไหว และสถานะคลังสินค้าระหว่างกิจการ</p>
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
          <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">กรุณาเลือกกิจการเพื่อเปรียบเทียบ</p>
        </div>
      ) : (
        <>
          {/* Section 1: KPI Cards */}
          {kpiCards}

          {/* Section 2: Ranking Table */}
          {rankingTable}

          {/* Section 3-4: Stock Value + Movement Charts (side by side on large screens) */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {stockValueChart}
            {stockMovementChart}
          </div>

          {/* Section 5-6: Health + Turnover Charts */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {inventoryHealthChart}
            {turnoverChart}
          </div>

          {/* Section 7: Radar Chart */}
          {radarChart}

          {/* Section 8-9: Low Stock + Overstock Lists */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {lowStockSection}
            {overstockSection}
          </div>

          {/* Section 10-11: Slow Moving + Top Turnover Items */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {slowMovingSection}
            {turnoverItemsSection}
          </div>

          {/* Section 12: Branch Legend */}
          {branchLegend}
        </>
      )}
    </div>
  );
}
