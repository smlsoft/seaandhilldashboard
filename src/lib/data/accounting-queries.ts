// Accounting data queries - Pure functions safe for client-side usage

import type { DateRange } from './types';
import { getPreviousPeriod } from '@/lib/comparison';

// ============================================================================
// Helper Functions
// ============================================================================

function buildBranchFilterSql(branches?: string[]): string {
  if (!branches || branches.length === 0 || branches.includes('ALL')) {
    return '';
  }
  if (branches.length === 1) {
    return `AND branch_sync = '${branches[0]}'`;
  }
  const branchList = branches.map(b => `'${b}'`).join(', ');
  return `AND branch_sync IN (${branchList})`;
}

// ============================================================================
// Query Export Functions (for View SQL Query feature)
// ============================================================================

export function getAssetsQuery(dateRange: DateRange, branchSync?: string[]): string {
  const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      SUM(debit - credit) as current_value,
      (SELECT SUM(debit - credit)
       FROM journal_transaction_detail
       WHERE account_type = 'ASSETS'
         AND date(doc_datetime) BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}'
         ${branchFilter}) as previous_value
    FROM journal_transaction_detail
    WHERE account_type = 'ASSETS'
      AND date(doc_datetime) BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ${branchFilter}
  `;
}

export function getLiabilitiesQuery(dateRange: DateRange, branchSync?: string[]): string {
  const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      SUM(credit - debit) as current_value,
      (SELECT SUM(credit - debit)
       FROM journal_transaction_detail
       WHERE account_type = 'LIABILITIES'
         AND date(doc_datetime) BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}'
         ${branchFilter}) as previous_value
    FROM journal_transaction_detail
    WHERE account_type = 'LIABILITIES'
      AND date(doc_datetime) BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ${branchFilter}
  `;
}

export function getEquityQuery(dateRange: DateRange, branchSync?: string[]): string {
  const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      SUM(credit - debit) as current_value,
      (SELECT SUM(credit - debit)
       FROM journal_transaction_detail
       WHERE account_type = 'EQUITY'
         AND date(doc_datetime) BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}'
         ${branchFilter}) as previous_value
    FROM journal_transaction_detail
    WHERE account_type = 'EQUITY'
      AND date(doc_datetime) BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ${branchFilter}
  `;
}

export function getRevenueQuery(dateRange: DateRange, branchSync?: string[]): string {
  const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      SUM(credit - debit) as current_value,
      (SELECT SUM(credit - debit)
       FROM journal_transaction_detail
       WHERE account_type = 'INCOME'
         AND date(doc_datetime) BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}'
         ${branchFilter}) as previous_value
    FROM journal_transaction_detail
    WHERE account_type = 'INCOME'
      AND date(doc_datetime) BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ${branchFilter}
  `;
}

export function getExpensesQuery(dateRange: DateRange, branchSync?: string[]): string {
  const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      SUM(debit - credit) as current_value,
      (SELECT SUM(debit - credit)
       FROM journal_transaction_detail
       WHERE account_type = 'EXPENSES'
         AND date(doc_datetime) BETWEEN '${previousPeriod.start}' AND '${previousPeriod.end}'
         ${branchFilter}) as previous_value
    FROM journal_transaction_detail
    WHERE account_type = 'EXPENSES'
      AND date(doc_datetime) BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ${branchFilter}
  `;
}

// Query string functions for DataCard queryInfo
export function getProfitLossQuery(dateRange: DateRange, branchSync?: string[]): string {
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      toStartOfMonth(doc_datetime) as month,
      sum(if(account_type = 'INCOME', credit - debit, 0)) as revenue,
      sum(if(account_type = 'EXPENSES', debit - credit, 0)) as expenses,
      revenue - expenses as netProfit
    FROM journal_transaction_detail
    WHERE doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ${branchFilter}
    GROUP BY month
    ORDER BY month ASC
  `;
}

