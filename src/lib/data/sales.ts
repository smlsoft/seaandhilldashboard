// Sales data queries for ClickHouse
import 'server-only';

import { clickhouse } from '@/lib/clickhouse';
import type {
  DateRange,
  SalesKPIs,
  SalesTrendData,
  TopProduct,
  SalesByBranch,
  SalesBySalesperson,
  TopCustomer,
  ARStatus,
  SalesByCategory,
  SalesAnalysisData,
  KPIData,
} from './types';
import { calculateGrowth, getPreviousPeriod } from '@/lib/comparison';

// Re-export query functions for convenience (server-side usage only)
export * from './sales-queries';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build branch filter SQL clause and parameters
 * Handles single branch, multiple branches, or ALL branches
 */
function buildBranchFilter(branches?: string[]): { sql: string; params: Record<string, any> } {
  if (!branches || branches.length === 0 || branches.includes('ALL')) {
    return { sql: '', params: {} };
  }

  if (branches.length === 1) {
    return {
      sql: 'AND branch_sync = {branchSync:String}',
      params: { branchSync: branches[0] }
    };
  }

  return {
    sql: 'AND branch_sync IN {branchList:Array(String)}',
    params: { branchList: branches }
  };
}

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * Get Sales KPIs: Total sales, gross profit, orders, avg order value
 */
export async function getSalesKPIs(dateRange: DateRange, branchSync?: string[]): Promise<SalesKPIs> {
  try {
    const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
    const branchFilter = buildBranchFilter(branchSync);

    // Total Sales
    const salesQuery = `
      SELECT
        sum(total_amount) as current_value,
        (SELECT sum(total_amount)
         FROM saleinvoice_transaction
         WHERE status_cancel != 'Cancel'
           AND doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}
           ${branchFilter.sql}
        ) as previous_value
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        ${branchFilter.sql}
    `;

    // Gross Profit
    const profitQuery = `
      SELECT
        sum(sid.sum_amount - sid.sum_of_cost) as current_value,
        sum(sid.sum_amount) as revenue,
        (SELECT sum(sid2.sum_amount - sid2.sum_of_cost)
         FROM saleinvoice_transaction_detail sid2
         JOIN saleinvoice_transaction si2 ON sid2.doc_no = si2.doc_no AND sid2.branch_sync = si2.branch_sync
         WHERE si2.status_cancel != 'Cancel'
           AND si2.doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}
           ${branchFilter.sql.replace(/branch_sync/g, 'si2.branch_sync')}
        ) as previous_value
      FROM saleinvoice_transaction_detail sid
      JOIN saleinvoice_transaction si ON sid.doc_no = si.doc_no AND sid.branch_sync = si.branch_sync
      WHERE si.status_cancel != 'Cancel'
        AND si.doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        ${branchFilter.sql.replace(/branch_sync/g, 'si.branch_sync')}
    `;

    // Total Orders
    const ordersQuery = `
      SELECT
        count(DISTINCT doc_no) as current_value,
        (SELECT count(DISTINCT doc_no)
         FROM saleinvoice_transaction
         WHERE status_cancel != 'Cancel'
           AND doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}
           ${branchFilter.sql}
        ) as previous_value
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        ${branchFilter.sql}
    `;

    // Average Order Value
    const avgOrderQuery = `
      SELECT
        avg(total_amount) as current_value,
        (SELECT avg(total_amount)
         FROM saleinvoice_transaction
         WHERE status_cancel != 'Cancel'
           AND doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}
           ${branchFilter.sql}
        ) as previous_value
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        ${branchFilter.sql}
    `;

    const params = {
      start_date: dateRange.start,
      end_date: dateRange.end,
      previous_start: previousPeriod.start,
      previous_end: previousPeriod.end,
      ...branchFilter.params
    };

    const [salesResult, profitResult, ordersResult, avgOrderResult] = await Promise.all([
      clickhouse.query({ query: salesQuery, query_params: params, format: 'JSONEachRow' }),
      clickhouse.query({ query: profitQuery, query_params: params, format: 'JSONEachRow' }),
      clickhouse.query({ query: ordersQuery, query_params: params, format: 'JSONEachRow' }),
      clickhouse.query({ query: avgOrderQuery, query_params: params, format: 'JSONEachRow' }),
    ]);

    const salesData = await salesResult.json();
    const profitData = await profitResult.json();
    const ordersData = await ordersResult.json();
    const avgOrderData = await avgOrderResult.json();

    const createKPI = (data: any[]): KPIData => {
      const row = data[0] || { current_value: 0, previous_value: 0 };
      const current = Number(row.current_value) || 0;
      const previous = Number(row.previous_value) || 0;
      const growth = calculateGrowth(current, previous);

      return {
        value: current,
        previousValue: previous,
        growth: growth.value,
        growthPercentage: growth.percentage,
        trend: growth.trend,
      };
    };

    const profitRow = (profitData[0] || { current_value: 0, revenue: 0 }) as Record<string, unknown>;
    const grossProfit = Number(profitRow.current_value) || 0;
    const revenue = Number(profitRow.revenue) || 0;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    return {
      totalSales: createKPI(salesData),
      grossProfit: createKPI(profitData),
      totalOrders: createKPI(ordersData),
      avgOrderValue: createKPI(avgOrderData),
      grossMarginPct,
    };
  } catch (error) {
    console.error('Error fetching sales KPIs:', error);
    throw error;
  }
}

