// Purchase data queries - Pure functions safe for client-side usage

import type { DateRange } from './types';
import { getPreviousPeriod } from '@/lib/comparison';

// ============================================================================
// Query Export Functions for View SQL Query Feature
// ============================================================================

/**
 * Get Total Purchases Query
 */
export function getTotalPurchasesQuery(dateRange: DateRange): string {
    const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
    return `SELECT
  sum(total_amount) as current_value,
  (SELECT sum(total_amount)
   FROM purchase_transaction
   WHERE status_cancel != 'Cancel'
     AND doc_datetime BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}') as previous_value
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
}

/**
 * Get Total Items Purchased Query
 */
export function getTotalItemsPurchasedQuery(dateRange: DateRange): string {
    const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
    return `SELECT
  sum(qty) as current_value,
  (SELECT sum(qty)
   FROM purchase_transaction_detail ptd
   JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
   WHERE pt.status_cancel != 'Cancel'
     AND pt.doc_datetime BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}') as previous_value
FROM purchase_transaction_detail ptd
JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
WHERE pt.status_cancel != 'Cancel'
  AND pt.doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
}

/**
 * Get Total Orders Query
 */
export function getTotalOrdersQuery(dateRange: DateRange): string {
    const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
    return `SELECT
  count(DISTINCT doc_no) as current_value,
  (SELECT count(DISTINCT doc_no)
   FROM purchase_transaction
   WHERE status_cancel != 'Cancel'
     AND doc_datetime BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}') as previous_value
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
}

/**
 * Get Average Order Value Query
 */
export function getAvgOrderValueQuery(dateRange: DateRange): string {
    const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
    return `SELECT
  avg(total_amount) as current_value,
  (SELECT avg(total_amount)
   FROM purchase_transaction
   WHERE status_cancel != 'Cancel'
     AND doc_datetime BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}') as previous_value
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
}

/**
 * Get Purchase Trend Query
 */
export function getPurchaseTrendQuery(dateRange: DateRange): string {
    return `SELECT
  formatDateTime(toStartOfMonth(doc_datetime), '%Y-%m') as month,
  sum(total_amount) as totalPurchases,
  count(DISTINCT doc_no) as poCount
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
GROUP BY month
ORDER BY month ASC`;
}

/**
 * Get Top Suppliers Query
 */
export function getTopSuppliersQuery(dateRange: DateRange): string {
    return `SELECT
  supplier_code as supplierCode,
  supplier_name as supplierName,
  count(DISTINCT doc_no) as poCount,
  sum(total_amount) as totalPurchases,
  avg(total_amount) as avgPOValue,
  max(doc_datetime) as lastPurchaseDate
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND supplier_code != ''
  AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
GROUP BY supplier_code, supplier_name
ORDER BY totalPurchases DESC
LIMIT 20`;
}

/**
 * Get Purchase By Category Query
 */
export function getPurchaseByCategoryQuery(dateRange: DateRange): string {
    return `SELECT
  ptd.item_category_code as categoryCode,
  ptd.item_category_name as categoryName,
  sum(ptd.qty) as totalQty,
  sum(ptd.sum_amount) as totalPurchaseValue,
  count(DISTINCT ptd.item_code) as uniqueItems
FROM purchase_transaction_detail ptd
JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
WHERE pt.status_cancel != 'Cancel'
  AND pt.doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
  AND ptd.item_category_name != ''
GROUP BY ptd.item_category_code, ptd.item_category_name
ORDER BY totalPurchaseValue DESC
LIMIT 15`;
}

/**
 * Get Purchase By Brand Query
 */
export function getPurchaseByBrandQuery(dateRange: DateRange): string {
    return `SELECT
  ptd.item_brand_code as brandCode,
  ptd.item_brand_name as brandName,
  sum(ptd.sum_amount) as totalPurchaseValue,
  uniq(ptd.item_code) as uniqueItems
FROM purchase_transaction_detail ptd
JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
WHERE pt.status_cancel != 'Cancel'
  AND pt.doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
  AND ptd.item_brand_name != ''
GROUP BY ptd.item_brand_code, ptd.item_brand_name
ORDER BY totalPurchaseValue DESC
LIMIT 15`;
}

/**
 * Get AP Outstanding Query
 */
export function getAPOutstandingQuery(dateRange: DateRange): string {
    return `SELECT
  supplier_code as supplierCode,
  supplier_name as supplierName,
  sum(total_amount - sum_pay_money) as totalOutstanding,
  sum(CASE WHEN due_date < today() AND total_amount > sum_pay_money THEN total_amount - sum_pay_money ELSE 0 END) as overdueAmount,
  count(DISTINCT doc_no) as docCount
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND doc_type = 'CREDIT'
  AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
  AND total_amount > sum_pay_money
GROUP BY supplier_code, supplier_name
ORDER BY totalOutstanding DESC
LIMIT 20`;
}
