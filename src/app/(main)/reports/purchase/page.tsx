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
  FolderTree,
  Tag,
  CreditCard,
} from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import { exportStyledReport } from '@/lib/exportExcel';
import { formatCurrency, formatNumber, formatDate, formatPercent, formatMonth } from '@/lib/formatters';
import { useReportHash } from '@/hooks/useReportHash';
import type {
  DateRange,
  PurchaseTrendData,
  TopSupplier,
  PurchaseByCategory,
  PurchaseByBrand,
  APOutstanding,
} from '@/lib/data/types';

// Report types
type ReportType =
  | 'purchase-trend'
  | 'top-suppliers'
  | 'by-category'
  | 'by-brand'
  | 'ap-outstanding';

const reportOptions: ReportOption<ReportType>[] = [
  {
    value: 'purchase-trend',
    label: 'แนวโน้มการจัดซื้อ',
    icon: TrendingUp,
    description: 'ยอดจัดซื้อและจำนวนใบสั่งซื้อรายวัน',
  },
  {
    value: 'top-suppliers',
    label: 'ซัพพลายเออร์ยอดนิยม',
    icon: Users,
    description: 'ซัพพลายเออร์ที่มียอดซื้อสูงสุด',
  },
  {
    value: 'by-category',
    label: 'การซื้อตามหมวดหมู่',
    icon: FolderTree,
    description: 'ยอดจัดซื้อแยกตามหมวดหมู่สินค้า',
  },
  {
    value: 'by-brand',
    label: 'การซื้อตามแบรนด์',
    icon: Tag,
    description: 'ยอดจัดซื้อแยกตามแบรนด์สินค้า',
  },
  {
    value: 'ap-outstanding',
    label: 'สถานะเจ้าหนี้การค้า',
    icon: CreditCard,
    description: 'ยอดค้างชำระแยกตามซัพพลายเออร์',
  },
];