export function getBalanceSheetQuery(asOfDate: string, branchSync?: string[]): string {
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      substring(account_code, 1, 1) as accountType,
      account_type,
      CASE
        WHEN account_type = 'ASSETS' THEN 'สินทรัพย์'
        WHEN account_type = 'LIABILITIES' THEN 'หนี้สิน'
        WHEN account_type = 'EQUITY' THEN 'ส่วนของผู้ถือหุ้น'
      END as typeName,
      account_code,
      account_name,
      if(account_type = 'ASSETS', sum(debit - credit), sum(credit - debit)) as balance
    FROM journal_transaction_detail
    WHERE (account_type = 'ASSETS' OR account_type = 'LIABILITIES' OR account_type = 'EQUITY')
      AND doc_datetime <= '${asOfDate}'
      ${branchFilter}
    GROUP BY account_type, accountType, typeName, account_code, account_name
    HAVING balance != 0
    ORDER BY account_code ASC
  `;
}

export function getCashFlowQuery(dateRange: DateRange, branchSync?: string[]): string {
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT 'Operating' as activityType,
      sum(if(account_type = 'INCOME', credit - debit, 0)) as revenue,
      sum(if(account_type = 'EXPENSES', debit - credit, 0)) as expenses,
      revenue - expenses as netCashFlow
    FROM journal_transaction_detail
    WHERE doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ${branchFilter}
    
    UNION ALL
    
    SELECT 'Investing', 0, sum(debit - credit), -sum(debit - credit)
    FROM journal_transaction_detail
    WHERE account_code LIKE '12%'
      AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ${branchFilter}
    
    UNION ALL
    
    SELECT 'Financing', sum(credit - debit), 0, sum(credit - debit)
    FROM journal_transaction_detail
    WHERE (account_code LIKE '21%' OR account_type = 'EQUITY')
      AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ${branchFilter}
  `;
}

export function getARAgingQuery(branchSync?: string[]): string {
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      customer_code as code,
      customer_name as name,
      doc_no as docNo,
      doc_datetime as docDate,
      due_date as dueDate,
      total_amount as totalAmount,
      sum_pay_money as paidAmount,
      total_amount - sum_pay_money as outstanding,
      dateDiff('day', due_date, now()) as daysOverdue,
      CASE
        WHEN dateDiff('day', due_date, now()) <= 0 THEN 'ยังไม่ครบกำหนด'
        WHEN dateDiff('day', due_date, now()) <= 30 THEN '1-30 วัน'
        WHEN dateDiff('day', due_date, now()) <= 60 THEN '31-60 วัน'
        WHEN dateDiff('day', due_date, now()) <= 90 THEN '61-90 วัน'
        ELSE 'เกิน 90 วัน'
      END as agingBucket
    FROM saleinvoice_transaction
    WHERE status_payment IN ('Outstanding', 'Partially Paid')
      AND status_cancel != 'Cancel'
      AND doc_type = 'CREDIT'
      ${branchFilter}
    ORDER BY daysOverdue DESC
    LIMIT 100
  `;
}

export function getAPAgingQuery(branchSync?: string[]): string {
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      supplier_code as code,
      supplier_name as name,
      doc_no as docNo,
      doc_datetime as docDate,
      due_date as dueDate,
      total_amount as totalAmount,
      sum_pay_money as paidAmount,
      total_amount - sum_pay_money as outstanding,
      dateDiff('day', due_date, now()) as daysOverdue,
      CASE
        WHEN dateDiff('day', due_date, now()) <= 0 THEN 'ยังไม่ครบกำหนด'
        WHEN dateDiff('day', due_date, now()) <= 30 THEN '1-30 วัน'
        WHEN dateDiff('day', due_date, now()) <= 60 THEN '31-60 วัน'
        WHEN dateDiff('day', due_date, now()) <= 90 THEN '61-90 วัน'
        ELSE 'เกิน 90 วัน'
      END as agingBucket
    FROM purchase_transaction
    WHERE status_payment IN ('Outstanding', 'Partially Paid')
      AND status_cancel != 'Cancel'
      AND doc_type = 'CREDIT'
      ${branchFilter}
    ORDER BY daysOverdue DESC
    LIMIT 100
  `;
}

export function getRevenueBreakdownQuery(dateRange: DateRange, branchSync?: string[]): string {
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      substring(account_code, 1, 2) as accountGroup,
      any(account_name) as accountName,
      sum(credit - debit) as amount,
      (amount / (SELECT sum(credit - debit)
                  FROM journal_transaction_detail
                  WHERE account_type = 'INCOME'
                    AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
                    ${branchFilter})) * 100 as percentage
    FROM journal_transaction_detail
    WHERE account_type = 'INCOME'
      AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ${branchFilter}
    GROUP BY accountGroup
    HAVING amount > 0
    ORDER BY amount DESC
  `;
}

export function getExpenseBreakdownQuery(dateRange: DateRange, branchSync?: string[]): string {
  const branchFilter = buildBranchFilterSql(branchSync);
  return `
    SELECT
      substring(account_code, 1, 2) as accountGroup,
      any(account_name) as accountName,
      sum(debit - credit) as amount,
      (amount / (SELECT sum(debit - credit)
                  FROM journal_transaction_detail
                  WHERE account_type = 'EXPENSES'
                    AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
                    ${branchFilter})) * 100 as percentage
    FROM journal_transaction_detail
    WHERE account_type = 'EXPENSES'
      AND doc_datetime BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ${branchFilter}
    GROUP BY accountGroup
    HAVING amount > 0
    ORDER BY amount DESC
  `;
}
