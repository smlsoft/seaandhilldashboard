'use client';

import { useState, useEffect } from 'react';
import { DataCard } from '@/components/DataCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { PaginatedTable, type ColumnDef } from '@/components/PaginatedTable';
import { ReportTypeSelector, type ReportOption } from '@/components/ReportTypeSelector';
import {
  TrendingUp,
  Users,
  ShoppingBag,
  MapPin,
  UserCheck,
  CreditCard,
} from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import { exportStyledReport } from '@/lib/exportExcel';
import { formatCurrency, formatNumber, formatDate, formatPercent } from '@/lib/formatters';
import { useReportHash } from '@/hooks/useReportHash';
import type {
  DateRange,
  SalesTrendData,
  TopProduct,
  SalesByBranch,
  SalesBySalesperson,
  TopCustomer,
  ARStatus,
} from '@/lib/data/types';

// Report types
type ReportType =
  | 'sales-trend'
  | 'top-products'
  | 'by-branch'
  | 'by-salesperson'
  | 'top-customers'
  | 'ar-status';

const reportOptions: ReportOption<ReportType>[] = [
  {
    value: 'sales-trend',
    label: 'แนวโน้มยอดขาย',
    icon: TrendingUp,
    description: 'ยอดขายและจำนวนออเดอร์รายวัน',
  },
  {
    value: 'top-products',
    label: 'สินค้าขายดี',
    icon: ShoppingBag,
    description: 'สินค้าที่มียอดขายสูงสุด',
  },
  {
    value: 'by-branch',
    label: 'ยอดขายตามสาขา',
    icon: MapPin,
    description: 'ยอดขายแยกตามสาขา/คลัง',
  },
  {
    value: 'by-salesperson',
    label: 'ยอดขายตามพนักงาน',
    icon: UserCheck,
    description: 'ยอดขายแยกตามพนักงานขาย',
  },
  {
    value: 'top-customers',
    label: 'ลูกค้ารายสำคัญ',
    icon: Users,
    description: 'ลูกค้าที่มียอดซื้อสูงสุด',
  },
  {
    value: 'ar-status',
    label: 'สถานะลูกหนี้การค้า',
    icon: CreditCard,
    description: 'สรุปสถานะการชำระเงินของลูกค้า',
  },
];

