'use client';

import { useState, useEffect } from 'react';
import { KPICard } from '@/components/KPICard';
import { DataCard } from '@/components/DataCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import { ProfitLossChart } from '@/components/accounting/ProfitLossChart';
import { BalanceSheetChart } from '@/components/accounting/BalanceSheetChart';
import { CashFlowChart } from '@/components/accounting/CashFlowChart';
import { ARAgingTable } from '@/components/accounting/ARAgingTable';
import { APAgingTable } from '@/components/accounting/APAgingTable';
import { RevenueExpenseBreakdown } from '@/components/accounting/RevenueExpenseBreakdown';
import { Wallet, CreditCard, PiggyBank, TrendingUp, TrendingDown } from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import { formatGrowthPercentage } from '@/lib/comparison';
import type { DateRange, AccountingKPIs, ProfitLossData, BalanceSheetItem, CashFlowData, AgingItem, CategoryBreakdown } from '@/lib/data/types';
import {
  getAssetsQuery,
  getLiabilitiesQuery,
  getEquityQuery,
  getRevenueQuery,
  getExpensesQuery,
  getProfitLossQuery,
  getBalanceSheetQuery,
  getCashFlowQuery,
  getARAgingQuery,
  getAPAgingQuery,
  getRevenueBreakdownQuery,
  getExpenseBreakdownQuery,
} from '@/lib/data/accounting';

