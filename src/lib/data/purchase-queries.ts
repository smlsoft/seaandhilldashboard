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
     AND doc_datetime BETWEEN '${previousPeriod.start} 00:00:00' AND '${previousPeriod.end} 23:59:59') as previous_value
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'`;
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
     AND pt.doc_datetime BETWEEN '${previousPeriod.start} 00:00:00' AND '${previousPeriod.end} 23:59:59') as previous_value
FROM purchase_transaction_detail ptd
JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
WHERE pt.status_cancel != 'Cancel'
  AND pt.doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'`;
}

/**
 * Get Total Orders Query
 */
export function getTotalOrdersQuery(dateRange: DateRange): string {
    const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
    return `SELECT
  count(DISTINCT doc_no, branch_sync) as current_value,
  (SELECT count(DISTINCT doc_no, branch_sync)
   FROM purchase_transaction
   WHERE status_cancel != 'Cancel'
     AND doc_datetime BETWEEN '${previousPeriod.start} 00:00:00' AND '${previousPeriod.end} 23:59:59') as previous_value
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'`;
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
     AND doc_datetime BETWEEN '${previousPeriod.start} 00:00:00' AND '${previousPeriod.end} 23:59:59') as previous_value
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'`;
}

/**
 * Get Purchase Trend Query
 */
export function getPurchaseTrendQuery(dateRange: DateRange): string {
    return `SELECT
  formatDateTime(toStartOfMonth(doc_datetime), '%Y-%m') as month,
  sum(total_amount) as totalPurchases,
  count(DISTINCT doc_no, branch_sync) as poCount
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'
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
  count(DISTINCT doc_no, branch_sync) as poCount,
  sum(total_amount) as totalPurchases,
  avg(total_amount) as avgPOValue,
  max(doc_datetime) as lastPurchaseDate
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND supplier_code != ''
  AND doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'
GROUP BY supplier_code, supplier_name
ORDER BY totalPurchases DESC
LIMIT 20`;
}

/**
 * Get Purchase By Category Query
 */
export function getPurchaseByCategoryQuery(dateRange: DateRange): string {
    return `SELECT
  COALESCE(NULLIF(ptd.item_category_code, ''), 'N/A') as categoryCode,
  COALESCE(NULLIF(ptd.item_category_name, ''), 'ไม่ระบุหมวดหมู่') as categoryName,
  sum(ptd.qty) as totalQty,
  sum(ptd.sum_amount) as totalPurchaseValue,
  count(DISTINCT ptd.item_code) as uniqueItems
FROM purchase_transaction_detail ptd
JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
WHERE pt.status_cancel != 'Cancel'
  AND pt.doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'
GROUP BY categoryCode, categoryName
ORDER BY totalPurchaseValue DESC
LIMIT 15`;
}

/**
 * Get Purchase By Brand Query
 */
export function getPurchaseByBrandQuery(dateRange: DateRange): string {
    return `SELECT
  COALESCE(NULLIF(ptd.item_brand_code, ''), 'N/A') as brandCode,
  COALESCE(NULLIF(ptd.item_brand_name, ''), 'ไม่ระบุแบรนด์') as brandName,
  sum(ptd.sum_amount) as totalPurchaseValue,
  uniq(ptd.item_code) as uniqueItems
FROM purchase_transaction_detail ptd
JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
WHERE pt.status_cancel != 'Cancel'
  AND pt.doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'
GROUP BY brandCode, brandName
ORDER BY totalPurchaseValue DESC
LIMIT 15`;
}

/**
 * Get Purchase By Category Summary Query
 */
