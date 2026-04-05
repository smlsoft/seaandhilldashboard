'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { formatSelectedBranchNames, useBranchStore } from '@/store/useBranchStore';
import { DataCard } from '@/components/DataCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { PaginatedTable, type ColumnDef } from '@/components/PaginatedTable';
import { ReportTypeSelector, type ReportOption } from '@/components/ReportTypeSelector';
import {
  TrendingDown,
  Scale,
  Droplets,
  Clock,
  Users,
  PieChart,
  BookOpen,
} from 'lucide-react';
import { exportStyledReport } from '@/lib/exportExcel';
import { exportStyledPdfReport } from '@/lib/exportPdf';
import { formatCurrency, formatDate, formatMonth, formatNumber } from '@/lib/formatters';
import { useReportHash } from '@/hooks/useReportHash';
import type {
  DateRange,
  ProfitLossData,
  BalanceSheetItem,
  CashFlowData,
  AgingItem,
  CategoryBreakdown,
  ChartOfAccountItem,
  AccountProductItem,
} from '@/lib/data/types';
import {
  getProfitLossQuery,
  getBalanceSheetQuery,
  getCashFlowQuery,
  getARAgingQuery,
  getAPAgingQuery,
  getRevenueBreakdownQuery,
  getExpenseBreakdownQuery,
  getChartOfAccountsListQuery,
} from '@/lib/data/accounting-queries';

// Report types
type ReportType =
  | 'profit-loss'
  | 'balance-sheet'
  | 'cash-flow'
  | 'ar-aging'
  | 'ap-aging'
  | 'revenue-breakdown'
  | 'expense-breakdown'
  | 'chart-of-accounts';

const reportOptions: ReportOption<ReportType>[] = [
  {
    value: 'profit-loss',
    label: 'งบกำไรขาดทุน',
    icon: TrendingDown,
    description: 'รายได้ ค่าใช้จ่าย และกำไรสุทธิรายเดือน',
  },
  {
    value: 'balance-sheet',
    label: 'งบดุล',
    icon: Scale,
    description: 'รายการสินทรัพย์ หนี้สิน และส่วนของผู้ถือหุ้น',
  },
  {
    value: 'cash-flow',
    label: 'งบกระแสเงินสด',
    icon: Droplets,
    description: 'กระแสเงินสดจากกิจกรรมต่างๆ',
  },
  {
    value: 'ar-aging',
    label: 'อายุลูกหนี้',
    icon: Clock,
    description: 'รายการลูกหนี้ค้างชำระทั้งหมด',
  },
  {
    value: 'ap-aging',
    label: 'อายุเจ้าหนี้',
    icon: Users,
    description: 'รายการเจ้าหนี้ค้างชำระทั้งหมด',
  },
  {
    value: 'revenue-breakdown',
    label: 'รายได้ตามหมวด',
    icon: PieChart,
    description: 'สัดส่วนรายได้แยกตามประเภทบัญชี',
  },
  {
    value: 'expense-breakdown',
    label: 'ค่าใช้จ่ายตามหมวด',
    icon: PieChart,
    description: 'สัดส่วนค่าใช้จ่ายแยกตามประเภทบัญชี',
  },
  {
    value: 'chart-of-accounts',
    label: 'ยอดขายตามผังบัญชี',
    icon: BookOpen,
    description: 'รายการสินค้าสำหรับแต่ละผังบัญชีจากการ JOIN journal กับใบแจ้งหนี้',
  },
];