export default function AccountingPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [kpis, setKpis] = useState<AccountingKPIs | null>(null);
  const [profitLossData, setProfitLossData] = useState<ProfitLossData[]>([]);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetItem[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [arAgingData, setArAgingData] = useState<AgingItem[]>([]);
  const [apAgingData, setApAgingData] = useState<AgingItem[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<CategoryBreakdown[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([]);

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
        plRes,
        bsRes,
        cfRes,
        arRes,
        apRes,
        breakdownRes,
      ] = await Promise.all([
        fetch(`/api/accounting/kpis?${params}`),
        fetch(`/api/accounting/profit-loss?${params}`),
        fetch(`/api/accounting/balance-sheet?as_of_date=${dateRange.end}`),
        fetch(`/api/accounting/cash-flow?${params}`),
        fetch('/api/accounting/ar-aging'),
        fetch('/api/accounting/ap-aging'),
        fetch(`/api/accounting/revenue-expense-breakdown?${params}`),
      ]);

      if (!kpisRes.ok) throw new Error('Failed to fetch KPIs');
      if (!plRes.ok) throw new Error('Failed to fetch P&L data');
      if (!bsRes.ok) throw new Error('Failed to fetch balance sheet');
      if (!cfRes.ok) throw new Error('Failed to fetch cash flow');
      if (!arRes.ok) throw new Error('Failed to fetch AR aging');
      if (!apRes.ok) throw new Error('Failed to fetch AP aging');
      if (!breakdownRes.ok) throw new Error('Failed to fetch breakdown');

      const [kpisData, plData, bsData, cfData, arData, apData, breakdownData] = await Promise.all([
        kpisRes.json(),
        plRes.json(),
        bsRes.json(),
        cfRes.json(),
        arRes.json(),
        apRes.json(),
        breakdownRes.json(),
      ]);

      setKpis(kpisData.data);
      setProfitLossData(plData.data);
      setBalanceSheetData(bsData.data);
      setCashFlowData(cfData.data);
      setArAgingData(arData.data);
      setApAgingData(apData.data);
      setRevenueBreakdown(breakdownData.data.revenue);
      setExpenseBreakdown(breakdownData.data.expenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      console.error('Error fetching accounting data:', err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            บัญชีและการเงิน
          </h1>
          <p className="text-muted-foreground mt-1">
            ภาพรวมสถานะทางการเงินและผลประกอบการ
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : kpis ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <KPICard
            title="สินทรัพย์"
            value={formatCurrency(kpis.assets.value)}
            trend={formatGrowthPercentage(kpis.assets.growthPercentage || 0)}
            trendUp={kpis.assets.trend === 'up'}
            icon={Wallet}
            queryInfo={{
              query: getAssetsQuery(dateRange),
              format: 'JSONEachRow'
            }}
          />
          <KPICard
            title="หนี้สิน"
            value={formatCurrency(kpis.liabilities.value)}
            trend={formatGrowthPercentage(kpis.liabilities.growthPercentage || 0)}
            trendUp={kpis.liabilities.trend === 'down'} // Down is good for liabilities
            icon={CreditCard}
            queryInfo={{
              query: getLiabilitiesQuery(dateRange),
              format: 'JSONEachRow'
            }}
          />
          <KPICard
            title="ทุน"
            value={formatCurrency(kpis.equity.value)}
            trend={formatGrowthPercentage(kpis.equity.growthPercentage || 0)}
            trendUp={kpis.equity.trend === 'up'}
            icon={PiggyBank}
            queryInfo={{
              query: getEquityQuery(dateRange),
              format: 'JSONEachRow'
            }}
          />
          <KPICard
            title="รายได้"
            value={formatCurrency(kpis.revenue.value)}
            trend={formatGrowthPercentage(kpis.revenue.growthPercentage || 0)}
            trendUp={kpis.revenue.trend === 'up'}
            icon={TrendingUp}
            queryInfo={{
              query: getRevenueQuery(dateRange),
              format: 'JSONEachRow'
            }}
          />
          <KPICard
            title="ค่าใช้จ่าย"
            value={formatCurrency(kpis.expenses.value)}
            trend={formatGrowthPercentage(kpis.expenses.growthPercentage || 0)}
            trendUp={kpis.expenses.trend === 'down'} // Down is good for expenses
            icon={TrendingDown}
            queryInfo={{
              query: getExpensesQuery(dateRange),
              format: 'JSONEachRow'
            }}
          />
        </div>
      ) : null}

      {/* Profit & Loss Chart */}
      <ErrorBoundary>
        <DataCard
          title="กำไร(ขาดทุน) สุทธิ"
          description="เปรียบเทียบรายได้ ค่าใช้จ่าย และกำไรสุทธิรายเดือน"
          linkTo="/reports/accounting#profit-loss"
          queryInfo={{
            query: getProfitLossQuery(dateRange),
            format: 'JSONEachRow'
          }}
        >
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ProfitLossChart data={profitLossData} />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* Balance Sheet & Cash Flow */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ErrorBoundary>
          <DataCard
            title="งบดุล"
            description="สินทรัพย์ หนี้สิน และส่วนของผู้ถือหุ้น"
            linkTo="/reports/accounting#balance-sheet"
            queryInfo={{
              query: getBalanceSheetQuery(dateRange.end),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <ChartSkeleton height="350px" />
            ) : (
              <BalanceSheetChart data={balanceSheetData} height="350px" />
            )}
          </DataCard>
        </ErrorBoundary>

        <ErrorBoundary>
          <DataCard
            title="กระแสเงินสด"
            description="จากกิจกรรมดำเนินงาน ลงทุน และจัดหาเงิน"
            linkTo="/reports/accounting#cash-flow"
            queryInfo={{
              query: getCashFlowQuery(dateRange),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <ChartSkeleton height="350px" />
            ) : (
              <CashFlowChart data={cashFlowData} height="350px" />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>

      {/* AR & AP Aging */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ErrorBoundary>
          <DataCard
            title="อายุลูกหนี้ (AR Aging)"
            description="รายการลูกหนี้ค้างชำระ"
            linkTo="/reports/accounting#ar-aging"
            queryInfo={{
              query: getARAgingQuery(),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <ARAgingTable data={arAgingData} />
            )}
          </DataCard>
        </ErrorBoundary>

        <ErrorBoundary>
          <DataCard
            title="อายุเจ้าหนี้ (AP Aging)"
            description="รายการเจ้าหนี้ค้างชำระ"
            linkTo="/reports/accounting#ap-aging"
            queryInfo={{
              query: getAPAgingQuery(),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <APAgingTable data={apAgingData} />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>

      {/* Revenue & Expense Breakdown */}
      <ErrorBoundary>
        <DataCard
          title="รายได้และค่าใช้จ่ายตามหมวด"
          description="สัดส่วนรายได้และค่าใช้จ่ายแยกตามประเภท"
          linkTo="/reports/accounting#revenue-breakdown"
          queryInfo={{
            query: `-- Revenue Breakdown\n${getRevenueBreakdownQuery(dateRange)}\n\n-- Expense Breakdown\n${getExpenseBreakdownQuery(dateRange)}`,
            format: 'JSONEachRow'
          }}
        >
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartSkeleton height="300px" />
              <ChartSkeleton height="300px" />
            </div>
          ) : (
            <RevenueExpenseBreakdown
              revenueData={revenueBreakdown}
              expenseData={expenseBreakdown}
            />
          )}
        </DataCard>
      </ErrorBoundary>
    </div>
  );
}