export default function PurchaseReportPage() {
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRange('THIS_MONTH')
  );
  const [selectedReport, setSelectedReport] = useState<ReportType>('purchase-trend');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [trendData, setTrendData] = useState<PurchaseTrendData[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [purchaseByCategory, setPurchaseByCategory] = useState<PurchaseByCategory[]>([]);
  const [purchaseByBrand, setPurchaseByBrand] = useState<PurchaseByBrand[]>([]);
  const [apOutstanding, setApOutstanding] = useState<APOutstanding[]>([]);

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
        case 'purchase-trend':
          endpoint = `/api/purchase/trend?${params}`;
          break;
        case 'top-suppliers':
          endpoint = `/api/purchase/top-suppliers?${params}`;
          break;
        case 'by-category':
          endpoint = `/api/purchase/by-category?${params}`;
          break;
        case 'by-brand':
          endpoint = `/api/purchase/by-brand?${params}`;
          break;
        case 'ap-outstanding':
          endpoint = `/api/purchase/ap-outstanding?${params}`;
          break;
      }

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Failed to fetch ${reportType} data`);

      const result = await response.json();

      switch (reportType) {
        case 'purchase-trend':
          setTrendData(result.data);
          break;
        case 'top-suppliers':
          setTopSuppliers(result.data);
          break;
        case 'by-category':
          setPurchaseByCategory(result.data);
          break;
        case 'by-brand':
          setPurchaseByBrand(result.data);
          break;
        case 'ap-outstanding':
          setApOutstanding(result.data);
          break;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
      );
      console.error('Error fetching purchase data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Column definitions for Purchase Trend
  const purchaseTrendColumns: ColumnDef<PurchaseTrendData>[] = [
    {
      key: 'month',
      header: 'เดือน',
      sortable: true,
      align: 'left',
      render: (item: PurchaseTrendData) => formatMonth(item.month),
    },
    {
      key: 'totalPurchases',
      header: 'ยอดจัดซื้อ',
      sortable: true,
      align: 'right',
      render: (item: PurchaseTrendData) => (
        <span className="font-medium text-blue-600">
          ฿{formatCurrency(item.totalPurchases)}
        </span>
      ),
    },
    {
      key: 'poCount',
      header: 'จำนวน PO',
      sortable: true,
      align: 'center',
      render: (item: PurchaseTrendData) => formatNumber(item.poCount),
    },
    {
      key: 'avgPOValue',
      header: 'ยอดเฉลี่ย/PO',
      sortable: true,
      align: 'right',
      render: (item: PurchaseTrendData) => {
        const avg = item.poCount > 0 ? item.totalPurchases / item.poCount : 0;
        return <span>฿{formatCurrency(avg)}</span>;
      },
    },
  ];

  // Column definitions for Top Suppliers
  const topSuppliersColumns: ColumnDef<TopSupplier>[] = [
    {
      key: 'rank',
      header: '#',
      sortable: false,
      align: 'center',
      render: (_item: TopSupplier, index?: number) => (
        <span className="text-muted-foreground">{(index || 0) + 1}</span>
      ),
    },
    {
      key: 'supplierName',
      header: 'ซัพพลายเออร์',
      sortable: true,
      align: 'left',
      render: (item: TopSupplier) => (
        <div>
          <div className="font-medium">{item.supplierName}</div>
          <div className="text-xs text-muted-foreground">{item.supplierCode}</div>
        </div>
      ),
    },
    {
      key: 'poCount',
      header: 'จำนวน PO',
      sortable: true,
      align: 'right',
      render: (item: TopSupplier) => formatNumber(item.poCount),
    },
    {
      key: 'totalPurchases',
      header: 'ยอดซื้อรวม',
      sortable: true,
      align: 'right',
      render: (item: TopSupplier) => (
        <span className="font-medium text-blue-600">
          ฿{formatCurrency(item.totalPurchases)}
        </span>
      ),
    },
    {
      key: 'avgPOValue',
      header: 'ยอดเฉลี่ย/PO',
      sortable: true,
      align: 'right',
      render: (item: TopSupplier) => (
        <span>฿{formatCurrency(item.avgPOValue)}</span>
      ),
    },
    {
      key: 'lastPurchaseDate',
      header: 'ซื้อล่าสุด',
      sortable: true,
      align: 'center',
      render: (item: TopSupplier) => formatDate(item.lastPurchaseDate),
    },
  ];

  // Column definitions for Purchase by Category
  const purchaseByCategoryColumns: ColumnDef<PurchaseByCategory>[] = [
    {
      key: 'categoryName',
      header: 'หมวดหมู่',
      sortable: true,
      align: 'left',
      render: (item: PurchaseByCategory) => (
        <span className="font-medium">{item.categoryName}</span>
      ),
    },
    {
      key: 'uniqueItems',
      header: 'จำนวนรายการ',
      sortable: true,
      align: 'right',
      render: (item: PurchaseByCategory) => formatNumber(item.uniqueItems || 0),
    },
    {
      key: 'totalQty',
      header: 'จำนวนซื้อ',
      sortable: true,
      align: 'right',
      render: (item: PurchaseByCategory) => formatNumber(item.totalQty),
    },
    {
      key: 'totalPurchaseValue',
      header: 'ยอดซื้อ',
      sortable: true,
      align: 'right',
      render: (item: PurchaseByCategory) => (
        <span className="font-medium text-blue-600">
          ฿{formatCurrency(item.totalPurchaseValue)}
        </span>
      ),
    },
  ];

  // Column definitions for Purchase by Brand
  const purchaseByBrandColumns: ColumnDef<PurchaseByBrand>[] = [
    {
      key: 'brandName',
      header: 'แบรนด์',
      sortable: true,
      align: 'left',
      render: (item: PurchaseByBrand) => (
        <span className="font-medium">{item.brandName}</span>
      ),
    },
    {
      key: 'uniqueItems',
      header: 'จำนวนรายการ',
      sortable: true,
      align: 'right',
      render: (item: PurchaseByBrand) => formatNumber(item.uniqueItems || 0),
    },
    {
      key: 'totalPurchaseValue',
      header: 'ยอดซื้อ',
      sortable: true,
      align: 'right',
      render: (item: PurchaseByBrand) => (
        <span className="font-medium text-blue-600">
          ฿{formatCurrency(item.totalPurchaseValue)}
        </span>
      ),
    },
  ];

  // Column definitions for AP Status
  // Column definitions for AP Outstanding
  const apOutstandingColumns: ColumnDef<APOutstanding>[] = [
    {
      key: 'supplierName',
      header: 'ซัพพลายเออร์',
      sortable: true,
      align: 'left',
      render: (item: APOutstanding) => (
        <div>
          <div className="font-medium">{item.supplierName}</div>
          <div className="text-xs text-muted-foreground">{item.supplierCode}</div>
        </div>
      ),
    },
    {
      key: 'docCount',
      header: 'จำนวนเอกสาร',
      sortable: true,
      align: 'right',
      render: (item: APOutstanding) => formatNumber(item.docCount),
    },


    {
      key: 'totalOutstanding',
      header: 'ยอดค้างชำระ',
      sortable: true,
      align: 'right',
      render: (item: APOutstanding) => (
        <span className="font-medium text-orange-600">
          ฿{formatCurrency(item.totalOutstanding)}
        </span>
      ),
    },
    {
      key: 'overdueAmount',
      header: 'ยอดเกินกำหนด',
      sortable: true,
      align: 'right',
      render: (item: APOutstanding) => (
        <span className={`font-medium ${item.overdueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
          ฿{formatCurrency(item.overdueAmount)}
        </span>
      ),
    },
    {
      key: 'overduePercent',
      header: '% เกินกำหนด',
      sortable: false,
      align: 'right',
      render: (item: APOutstanding) => {
        const pct = item.totalOutstanding > 0
          ? (item.overdueAmount / item.totalOutstanding) * 100
          : 0;
        const color = pct >= 50 ? 'text-red-600' : pct >= 20 ? 'text-yellow-600' : 'text-green-600';
        return <span className={`font-medium ${color}`}>{pct.toFixed(1)}%</span>;
      },
    },
  ];

  // Get current report option
  const currentReport = reportOptions.find(opt => opt.value === selectedReport);

  // Render report content based on selected type
  const renderReportContent = () => {
    switch (selectedReport) {
      case 'purchase-trend':
        return (
          <PaginatedTable
            data={trendData}
            columns={purchaseTrendColumns}
            itemsPerPage={15}
            emptyMessage="ไม่มีข้อมูลการจัดซื้อ"
            defaultSortKey="month"
            defaultSortOrder="desc"
            keyExtractor={(item: PurchaseTrendData) => item.month}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                totalPurchases: (data) => {
                  const total = data.reduce((sum, item) => sum + item.totalPurchases, 0);
                  return <span className="font-medium text-blue-600">฿{formatCurrency(total)}</span>;
                },
                poCount: (data) => {
                  const total = data.reduce((sum, item) => sum + item.poCount, 0);
                  return <span className="font-medium text-black">{total}</span>;
                },
                avgPOValue: (data) => {
                  const totalPurchases = data.reduce((sum, item) => sum + item.totalPurchases, 0);
                  const totalPOs = data.reduce((sum, item) => sum + item.poCount, 0);
                  const avg = totalPOs > 0 ? totalPurchases / totalPOs : 0;
                  return <span className="font-medium">฿{formatCurrency(avg)}</span>;
                }
              }
            }}
          />
        );

      case 'top-suppliers':
        return (
          <PaginatedTable
            data={topSuppliers}
            columns={topSuppliersColumns}
            itemsPerPage={15}
            emptyMessage="ไม่มีข้อมูลซัพพลายเออร์"
            defaultSortKey="totalPurchase"
            defaultSortOrder="desc"
            keyExtractor={(item: TopSupplier) => item.supplierCode}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                poCount: (data) => {
                  const total = data.reduce((sum, item) => sum + item.poCount, 0);
                  return <span className="font-medium text-black">{formatNumber(total)}</span>;
                },
                totalPurchases: (data) => {
                  const total = data.reduce((sum, item) => sum + item.totalPurchases, 0);
                  return <span className="font-medium text-blue-600">฿{formatCurrency(total)}</span>;
                },
              }
            }}
          />
        );

      case 'by-category':
        return (
          <PaginatedTable
            data={purchaseByCategory}
            columns={purchaseByCategoryColumns}
            itemsPerPage={10}
            emptyMessage="ไม่มีข้อมูลหมวดหมู่"
            defaultSortKey="totalPurchase"
            defaultSortOrder="desc"
            keyExtractor={(item: PurchaseByCategory) => item.categoryName}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                totalQty: (data) => {
                  const total = data.reduce((sum, item) => sum + item.totalQty, 0);
                  return <span className="font-medium text-black">{formatNumber(total)}</span>;
                },
                totalPurchaseValue: (data) => {
                  const total = data.reduce((sum, item) => sum + item.totalPurchaseValue, 0);
                  return <span className="font-medium text-blue-600">฿{formatCurrency(total)}</span>;
                }
              }
            }}
          />
        );

      case 'by-brand':
        return (
          <PaginatedTable
            data={purchaseByBrand}
            columns={purchaseByBrandColumns}
            itemsPerPage={10}
            emptyMessage="ไม่มีข้อมูลแบรนด์"
            defaultSortKey="totalPurchase"
            defaultSortOrder="desc"
            keyExtractor={(item: PurchaseByBrand) => item.brandName}
            showSummary={true}
            summaryConfig={{
              labelColSpan: 1,
              values: {
                totalPurchaseValue: (data) => {
                  const total = data.reduce((sum, item) => sum + item.totalPurchaseValue, 0);
                  return <span className="font-medium text-blue-600">฿{formatCurrency(total)}</span>;
                }
              }
            }}
          />
        );

      case 'ap-outstanding':
        return (
          <PaginatedTable
            data={apOutstanding}
            columns={apOutstandingColumns}
            itemsPerPage={10}
            emptyMessage="ไม่มียอดค้างชำระ"
            defaultSortKey="totalOutstanding"
            defaultSortOrder="desc"
            keyExtractor={(item: APOutstanding) => item.supplierCode}
          />
        );

      default:
        return null;
    }
  };

  // Get export function based on report type
  const getExportFunction = () => {
    switch (selectedReport) {
      case 'purchase-trend':
        return () => {
          const dataWithAvg = trendData.map(item => ({
            ...item,
            avgPOValue: item.poCount > 0 ? item.totalPurchases / item.poCount : 0
          }));
          exportStyledReport({
            data: dataWithAvg,
            headers: { month: 'เดือน', totalPurchases: 'ยอดจัดซื้อ', poCount: 'จำนวน PO', avgPOValue: 'ยอดเฉลี่ย/PO' },
            filename: 'แนวโน้มการจัดซื้อ',
            sheetName: 'Purchase Trend',
            title: 'รายงานแนวโน้มการจัดซื้อ',
            subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
            currencyColumns: ['totalPurchases', 'avgPOValue'],
            numberColumns: ['poCount'],
            summaryConfig: {
              columns: {
                totalPurchases: 'sum',
                poCount: 'sum',
                avgPOValue: 'avg'
              }
            }
          });
        };

      case 'top-suppliers':
        return () => exportStyledReport({
          data: topSuppliers,
          headers: { supplierCode: 'รหัสซัพพลายเออร์', supplierName: 'ชื่อซัพพลายเออร์', orderCount: 'ใบสั่งซื้อ', totalPurchase: 'ยอดซื้อรวม', avgOrderValue: 'ยอดเฉลี่ย/ใบ', lastOrderDate: 'สั่งซื้อล่าสุด' },
          filename: 'ซัพพลายเออร์ยอดนิยม',
          sheetName: 'Top Suppliers',
          title: 'รายงานซัพพลายเออร์ยอดนิยม',
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
          numberColumns: ['orderCount'],
          currencyColumns: ['totalPurchase', 'avgOrderValue'],
          summaryConfig: {
            columns: {
              orderCount: 'sum',
              totalPurchase: 'sum',
            }
          }
        });

      case 'by-category':
        return () => exportStyledReport({
          data: purchaseByCategory,
          headers: { categoryName: 'หมวดหมู่', itemCount: 'จำนวนรายการ', totalQty: 'จำนวนซื้อ', totalPurchase: 'ยอดซื้อ', percentage: 'สัดส่วน (%)' },
          filename: 'การซื้อตามหมวดหมู่',
          sheetName: 'By Category',
          title: 'รายงานการซื้อตามหมวดหมู่',
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
          numberColumns: ['itemCount', 'totalQty'],
          currencyColumns: ['totalPurchase'],
          percentColumns: ['percentage'],
          summaryConfig: {
            columns: {
              totalQty: 'sum',
              totalPurchase: 'sum',
            }
          }
        });

      case 'by-brand':
        return () => exportStyledReport({
          data: purchaseByBrand,
          headers: { brandName: 'แบรนด์', itemCount: 'จำนวนรายการ', totalQty: 'จำนวนซื้อ', totalPurchase: 'ยอดซื้อ', percentage: 'สัดส่วน (%)' },
          filename: 'การซื้อตามแบรนด์',
          sheetName: 'By Brand',
          title: 'รายงานการซื้อตามแบรนด์',
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
          numberColumns: ['itemCount', 'totalQty'],
          currencyColumns: ['totalPurchase'],
          percentColumns: ['percentage'],
          summaryConfig: {
            columns: {
              totalQty: 'sum',
              totalPurchase: 'sum',
            }
          }
        });

      case 'ap-outstanding':
        return () => exportStyledReport({
          data: apOutstanding,
          headers: { supplierCode: 'รหัสซัพพลายเออร์', supplierName: 'ชื่อซัพพลายเออร์', docCount: 'จำนวนเอกสาร', totalOutstanding: 'ยอดค้างชำระ', overdueAmount: 'ยอดเกินกำหนด' },
          filename: 'สถานะเจ้าหนี้การค้า',
          sheetName: 'AP Outstanding',
          title: 'รายงานสถานะเจ้าหนี้การค้า',
          subtitle: `ช่วงวันที่ ${dateRange.start} ถึง ${dateRange.end}`,
          currencyColumns: ['totalOutstanding', 'overdueAmount'],
          numberColumns: ['docCount'],
          summaryConfig: {
            columns: {
              docCount: 'sum',
              totalOutstanding: 'sum',
              overdueAmount: 'sum',
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
              รายงานการจัดซื้อ
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              ข้อมูลรายงานการจัดซื้อและซัพพลายเออร์ในรูปแบบตาราง
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
          queryInfo={undefined}
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
