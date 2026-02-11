'use client';

import { useState, useEffect, useCallback } from 'react';
import { useComparison } from '@/lib/ComparisonContext';
import ComparisonKPICard from '@/components/comparison/ComparisonKPICard';
import ComparisonRankingTable from '@/components/comparison/ComparisonRankingTable';
import { ComparisonDateFilter } from '@/components/comparison/ComparisonDateFilter';
import { Users, ShoppingCart, DollarSign, UserCheck, BarChart3, ArrowLeft } from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import Link from 'next/link';
import type { DateRange, TopCustomer, SalesKPIs } from '@/lib/data/types';

const BRANCH_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6',
];

interface BranchCustomerData {
  branchKey: string;
  branchName: string;
  topCustomers: TopCustomer[];
  totalCustomers: number;
  totalOrders: number;
  totalSales: number;
  avgOrderValue: number;
}

export default function CustomersComparisonPage() {
  const { selectedBranches, availableBranches, isLoaded } = useComparison();
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BranchCustomerData[]>([]);

  const fetchData = useCallback(async () => {
    if (!isLoaded || selectedBranches.length === 0) return;
    setLoading(true);

    try {
      const branchDataPromises = selectedBranches
        .filter((k: string) => k !== 'ALL')
        .map(async (branchKey: string) => {
          const branchInfo = availableBranches.find((b: { key: string; name: string }) => b.key === branchKey);
          const params = new URLSearchParams({
            start_date: dateRange.start,
            end_date: dateRange.end,
          });
          params.append('branch', branchKey);

          const [customersRes, kpisRes] = await Promise.all([
            fetch(`/api/sales/top-customers?${params}`),
            fetch(`/api/sales/kpis?${params}`),
          ]);

          const [customersData, kpisData] = await Promise.all([
            customersRes.ok ? customersRes.json() : { data: [] },
            kpisRes.ok ? kpisRes.json() : { data: null },
          ]);

          const customers: TopCustomer[] = customersData.data || [];
          const kpis: SalesKPIs | null = kpisData.data;

          return {
            branchKey,
            branchName: branchInfo?.name || `กิจการ ${branchKey}`,
            topCustomers: customers,
            totalCustomers: customers.length,
            totalOrders: kpis?.totalOrders?.value || 0,
            totalSales: kpis?.totalSales?.value || 0,
            avgOrderValue: kpis?.avgOrderValue?.value || 0,
          } as BranchCustomerData;
        });

      const results = await Promise.all(branchDataPromises);
      setData(results);
    } catch (err) {
      console.error('Error fetching customers comparison:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranches, availableBranches, dateRange, isLoaded]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) =>
    `฿${value.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;

  const formatShort = (value: number) => {
    if (Math.abs(value) >= 1000000) return `฿${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `฿${(value / 1000).toFixed(0)}K`;
    return `฿${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => value.toLocaleString('th-TH');

  // KPI data
  const totalCustomersKPI = data.map(d => ({
    branchKey: d.branchKey,
    branchName: d.branchName,
    value: d.totalCustomers,
    formattedValue: formatNumber(d.totalCustomers),
  }));

  const totalOrdersKPI = data.map(d => ({
    branchKey: d.branchKey,
    branchName: d.branchName,
    value: d.totalOrders,
    formattedValue: formatNumber(d.totalOrders),
  }));

  const totalSalesKPI = data.map(d => ({
    branchKey: d.branchKey,
    branchName: d.branchName,
    value: d.totalSales,
    formattedValue: formatShort(d.totalSales),
  }));

  const avgOrderKPI = data.map(d => ({
    branchKey: d.branchKey,
    branchName: d.branchName,
    value: d.avgOrderValue,
    formattedValue: formatCurrency(d.avgOrderValue),
  }));

  // Ranking
  const rankingData = data.map(d => ({
    branchKey: d.branchKey,
    branchName: d.branchName,
    metrics: [
      { label: 'ลูกค้า', value: d.totalCustomers, formattedValue: formatNumber(d.totalCustomers), higherIsBetter: true },
      { label: 'ออเดอร์', value: d.totalOrders, formattedValue: formatNumber(d.totalOrders), higherIsBetter: true },
      { label: 'ยอดขายรวม', value: d.totalSales, formattedValue: formatShort(d.totalSales), higherIsBetter: true },
      { label: 'เฉลี่ย/ออเดอร์', value: d.avgOrderValue, formattedValue: formatCurrency(d.avgOrderValue), higherIsBetter: true },
    ],
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4">
       
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-wider font-semibold mb-1">
              <BarChart3 className="h-4 w-4" />
              <span>เปรียบเทียบกิจการ</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">เปรียบเทียบลูกค้า</h1>
            <p className="text-muted-foreground mt-1">เปรียบเทียบฐานลูกค้า ยอดซื้อ และพฤติกรรมลูกค้าระหว่างกิจการ</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ComparisonDateFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted/20 animate-pulse" />
            ))}
          </div>
          <div className="h-80 rounded-2xl bg-muted/20 animate-pulse" />
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground rounded-2xl border bg-card">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">กรุณาเลือกกิจการเพื่อเปรียบเทียบ</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <ComparisonKPICard
              title="จำนวนลูกค้า"
              icon={<Users className="h-5 w-5 text-primary" />}
              branches={totalCustomersKPI}
              formatTotal={(t: number) => t.toLocaleString()}
            />
            <ComparisonKPICard
              title="จำนวนออเดอร์"
              icon={<ShoppingCart className="h-5 w-5 text-emerald-600" />}
              branches={totalOrdersKPI}
              formatTotal={(t: number) => t.toLocaleString()}
            />
            <ComparisonKPICard
              title="ยอดขายรวม"
              icon={<DollarSign className="h-5 w-5 text-amber-600" />}
              branches={totalSalesKPI}
              formatTotal={formatShort}
            />
            <ComparisonKPICard
              title="ค่าเฉลี่ยต่อออเดอร์"
              icon={<UserCheck className="h-5 w-5 text-violet-600" />}
              branches={avgOrderKPI}
              formatTotal={formatCurrency}
            />
          </div>

          {/* Ranking */}
          <ComparisonRankingTable
            title="อันดับลูกค้ากิจการ"
            description="เปรียบเทียบฐานลูกค้าและยอดขายระหว่างกิจการ"
            data={rankingData}
            sortByMetric={0}
          />

          {/* Top Customers per Branch */}
          <div className="rounded-2xl border bg-card shadow-sm p-6">
            <h3 className="font-bold text-lg mb-1">ลูกค้า VIP Top 5 แต่ละกิจการ</h3>
            <p className="text-sm text-muted-foreground mb-6">เปรียบเทียบลูกค้าที่มียอดซื้อสูงสุดของแต่ละกิจการ</p>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {data.map((branch, idx) => (
                <div key={branch.branchKey} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: BRANCH_COLORS[idx % BRANCH_COLORS.length] }} />
                    <h4 className="font-semibold text-sm">{branch.branchName}</h4>
                  </div>
                  <div className="space-y-2">
                    {branch.topCustomers.slice(0, 5).map((customer, cIdx) => (
                      <div key={cIdx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground truncate max-w-[55%]">
                          {cIdx + 1}. {customer.customerName}
                        </span>
                        <div className="text-right">
                          <span className="font-semibold">{formatShort(customer.totalSpent)}</span>
                          <span className="text-xs text-muted-foreground ml-1">({customer.orderCount} บิล)</span>
                        </div>
                      </div>
                    ))}
                    {branch.topCustomers.length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">ไม่พบข้อมูลลูกค้า</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
