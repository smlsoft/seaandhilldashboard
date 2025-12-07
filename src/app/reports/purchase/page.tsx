'use client';

import { useState, useEffect } from 'react';
import { DataCard } from '@/components/DataCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { PaginatedTable, type ColumnDef } from '@/components/PaginatedTable';
import { getDateRange } from '@/lib/dateRanges';
import { exportToExcelWithHeaders } from '@/lib/exportExcel';
import type {
  DateRange,
  PurchaseTrendData,
  TopSupplier,
  PurchaseByCategory,
  PurchaseByBrand,
  APOutstanding,
} from '@/lib/data/types';

export default function PurchaseReportPage() {
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRange('THIS_MONTH')
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [trendData, setTrendData] = useState<PurchaseTrendData[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [purchaseByCategory, setPurchaseByCategory] = useState<PurchaseByCategory[]>([]);
  const [purchaseByBrand, setPurchaseByBrand] = useState<PurchaseByBrand[]>([]);
  const [apOutstanding, setApOutstanding] = useState<APOutstanding[]>([]);

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
        suppliersRes,
        categoryRes,
        brandRes,
        apRes,
      ] = await Promise.all([
        fetch(`/api/purchase/trend?${params}`),
        fetch(`/api/purchase/top-suppliers?${params}`),
        fetch(`/api/purchase/by-category?${params}`),
        fetch(`/api/purchase/by-brand?${params}`),
        fetch(`/api/purchase/ap-outstanding?${params}`),
      ]);

      if (!trendRes.ok) throw new Error('Failed to fetch trend data');
      if (!suppliersRes.ok) throw new Error('Failed to fetch top suppliers');
      if (!categoryRes.ok) throw new Error('Failed to fetch purchase by category');
      if (!brandRes.ok) throw new Error('Failed to fetch purchase by brand');
      if (!apRes.ok) throw new Error('Failed to fetch AP outstanding');

      const [
        trendDataRes,
        suppliersData,
        categoryData,
        brandData,
        apData,
      ] = await Promise.all([
        trendRes.json(),
        suppliersRes.json(),
        categoryRes.json(),
        brandRes.json(),
        apRes.json(),
      ]);

      setTrendData(trendDataRes.data);
      setTopSuppliers(suppliersData.data);
      setPurchaseByCategory(categoryData.data);
      setPurchaseByBrand(brandData.data);
      setApOutstanding(apData.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
      );
      console.error('Error fetching purchase data:', err);
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

  const formatMonth = (monthStr: string): string => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric',
    });
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
      header: 'ยอดซื้อ',
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
      align: 'right',
      render: (item: PurchaseTrendData) => formatNumber(item.poCount),
    },
    {
      key: 'avgPOValue',
      header: 'เฉลี่ยต่อ PO',
      sortable: false,
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
      header: 'เฉลี่ยต่อ PO',
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
      align: 'left',
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
        <div>
          <div className="font-medium">{item.categoryName}</div>
          <div className="text-xs text-muted-foreground">{item.categoryCode}</div>
        </div>
      ),
    },
    {
      key: 'totalQty',
      header: 'จำนวน',
      sortable: true,
      align: 'right',
      render: (item: PurchaseByCategory) => formatNumber(item.totalQty),
    },
    {
      key: 'uniqueItems',
      header: 'รายการสินค้า',
      sortable: true,
      align: 'right',
      render: (item: PurchaseByCategory) => formatNumber(item.uniqueItems || 0),
    },
    {
      key: 'totalPurchaseValue',
      header: 'มูลค่าซื้อ',
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
      key: 'rank',
      header: '#',
      sortable: false,
      align: 'center',
      render: (_item: PurchaseByBrand, index?: number) => (
        <span className="text-muted-foreground">{(index || 0) + 1}</span>
      ),
    },
    {
      key: 'brandName',
      header: 'แบรนด์',
      sortable: true,
      align: 'left',
      render: (item: PurchaseByBrand) => (
        <div>
          <div className="font-medium">{item.brandName}</div>
          <div className="text-xs text-muted-foreground">{item.brandCode}</div>
        </div>
      ),
    },
    {
      key: 'uniqueItems',
      header: 'รายการสินค้า',
      sortable: true,
      align: 'right',
      render: (item: PurchaseByBrand) => formatNumber(item.uniqueItems || 0),
    },
    {
      key: 'totalPurchaseValue',
      header: 'มูลค่าซื้อ',
      sortable: true,
      align: 'right',
      render: (item: PurchaseByBrand) => (
        <span className="font-medium text-blue-600">
          ฿{formatCurrency(item.totalPurchaseValue)}
        </span>
      ),
    },
  ];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            รายงานการจัดซื้อ
          </h1>
          <p className="text-muted-foreground mt-1">
            ข้อมูลรายงานการจัดซื้อและซัพพลายเออร์ในรูปแบบตาราง
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Error Display */}
      {error && <ErrorDisplay error={error} onRetry={fetchAllData} />}

      {/* Purchase Trend Table */}
      <ErrorBoundary>
        <DataCard
          id="purchase-trend"
          title="แนวโน้มการจัดซื้อ"
          description="ยอดซื้อและจำนวน PO รายเดือน"
          onExportExcel={() => exportToExcelWithHeaders(
            trendData,
            { month: 'เดือน', totalPurchases: 'ยอดซื้อ', poCount: 'จำนวน PO' },
            'แนวโน้มการจัดซื้อ',
            'Purchase Trend'
          )}
        >
          {loading ? (
            <TableSkeleton rows={6} />
          ) : (
            <PaginatedTable
              data={trendData}
              columns={purchaseTrendColumns}
              itemsPerPage={12}
              emptyMessage="ไม่มีข้อมูลการจัดซื้อ"
              defaultSortKey="month"
              defaultSortOrder="desc"
              keyExtractor={(item: PurchaseTrendData) => item.month}
            />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* Top Suppliers Table */}
      <ErrorBoundary>
        <DataCard
          id="top-suppliers"
          title="ซัพพลายเออร์ยอดนิยม Top 20"
          description="ซัพพลายเออร์ที่มียอดซื้อสูงสุด"
          onExportExcel={() => exportToExcelWithHeaders(
            topSuppliers,
            { supplierCode: 'รหัสซัพพลายเออร์', supplierName: 'ชื่อซัพพลายเออร์', poCount: 'จำนวน PO', totalPurchases: 'ยอดซื้อ' },
            'ซัพพลายเออร์ยอดนิยม',
            'Top Suppliers'
          )}
        >
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            <PaginatedTable
              data={topSuppliers}
              columns={topSuppliersColumns}
              itemsPerPage={10}
              emptyMessage="ไม่มีข้อมูลซัพพลายเออร์"
              defaultSortKey="totalPurchases"
              defaultSortOrder="desc"
              keyExtractor={(item: TopSupplier) => item.supplierCode}
            />
          )}
        </DataCard>
      </ErrorBoundary>

      {/* Purchase by Category & Brand */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ErrorBoundary>
          <DataCard
            id="by-category"
            title="การซื้อตามหมวดหมู่"
            description="ยอดซื้อแยกตามหมวดหมู่สินค้า"
            onExportExcel={() => exportToExcelWithHeaders(
              purchaseByCategory,
              { categoryCode: 'รหัสหมวดหมู่', categoryName: 'ชื่อหมวดหมู่', uniqueItems: 'รายการสินค้า', totalPurchaseValue: 'มูลค่าซื้อ' },
              'การซื้อตามหมวดหมู่',
              'Purchase by Category'
            )}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <PaginatedTable
                data={purchaseByCategory}
                columns={purchaseByCategoryColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีข้อมูลหมวดหมู่"
                defaultSortKey="totalPurchaseValue"
                defaultSortOrder="desc"
                keyExtractor={(item: PurchaseByCategory) => item.categoryCode}
              />
            )}
          </DataCard>
        </ErrorBoundary>

        <ErrorBoundary>
          <DataCard
            id="by-brand"
            title="การซื้อตามแบรนด์"
            description="ยอดซื้อแยกตามแบรนด์สินค้า"
            onExportExcel={() => exportToExcelWithHeaders(
              purchaseByBrand,
              { brandCode: 'รหัสแบรนด์', brandName: 'ชื่อแบรนด์', uniqueItems: 'รายการสินค้า', totalPurchaseValue: 'มูลค่าซื้อ' },
              'การซื้อตามแบรนด์',
              'Purchase by Brand'
            )}
          >
            {loading ? (
              <TableSkeleton rows={8} />
            ) : (
              <PaginatedTable
                data={purchaseByBrand}
                columns={purchaseByBrandColumns}
                itemsPerPage={10}
                emptyMessage="ไม่มีข้อมูลแบรนด์"
                defaultSortKey="totalPurchaseValue"
                defaultSortOrder="desc"
                keyExtractor={(item: PurchaseByBrand) => item.brandCode}
              />
            )}
          </DataCard>
        </ErrorBoundary>
      </div>

      {/* AP Outstanding Table */}
      <ErrorBoundary>
        <DataCard
          id="ap-outstanding"
          title="สถานะเจ้าหนี้การค้า (AP)"
          description="ยอดค้างชำระแยกตามซัพพลายเออร์"
          onExportExcel={() => exportToExcelWithHeaders(
            apOutstanding,
            { supplierCode: 'รหัสซัพพลายเออร์', supplierName: 'ชื่อซัพพลายเออร์', docCount: 'จำนวนเอกสาร', totalOutstanding: 'ยอดค้างชำระ', overdueAmount: 'ยอดเกินกำหนด' },
            'สถานะเจ้าหนี้การค้า',
            'AP Outstanding'
          )}
        >
          {loading ? (
            <TableSkeleton rows={10} />
          ) : (
            <PaginatedTable
              data={apOutstanding}
              columns={apOutstandingColumns}
              itemsPerPage={10}
              emptyMessage="ไม่มียอดค้างชำระ"
              defaultSortKey="totalOutstanding"
              defaultSortOrder="desc"
              keyExtractor={(item: APOutstanding) => item.supplierCode}
            />
          )}
        </DataCard>
      </ErrorBoundary>
    </div>
  );
}
