// Sales data queries - Pure functions safe for client-side usage

import type { DateRange } from './types';
import { getPreviousPeriod } from '@/lib/comparison';

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
}