export function getPurchaseByCategorySummaryQuery(dateRange: DateRange, accountType: 'EXPENSES' | 'ASSETS' = 'EXPENSES'): string {
    return `WITH journal_summary AS (
  SELECT 
    doc_no,
    branch_sync,
    account_code,
    account_name,
    sum(debit - credit) as amount
  FROM journal_transaction_detail
  WHERE account_type = '${accountType}'
    AND doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'
  GROUP BY doc_no, branch_sync, account_code, account_name
  HAVING amount != 0
),
purchase_summary AS (
  SELECT
    ptd.doc_no,
    ptd.branch_sync,
    sum(ptd.qty) as total_qty
  FROM purchase_transaction_detail ptd
  JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
  WHERE pt.status_cancel != 'Cancel'
    AND pt.doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'
  GROUP BY ptd.doc_no, ptd.branch_sync
)
SELECT
  j.account_code as categoryCode,
  j.account_name as categoryName,
  sum(j.amount) as totalPurchaseValue,
  count(DISTINCT j.doc_no, j.branch_sync) as orderCount,
  sum(p.total_qty) as totalQty
FROM journal_summary j
JOIN purchase_summary p ON j.doc_no = p.doc_no AND j.branch_sync = p.branch_sync
GROUP BY j.account_code, j.account_name
ORDER BY totalPurchaseValue DESC`;
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
  count(DISTINCT doc_no, branch_sync) as docCount
FROM purchase_transaction
WHERE status_cancel != 'Cancel'
  AND doc_type = 'CREDIT'
  AND doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'
  AND total_amount > sum_pay_money
GROUP BY supplier_code, supplier_name
ORDER BY totalOutstanding DESC
LIMIT 20`;
}

/**
 * Helper function to build branch filter SQL
 */
function buildBranchFilterSql(branchSync?: string[]): string {
  if (!branchSync || branchSync.length === 0 || branchSync.includes('ALL')) {
    return '';
  }
  const branches = branchSync.map(b => `'${b}'`).join(', ');
  return `AND branch_sync IN (${branches})`;
}

/**
 * Get Purchase Expense Breakdown Query
 * Groups purchase expenses by account code from journal_transaction_detail
 * Only shows EXPENSES accounts that have purchase documents
 */
export function getPurchaseExpenseBreakdownQuery(dateRange: DateRange, branchSync?: string[]): string {
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      account_code AS accountGroup,
      account_name AS accountName,
      sum(debit - credit) AS amount,
      (amount / (
        SELECT sum(debit - credit)
        FROM journal_transaction_detail
        WHERE account_type = 'EXPENSES'
          AND date(doc_datetime) BETWEEN '${dateRange.start}' AND '${dateRange.end}'
          AND doc_no IN (
            SELECT DISTINCT doc_no
            FROM purchase_transaction
            WHERE status_cancel != 'Cancel'
              AND date(doc_datetime) BETWEEN '${dateRange.start}' AND '${dateRange.end}'
          )
          ${branchFilter}
      )) * 100 AS percentage
    FROM journal_transaction_detail
    WHERE account_type = 'EXPENSES'
      AND date(doc_datetime) BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      AND doc_no IN (
        SELECT DISTINCT doc_no
        FROM purchase_transaction
        WHERE status_cancel != 'Cancel'
          AND date(doc_datetime) BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      )
      ${branchFilter}
    GROUP BY account_code, account_name
    HAVING amount != 0
    ORDER BY amount DESC
  `;
}

/**
 * Get Purchase Items by Account Code
 * Shows detailed purchase items for a specific account
 */
export function getPurchaseItemsByAccountQuery(
  dateRange: DateRange,
  accountCode: string = 'ALL',
  branchSync?: string[]
): string {
  const branchFilter = buildBranchFilterSql(branchSync);
  
  const accountFilter = accountCode && accountCode !== 'ALL'
    ? `AND j.account_code = '${accountCode}'`
    : `AND j.account_type = 'EXPENSES'`;

  return `SELECT
  DATE(ptd.doc_datetime) AS docDate,
  ptd.doc_no AS docNo,
  ptd.item_code AS itemCode,
  ptd.item_name AS itemName,
  COALESCE(NULLIF(ptd.item_category_code, ''), 'N/A') AS categoryCode,
  COALESCE(NULLIF(ptd.item_category_name, ''), 'ไม่ระบุหมวดหมู่') AS categoryName,
  COALESCE(NULLIF(ptd.item_brand_name, ''), 'ไม่ระบุแบรนด์') AS brandName,
  ptd.unit_code AS unitCode,
  ptd.qty AS qty,
  ptd.price AS price,
  ptd.sum_amount AS totalAmount
FROM purchase_transaction_detail ptd
JOIN purchase_transaction pt 
  ON ptd.doc_no = pt.doc_no 
  AND ptd.branch_sync = pt.branch_sync
WHERE pt.status_cancel != 'Cancel'
  AND pt.doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'
  AND ptd.doc_no IN (
    SELECT DISTINCT j.doc_no
    FROM journal_transaction_detail j
    WHERE j.doc_datetime BETWEEN '${dateRange.start} 00:00:00' AND '${dateRange.end} 23:59:59'
      ${accountFilter}
      ${branchFilter}
  )
  ${branchFilter.replace(/branch_sync/g, 'pt.branch_sync')}
ORDER BY ptd.doc_datetime DESC, ptd.doc_no DESC, ptd.item_code ASC
LIMIT 1000`;
}