export default function SalesReportPage() {
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRange('THIS_MONTH')
  );
  const [selectedReport, setSelectedReport] = useState<ReportType>('sales-trend');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [trendData, setTrendData] = useState<SalesTrendData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesByBranch, setSalesByBranch] = useState<SalesByBranch[]>([]);
  const [salesBySalesperson, setSalesBySalesperson] = useState<
    SalesBySalesperson[]
  >([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [arStatus, setArStatus] = useState<ARStatus[]>([]);

  // Handle URL hash for report selection
  useReportHash(reportOptions, setSelectedReport);

  useEffect(() => {
    fetchReportData(selectedReport);
  }, [dateRange, selectedReport]);

  const fetchReportData = async (reportType: ReportType) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      let endpoint = '';
      switch (reportType) {
        case 'sales-trend':
          endpoint = `/api/sales/trend?${params}`;
          break;
        case 'top-products':
          endpoint = `/api/sales/top-products?${params}`;
          break;
        case 'by-branch':
          endpoint = `/api/sales/by-branch?${params}`;
          break;
        case 'by-salesperson':
          endpoint = `/api/sales/by-salesperson?${params}`;
          break;
        case 'top-customers':
          endpoint = `/api/sales/top-customers?${params}`;
          break;
        case 'ar-status':
          endpoint = `/api/sales/ar-status?${params}`;
          break;
      }

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Failed to fetch ${reportType} data`);

      const result = await response.json();

      switch (reportType) {
        case 'sales-trend':
          setTrendData(result.data);
          break;
        case 'top-products':
          setTopProducts(result.data);
          break;
        case 'by-branch':
          setSalesByBranch(result.data);
          break;
        case 'by-salesperson':
          setSalesBySalesperson(result.data);
          break;
        case 'top-customers':
          setTopCustomers(result.data);
          break;
        case 'ar-status':
          setArStatus(result.data);
          break;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
      );
      console.error('Error fetching sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Column definitions for Sales Trend
  const salesTrendColumns: ColumnDef<SalesTrendData>[] = [
    {
      key: 'date',
      header: 'วันที่',
      sortable: true,
      align: 'left',
      render: (item: SalesTrendData) => formatDate(item.date),
    },
    {
      key: 'sales',
      header: 'ยอดขาย',
      sortable: true,
      align: 'right',
      render: (item: SalesTrendData) => (
        <span className="font-medium text-green-600">
          ฿{formatCurrency(item.sales)}
        </span>
      ),
    },
    {
      key: 'orderCount',
      header: 'จำนวนออเดอร์',
      sortable: true,
      align: 'center',
      render: (item: SalesTrendData) => formatNumber(item.orderCount),
    },
    {
      key: 'avgOrderValue',
      header: 'ยอดเฉลี่ย/ออเดอร์',
      sortable: true,
      align: 'right',
      render: (item: SalesTrendData) => {
        const avg =
          item.orderCount > 0 ? item.sales / item.orderCount : 0;
        return <span>฿{formatCurrency(avg)}</span>;
      },
    },
  ];

  // Column definitions for Top Products
  const topProductsColumns: ColumnDef<TopProduct>[] = [
    {
      key: 'rank',
      header: '#',
      sortable: false,
      align: 'center',
      render: (_item: TopProduct, index?: number) => (
        <span className="text-muted-foreground">{(index || 0) + 1}</span>
      ),
    },
    {
      key: 'itemName',
      header: 'สินค้า',
      sortable: true,
      align: 'left',
      render: (item: TopProduct) => (
        <div>
          <div className="font-medium">{item.itemName}</div>
          <div className="text-xs text-muted-foreground">{item.itemCode}</div>
        </div>
      ),
    },
    {
      key: 'brandName',
      header: 'แบรนด์',
      sortable: true,
      align: 'left',
    },
    {
      key: 'categoryName',
      header: 'หมวดหมู่',
      sortable: true,
      align: 'left',
    },
    {
      key: 'totalQtySold',
      header: 'จำนวนขาย',
      sortable: true,
      align: 'right',
      render: (item: TopProduct) => formatNumber(item.totalQtySold),
    },
    {
      key: 'totalSales',
      header: 'ยอดขาย',
      sortable: true,
      align: 'right',
      render: (item: TopProduct) => (
        <span className="font-medium text-green-600">
          ฿{formatCurrency(item.totalSales)}
        </span>
      ),
    },
    {
      key: 'totalProfit',
      header: 'กำไร',
      sortable: true,
      align: 'right',
      render: (item: TopProduct) => (
        <span className="font-medium text-blue-600">
          ฿{formatCurrency(item.totalProfit)}
        </span>
      ),
    },
    {
      key: 'profitMarginPct',
      header: 'อัตรากำไร',
      sortable: true,
      align: 'right',
      render: (item: TopProduct) => {
        const color =
          item.profitMarginPct >= 30
            ? 'text-green-600'
            : item.profitMarginPct >= 15
              ? 'text-yellow-600'
              : 'text-red-600';
        return (
          <span className={`font-medium ${color}`}>
            {formatPercent(item.profitMarginPct)}
          </span>
        );
      },
    },
  ];

  // Column definitions for Sales by Branch
  const salesByBranchColumns: ColumnDef<SalesByBranch>[] = [
    {
      key: 'branchCode',
      header: 'รหัสสาขา',
      sortable: true,
      align: 'left',
      render: (item: SalesByBranch) => (
        <span className="font-mono text-xs">{item.branchCode}</span>
      ),
    },
    {
      key: 'branchName',
      header: 'ชื่อสาขา',
      sortable: true,
      align: 'left',
      render: (item: SalesByBranch) => (
        <span className="font-medium">{item.branchName}</span>
      ),
    },
    {
      key: 'orderCount',
      header: 'จำนวนออเดอร์',
      sortable: true,
      align: 'right',
      render: (item: SalesByBranch) => formatNumber(item.orderCount),
    },
    {
      key: 'totalSales',
      header: 'ยอดขาย',
      sortable: true,
      align: 'right',
      render: (item: SalesByBranch) => (
        <span className="font-medium text-green-600">
          ฿{formatCurrency(item.totalSales)}
        </span>
      ),
    },
    {
      key: 'avgPerOrder',
      header: 'ยอดเฉลี่ย/ออเดอร์',
      sortable: false,
      align: 'right',
      render: (item: SalesByBranch) => {
        const avg =
          item.orderCount > 0 ? item.totalSales / item.orderCount : 0;
        return <span>฿{formatCurrency(avg)}</span>;
      },
    },
  ];

  // Column definitions for Sales by Salesperson
  const salesBySalespersonColumns: ColumnDef<SalesBySalesperson>[] = [
    {
      key: 'saleCode',
      header: 'รหัสพนักงาน',
      sortable: true,
      align: 'left',
      render: (item: SalesBySalesperson) => (
        <span className="font-mono text-xs">{item.saleCode}</span>
      ),
    },
    {
      key: 'saleName',
      header: 'ชื่อพนักงาน',
      sortable: true,
      align: 'left',
      render: (item: SalesBySalesperson) => (
        <span className="font-medium">{item.saleName}</span>
      ),
    },
    {
      key: 'customerCount',
      header: 'ลูกค้า',
      sortable: true,
      align: 'right',
      render: (item: SalesBySalesperson) => formatNumber(item.customerCount),
    },
    {
      key: 'orderCount',
      header: 'ออเดอร์',
      sortable: true,
      align: 'right',
      render: (item: SalesBySalesperson) => formatNumber(item.orderCount),
    },
    {
      key: 'totalSales',
      header: 'ยอดขาย',
      sortable: true,
      align: 'right',
      render: (item: SalesBySalesperson) => (
        <span className="font-medium text-green-600">
          ฿{formatCurrency(item.totalSales)}
        </span>
      ),
    },
    {
      key: 'avgOrderValue',
      header: 'ยอดเฉลี่ย/ออเดอร์',
      sortable: true,
      align: 'right',
      render: (item: SalesBySalesperson) => (
        <span>฿{formatCurrency(item.avgOrderValue)}</span>
      ),
    },
  ];

  // Column definitions for Top Customers
  const topCustomersColumns: ColumnDef<TopCustomer>[] = [
    {
      key: 'rank',
      header: '#',
      sortable: false,
      align: 'center',
      render: (_item: TopCustomer, index?: number) => (
        <span className="text-muted-foreground">{(index || 0) + 1}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'ลูกค้า',
      sortable: true,
      align: 'left',
      render: (item: TopCustomer) => (
        <div>
          <div className="font-medium">{item.customerName}</div>
          <div className="text-xs text-muted-foreground">
            {item.customerCode}
          </div>
        </div>
      ),
    },
    {
      key: 'orderCount',
      header: 'ออเดอร์',
      sortable: true,
      align: 'right',
      render: (item: TopCustomer) => formatNumber(item.orderCount),
    },
    {
      key: 'totalSpent',
      header: 'ยอดซื้อรวม',
      sortable: true,
      align: 'right',
      render: (item: TopCustomer) => (
        <span className="font-medium text-green-600">
          ฿{formatCurrency(item.totalSpent)}
        </span>
      ),
    },
    {
      key: 'avgOrderValue',
      header: 'ยอดเฉลี่ย/ออเดอร์',
      sortable: true,
      align: 'right',
      render: (item: TopCustomer) => (
        <span>฿{formatCurrency(item.avgOrderValue)}</span>
      ),
    },
    {
      key: 'lastOrderDate',
      header: 'ซื้อล่าสุด',
      sortable: true,
      align: 'center',
      render: (item: TopCustomer) => formatDate(item.lastOrderDate),
    },
    {
      key: 'daysSinceLastOrder',
      header: 'วันที่ผ่านมา',
      sortable: true,
      align: 'center',
      render: (item: TopCustomer) => {
        const days = item.daysSinceLastOrder;
        const color =
          days <= 30
            ? 'text-green-600'
            : days <= 60
              ? 'text-yellow-600'
              : 'text-red-600';
        return <span className={`font-medium ${color}`}>{days} วัน</span>;
      },
    },
  ];

  // Column definitions for AR Status
  const arStatusColumns: ColumnDef<ARStatus>[] = [
    {
      key: 'statusPayment',
      header: 'สถานะชำระ',
      sortable: true,
      align: 'left',
      render: (item: ARStatus) => {
        const statusMap: { [key: string]: { label: string; color: string } } = {
          Paid: { label: 'ชำระแล้ว', color: 'text-green-600' },
          Partial: { label: 'ชำระบางส่วน', color: 'text-yellow-600' },
          Unpaid: { label: 'ยังไม่ชำระ', color: 'text-red-600' },
        };
        const status = statusMap[item.statusPayment] || {
          label: item.statusPayment || 'ไม่ระบุ',
          color: 'text-gray-600',
        };
        return (
          <span className={`font-medium ${status.color}`}>{status.label}</span>
        );
      },
    },
    {
      key: 'invoiceCount',
      header: 'จำนวนใบแจ้งหนี้',
      sortable: true,
      align: 'right',
      render: (item: ARStatus) => formatNumber(item.invoiceCount),
    },
    {
      key: 'totalInvoiceAmount',
      header: 'ยอดรวม',
      sortable: true,
      align: 'right',
      render: (item: ARStatus) => (
        <span>฿{formatCurrency(item.totalInvoiceAmount)}</span>
      ),
    },
    {
      key: 'totalPaid',
      header: 'ชำระแล้ว',
      sortable: true,
      align: 'right',
      render: (item: ARStatus) => (
        <span className="text-green-600">฿{formatCurrency(item.totalPaid)}</span>
      ),
    },
    {
      key: 'totalOutstanding',
      header: 'ค้างชำระ',
      sortable: true,
      align: 'right',
      render: (item: ARStatus) => (
        <span className="font-medium text-red-600">
          ฿{formatCurrency(item.totalOutstanding)}
        </span>
      ),
    },
    {
      key: 'paidPercent',
      header: '% ชำระ',
      sortable: false,
      align: 'right',
      render: (item: ARStatus) => {
        const pct =
          item.totalInvoiceAmount > 0
            ? (item.totalPaid / item.totalInvoiceAmount) * 100
            : 0;
        const color =
          pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{formatPercent(pct)}</span>;
      },
    },
  ];

  // Get current report option
  const currentReport = reportOptions.find(opt => opt.value === selectedReport);

  // Render report content based on selected type
  const renderReportContent = () => {
    switch (selectedReport) {
      case 'sales-trend':
        return (
          <PaginatedTable
            data={trendData}
            columns={salesTrendColumns}
            itemsPerPage={15}
            emptyMessage="ไม่มีข้อมูลยอดขาย"
            defaultSortKey="date"
            defaultSortOrder="desc"
            keyExtractor={(item: SalesTrendData) => item.date}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                sales: (data) => {
                  const total = data.reduce((sum, item) => sum + item.sales, 0);
                  return <span className="font-medium text-green-600">฿{formatCurrency(total)}</span>;
                },
                orderCount: (data) => {
                  const total = data.reduce((sum, item) => sum + item.orderCount, 0);
                  return <span className="font-medium text-black">{total}</span>;
                },
                avgOrderValue: (data) => {
                  const totalAvg = data.reduce((sum, item) => {
                    const avg = item.orderCount > 0 ? item.sales / item.orderCount : 0;
                    return sum + avg;
                  }, 0);
                  return <span className="font-medium">฿{formatCurrency(totalAvg)}</span>;
                }
              }
            }}
          />
        );

      case 'top-products':
        return (
          <PaginatedTable
            data={topProducts}
            columns={topProductsColumns}
            itemsPerPage={15}
            emptyMessage="ไม่มีข้อมูลสินค้าขายดี"
            defaultSortKey="totalSales"
            defaultSortOrder="desc"
            keyExtractor={(item: TopProduct) => item.itemCode}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                totalQtySold: (data) => {
                  const total = data.reduce((sum, item) => sum + item.totalQtySold, 0);
                  return <span className="font-medium text-black">{formatNumber(total)}</span>;
                },
                totalSales: (data) => {
                  const total = data.reduce((sum, item) => sum + item.totalSales, 0);
                  return <span className="font-medium text-green-600">฿{formatCurrency(total)}</span>;
                },
                totalProfit: (data) => {
                  const total = data.reduce((sum, item) => sum + item.totalProfit, 0);
                  return <span className="font-medium text-blue-600">฿{formatCurrency(total)}</span>;
                }
              }
            }}
          />
        );

      case 'by-branch':
        return (
          <PaginatedTable
            data={salesByBranch}
            columns={salesByBranchColumns}
            itemsPerPage={10}
            emptyMessage="ไม่มีข้อมูลสาขา"
            defaultSortKey="totalSales"
            defaultSortOrder="desc"
            keyExtractor={(item: SalesByBranch) => item.branchCode}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                orderCount: (data) => {
                  const total = data.reduce((sum, item) => sum + item.orderCount, 0);
                  return <span className="font-medium text-black">{formatNumber(total)}</span>;
                },
                totalSales: (data) => {
                  const total = data.reduce((sum, item) => sum + item.totalSales, 0);
                  return <span className="font-medium text-green-600">฿{formatCurrency(total)}</span>;
                }
              }
            }}
          />
        );

      case 'by-salesperson':
        return (
          <PaginatedTable
            data={salesBySalesperson}
            columns={salesBySalespersonColumns}
            itemsPerPage={10}
            emptyMessage="ไม่มีข้อมูลพนักงานขาย"
            defaultSortKey="totalSales"
            defaultSortOrder="desc"
            keyExtractor={(item: SalesBySalesperson) => item.saleCode}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                orderCount: (data) => {
                  const total = data.reduce((sum, item) => sum + item.orderCount, 0);
                  return <span className="font-medium text-black">{formatNumber(total)}</span>;
                },
                totalSales: (data) => {
                  const total = data.reduce((sum, item) => sum + item.totalSales, 0);
                  return <span className="font-medium text-green-600">฿{formatCurrency(total)}</span>;
                }
              }
            }}
          />
        );

      case 'top-customers':
        return (
          <PaginatedTable
            data={topCustomers}
            columns={topCustomersColumns}
            itemsPerPage={10}
            emptyMessage="ไม่มีข้อมูลลูกค้า"
            defaultSortKey="totalSpent"
            defaultSortOrder="desc"
            keyExtractor={(item: TopCustomer) => item.customerCode}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                orderCount: (data) => {
                  const total = data.reduce((sum, item) => sum + item.orderCount, 0);
                  return <span className="font-medium text-black">{formatNumber(total)}</span>;
                },
                totalSpent: (data) => {
                  const total = data.reduce((sum, item) => sum + item.totalSpent, 0);
                  return <span className="font-medium text-green-600">฿{formatCurrency(total)}</span>;
                },
                avgOrderValue: (data) => {
                  const totalAvg = data.reduce((sum, item) => {
                    const avg = item.orderCount > 0 ? item.avgOrderValue : 0;
                    return sum + avg;
                  }, 0);
                  return <span className="font-medium">฿{formatCurrency(totalAvg)}</span>;
                }
              }
            }}
          />
        );

      case 'ar-status':
        return (
          <PaginatedTable
            data={arStatus}
            columns={arStatusColumns}
            itemsPerPage={10}
            emptyMessage="ไม่มีข้อมูลลูกหนี้"
            defaultSortKey="totalOutstanding"
            defaultSortOrder="desc"
            keyExtractor={(item: ARStatus) => item.statusPayment}
          />
        );

      default:
        return null;
    }
  };

  // Get export function based on report type
  const getExportFunction = () => {
    switch (selectedReport) {
      case 'sales-trend':
        return () => {
          const dataWithAvg = trendData.map(item => ({
            ...item,
            avgOrderValue: item.orderCount > 0 ? item.sales / item.orderCount : 0
          }));
          exportStyledReport({
            data: dataWithAvg,
            headers: { date: 'วันที่', sales: 'ยอดขาย', orderCount: 'จำนวนออเดอร์', avgOrderValue: 'ยอดเฉลี่ย/ออเดอร์' },
            filename: 'แนวโน้มยอดขาย',
            sheetName: 'Sales Trend',
            title: 'รายงานแนวโน้มยอดขาย',
            subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
            currencyColumns: ['sales', 'avgOrderValue'],
            numberColumns: ['orderCount'],
            summaryConfig: {
              columns: {
                sales: 'sum',
                orderCount: 'sum',
                avgOrderValue: 'sum'
              }
            }
          });
        };

      case 'top-products':
        return () => exportStyledReport({
          data: topProducts,
          headers: { itemCode: 'รหัสสินค้า', itemName: 'ชื่อสินค้า', brandName: 'แบรนด์', categoryName: 'หมวดหมู่', totalQtySold: 'จำนวนขาย', totalSales: 'ยอดขาย', totalProfit: 'กำไร', profitMarginPct: 'อัตรากำไร (%)' },
          filename: 'สินค้าขายดี',
          sheetName: 'Top Products',
          title: 'รายงานสินค้าขายดี',
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
          numberColumns: ['totalQtySold'],
          currencyColumns: ['totalSales', 'totalProfit'],
          percentColumns: ['profitMarginPct'],
          summaryConfig: {
            columns: {
              totalQtySold: 'sum',
              totalSales: 'sum',
              totalProfit: 'sum',
            }
          }
        });

      case 'by-branch':
        return () => exportStyledReport({
          data: salesByBranch,
          headers: { branchCode: 'รหัสสาขา', branchName: 'ชื่อสาขา', orderCount: 'จำนวนออเดอร์', totalSales: 'ยอดขาย' },
          filename: 'ยอดขายตามสาขา',
          sheetName: 'Sales by Branch',
          title: 'รายงานยอดขายตามสาขา',
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
          numberColumns: ['orderCount'],
          currencyColumns: ['totalSales'],
          summaryConfig: {
            columns: {
              orderCount: 'sum',
              totalSales: 'sum',
            }
          }
        });

      case 'by-salesperson':
        return () => exportStyledReport({
          data: salesBySalesperson,
          headers: { saleCode: 'รหัสพนักงาน', saleName: 'ชื่อพนักงาน', customerCount: 'ลูกค้า', orderCount: 'ออเดอร์', totalSales: 'ยอดขาย', avgOrderValue: 'ยอดเฉลี่ย/ออเดอร์' },
          filename: 'ยอดขายตามพนักงาน',
          sheetName: 'Sales by Salesperson',
          title: 'รายงานยอดขายตามพนักงาน',
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
          numberColumns: ['customerCount', 'orderCount'],
          currencyColumns: ['totalSales', 'avgOrderValue'],
          summaryConfig: {
            columns: {
              customerCount: 'sum',
              orderCount: 'sum',
              totalSales: 'sum',
            }
          }
        });

      case 'top-customers':
        return () => exportStyledReport({
          data: topCustomers,
          headers: { customerCode: 'รหัสลูกค้า', customerName: 'ชื่อลูกค้า', orderCount: 'จำนวนออเดอร์', totalSpent: 'ยอดซื้อรวม', avgOrderValue: 'ยอดเฉลี่ย/ออเดอร์', lastOrderDate: 'ซื้อล่าสุด', daysSinceLastOrder: 'วันที่ผ่านมา' },
          filename: 'ลูกค้ารายสำคัญ',
          sheetName: 'Top Customers',
          title: 'รายงานลูกค้ารายสำคัญ',
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
          numberColumns: ['orderCount', 'daysSinceLastOrder'],
          currencyColumns: ['totalSpent', 'avgOrderValue'],
          summaryConfig: {
            columns: {
              orderCount: 'sum',
              totalSpent: 'sum',
              avgOrderValue: 'avg',
            }
          }
        });

      case 'ar-status':
        return () => exportStyledReport({
          data: arStatus,
          headers: { statusPayment: 'สถานะชำระ', invoiceCount: 'จำนวนใบแจ้งหนี้', totalInvoiceAmount: 'ยอดรวม', totalPaid: 'ชำระแล้ว', totalOutstanding: 'ค้างชำระ' },
          filename: 'สถานะลูกหนี้การค้า',
          sheetName: 'AR Status',
          title: 'รายงานสถานะลูกหนี้การค้า',
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
          numberColumns: ['invoiceCount'],
          currencyColumns: ['totalInvoiceAmount', 'totalPaid', 'totalOutstanding'],
          summaryConfig: {
            columns: {
              invoiceCount: 'sum',
              totalInvoiceAmount: 'sum',
              totalPaid: 'sum',
              totalOutstanding: 'sum',
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
              รายงานยอดขายและลูกค้า
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              ข้อมูลรายงานยอดขาย สินค้า และลูกค้าในรูปแบบตาราง
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