/**
 * Get Sales Trend data by day/month
 */
export async function getSalesTrendData(dateRange: DateRange, branchSync?: string[]): Promise<SalesTrendData[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    const query = `
      SELECT
        toStartOfDay(doc_datetime) as date,
        sum(total_amount) as sales,
        count(DISTINCT doc_no) as orderCount
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        ${branchFilter.sql}
      GROUP BY date
      ORDER BY date ASC
    `;

    const result = await clickhouse.query({
      query,
      query_params: {
        start_date: dateRange.start,
        end_date: dateRange.end,
        ...branchFilter.params
      },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      date: row.date,
      sales: Number(row.sales) || 0,
      orderCount: Number(row.orderCount) || 0,
    }));
  } catch (error) {
    console.error('Error fetching sales trend:', error);
    throw error;
  }
}

/**
 * Get Top 10 selling products
 */
export async function getTopProducts(dateRange: DateRange, branchSync?: string[]): Promise<TopProduct[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    const query = `
      SELECT
        sid.item_code as itemCode,
        sid.item_name as itemName,
        sid.item_brand_name as brandName,
        sid.item_category_name as categoryName,
        sum(sid.qty) as totalQtySold,
        sum(sid.sum_amount) as totalSales,
        sum(sid.sum_amount - sid.sum_of_cost) as totalProfit,
        (totalProfit / totalSales) * 100 as profitMarginPct
      FROM saleinvoice_transaction_detail sid
      JOIN saleinvoice_transaction si ON sid.doc_no = si.doc_no AND sid.branch_sync = si.branch_sync
      WHERE si.status_cancel != 'Cancel'
        AND si.doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        ${branchFilter.sql.replace(/branch_sync/g, 'si.branch_sync')}
      GROUP BY sid.item_code, sid.item_name, sid.item_brand_name, sid.item_category_name
      ORDER BY totalSales DESC
      LIMIT 10
    `;

    const result = await clickhouse.query({
      query,
      query_params: {
        start_date: dateRange.start,
        end_date: dateRange.end,
        ...branchFilter.params
      },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      itemCode: row.itemCode,
      itemName: row.itemName,
      brandName: row.brandName || '-',
      categoryName: row.categoryName || '-',
      totalQtySold: Number(row.totalQtySold) || 0,
      totalSales: Number(row.totalSales) || 0,
      totalProfit: Number(row.totalProfit) || 0,
      profitMarginPct: Number(row.profitMarginPct) || 0,
    }));
  } catch (error) {
    console.error('Error fetching top products:', error);
    throw error;
  }
}

/**
 * Get Sales by Branch
 */
