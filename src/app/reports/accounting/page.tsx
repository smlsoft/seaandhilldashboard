'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataCard } from '@/components/DataCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { PaginatedTable, type ColumnDef } from '@/components/PaginatedTable';
import { getDateRange } from '@/lib/dateRanges';
import type { 
  DateRange, 
  ProfitLossData, 
  BalanceSheetItem, 
  CashFlowData, 
  AgingItem, 
  CategoryBreakdown 
} from '@/lib/data/types';
import { 
  getProfitLossQuery,
  getBalanceSheetQuery,
  getCashFlowQuery,
  getARAgingQuery,
  getAPAgingQuery,
  getRevenueBreakdownQuery,
  getExpenseBreakdownQuery,
} from '@/lib/data/accounting';

export default function AccountingReportPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [profitLossData, setProfitLossData] = useState<ProfitLossData[]>([]);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetItem[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);

  // Balance sheet filter
  const [balanceSheetTypeFilter, setBalanceSheetTypeFilter] = useState<string>('all');
  const [arAgingData, setArAgingData] = useState<AgingItem[]>([]);
  const [apAgingData, setApAgingData] = useState<AgingItem[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<CategoryBreakdown[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([]);

  // Scroll to hash element after loading
  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash) {
        const element = document.querySelector(hash);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    }
  }, [loading]);

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

      const [
        plRes,
        bsRes,
        cfRes,
        arRes,
        apRes,
        breakdownRes,
      ] = await Promise.all([
        fetch(`/api/accounting/profit-loss?${params}`),
        fetch(`/api/accounting/balance-sheet?as_of_date=${dateRange.end}`),
        fetch(`/api/accounting/cash-flow?${params}`),
        fetch('/api/accounting/ar-aging'),
        fetch('/api/accounting/ap-aging'),
        fetch(`/api/accounting/revenue-expense-breakdown?${params}`),
      ]);

      if (!plRes.ok) throw new Error('Failed to fetch P&L data');
      if (!bsRes.ok) throw new Error('Failed to fetch balance sheet');
      if (!cfRes.ok) throw new Error('Failed to fetch cash flow');
      if (!arRes.ok) throw new Error('Failed to fetch AR aging');
      if (!apRes.ok) throw new Error('Failed to fetch AP aging');
      if (!breakdownRes.ok) throw new Error('Failed to fetch breakdown');

      const [plData, bsData, cfData, arData, apData, breakdownData] = await Promise.all([
        plRes.json(),
        bsRes.json(),
        cfRes.json(),
        arRes.json(),
        apRes.json(),
        breakdownRes.json(),
      ]);

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

  // Format helpers
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  };

  const formatMonth = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric',
    });
  };

  const getAgingColor = (bucket: string): string => {
    switch (bucket) {
      case 'ยังไม่ครบกำหนด':
        return 'text-green-600';
      case '1-30 วัน':
        return 'text-yellow-600';
      case '31-60 วัน':
        return 'text-orange-600';
      case '61-90 วัน':
        return 'text-blue-600';
      default:
        return 'text-blue-700 font-semibold';
    }
  };

  // Column definitions for Profit & Loss
  const profitLossColumns: ColumnDef<ProfitLossData>[] = [
    {
      key: 'month',
      header: 'เดือน',
      sortable: true,
      align: 'left',
      render: (item: ProfitLossData) => formatMonth(item.month),
    },
    {
      key: 'revenue',
      header: 'รายได้',
      sortable: true,
      align: 'right',
      render: (item: ProfitLossData) => (
        <span className="text-green-600 font-medium">฿{formatCurrency(item.revenue)}</span>
      ),
    },
    {
      key: 'expenses',
      header: 'ค่าใช้จ่าย',
      sortable: true,
      align: 'right',
      render: (item: ProfitLossData) => (
        <span className="text-red-600 font-medium">฿{formatCurrency(item.expenses)}</span>
      ),
    },
    {
      key: 'netProfit',
      header: 'กำไรสุทธิ',
      sortable: true,
      align: 'right',
      render: (item: ProfitLossData) => (
        <span className={`font-semibold ${item.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
          ฿{formatCurrency(item.netProfit)}
        </span>
      ),
    },
  ];

  // Column definitions for Balance Sheet
  const balanceSheetColumns: ColumnDef<BalanceSheetItem>[] = [
    {
      key: 'accountCode',
      header: 'รหัสบัญชี',
      sortable: true,
      align: 'left',
      render: (item: BalanceSheetItem) => (
        <span className="font-mono text-xs">{item.accountCode}</span>
      ),
    },
    {
      key: 'accountName',
      header: 'ชื่อบัญชี',
      sortable: true,
      align: 'left',
    },
    {
      key: 'typeName',
      header: 'ประเภท',
      sortable: true,
      align: 'center',
      render: (item: BalanceSheetItem) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
          item.typeName === 'สินทรัพย์' ? 'bg-green-200 text-green-700' :
          item.typeName === 'หนี้สิน' ? 'bg-red-200 text-red-700' :
          'bg-blue-200 text-blue-700'
        }`}>
          {item.typeName}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'ยอดคงเหลือ',
      sortable: true,
      align: 'right',
      render: (item: BalanceSheetItem) => (
        <span className="font-medium">฿{formatCurrency(item.balance)}</span>
      ),
    },
  ];

  // Column definitions for Cash Flow
  const cashFlowColumns: ColumnDef<CashFlowData>[] = [
    {
      key: 'activityType',
      header: 'ประเภทกิจกรรม',
      sortable: false,
      align: 'left',
      render: (item: CashFlowData) => {
        const labels: Record<string, string> = {
          'Operating': 'กิจกรรมดำเนินงาน',
          'Investing': 'กิจกรรมลงทุน',
          'Financing': 'กิจกรรมจัดหาเงิน',
        };
        return <span className="font-medium">{labels[item.activityType] || item.activityType}</span>;
      },
    },
    {
      key: 'revenue',
      header: 'เงินสดรับ',
      sortable: true,
      align: 'right',
      render: (item: CashFlowData) => (
        <span className="text-green-600">฿{formatCurrency(item.revenue)}</span>
      ),
    },
    {
      key: 'expenses',
      header: 'เงินสดจ่าย',
      sortable: true,
      align: 'right',
      render: (item: CashFlowData) => (
        <span className="text-red-600">฿{formatCurrency(item.expenses)}</span>
      ),
    },
    {
      key: 'netCashFlow',
      header: 'กระแสเงินสดสุทธิ',
      sortable: true,
      align: 'right',
      render: (item: CashFlowData) => (
        <span className={`font-semibold ${item.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ฿{formatCurrency(item.netCashFlow)}
        </span>
      ),
    },
  ];

  // Column definitions for AR Aging
  const arAgingColumns: ColumnDef<AgingItem>[] = [
    {
      key: 'docNo',
      header: 'เลขที่เอกสาร',
      sortable: false,
      align: 'left',
      render: (item: AgingItem) => (
        <span className="font-mono text-xs">{item.docNo}</span>
      ),
    },
    {
      key: 'name',
      header: 'ลูกค้า',
      sortable: true,
      align: 'left',
      render: (item: AgingItem) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.code}</div>
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'วันครบกำหนด',
      sortable: true,
      align: 'right',
      render: (item: AgingItem) => (
        <span className="text-xs">{formatDate(item.dueDate)}</span>
      ),
    },
    {
      key: 'outstanding',
      header: 'ยอดค้างชำระ',
      sortable: true,
      align: 'right',
      render: (item: AgingItem) => (
        <span className="font-medium">฿{formatCurrency(item.outstanding)}</span>
      ),
    },
    {
      key: 'agingBucket',
      header: 'อายุหนี้',
      sortable: true,
      align: 'center',
      render: (item: AgingItem) => (
        <span className={getAgingColor(item.agingBucket)}>
          {item.agingBucket}
        </span>
      ),
    },
  ];

  // Column definitions for AP Aging
  const apAgingColumns: ColumnDef<AgingItem>[] = [
    {
      key: 'docNo',
      header: 'เลขที่เอกสาร',
      sortable: false,
      align: 'left',
      render: (item: AgingItem) => (
        <span className="font-mono text-xs">{item.docNo}</span>
      ),
    },
    {
      key: 'name',
      header: 'ซัพพลายเออร์',
      sortable: true,
      align: 'left',
      render: (item: AgingItem) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.code}</div>
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'วันครบกำหนด',
      sortable: true,
      align: 'right',
      render: (item: AgingItem) => (
        <span className="text-xs">{formatDate(item.dueDate)}</span>
      ),
    },
    {
      key: 'outstanding',
      header: 'ยอดค้างชำระ',
      sortable: true,
      align: 'right',
      render: (item: AgingItem) => (
        <span className="font-medium">฿{formatCurrency(item.outstanding)}</span>
      ),
    },
    {
      key: 'agingBucket',
      header: 'อายุหนี้',
      sortable: true,
      align: 'center',
      render: (item: AgingItem) => (
        <span className={getAgingColor(item.agingBucket)}>
          {item.agingBucket}
        </span>
      ),
    },
  ];

  // Column definitions for Revenue Breakdown
  const revenueBreakdownColumns: ColumnDef<CategoryBreakdown>[] = [
    {
      key: 'accountGroup',
      header: 'รหัสกลุ่ม',
      sortable: true,
      align: 'left',
      render: (item: CategoryBreakdown) => (
        <span className="font-mono text-xs">{item.accountGroup}</span>
      ),
    },
    {
      key: 'accountName',
      header: 'ชื่อบัญชี',
      sortable: true,
      align: 'left',
    },
    {
      key: 'amount',
      header: 'จำนวนเงิน',
      sortable: true,
      align: 'right',
      render: (item: CategoryBreakdown) => (
        <span className="font-medium text-green-600">฿{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'percentage',
      header: 'สัดส่วน',
      sortable: true,
      align: 'right',
      render: (item: CategoryBreakdown) => (
        <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
      ),
    },
  ];

  // Column definitions for Expense Breakdown
  const expenseBreakdownColumns: ColumnDef<CategoryBreakdown>[] = [
    {
      key: 'accountGroup',
      header: 'รหัสกลุ่ม',
      sortable: true,
      align: 'left',
      render: (item: CategoryBreakdown) => (
        <span className="font-mono text-xs">{item.accountGroup}</span>
      ),
    },
    {
      key: 'accountName',
      header: 'ชื่อบัญชี',
      sortable: true,
      align: 'left',
    },
    {
      key: 'amount',
      header: 'จำนวนเงิน',
      sortable: true,
      align: 'right',
      render: (item: CategoryBreakdown) => (
        <span className="font-medium text-red-600">฿{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'percentage',
      header: 'สัดส่วน',
      sortable: true,
      align: 'right',
      render: (item: CategoryBreakdown) => (
        <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            รายงานบัญชี
          </h1>
          <p className="text-muted-foreground mt-1">
            ข้อมูลรายงานทางบัญชีและการเงินในรูปแบบตาราง
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Error Display */}
      {error && (
        <ErrorDisplay error={error} onRetry={fetchAllData} />
      )}

      {/* Profit & Loss Table */}
      <ErrorBoundary>
        <DataCard
          id="profit-loss"
          title="งบกำไรขาดทุน"
          description="รายได้ ค่าใช้จ่าย และกำไรสุทธิรายเดือน"
          queryInfo={{
            query: getProfitLossQuery(dateRange),
            format: 'JSONEachRow'
          }}
        >
          {loading ? (
            <TableSkeleton rows={6} />
          ) : (
            <PaginatedTable
              data={profitLossData}
              columns={profitLossColumns}
              itemsPerPage={12}
              emptyMessage="ไม่มีข้อมูลงบกำไรขาดทุน"
              defaultSortKey="month"
              defaultSortOrder="desc"
              keyExtractor={(item: ProfitLossData) => item.month}
            />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* Balance Sheet Table */}
      <ErrorBoundary>
        <DataCard
          id="balance-sheet"
          title="งบดุล"
          description="รายการสินทรัพย์ หนี้สิน และส่วนของผู้ถือหุ้น"
          queryInfo={{
            query: getBalanceSheetQuery(dateRange.end),
            format: 'JSONEachRow'
          }} 
          headerExtra={
            <div className="flex items-center gap-2 -mb-5">
              <label className="text-sm text-muted-foreground">ประเภท:</label>
              <select
                value={balanceSheetTypeFilter}
                onChange={(e) => setBalanceSheetTypeFilter(e.target.value)}
                className="text-sm border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">ทั้งหมด</option>
                <option value="สินทรัพย์">สินทรัพย์</option>
                <option value="หนี้สิน">หนี้สิน</option>
                <option value="ส่วนของผู้ถือหุ้น">ส่วนของผู้ถือหุ้น</option>
              </select>
            </div>
          }
        >
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            <PaginatedTable
              data={balanceSheetTypeFilter === 'all' 
                ? balanceSheetData 
                : balanceSheetData.filter(item => item.typeName === balanceSheetTypeFilter)
              }
              columns={balanceSheetColumns}
              itemsPerPage={15}
              emptyMessage="ไม่มีข้อมูลงบดุล"
              defaultSortKey="accountCode"
              defaultSortOrder="asc"
              keyExtractor={(item: BalanceSheetItem) => item.accountCode}
            />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* Cash Flow Table */}
      <ErrorBoundary>
        <DataCard
          id="cash-flow"
          title="งบกระแสเงินสด"
          description="กระแสเงินสดจากกิจกรรมต่างๆ"
          queryInfo={{
            query: getCashFlowQuery(dateRange),
            format: 'JSONEachRow'
          }}
        >
          {loading ? (
            <TableSkeleton rows={3} />
          ) : (
            <PaginatedTable
              data={cashFlowData}
              columns={cashFlowColumns}
              itemsPerPage={10}
              emptyMessage="ไม่มีข้อมูลกระแสเงินสด"
              keyExtractor={(item: CashFlowData) => item.activityType}
            />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* AR & AP Aging Tables */}
      <div className="grid gap-6 ">
        <ErrorBoundary>
          <DataCard
            id="ar-aging"
            title="อายุลูกหนี้ (AR Aging)"
            description="รายการลูกหนี้ค้างชำระทั้งหมด"
            queryInfo={{
              query: getARAgingQuery(),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <PaginatedTable
                data={arAgingData}
                columns={arAgingColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีลูกหนี้ค้างชำระ"
                defaultSortKey="outstanding"
                defaultSortOrder="desc"
                keyExtractor={(item: AgingItem) => item.docNo}
              />
            )}
          </DataCard>
        </ErrorBoundary>

        <ErrorBoundary>
          <DataCard
            id="ap-aging"
            title="อายุเจ้าหนี้ (AP Aging)"
            description="รายการเจ้าหนี้ค้างชำระทั้งหมด"
            queryInfo={{
              query: getAPAgingQuery(),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <PaginatedTable
                data={apAgingData}
                columns={apAgingColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีเจ้าหนี้ค้างชำระ"
                defaultSortKey="outstanding"
                defaultSortOrder="desc"
                keyExtractor={(item: AgingItem) => item.docNo}
              />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>

      {/* Revenue & Expense Breakdown Tables */}
      <div id="revenue-expense" className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ErrorBoundary>
          <DataCard
            title="รายได้ตามหมวด"
            description="สัดส่วนรายได้แยกตามประเภทบัญชี"
            queryInfo={{
              query: getRevenueBreakdownQuery(dateRange),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <TableSkeleton rows={5} />
            ) : (
              <PaginatedTable
                data={revenueBreakdown}
                columns={revenueBreakdownColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีข้อมูลรายได้"
                defaultSortKey="amount"
                defaultSortOrder="desc"
                keyExtractor={(item: CategoryBreakdown) => item.accountGroup}
              />
            )}
          </DataCard>
        </ErrorBoundary>

        <ErrorBoundary>
          <DataCard
            title="ค่าใช้จ่ายตามหมวด"
            description="สัดส่วนค่าใช้จ่ายแยกตามประเภทบัญชี"
            queryInfo={{
              query: getExpenseBreakdownQuery(dateRange),
              format: 'JSONEachRow'
            }}
          >
            {loading ? (
              <TableSkeleton rows={5} />
            ) : (
              <PaginatedTable
                data={expenseBreakdown}
                columns={expenseBreakdownColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีข้อมูลค่าใช้จ่าย"
                defaultSortKey="amount"
                defaultSortOrder="desc"
                keyExtractor={(item: CategoryBreakdown) => item.accountGroup}
              />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>
    </div>
  );
}