export default function AccountingReportPage() {
  const { dateRange, setDateRange } = useDateRangeStore();
  const searchParams = useSearchParams();
  
  // Initialize report type from URL params, fallback to 'profit-loss'
  const [selectedReport, setSelectedReport] = useState<ReportType>(() => {
    const reportFromUrl = searchParams.get('report');
    return (reportFromUrl as ReportType) || 'profit-loss';
  });

  const selectedBranches = useBranchStore((s) => s.selectedBranches);
  const availableBranches = useBranchStore((s) => s.availableBranches);
  const selectedBranchLabel = formatSelectedBranchNames(selectedBranches, availableBranches);
  const withBranchSubtitle = (detail: string) => `กิจการ: ${selectedBranchLabel} | ${detail}`;

  // Balance sheet filter - initialize from URL params
  const [balanceSheetTypeFilter, setBalanceSheetTypeFilter] = useState<string>(() => {
    const filterFromUrl = searchParams.get('accountType');
    return filterFromUrl || 'all';
  });

  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('');

  // Reset selected account code when switching away from revenue-breakdown / expense-breakdown / chart-of-accounts or when filters change
  useEffect(() => {
    if (selectedReport !== 'chart-of-accounts' && selectedReport !== 'revenue-breakdown' && selectedReport !== 'expense-breakdown') {
      setSelectedAccountCode('');
    }
  }, [selectedReport, dateRange, selectedBranches]);

  // Effect to update report from URL after initial load
  useEffect(() => {
    const reportFromUrl = searchParams.get('report');
    if (reportFromUrl) {
      setSelectedReport(reportFromUrl as ReportType);
    }
    const filterFromUrl = searchParams.get('accountType');
    if (filterFromUrl) {
      setBalanceSheetTypeFilter(filterFromUrl);
    }
  }, [searchParams]);

  // Handle URL hash for report selection
  useReportHash(reportOptions, setSelectedReport);

  const { data: reportData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['accountingReportData', selectedReport, dateRange, selectedBranches],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      if (!selectedBranches.includes('ALL')) {
        selectedBranches.forEach((b) => params.append('branch', b));
      }

      let endpoint = '';
      switch (selectedReport) {
        case 'profit-loss':
          endpoint = `/api/accounting/profit-loss?${params}`;
          break;
        case 'balance-sheet':
          endpoint = `/api/accounting/balance-sheet?${params}`;
          break;
        case 'cash-flow':
          endpoint = `/api/accounting/cash-flow?${params}`;
          break;
        case 'ar-aging':
          endpoint = `/api/accounting/ar-aging?${params}`;
          break;
        case 'ap-aging':
          endpoint = `/api/accounting/ap-aging?${params}`;
          break;
        case 'revenue-breakdown':
        case 'expense-breakdown':
          endpoint = `/api/accounting/revenue-expense-breakdown?${params}`;
          break;
        case 'chart-of-accounts':
          endpoint = `/api/reports/accounting?${params}`;
          break;
      }

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Failed to fetch ${selectedReport} data`);

      const result = await response.json();
      return result.data;
    }
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? 'เกิดข้อผิดพลาดในการโหลดข้อมูล' : null;

  const profitLossData: ProfitLossData[] = selectedReport === 'profit-loss' ? (reportData || []) : [];
  const balanceSheetData: BalanceSheetItem[] = selectedReport === 'balance-sheet' ? (reportData || []) : [];
  const cashFlowData: CashFlowData[] = selectedReport === 'cash-flow' ? (reportData || []) : [];
  const arAgingData: AgingItem[] = selectedReport === 'ar-aging' ? (reportData || []) : [];
  const apAgingData: AgingItem[] = selectedReport === 'ap-aging' ? (reportData || []) : [];
  const revenueBreakdown: CategoryBreakdown[] = (selectedReport === 'revenue-breakdown' || selectedReport === 'expense-breakdown') ? (reportData?.revenue || []) : [];
  const expenseBreakdown: CategoryBreakdown[] = (selectedReport === 'expense-breakdown' || selectedReport === 'revenue-breakdown') ? (reportData?.expenses || []) : [];
  const chartOfAccountsList: ChartOfAccountItem[] = selectedReport === 'chart-of-accounts' ? (reportData || []) : [];

  // Separate query for account products (triggered when user selects an account)
  const { data: accountProducts, isLoading: productsLoading } = useQuery<AccountProductItem[]>({
    queryKey: ['accountProducts', selectedAccountCode, dateRange, selectedBranches],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      if (!selectedBranches.includes('ALL')) {
        selectedBranches.forEach((b) => params.append('branch', b));
      }
      const response = await fetch(
        `/api/reports/accounting/${encodeURIComponent(selectedAccountCode)}?${params}`
      );
      if (!response.ok) throw new Error('Failed to fetch account products');
      const result = await response.json();
      return result.data as AccountProductItem[];
    },
    enabled: (selectedReport === 'chart-of-accounts' || selectedReport === 'revenue-breakdown' || selectedReport === 'expense-breakdown') && !!selectedAccountCode,
  });

  const fetchReportData = () => { refetch(); };

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
        return 'text-red-600 font-semibold';
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
        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${item.typeName === 'สินทรัพย์' ? 'bg-green-200 text-green-700' :
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

  // Column definitions for AR/AP Aging
  const agingColumns: ColumnDef<AgingItem>[] = [
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
      header: selectedReport === 'ar-aging' ? 'ลูกค้า' : 'ซัพพลายเออร์',
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

  // Column definitions for Category Breakdown (account summary)
  const breakdownColumns: ColumnDef<CategoryBreakdown>[] = [
    {
      key: 'accountGroup',
      header: 'รหัสบัญชี',
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
        <span className={`font-medium ${selectedReport === 'revenue-breakdown' ? 'text-green-600' : 'text-red-600'}`}>
          ฿{formatCurrency(item.amount)}
        </span>
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

  // Get current report option
  const currentReport = reportOptions.find(opt => opt.value === selectedReport);

  const currentBreakdownData = selectedReport === 'revenue-breakdown' ? revenueBreakdown : expenseBreakdown;

  // Render report content based on selected type
  const renderReportContent = () => {
    switch (selectedReport) {
      case 'profit-loss':
        return (
          <PaginatedTable
            data={profitLossData}
            columns={profitLossColumns}
            itemsPerPage={12}
            emptyMessage="ไม่มีข้อมูลงบกำไรขาดทุน"
            defaultSortKey="month"
            defaultSortOrder="desc"
            keyExtractor={(item: ProfitLossData) => item.month}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                revenue: (data) => (
                  <span className="text-green-600 font-bold">
                    ฿{formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0))}
                  </span>
                ),
                expenses: (data) => (
                  <span className="text-red-600 font-bold">
                    ฿{formatCurrency(data.reduce((sum, item) => sum + item.expenses, 0))}
                  </span>
                ),
                netProfit: (data) => {
                  const total = data.reduce((sum, item) => sum + item.netProfit, 0);
                  return (
                    <span className={`font-bold ${total >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ฿{formatCurrency(total)}
                    </span>
                  );
                },
              },
            }}
          />
        );

      case 'balance-sheet':
        return (
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
            keyExtractor={(item: BalanceSheetItem, index: number) => `${item.accountType}-${item.accountCode}-${index}`}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 2,
              values: {
                balance: (data) => {
                  const total = data.reduce((sum, item) => sum + item.balance, 0);
                  return (
                    <span className={`font-bold ${total >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ฿{formatCurrency(total)}
                    </span>
                  );
                }
              }
            }}
          />
        );

      case 'cash-flow':
        return (
          <PaginatedTable
            data={cashFlowData}
            columns={cashFlowColumns}
            itemsPerPage={10}
            emptyMessage="ไม่มีข้อมูลกระแสเงินสด"
            keyExtractor={(item: CashFlowData) => item.activityType}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                revenue: (data) => (
                  <span className="text-green-600 font-bold">
                    ฿{formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0))}
                  </span>
                ),
                expenses: (data) => (
                  <span className="text-red-600 font-bold">
                    ฿{formatCurrency(data.reduce((sum, item) => sum + item.expenses, 0))}
                  </span>
                ),
                netCashFlow: (data) => {
                  const total = data.reduce((sum, item) => sum + item.netCashFlow, 0);
                  return (
                    <span className={`font-bold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ฿{formatCurrency(total)}
                    </span>
                  );
                },
              }
            }}
          />
        );

      case 'ar-aging':
      case 'ap-aging':
        const agingData = selectedReport === 'ar-aging' ? arAgingData : apAgingData;
        return (
          <PaginatedTable
            data={agingData}
            columns={agingColumns}
            itemsPerPage={10}
            emptyMessage={selectedReport === 'ar-aging' ? 'ไม่มีลูกหนี้ค้างชำระ' : 'ไม่มีเจ้าหนี้ค้างชำระ'}
            defaultSortKey="outstanding"
            defaultSortOrder="desc"
            keyExtractor={(item: AgingItem, index: number) => `${item.code}-${item.docNo}-${index}`}
          />
        );

      case 'revenue-breakdown': {
        const revenueListColumns: ColumnDef<CategoryBreakdown>[] = [
          {
            key: 'accountGroup',
            header: 'รหัสบัญชี',
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
            render: (item: CategoryBreakdown) => (
              <span className="font-medium">{item.accountName}</span>
            ),
          },
          {
            key: 'amount',
            header: 'ยอดรายได้',
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
        const productColumns: ColumnDef<AccountProductItem>[] = [
          {
            key: 'itemCode',
            header: 'รหัสสินค้า',
            sortable: true,
            align: 'left',
            render: (item) => <span className="font-mono text-xs">{item.itemCode}</span>,
          },
          {
            key: 'itemName',
            header: 'ชื่อสินค้า',
            sortable: true,
            align: 'left',
          },
          {
            key: 'categoryName',
            header: 'หมวดสินค้า',
            sortable: true,
            align: 'left',
            render: (item) => (
              <span className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                {item.categoryName}
              </span>
            ),
          },
          {
            key: 'orderCount',
            header: 'ออเดอร์ (ต่อสินค้า)',
            sortable: true,
            align: 'right',
            render: (item) => formatNumber(item.orderCount),
          },
          {
            key: 'totalQtySold',
            header: 'จำนวนขาย',
            sortable: true,
            align: 'right',
            render: (item) => formatNumber(item.totalQtySold),
          },
          {
            key: 'totalSales',
            header: 'ยอดขาย',
            sortable: true,
            align: 'right',
            render: (item) => (
              <span className="text-green-600 font-medium">฿{formatCurrency(item.totalSales)}</span>
            ),
          },
          {
            key: 'totalProfit',
            header: 'กำไร',
            sortable: true,
            align: 'right',
            render: (item) => (
              <span className={item.totalProfit >= 0 ? 'text-blue-600 font-medium' : 'text-red-600 font-medium'}>
                ฿{formatCurrency(item.totalProfit)}
              </span>
            ),
          },
        ];

        // Dropdown selected → show products for that account
        if (selectedAccountCode) {
          return productsLoading ? (
            <TableSkeleton rows={8} />
          ) : (
            <PaginatedTable
              data={accountProducts || []}
              columns={productColumns}
              itemsPerPage={15}
              emptyMessage="ไม่พบสินค้าในผังบัญชีนี้"
              defaultSortKey="totalSales"
              defaultSortOrder="desc"
              keyExtractor={(item, index) => `${item.itemCode}-${index}`}
              showSummary={true}
              summaryConfig={{
                labelColSpan: 3,
                values: {
                  orderCount: () => <span className="text-muted-foreground">-</span>,
                  totalQtySold: (data) => <span className="font-medium">{formatNumber(data.reduce((s, i) => s + i.totalQtySold, 0))}</span>,
                  totalSales: (data) => (
                    <span className="font-bold text-green-600">
                      ฿{formatCurrency(data.reduce((s, i) => s + i.totalSales, 0))}
                    </span>
                  ),
                  totalProfit: (data) => {
                    const total = data.reduce((s, i) => s + i.totalProfit, 0);
                    return (
                      <span className={`font-bold ${total >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ฿{formatCurrency(total)}
                      </span>
                    );
                  },
                },
              }}
            />
          );
        }

        // ทั้งหมด → show accounts summary
        return (
          <PaginatedTable
            data={revenueBreakdown}
            columns={revenueListColumns}
            itemsPerPage={15}
            emptyMessage="ไม่มีข้อมูลรายได้"
            defaultSortKey="amount"
            defaultSortOrder="desc"
            keyExtractor={(item: CategoryBreakdown, index: number) => `${item.accountGroup}-${index}`}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                amount: (data) => (
                  <span className="font-bold text-green-600">
                    ฿{formatCurrency(data.reduce((s, i) => s + i.amount, 0))}
                  </span>
                ),
              },
            }}
          />
        );
      }

      case 'expense-breakdown': {
        const expenseListColumns: ColumnDef<CategoryBreakdown>[] = [
          {
            key: 'accountGroup',
            header: 'รหัสบัญชี',
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
            render: (item: CategoryBreakdown) => (
              <span className="font-medium">{item.accountName}</span>
            ),
          },
          {
            key: 'amount',
            header: 'ยอดค่าใช้จ่าย',
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
        const expenseProductColumns: ColumnDef<AccountProductItem>[] = [
          {
            key: 'itemCode',
            header: 'รหัสสินค้า',
            sortable: true,
            align: 'left',
            render: (item) => <span className="font-mono text-xs">{item.itemCode}</span>,
          },
          {
            key: 'itemName',
            header: 'ชื่อสินค้า',
            sortable: true,
            align: 'left',
          },
          {
            key: 'categoryName',
            header: 'หมวดสินค้า',
            sortable: true,
            align: 'left',
            render: (item) => (
              <span className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                {item.categoryName}
              </span>
            ),
          },
          {
            key: 'orderCount',
            header: 'ออเดอร์ (ต่อสินค้า)',
            sortable: true,
            align: 'right',
            render: (item) => formatNumber(item.orderCount),
          },
          {
            key: 'totalQtySold',
            header: 'จำนวนขาย',
            sortable: true,
            align: 'right',
            render: (item) => formatNumber(item.totalQtySold),
          },
          {
            key: 'totalSales',
            header: 'ยอดขาย',
            sortable: true,
            align: 'right',
            render: (item) => (
              <span className="text-green-600 font-medium">฿{formatCurrency(item.totalSales)}</span>
            ),
          },
          {
            key: 'totalProfit',
            header: 'กำไร',
            sortable: true,
            align: 'right',
            render: (item) => (
              <span className={item.totalProfit >= 0 ? 'text-blue-600 font-medium' : 'text-red-600 font-medium'}>
                ฿{formatCurrency(item.totalProfit)}
              </span>
            ),
          },
        ];

        // Dropdown selected → show products for that account
        if (selectedAccountCode) {
          return productsLoading ? (
            <TableSkeleton rows={8} />
          ) : (
            <PaginatedTable
              data={accountProducts || []}
              columns={expenseProductColumns}
              itemsPerPage={15}
              emptyMessage="ไม่พบสินค้าในผังบัญชีนี้"
              defaultSortKey="totalSales"
              defaultSortOrder="desc"
              keyExtractor={(item, index) => `${item.itemCode}-${index}`}
              showSummary={true}
              summaryConfig={{
                labelColSpan: 3,
                values: {
                  orderCount: () => <span className="text-muted-foreground">-</span>,
                  totalQtySold: (data) => <span className="font-medium">{formatNumber(data.reduce((s, i) => s + i.totalQtySold, 0))}</span>,
                  totalSales: (data) => (
                    <span className="font-bold text-green-600">
                      ฿{formatCurrency(data.reduce((s, i) => s + i.totalSales, 0))}
                    </span>
                  ),
                  totalProfit: (data) => {
                    const total = data.reduce((s, i) => s + i.totalProfit, 0);
                    return (
                      <span className={`font-bold ${total >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ฿{formatCurrency(total)}
                      </span>
                    );
                  },
                },
              }}
            />
          );
        }

        // ทั้งหมด → show expense account summary
        return (
          <PaginatedTable
            data={expenseBreakdown}
            columns={expenseListColumns}
            itemsPerPage={15}
            emptyMessage="ไม่มีข้อมูลค่าใช้จ่าย"
            defaultSortKey="amount"
            defaultSortOrder="desc"
            keyExtractor={(item: CategoryBreakdown, index: number) => `${item.accountGroup}-${index}`}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                amount: (data) => (
                  <span className="font-bold text-red-600">
                    ฿{formatCurrency(data.reduce((s, i) => s + i.amount, 0))}
                  </span>
                ),
              },
            }}
          />
        );
      }

      case 'chart-of-accounts': {
        const accountTypeLabel: Record<string, string> = {
          INCOME: 'รายได้', EXPENSES: 'ค่าใช้จ่าย',
          ASSETS: 'สินทรัพย์', LIABILITIES: 'หนี้สิน', EQUITY: 'ส่วนของผู้ถือหุ้น',
        };
        const accountTypeColor: Record<string, string> = {
          INCOME: 'bg-green-100 text-green-700',
          EXPENSES: 'bg-red-100 text-red-700',
          ASSETS: 'bg-blue-100 text-blue-700',
          LIABILITIES: 'bg-orange-100 text-orange-700',
          EQUITY: 'bg-purple-100 text-purple-700',
        };
        const accountListColumns: import('@/components/PaginatedTable').ColumnDef<ChartOfAccountItem>[] = [
          {
            key: 'accountCode',
            header: 'รหัสบัญชี',
            sortable: true,
            align: 'left',
            render: (item) => <span className="font-mono text-xs">{item.accountCode}</span>,
          },
          {
            key: 'accountName',
            header: 'ชื่อบัญชี',
            sortable: true,
            align: 'left',
            render: (item) => <span className="font-medium">{item.accountName}</span>,
          },
          {
            key: 'accountType',
            header: 'ประเภท',
            sortable: true,
            align: 'center',
            render: (item) => (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                accountTypeColor[item.accountType] || 'bg-secondary text-secondary-foreground'
              }`}>
                {accountTypeLabel[item.accountType] || item.accountType}
              </span>
            ),
          },
          {
            key: 'netAmount',
            header: 'ยอดรายได้',
            sortable: true,
            align: 'right',
            render: (item) => (
              <span className={`font-medium ${item.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ฿{formatCurrency(item.netAmount)}
              </span>
            ),
          },
          {
            key: 'docCount',
            header: 'จำนวนเอกสาร',
            sortable: true,
            align: 'right',
            render: (item) => formatNumber(item.docCount),
          },
        ];
        const productColumns: import('@/components/PaginatedTable').ColumnDef<AccountProductItem>[] = [
          {
            key: 'itemCode',
            header: 'รหัสสินค้า',
            sortable: true,
            align: 'left',
            render: (item) => <span className="font-mono text-xs">{item.itemCode}</span>,
          },
          {
            key: 'itemName',
            header: 'ชื่อสินค้า',
            sortable: true,
            align: 'left',
          },
          {
            key: 'categoryName',
            header: 'หมวดสินค้า',
            sortable: true,
            align: 'left',
            render: (item) => (
              <span className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                {item.categoryName}
              </span>
            ),
          },
          {
            key: 'orderCount',
            header: 'ออเดอร์',
            sortable: true,
            align: 'right',
            render: (item) => formatNumber(item.orderCount),
          },
          {
            key: 'totalQtySold',
            header: 'จำนวน',
            sortable: true,
            align: 'right',
            render: (item) => formatNumber(item.totalQtySold),
          },
          {
            key: 'totalSales',
            header: 'ยอดขาย',
            sortable: true,
            align: 'right',
            render: (item) => <span className="text-green-600 font-medium">฿{formatCurrency(item.totalSales)}</span>,
          },
          {
            key: 'totalProfit',
            header: 'กำไร',
            sortable: true,
            align: 'right',
            render: (item) => (
              <span className={item.totalProfit >= 0 ? 'text-blue-600 font-medium' : 'text-red-600 font-medium'}>
                ฿{formatCurrency(item.totalProfit)}
              </span>
            ),
          },
        ];
        const selectedAccount = chartOfAccountsList.find(a => a.accountCode === selectedAccountCode);
        return (
          <div className="space-y-0">
            {/* Top: Account list — clickable rows as category selector */}
            <PaginatedTable
              data={chartOfAccountsList}
              columns={accountListColumns}
              itemsPerPage={10}
              emptyMessage="ไม่มีข้อมูลผังบัญชี"
              defaultSortKey="netAmount"
              defaultSortOrder="desc"
              keyExtractor={(item) => item.accountCode}
              showSummary={true}
              summaryConfig={{
                labelColSpan: 3,
                values: {
                  netAmount: (data) => (
                    <span className="font-bold text-green-600">
                      ฿{formatCurrency(data.reduce((s, i) => s + i.netAmount, 0))}
                    </span>
                  ),
                  docCount: (data) => (
                    <span className="font-bold">{formatNumber(data.reduce((s, i) => s + i.docCount, 0))}</span>
                  ),
                },
              }}
              onRowClick={(item) =>
                setSelectedAccountCode(selectedAccountCode === item.accountCode ? '' : item.accountCode)
              }
              rowClassName={(item) =>
                item.accountCode === selectedAccountCode
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : ''
              }
            />
            {/* Bottom: Products for selected account */}
            {selectedAccountCode && (
              <div className="border-t-2 border-primary/30 pt-4 mt-2 space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold text-sm">
                      {selectedAccount?.accountName || selectedAccountCode}
                    </span>
                    {selectedAccount && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        accountTypeColor[selectedAccount.accountType] || 'bg-secondary text-secondary-foreground'
                      }`}>
                        {accountTypeLabel[selectedAccount.accountType] || selectedAccount.accountType}
                      </span>
                    )}
                  </div>
                  {selectedAccount && (
                    <span className="text-muted-foreground text-xs">
                      ยอดสุทธิ: <span className="font-medium text-foreground">฿{formatCurrency(selectedAccount.netAmount)}</span>
                      {' · '}
                      เอกสาร: <span className="font-medium text-foreground">{formatNumber(selectedAccount.docCount)}</span>
                    </span>
                  )}
                </div>
                {productsLoading ? (
                  <TableSkeleton rows={6} />
                ) : (
                  <PaginatedTable
                    data={accountProducts || []}
                    columns={productColumns}
                    itemsPerPage={15}
                    emptyMessage="ไม่พบสินค้าในผังบัญชีนี้"
                    defaultSortKey="totalSales"
                    defaultSortOrder="desc"
                    keyExtractor={(item, index) => `${item.itemCode}-${index}`}
                    showSummary={true}
                    summaryConfig={{
                      labelColSpan: 5,
                      values: {
                        totalSales: (data) => (
                          <span className="font-bold text-green-600">
                            ฿{formatCurrency(data.reduce((s, i) => s + i.totalSales, 0))}
                          </span>
                        ),
                        totalProfit: (data) => {
                          const total = data.reduce((s, i) => s + i.totalProfit, 0);
                          return (
                            <span className={`font-bold ${total >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              ฿{formatCurrency(total)}
                            </span>
                          );
                        },
                      },
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      }
    }
  };

  // Get export function based on report type
  const getExportFunction = () => {
    switch (selectedReport) {
      case 'profit-loss':
        return () => exportStyledReport({
          data: profitLossData,
          headers: { month: 'เดือน', revenue: 'รายได้', expenses: 'ค่าใช้จ่าย', netProfit: 'กำไรสุทธิ' },
          filename: 'รายงานงบกำไรขาดทุน',
          sheetName: 'Profit & Loss',
          title: 'รายงานงบกำไรขาดทุน',
          subtitle: withBranchSubtitle(`ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`),
          currencyColumns: ['revenue', 'expenses', 'netProfit'],
          summaryConfig: {
            columns: {
              revenue: 'sum',
              expenses: 'sum',
              netProfit: 'sum',
            }
          }
        });

      case 'balance-sheet':
        return () => exportStyledReport({
          data: balanceSheetTypeFilter === 'all'
            ? balanceSheetData
            : balanceSheetData.filter(item => item.typeName === balanceSheetTypeFilter),
          headers: { accountCode: 'รหัสบัญชี', accountName: 'ชื่อบัญชี', typeName: 'ประเภท', balance: 'ยอดคงเหลือ' },
          filename: 'รายงานงบดุล',
          sheetName: 'Balance Sheet',
          title: 'รายงานงบดุล',
          subtitle: withBranchSubtitle(`ณ วันที่ ${dateRange.end}`),
          currencyColumns: ['balance'],
          summaryConfig: {
            columns: {
              balance: 'sum',
            }
          }
        });

      case 'cash-flow':
        return () => exportStyledReport({
          data: cashFlowData,
          headers: { activityType: 'ประเภทกิจกรรม', revenue: 'เงินสดรับ', expenses: 'เงินสดจ่าย', netCashFlow: 'กระแสเงินสดสุทธิ' },
          filename: 'รายงานงบกระแสเงินสด',
          sheetName: 'Cash Flow',
          title: 'รายงานงบกระแสเงินสด',
          subtitle: withBranchSubtitle(`ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`),
          currencyColumns: ['revenue', 'expenses', 'netCashFlow'],
          summaryConfig: {
            columns: {
              revenue: 'sum',
              expenses: 'sum',
              netCashFlow: 'sum',
            }
          }
        });

      case 'ar-aging':
        return () => exportStyledReport({
          data: arAgingData,
          headers: { docNo: 'เลขที่เอกสาร', code: 'รหัส', name: 'ลูกค้า', dueDate: 'วันครบกำหนด', outstanding: 'ยอดค้างชำระ', agingBucket: 'อายุหนี้' },
          filename: 'รายงานอายุลูกหนี้',
          sheetName: 'AR Aging',
          title: 'รายงานอายุลูกหนี้ (AR Aging)',
          subtitle: withBranchSubtitle(`ณ วันที่ ${new Date().toLocaleDateString('th-TH')}`),
          currencyColumns: ['outstanding'],
          summaryConfig: {
            columns: {
              outstanding: 'sum',
            }
          }
        });

      case 'ap-aging':
        return () => exportStyledReport({
          data: apAgingData,
          headers: { docNo: 'เลขที่เอกสาร', code: 'รหัส', name: 'ซัพพลายเออร์', dueDate: 'วันครบกำหนด', outstanding: 'ยอดค้างชำระ', agingBucket: 'อายุหนี้' },
          filename: 'รายงานอายุเจ้าหนี้',
          sheetName: 'AP Aging',
          title: 'รายงานอายุเจ้าหนี้ (AP Aging)',
          subtitle: withBranchSubtitle(`ณ วันที่ ${new Date().toLocaleDateString('th-TH')}`),
          currencyColumns: ['outstanding'],
          summaryConfig: {
            columns: {
              outstanding: 'sum',
            }
          }
        });

      case 'revenue-breakdown':
        return () => exportStyledReport({
          data: revenueBreakdown,
          headers: { accountGroup: 'รหัสบัญชี', accountName: 'ชื่อบัญชี', amount: 'ยอดรายได้', percentage: 'สัดส่วน (%)' },
          filename: 'รายงานรายได้ตามผังบัญชี',
          sheetName: 'Revenue Breakdown',
          title: 'รายงานรายได้ตามผังบัญชี',
          subtitle: withBranchSubtitle(`ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`),
          currencyColumns: ['amount'],
          percentColumns: ['percentage'],
          summaryConfig: { columns: { amount: 'sum' } }
        });

      case 'expense-breakdown':
        return () => exportStyledReport({
          data: expenseBreakdown,
          headers: { accountGroup: 'รหัสบัญชี', accountName: 'ชื่อบัญชี', amount: 'ยอดค่าใช้จ่าย', percentage: 'สัดส่วน (%)' },
          filename: 'รายงานค่าใช้จ่ายตามผังบัญชี',
          sheetName: 'Expense Breakdown',
          title: 'รายงานค่าใช้จ่ายตามผังบัญชี',
          subtitle: withBranchSubtitle(`ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`),
          currencyColumns: ['amount'],
          percentColumns: ['percentage'],
          summaryConfig: { columns: { amount: 'sum' } }
        });

      case 'chart-of-accounts':
        if (!selectedAccountCode || !accountProducts?.length) return undefined;
        return () => exportStyledReport({
          data: accountProducts,
          headers: {
            itemCode: 'รหัสสินค้า',
            itemName: 'ชื่อสินค้า',
            categoryName: 'หมวดสินค้า',
            orderCount: 'จำนวนออเดอร์',
            totalQtySold: 'จำนวนสินค้า',
            totalSales: 'ยอดขาย',
            totalProfit: 'กำไร',
          },
          filename: `ยอดขายตามผังบัญชี-${selectedAccountCode}`,
          sheetName: 'Account Products',
          title: `ยอดขายตามผังบัญชี: ${selectedAccountCode}`,
          subtitle: withBranchSubtitle(`ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`),
          currencyColumns: ['totalSales', 'totalProfit'],
          summaryConfig: { columns: { totalSales: 'sum', totalProfit: 'sum' } },
        });

      default:
        return undefined;
    }
  };

  const getExportPdfFunction = () => {
    switch (selectedReport) {
      case 'profit-loss':
        return () => exportStyledPdfReport({
          data: profitLossData,
          headers: { month: 'เดือน', revenue: 'รายได้', expenses: 'ค่าใช้จ่าย', netProfit: 'กำไรสุทธิ' },
          filename: 'รายงานงบกำไรขาดทุน',
          title: 'รายงานงบกำไรขาดทุน',
          subtitle: withBranchSubtitle(`ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`),
          currencyColumns: ['revenue', 'expenses', 'netProfit'],
          summaryConfig: {
            columns: {
              revenue: 'sum',
              expenses: 'sum',
              netProfit: 'sum',
            }
          }
        });

      case 'balance-sheet':
        return () => exportStyledPdfReport({
          data: balanceSheetTypeFilter === 'all'
            ? balanceSheetData
            : balanceSheetData.filter(item => item.typeName === balanceSheetTypeFilter),
          headers: { accountCode: 'รหัสบัญชี', accountName: 'ชื่อบัญชี', typeName: 'ประเภท', balance: 'ยอดคงเหลือ' },
          filename: 'รายงานงบดุล',
          title: 'รายงานงบดุล',
          subtitle: withBranchSubtitle(`ณ วันที่ ${dateRange.end}`),
          currencyColumns: ['balance'],
          summaryConfig: {
            columns: {
              balance: 'sum',
            }
          }
        });

      case 'cash-flow':
        return () => exportStyledPdfReport({
          data: cashFlowData,
          headers: { activityType: 'ประเภทกิจกรรม', revenue: 'เงินสดรับ', expenses: 'เงินสดจ่าย', netCashFlow: 'กระแสเงินสดสุทธิ' },
          filename: 'รายงานงบกระแสเงินสด',
          title: 'รายงานงบกระแสเงินสด',
          subtitle: withBranchSubtitle(`ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`),
          currencyColumns: ['revenue', 'expenses', 'netCashFlow'],
          summaryConfig: {
            columns: {
              revenue: 'sum',
              expenses: 'sum',
              netCashFlow: 'sum',
            }
          }
        });

      case 'ar-aging':
        return () => exportStyledPdfReport({
          data: arAgingData,
          headers: { docNo: 'เลขที่เอกสาร', code: 'รหัส', name: 'ลูกค้า', dueDate: 'วันครบกำหนด', outstanding: 'ยอดค้างชำระ', agingBucket: 'อายุหนี้' },
          filename: 'รายงานอายุลูกหนี้',
          title: 'รายงานอายุลูกหนี้ (AR Aging)',
          subtitle: withBranchSubtitle(`ณ วันที่ ${new Date().toLocaleDateString('th-TH')}`),
          currencyColumns: ['outstanding'],
          summaryConfig: {
            columns: {
              outstanding: 'sum',
            }
          }
        });

      case 'ap-aging':
        return () => exportStyledPdfReport({
          data: apAgingData,
          headers: { docNo: 'เลขที่เอกสาร', code: 'รหัส', name: 'ซัพพลายเออร์', dueDate: 'วันครบกำหนด', outstanding: 'ยอดค้างชำระ', agingBucket: 'อายุหนี้' },
          filename: 'รายงานอายุเจ้าหนี้',
          title: 'รายงานอายุเจ้าหนี้ (AP Aging)',
          subtitle: withBranchSubtitle(`ณ วันที่ ${new Date().toLocaleDateString('th-TH')}`),
          currencyColumns: ['outstanding'],
          summaryConfig: {
            columns: {
              outstanding: 'sum',
            }
          }
        });

      case 'revenue-breakdown':
        return () => exportStyledPdfReport({
          data: revenueBreakdown,
          headers: { accountGroup: 'รหัสบัญชี', accountName: 'ชื่อบัญชี', amount: 'ยอดรายได้', percentage: 'สัดส่วน (%)' },
          filename: 'รายงานรายได้ตามผังบัญชี',
          title: 'รายงานรายได้ตามผังบัญชี',
          subtitle: withBranchSubtitle(`ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`),
          currencyColumns: ['amount'],
          percentColumns: ['percentage'],
          summaryConfig: { columns: { amount: 'sum' } }
        });

      case 'expense-breakdown':
        return () => exportStyledPdfReport({
          data: expenseBreakdown,
          headers: { accountGroup: 'รหัสบัญชี', accountName: 'ชื่อบัญชี', amount: 'ยอดค่าใช้จ่าย', percentage: 'สัดส่วน (%)' },
          filename: 'รายงานค่าใช้จ่ายตามผังบัญชี',
          title: 'รายงานค่าใช้จ่ายตามผังบัญชี',
          subtitle: withBranchSubtitle(`ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`),
          currencyColumns: ['amount'],
          percentColumns: ['percentage'],
          summaryConfig: { columns: { amount: 'sum' } }
        });

      case 'chart-of-accounts':
        if (!selectedAccountCode || !accountProducts?.length) return undefined;
        return () => exportStyledPdfReport({
          data: accountProducts,
          headers: {
            itemCode: 'รหัสสินค้า',
            itemName: 'ชื่อสินค้า',
            categoryName: 'หมวดสินค้า',
            orderCount: 'จำนวนออเดอร์',
            totalQtySold: 'จำนวนสินค้า',
            totalSales: 'ยอดขาย',
            totalProfit: 'กำไร',
          },
          filename: `ยอดขายตามผังบัญชี-${selectedAccountCode}`,
          title: `ยอดขายตามผังบัญชี: ${selectedAccountCode}`,
          subtitle: withBranchSubtitle(`ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`),
          currencyColumns: ['totalSales', 'totalProfit'],
          summaryConfig: { columns: { totalSales: 'sum', totalProfit: 'sum' } },
        });

      default:
        return undefined;
    }
  };

  // Framer motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header with integrated controls */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              รายงานบัญชี
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              ข้อมูลรายงานทางบัญชีและการเงินในรูปแบบตาราง
            </p>
          </div>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* Compact Report Type Selector */}
        <ReportTypeSelector
          value={selectedReport}
          options={reportOptions}
          onChange={(value) => {
            setSelectedReport(value as ReportType);
            setSelectedAccountCode('');
          }}
        />
      </motion.div>

      {/* Error Display */}
      {error && <motion.div variants={itemVariants}><ErrorDisplay error={error} onRetry={() => refetch()} /></motion.div>}

      {/* Report Content */}
      <motion.div variants={itemVariants}>
        <ErrorBoundary>
        <DataCard
          id={selectedReport}
          title={currentReport?.label || ''}
          description={currentReport?.description || ''}
          headerExtra={selectedReport === 'balance-sheet' ? (
            <div className="flex items-center gap-2">
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
          ) : selectedReport === 'revenue-breakdown' ? (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">ผังบัญชี:</label>
              <select
                value={selectedAccountCode || 'ALL'}
                onChange={(e) => setSelectedAccountCode(e.target.value === 'ALL' ? '' : e.target.value)}
                className="text-sm border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="ALL">ทั้งหมด</option>
                {revenueBreakdown.map((acc) => (
                  <option key={acc.accountGroup} value={acc.accountGroup}>
                    {acc.accountName}
                  </option>
                ))}
              </select>
            </div>
          ) : selectedReport === 'expense-breakdown' ? (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">ผังบัญชี:</label>
              <select
                value={selectedAccountCode || 'ALL'}
                onChange={(e) => setSelectedAccountCode(e.target.value === 'ALL' ? '' : e.target.value)}
                className="text-sm border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="ALL">ทั้งหมด</option>
                {expenseBreakdown.map((acc) => (
                  <option key={acc.accountGroup} value={acc.accountGroup}>
                    {acc.accountName}
                  </option>
                ))}
              </select>
            </div>
          ) : undefined}
          queryInfo={selectedReport === 'profit-loss' ? {
            query: getProfitLossQuery(dateRange),
            format: 'JSONEachRow'
          } : selectedReport === 'balance-sheet' ? {
            query: getBalanceSheetQuery(dateRange),
            format: 'JSONEachRow'
          } : selectedReport === 'cash-flow' ? {
            query: getCashFlowQuery(dateRange),
            format: 'JSONEachRow'
          } : selectedReport === 'ar-aging' ? {
            query: getARAgingQuery(dateRange),
            format: 'JSONEachRow'
          } : selectedReport === 'ap-aging' ? {
            query: getAPAgingQuery(dateRange),
            format: 'JSONEachRow'
          } : selectedReport === 'revenue-breakdown' ? {
            query: getRevenueBreakdownQuery(dateRange),
            format: 'JSONEachRow'
          } : selectedReport === 'expense-breakdown' ? {
            query: getExpenseBreakdownQuery(dateRange),
            format: 'JSONEachRow'
          } : selectedReport === 'chart-of-accounts' ? {
            query: getChartOfAccountsListQuery(dateRange),
            format: 'JSONEachRow'
          } : undefined}
          onExportExcel={getExportFunction()}
          onExportPDF={getExportPdfFunction()}
        >
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            renderReportContent()
          )}
        </DataCard>
      </ErrorBoundary>
      </motion.div>
    </motion.div>
  );
}