export async function getSalesByBranch(dateRange: DateRange, branchSync?: string[]): Promise<SalesByBranch[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    const query = `
      SELECT
        branch_code as branchCode,
        branch_name as branchName,
        count(DISTINCT doc_no) as orderCount,
        sum(total_amount) as totalSales
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        AND branch_code != ''
        ${branchFilter.sql}
      GROUP BY branch_code, branch_name
      ORDER BY totalSales DESC
    `;

    const result = await clickhouse.query({
      query,
      query_params: {
        start_date: dateRange.start,
        end_date: dateRange.end,
        ...branchFilter.params
      },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      branchCode: row.branchCode,
      branchName: row.branchName,
      orderCount: Number(row.orderCount) || 0,
      totalSales: Number(row.totalSales) || 0,
    }));
  } catch (error) {
    console.error('Error fetching sales by branch:', error);
    throw error;
  }
}

/**
 * Get Sales by Salesperson
 */
export async function getSalesBySalesperson(dateRange: DateRange, branchSync?: string[]): Promise<SalesBySalesperson[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    const query = `
      SELECT
        sale_code as saleCode,
        sale_name as saleName,
        count(DISTINCT doc_no) as orderCount,
        sum(total_amount) as totalSales,
        avg(total_amount) as avgOrderValue,
        uniq(customer_code) as customerCount
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        AND sale_code != ''
        ${branchFilter.sql}
      GROUP BY sale_code, sale_name
      ORDER BY totalSales DESC
      LIMIT 20
    `;

    const result = await clickhouse.query({
      query,
      query_params: {
        start_date: dateRange.start,
        end_date: dateRange.end,
        ...branchFilter.params
      },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      saleCode: row.saleCode,
      saleName: row.saleName,
      orderCount: Number(row.orderCount) || 0,
      totalSales: Number(row.totalSales) || 0,
      avgOrderValue: Number(row.avgOrderValue) || 0,
      customerCount: Number(row.customerCount) || 0,
    }));
  } catch (error) {
    console.error('Error fetching sales by salesperson:', error);
    throw error;
  }
}

/**
 * Get Top Customers
 */
export async function getTopCustomers(dateRange: DateRange, branchSync?: string[]): Promise<TopCustomer[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    const query = `
      SELECT
        customer_code as customerCode,
        customer_name as customerName,
        count(DISTINCT doc_no) as orderCount,
        sum(total_amount) as totalSpent,
        avg(total_amount) as avgOrderValue,
        max(doc_datetime) as lastOrderDate,
        dateDiff('day', lastOrderDate, now()) as daysSinceLastOrder
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND customer_code != ''
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        ${branchFilter.sql}
      GROUP BY customer_code, customer_name
      ORDER BY totalSpent DESC
      LIMIT 20
    `;

    const result = await clickhouse.query({
      query,
      query_params: {
        start_date: dateRange.start,
        end_date: dateRange.end,
        ...branchFilter.params
      },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      customerCode: row.customerCode,
      customerName: row.customerName,
      orderCount: Number(row.orderCount) || 0,
      totalSpent: Number(row.totalSpent) || 0,
      avgOrderValue: Number(row.avgOrderValue) || 0,
      lastOrderDate: row.lastOrderDate,
      daysSinceLastOrder: Number(row.daysSinceLastOrder) || 0,
    }));
  } catch (error) {
    console.error('Error fetching top customers:', error);
    throw error;
  }
}

/**
 * Get AR Status Summary
 */
export async function getARStatus(dateRange: DateRange, branchSync?: string[]): Promise<ARStatus[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    const query = `
      SELECT
        status_payment as statusPayment,
        count(DISTINCT doc_no) as invoiceCount,
        sum(total_amount) as totalInvoiceAmount,
        sum(sum_pay_money) as totalPaid,
        sum(total_amount - sum_pay_money) as totalOutstanding
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_type = 'CREDIT'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        ${branchFilter.sql}
      GROUP BY statusPayment
      ORDER BY totalOutstanding DESC
    `;

    const result = await clickhouse.query({
      query,
      query_params: {
        start_date: dateRange.start,
        end_date: dateRange.end,
        ...branchFilter.params
      },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      statusPayment: row.statusPayment,
      invoiceCount: Number(row.invoiceCount) || 0,
      totalInvoiceAmount: Number(row.totalInvoiceAmount) || 0,
      totalPaid: Number(row.totalPaid) || 0,
      totalOutstanding: Number(row.totalOutstanding) || 0,
    }));
  } catch (error) {
    console.error('Error fetching AR status:', error);
    throw error;
  }
}
<<<<<<< HEAD

