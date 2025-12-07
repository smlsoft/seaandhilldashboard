'use client';

import { useState, useEffect } from 'react';
import { DataCard } from '@/components/DataCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { PaginatedTable, type ColumnDef } from '@/components/PaginatedTable';
import {
  TrendingUp,
  Users,
  ShoppingBag,
  MapPin,
  UserCheck,
  CreditCard,
} from 'lucide-react';
import { getDateRange } from '@/lib/dateRanges';
import { exportToExcelWithHeaders } from '@/lib/exportExcel';
import type {
  DateRange,
  SalesTrendData,
  TopProduct,
  SalesByBranch,
  SalesBySalesperson,
  TopCustomer,
  ARStatus,
} from '@/lib/data/types';

export default function SalesReportPage() {
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRange('THIS_MONTH')
  );
  const [loading, setLoading] = useState(true);
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
        trendRes,
        productsRes,
        branchRes,
        salespersonRes,
        customersRes,
        arRes,
      ] = await Promise.all([
        fetch(`/api/sales/trend?${params}`),
        fetch(`/api/sales/top-products?${params}`),
        fetch(`/api/sales/by-branch?${params}`),
        fetch(`/api/sales/by-salesperson?${params}`),
        fetch(`/api/sales/top-customers?${params}`),
        fetch(`/api/sales/ar-status?${params}`),
      ]);

      if (!trendRes.ok) throw new Error('Failed to fetch trend data');
      if (!productsRes.ok) throw new Error('Failed to fetch top products');
      if (!branchRes.ok) throw new Error('Failed to fetch sales by branch');
      if (!salespersonRes.ok)
        throw new Error('Failed to fetch sales by salesperson');
      if (!customersRes.ok) throw new Error('Failed to fetch top customers');
      if (!arRes.ok) throw new Error('Failed to fetch AR status');

      const [
        trendDataRes,
        productsData,
        branchData,
        salespersonData,
        customersData,
        arData,
      ] = await Promise.all([
        trendRes.json(),
        productsRes.json(),
        branchRes.json(),
        salespersonRes.json(),
        customersRes.json(),
        arRes.json(),
      ]);

      setTrendData(trendDataRes.data);
      setTopProducts(productsData.data);
      setSalesByBranch(branchData.data);
      setSalesBySalesperson(salespersonData.data);
      setTopCustomers(customersData.data);
      setArStatus(arData.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
      );
      console.error('Error fetching sales data:', err);
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

  const formatNumber = (value: number): string => {
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  const formatPercent = (value: number): string => {
    return value.toFixed(1) + '%';
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
      align: 'right',
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
      align: 'left',
      render: (item: TopCustomer) => formatDate(item.lastOrderDate),
    },
    {
      key: 'daysSinceLastOrder',
      header: 'วันที่ผ่านมา',
      sortable: true,
      align: 'right',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            รายงานยอดขายและลูกค้า
          </h1>
          <p className="text-muted-foreground mt-1">
            ข้อมูลรายงานยอดขาย สินค้า และลูกค้าในรูปแบบตาราง
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Error Display */}
      {error && <ErrorDisplay error={error} onRetry={fetchAllData} />}

      {/* Sales Trend Table */}
      <ErrorBoundary>
        <DataCard
          id="sales-trend"
          title="แนวโน้มยอดขาย"
          description="ยอดขายและจำนวนออเดอร์รายวัน"
          onExportExcel={() => exportToExcelWithHeaders(
            trendData,
            { date: 'วันที่', sales: 'ยอดขาย', orderCount: 'จำนวนออเดอร์' },
            'แนวโน้มยอดขาย',
            'Sales Trend'
          )}
        >
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            <PaginatedTable
              data={trendData}
              columns={salesTrendColumns}
              itemsPerPage={15}
              emptyMessage="ไม่มีข้อมูลยอดขาย"
              defaultSortKey="date"
              defaultSortOrder="desc"
              keyExtractor={(item: SalesTrendData) => item.date}
            />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* Top Products Table */}
      <ErrorBoundary>
        <DataCard
          id="top-products"
          title="สินค้าขายดี"
          description="สินค้าที่มียอดขายสูงสุด"
          onExportExcel={() => exportToExcelWithHeaders(
            topProducts,
            { itemCode: 'รหัสสินค้า', itemName: 'ชื่อสินค้า', brandName: 'แบรนด์', categoryName: 'หมวดหมู่', totalQtySold: 'จำนวนขาย', totalSales: 'ยอดขาย' },
            'สินค้าขายดี',
            'Top Products'
          )}
        >
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            <PaginatedTable
              data={topProducts}
              columns={topProductsColumns}
              itemsPerPage={15}
              emptyMessage="ไม่มีข้อมูลสินค้าขายดี"
              defaultSortKey="totalSales"
              defaultSortOrder="desc"
              keyExtractor={(item: TopProduct) => item.itemCode}
            />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* Sales by Branch & Salesperson */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ErrorBoundary>
          <DataCard
            id="by-branch"
            title="ยอดขายตามสาขา"
            description="ยอดขายแยกตามสาขา/คลัง"
            onExportExcel={() => exportToExcelWithHeaders(
              salesByBranch,
              { branchCode: 'รหัสสาขา', branchName: 'ชื่อสาขา', orderCount: 'จำนวนออเดอร์', totalSales: 'ยอดขาย' },
              'ยอดขายตามสาขา',
              'Sales by Branch'
            )}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <PaginatedTable
                data={salesByBranch}
                columns={salesByBranchColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีข้อมูลสาขา"
                defaultSortKey="totalSales"
                defaultSortOrder="desc"
                keyExtractor={(item: SalesByBranch) => item.branchCode}
              />
            )}
          </DataCard>
        </ErrorBoundary>

        <ErrorBoundary>
          <DataCard
            id="by-salesperson"
            title="ยอดขายตามพนักงาน"
            description="ยอดขายแยกตามพนักงานขาย"
            onExportExcel={() => exportToExcelWithHeaders(
              salesBySalesperson,
              { saleCode: 'รหัสพนักงาน', saleName: 'ชื่อพนักงาน', orderCount: 'จำนวนออเดอร์', totalSales: 'ยอดขาย' },
              'ยอดขายตามพนักงาน',
              'Sales by Salesperson'
            )}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <PaginatedTable
                data={salesBySalesperson}
                columns={salesBySalespersonColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีข้อมูลพนักงานขาย"
                defaultSortKey="totalSales"
                defaultSortOrder="desc"
                keyExtractor={(item: SalesBySalesperson) => item.saleCode}
              />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>

      {/* Top Customers Table */}
      <ErrorBoundary>
        <DataCard
          id="top-customers"
          title="ลูกค้ารายสำคัญ"
          description="ลูกค้าที่มียอดซื้อสูงสุด"
          onExportExcel={() => exportToExcelWithHeaders(
            topCustomers,
            { customerCode: 'รหัสลูกค้า', customerName: 'ชื่อลูกค้า', orderCount: 'จำนวนออเดอร์', totalSpent: 'ยอดซื้อรวม', avgOrderValue: 'ยอดเฉลี่ย/ออเดอร์', lastOrderDate: 'ซื้อล่าสุด', daysSinceLastOrder: 'วันที่ผ่านมา' },
            'ลูกค้ารายสำคัญ',
            'Top Customers'
          )}
        >
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            <PaginatedTable
              data={topCustomers}
              columns={topCustomersColumns}
              itemsPerPage={15}
              emptyMessage="ไม่มีข้อมูลลูกค้า"
              defaultSortKey="totalSpent"
              defaultSortOrder="desc"
              keyExtractor={(item: TopCustomer) => item.customerCode}
            />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* AR Status Table */}
      <ErrorBoundary>
        <DataCard
          id="ar-status"
          title="สถานะลูกหนี้การค้า"
          description="สรุปสถานะการชำระเงินของลูกค้า"
          onExportExcel={() => exportToExcelWithHeaders(
            arStatus,
            { statusPayment: 'สถานะชำระ', invoiceCount: 'จำนวนใบแจ้งหนี้', totalInvoiceAmount: 'ยอดรวม', totalPaid: 'ชำระแล้ว', totalOutstanding: 'ค้างชำระ' },
            'สถานะลูกหนี้การค้า',
            'AR Status'
          )}
        >
          {loading ? (
            <TableSkeleton rows={5} />
          ) : (
            <PaginatedTable
              data={arStatus}
              columns={arStatusColumns}
              itemsPerPage={10}
              emptyMessage="ไม่มีข้อมูลลูกหนี้"
              defaultSortKey="totalOutstanding"
              defaultSortOrder="desc"
              keyExtractor={(item: ARStatus) => item.statusPayment}
            />
          )}
        </DataCard>
      </ErrorBoundary>
    </div>
  );
}
