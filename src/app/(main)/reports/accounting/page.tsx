'use client';

import { useState, useEffect } from 'react';
import { useBranchChange } from '@/lib/branch-events';
import { getSelectedBranch } from '@/app/actions/branch-actions';
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
} from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import { exportStyledReport } from '@/lib/exportExcel';
import { formatCurrency, formatDate, formatMonth } from '@/lib/formatters';
import { useReportHash } from '@/hooks/useReportHash';
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
} from '@/lib/data/accounting-queries';

// Report types
type ReportType =
  | 'profit-loss'
  | 'balance-sheet'
  | 'cash-flow'
  | 'ar-aging'
  | 'ap-aging'
  | 'revenue-breakdown'
  | 'expense-breakdown';

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
];

export default function AccountingReportPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('THIS_MONTH'));
  const [selectedReport, setSelectedReport] = useState<ReportType>('profit-loss');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [profitLossData, setProfitLossData] = useState<ProfitLossData[]>([]);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetItem[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [arAgingData, setArAgingData] = useState<AgingItem[]>([]);
  const [apAgingData, setApAgingData] = useState<AgingItem[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<CategoryBreakdown[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([]);

  // Balance sheet filter
  const [balanceSheetTypeFilter, setBalanceSheetTypeFilter] = useState<string>('all');

  // Handle URL hash for report selection
  useReportHash(reportOptions, setSelectedReport);

  useEffect(() => {
    fetchReportData(selectedReport);
  }, [dateRange, selectedReport]);

  // Listen for branch changes
  useBranchChange(() => fetchReportData(selectedReport));

  const fetchReportData = async (reportType: ReportType) => {
    setLoading(true);
    setError(null);

    try {
      const branches = await getSelectedBranch();
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      if (branches.length > 0 && !branches.includes('ALL')) {
        branches.forEach(b => params.append('branch', b));
      }

      let endpoint = '';
      switch (reportType) {
        case 'profit-loss':
          endpoint = `/api/accounting/profit-loss?${params}`;
          break;
        case 'balance-sheet': {
          const bsParams = new URLSearchParams({ as_of_date: dateRange.end });
          if (branches.length > 0 && !branches.includes('ALL')) {
            branches.forEach(b => bsParams.append('branch', b));
          }
          endpoint = `/api/accounting/balance-sheet?${bsParams}`;
          break;
        }
        case 'cash-flow':
          endpoint = `/api/accounting/cash-flow?${params}`;
          break;
        case 'ar-aging': {
          const arParams = new URLSearchParams();
          if (branches.length > 0 && !branches.includes('ALL')) {
            branches.forEach(b => arParams.append('branch', b));
          }
          endpoint = arParams.toString() ? `/api/accounting/ar-aging?${arParams}` : '/api/accounting/ar-aging';
          break;
        }
        case 'ap-aging': {
          const apParams = new URLSearchParams();
          if (branches.length > 0 && !branches.includes('ALL')) {
            branches.forEach(b => apParams.append('branch', b));
          }
          endpoint = apParams.toString() ? `/api/accounting/ap-aging?${apParams}` : '/api/accounting/ap-aging';
          break;
        }
        case 'revenue-breakdown':
        case 'expense-breakdown':
          endpoint = `/api/accounting/revenue-expense-breakdown?${params}`;
          break;
      }

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Failed to fetch ${reportType} data`);

      const result = await response.json();

      switch (reportType) {
        case 'profit-loss':
          setProfitLossData(result.data);
          break;
        case 'balance-sheet':
          setBalanceSheetData(result.data);
          break;
        case 'cash-flow':
          setCashFlowData(result.data);
          break;
        case 'ar-aging':
          setArAgingData(result.data);
          break;
        case 'ap-aging':
          setApAgingData(result.data);
          break;
        case 'revenue-breakdown':
          setRevenueBreakdown(result.data.revenue);
          setExpenseBreakdown(result.data.expenses);
          break;
        case 'expense-breakdown':
          if (!revenueBreakdown.length) {
            setRevenueBreakdown(result.data.revenue);
          }
          setExpenseBreakdown(result.data.expenses);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      console.error('Error fetching accounting data:', err);
    } finally {
      setLoading(false);
    }
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

  // Column definitions for Category Breakdown
  const breakdownColumns: ColumnDef<CategoryBreakdown>[] = [
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
            keyExtractor={(item: BalanceSheetItem) => item.accountCode}
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
            keyExtractor={(item: AgingItem) => item.docNo}
          />
        );

      case 'revenue-breakdown':
      case 'expense-breakdown':
        const breakdownData = selectedReport === 'revenue-breakdown' ? revenueBreakdown : expenseBreakdown;
        return (
          <PaginatedTable
            data={breakdownData}
            columns={breakdownColumns}
            itemsPerPage={10}
            emptyMessage="ไม่มีข้อมูล"
            defaultSortKey="amount"
            defaultSortOrder="desc"
            keyExtractor={(item: CategoryBreakdown) => item.accountGroup}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                amount: (data) => {
                  const total = data.reduce((sum, item) => sum + item.amount, 0);
                  return (
                    <span className={`font-bold ${selectedReport === 'revenue-breakdown' ? 'text-green-600' : 'text-red-600'}`}>
                      ฿{formatCurrency(total)}
                    </span>
                  );
                }
              }
            }}
          />
        );

      default:
        return null;
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
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
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
          subtitle: `ณ วันที่ ${dateRange.end}`,
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
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
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
          subtitle: `ณ วันที่ ${new Date().toLocaleDateString('th-TH')}`,
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
          subtitle: `ณ วันที่ ${new Date().toLocaleDateString('th-TH')}`,
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
          headers: { accountGroup: 'รหัสกลุ่ม', accountName: 'ชื่อบัญชี', amount: 'จำนวนเงิน', percentage: 'สัดส่วน (%)' },
          filename: 'รายงานรายได้ตามหมวด',
          sheetName: 'Revenue Breakdown',
          title: 'รายงานรายได้ตามหมวด',
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
          currencyColumns: ['amount'],
          percentColumns: ['percentage'],
          summaryConfig: {
            columns: {
              amount: 'sum',
            }
          }
        });

      case 'expense-breakdown':
        return () => exportStyledReport({
          data: expenseBreakdown,
          headers: { accountGroup: 'รหัสกลุ่ม', accountName: 'ชื่อบัญชี', amount: 'จำนวนเงิน', percentage: 'สัดส่วน (%)' },
          filename: 'รายงานค่าใช้จ่ายตามหมวด',
          sheetName: 'Expense Breakdown',
          title: 'รายงานค่าใช้จ่ายตามหมวด',
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
          currencyColumns: ['amount'],
          percentColumns: ['percentage'],
          summaryConfig: {
            columns: {
              amount: 'sum',
            }
          }
        });

      default:
        return undefined;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with integrated controls */}
      <div className="flex flex-col gap-4">
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
          onChange={(value) => setSelectedReport(value as ReportType)}
        />
      </div>

      {/* Error Display */}
      {error && <ErrorDisplay error={error} onRetry={() => fetchReportData(selectedReport)} />}

      {/* Report Content */}
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
          ) : undefined}
          queryInfo={selectedReport === 'profit-loss' ? {
            query: getProfitLossQuery(dateRange),
            format: 'JSONEachRow'
          } : selectedReport === 'balance-sheet' ? {
            query: getBalanceSheetQuery(dateRange.end),
            format: 'JSONEachRow'
          } : selectedReport === 'cash-flow' ? {
            query: getCashFlowQuery(dateRange),
            format: 'JSONEachRow'
          } : selectedReport === 'ar-aging' ? {
            query: getARAgingQuery(),
            format: 'JSONEachRow'
          } : selectedReport === 'ap-aging' ? {
            query: getAPAgingQuery(),
            format: 'JSONEachRow'
          } : selectedReport === 'revenue-breakdown' ? {
            query: getRevenueBreakdownQuery(dateRange),
            format: 'JSONEachRow'
          } : selectedReport === 'expense-breakdown' ? {
            query: getExpenseBreakdownQuery(dateRange),
            format: 'JSONEachRow'
          } : undefined}
          onExportExcel={getExportFunction()}
        >
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            renderReportContent()
          )}
        </DataCard>
      </ErrorBoundary>
    </div>
  );
}