<<<<<<< Updated upstream
// ============================================
// SQL Query Functions - Generate queries with actual dates
// ============================================

/**
 * Get Total Sales KPI Query
 */
export function getTotalSalesQuery(dateRange: DateRange): string {
  const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
  return `SELECT
  sum(total_amount) as current_value,
  (SELECT sum(total_amount)
   FROM saleinvoice_transaction
   WHERE status_cancel != 'Cancel'
     AND doc_datetime BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}') as previous_value
FROM saleinvoice_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
}

/**
 * Get Gross Profit KPI Query
 */
export function getGrossProfitQuery(dateRange: DateRange): string {
  const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
  return `SELECT
  sum(sid.sum_amount - sid.sum_of_cost) as current_value,
  (SELECT sum(sid2.sum_amount - sid2.sum_of_cost)
   FROM saleinvoice_transaction_detail sid2
   JOIN saleinvoice_transaction si2 ON sid2.doc_no = si2.doc_no AND sid2.branch_sync = si2.branch_sync
   WHERE si2.status_cancel != 'Cancel'
     AND si2.doc_datetime BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}') as previous_value
FROM saleinvoice_transaction_detail sid
JOIN saleinvoice_transaction si ON sid.doc_no = si.doc_no AND sid.branch_sync = si.branch_sync
WHERE si.status_cancel != 'Cancel'
  AND si.doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
}

/**
 * Get Total Orders KPI Query
 */
export function getTotalOrdersQuery(dateRange: DateRange): string {
  const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
  return `SELECT
  count(DISTINCT doc_no) as current_value,
  (SELECT count(DISTINCT doc_no)
   FROM saleinvoice_transaction
   WHERE status_cancel != 'Cancel'
     AND doc_datetime BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}') as previous_value
FROM saleinvoice_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
}

/**
 * Get Average Order Value KPI Query
 */
export function getAvgOrderValueQuery(dateRange: DateRange): string {
  const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
  return `SELECT
  avg(total_amount) as current_value,
  (SELECT avg(total_amount)
   FROM saleinvoice_transaction
   WHERE status_cancel != 'Cancel'
     AND doc_datetime BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}') as previous_value
FROM saleinvoice_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
}

/**
 * Get Sales Trend Query with actual dates
 */
export function getSalesTrendQuery(startDate: string, endDate: string): string {
  return `
SELECT
  toStartOfDay(doc_datetime) as date,
  sum(total_amount) as sales,
  count(DISTINCT doc_no) as orderCount
FROM saleinvoice_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${startDate}' AND '${endDate}'
GROUP BY date
ORDER BY date ASC
  `.trim();
}

/**
 * Get Top Products Query with actual dates
 */
export function getTopProductsQuery(startDate: string, endDate: string): string {
  return `
SELECT
  sid.item_code as itemCode,
  sid.item_name as itemName,
  sid.item_brand_name as brandName,
  sid.item_category_name as categoryName,
  sum(sid.qty) as totalQtySold,
  sum(sid.sum_amount) as totalSales,
  sum(sid.sum_amount - sid.sum_of_cost) as totalProfit,
  (totalProfit / totalSales) * 100 as profitMarginPct
FROM saleinvoice_transaction_detail sid
JOIN saleinvoice_transaction si ON sid.doc_no = si.doc_no AND sid.branch_sync = si.branch_sync
WHERE si.status_cancel != 'Cancel'
  AND si.doc_datetime BETWEEN '${startDate}' AND '${endDate}'
GROUP BY sid.item_code, sid.item_name, sid.item_brand_name, sid.item_category_name
ORDER BY totalSales DESC
LIMIT 10
  `.trim();
}

/**
 * Get Sales by Branch Query with actual dates
 */
export function getSalesByBranchQuery(startDate: string, endDate: string): string {
  return `
SELECT
  branch_code as branchCode,
  branch_name as branchName,
  count(DISTINCT doc_no) as orderCount,
  sum(total_amount) as totalSales
FROM saleinvoice_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${startDate}' AND '${endDate}'
  AND branch_code != ''
GROUP BY branch_code, branch_name
ORDER BY totalSales DESC
  `.trim();
}

/**
 * Get Sales by Salesperson Query with actual dates
 */
export function getSalesBySalespersonQuery(startDate: string, endDate: string): string {
  return `
SELECT
  sale_code as saleCode,
  sale_name as saleName,
  count(DISTINCT doc_no) as orderCount,
  sum(total_amount) as totalSales,
  avg(total_amount) as avgOrderValue,
  uniq(customer_code) as customerCount
FROM saleinvoice_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${startDate}' AND '${endDate}'
  AND sale_code != ''
GROUP BY sale_code, sale_name
ORDER BY totalSales DESC
LIMIT 20
  `.trim();
}

/**
 * Get Top Customers Query with actual dates
 */
export function getTopCustomersQuery(startDate: string, endDate: string): string {
  return `
SELECT
  customer_code as customerCode,
  customer_name as customerName,
  count(DISTINCT doc_no) as orderCount,
  sum(total_amount) as totalSpent,
  avg(total_amount) as avgOrderValue,
  max(doc_datetime) as lastOrderDate,
  dateDiff('day', lastOrderDate, now()) as daysSinceLastOrder
FROM saleinvoice_transaction
WHERE status_cancel != 'Cancel'
  AND customer_code != ''
  AND doc_datetime BETWEEN '${startDate}' AND '${endDate}'
GROUP BY customer_code, customer_name
ORDER BY totalSpent DESC
LIMIT 20
  `.trim();
}

/**
 * Get AR Status Query with actual dates
 */
export function getARStatusQuery(startDate: string, endDate: string): string {
  return `
SELECT
  status_payment as statusPayment,
  count(DISTINCT doc_no) as invoiceCount,
  sum(total_amount) as totalInvoiceAmount,
  sum(sum_pay_money) as totalPaid,
  sum(total_amount - sum_pay_money) as totalOutstanding
FROM saleinvoice_transaction
WHERE status_cancel != 'Cancel'
  AND doc_type = 'CREDIT'
  AND doc_datetime BETWEEN '${startDate}' AND '${endDate}'
GROUP BY statusPayment
ORDER BY totalOutstanding DESC
  `.trim();
=======
/**
 * Get Sales by Category
 */
export async function getSalesByCategory(dateRange: DateRange, branchSync?: string[]): Promise<SalesByCategory[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    const query = `
      SELECT
        si.branch_name as branchName,
        COALESCE(NULLIF(sid.item_category_name, ''), 'ไม่ระบุหมวดหมู่') as categoryName,
        count(DISTINCT si.doc_no) as orderCount,
        sum(sid.qty) as totalQtySold,
        sum(sid.sum_amount) as totalSales,
        sum(sid.sum_amount - sid.sum_of_cost) as totalProfit,
        (totalProfit / totalSales) * 100 as profitMarginPct
      FROM saleinvoice_transaction_detail sid
      JOIN saleinvoice_transaction si ON sid.doc_no = si.doc_no AND sid.branch_sync = si.branch_sync
      WHERE si.status_cancel != 'Cancel'
        AND si.doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        ${branchFilter.sql.replace(/branch_sync/g, 'si.branch_sync')}
      GROUP BY si.branch_sync, si.branch_name, categoryName
      ORDER BY si.branch_name ASC, totalSales DESC
    `;

    const result = await clickhouse.query({
      query,
      query_params: {
        start_date: dateRange.start,
        end_date: dateRange.end,
        ...branchFilter.params
      },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      branchName: row.branchName || 'ไม่ระบุสาขา',
      categoryName: row.categoryName || 'ไม่ระบุหมวดหมู่',
      orderCount: Number(row.orderCount) || 0,
      totalQtySold: Number(row.totalQtySold) || 0,
      totalSales: Number(row.totalSales) || 0,
      totalProfit: Number(row.totalProfit) || 0,
      profitMarginPct: Number(row.profitMarginPct) || 0,
    }));
  } catch (error) {
    console.error('Error fetching sales by category:', error);
    throw error;
  }
}

/**
 * Get Sales by Category Summary (Aggregated)
 */
export async function getSalesByCategorySummary(dateRange: DateRange, branchSync?: string[]): Promise<SalesByCategory[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    const query = `
      SELECT
        COALESCE(NULLIF(sid.item_category_name, ''), 'ไม่ระบุหมวดหมู่') as categoryName,
        sum(sid.sum_amount) as totalSales,
        count(DISTINCT si.doc_no) as orderCount
      FROM saleinvoice_transaction_detail sid
      JOIN saleinvoice_transaction si ON sid.doc_no = si.doc_no AND sid.branch_sync = si.branch_sync
      WHERE si.status_cancel != 'Cancel'
        AND si.doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        ${branchFilter.sql.replace(/branch_sync/g, 'si.branch_sync')}
      GROUP BY categoryName
      ORDER BY totalSales DESC
    `;

    const result = await clickhouse.query({
      query,
      query_params: {
        start_date: dateRange.start,
        end_date: dateRange.end,
        ...branchFilter.params
      },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      branchName: 'All', // Placeholder as this is aggregated
      categoryName: row.categoryName || 'ไม่ระบุหมวดหมู่',
      orderCount: Number(row.orderCount) || 0,
      totalQtySold: 0, // Not fetched in summary
      totalSales: Number(row.totalSales) || 0,
      totalProfit: 0, // Not fetched in summary
      profitMarginPct: 0, // Not fetched in summary
    }));
  } catch (error) {
    console.error('Error fetching sales by category summary:', error);
    throw error;
  }
}

/**
 * Get Detailed Sales Analysis Data
 */
export async function getSalesAnalysisData(dateRange: DateRange, branchSync?: string[]): Promise<SalesAnalysisData[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    const query = `
      SELECT
        COALESCE(NULLIF(sid.item_category_name, ''), 'ไม่ระบุหมวดหมู่') as categoryName,
        toDate(si.doc_datetime) as docDate,
        si.doc_no as docNo,
        sid.item_code as itemCode,
        sid.item_name as itemName,
        sid.unit_code as unitCode,
        sid.qty as qty,
        sid.sum_amount / NULLIF(sid.qty, 0) as price,
        sid.discount_amount as discountAmount,
        sid.sum_amount as totalAmount
      FROM saleinvoice_transaction_detail sid
      JOIN saleinvoice_transaction si ON sid.doc_no = si.doc_no AND sid.branch_sync = si.branch_sync
      WHERE si.status_cancel != 'Cancel'
        AND si.doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        ${branchFilter.sql.replace(/branch_sync/g, 'si.branch_sync')}
      ORDER BY categoryName, docDate, docNo
    `;

    const result = await clickhouse.query({
      query,
      query_params: {
        start_date: dateRange.start,
        end_date: dateRange.end,
        ...branchFilter.params
      },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      categoryName: row.categoryName || 'ไม่ระบุหมวดหมู่',
      docDate: row.docDate,
      docNo: row.docNo,
      itemCode: row.itemCode,
      itemName: row.itemName,
      unitCode: row.unitCode || '',
      qty: Number(row.qty) || 0,
      price: Number(row.price) || 0,
      discountAmount: Number(row.discountAmount) || 0,
      totalAmount: Number(row.totalAmount) || 0,
    }));
  } catch (error) {
    console.error('Error fetching sales analysis:', error);
    throw error;
  }
>>>>>>> Stashed changes
}
=======
>>>>>>> main
