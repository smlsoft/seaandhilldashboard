// Accounting data queries for ClickHouse

import { clickhouse } from '@/lib/clickhouse';
import type {
  DateRange,
  AccountingKPIs,
  ProfitLossData,
  BalanceSheetItem,
  CashFlowData,
  AgingItem,
  CategoryBreakdown,
  KPIData,
} from './types';
import { calculateGrowth, getPreviousPeriod } from '@/lib/comparison';

/**
 * Get Accounting KPIs: Assets, Liabilities, Equity, Revenue, Expenses
 */
export async function getAccountingKPIs(dateRange: DateRange): Promise<AccountingKPIs> {
  try {
    // Get previous period for comparison
    const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');

    // Assets (Account Type = ASSETS)
    const assetsQuery = `
      SELECT
        SUM(debit - credit) as current_value,
        (SELECT SUM(debit - credit)
         FROM journal_transaction_detail
         WHERE account_type = 'ASSETS'
           AND date(doc_datetime) BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM journal_transaction_detail
      WHERE account_type = 'ASSETS'
        AND date(doc_datetime) BETWEEN {start_date:String} AND {end_date:String}
    `;

    // Liabilities (Account 2xxxxx)
    const liabilitiesQuery = `
      SELECT
        SUM(credit - debit) as current_value,
        (SELECT SUM(credit - debit)
         FROM journal_transaction_detail
         WHERE account_type = 'LIABILITIES'
           AND date(doc_datetime) BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM journal_transaction_detail
      WHERE account_type = 'LIABILITIES'
        AND date(doc_datetime) BETWEEN {start_date:String} AND {end_date:String}
    `;

    // Equity (Account 3xxxxx)
    const equityQuery = `
      SELECT
        SUM(credit - debit) as current_value,
        (SELECT SUM(credit - debit)
         FROM journal_transaction_detail
         WHERE account_type = 'EQUITY'
           AND date(doc_datetime) BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM journal_transaction_detail
      WHERE account_type = 'EQUITY'
        AND date(doc_datetime) BETWEEN {start_date:String} AND {end_date:String}
    `;

    // Revenue (Account 4xxxxx)
    const revenueQuery = `
      SELECT
        SUM(credit - debit) as current_value,
        (SELECT SUM(credit - debit)
         FROM journal_transaction_detail
         WHERE account_type = 'INCOME'
           AND date(doc_datetime) BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM journal_transaction_detail
      WHERE account_type = 'INCOME'
        AND date(doc_datetime) BETWEEN {start_date:String} AND {end_date:String}
    `;

    // Expenses (Account 5xxxxx)
    const expensesQuery = `
      SELECT
        SUM(debit - credit) as current_value,
        (SELECT SUM(debit - credit)
         FROM journal_transaction_detail
         WHERE account_type = 'EXPENSES'
           AND date(doc_datetime) BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM journal_transaction_detail
      WHERE account_type = 'EXPENSES'
        AND date(doc_datetime) BETWEEN {start_date:String} AND {end_date:String}
    `;

    const params = {
      start_date: dateRange.start,
      end_date: dateRange.end,
      previous_start: previousPeriod.start,
      previous_end: previousPeriod.end,
    };

    // Helper function to replace params in query for logging
    const replaceParams = (query: string) => {
      return query
        .replace(/{start_date:String}/g, `'${params.start_date}'`)
        .replace(/{end_date:String}/g, `'${params.end_date}'`)
        .replace(/{previous_start:String}/g, `'${params.previous_start}'`)
        .replace(/{previous_end:String}/g, `'${params.previous_end}'`);
    };

    // Debug: Log queries with replaced params
    console.log('=== Accounting KPIs Debug ===');
    console.log('Params:', params);
    console.log('\n[Assets Query]:', replaceParams(assetsQuery));
    console.log('\n[Liabilities Query]:', replaceParams(liabilitiesQuery));
    console.log('\n[Equity Query]:', replaceParams(equityQuery));
    console.log('\n[Income Query]:', replaceParams(revenueQuery));
    console.log('\n[Expenses Query]:', replaceParams(expensesQuery));

    // Execute queries in parallel
    const [assetsResult, liabilitiesResult, equityResult, revenueResult, expensesResult] =
      await Promise.all([
        clickhouse.query({ query: assetsQuery, query_params: params, format: 'JSONEachRow' }),
        clickhouse.query({ query: liabilitiesQuery, query_params: params, format: 'JSONEachRow' }),
        clickhouse.query({ query: equityQuery, query_params: params, format: 'JSONEachRow' }),
        clickhouse.query({ query: revenueQuery, query_params: params, format: 'JSONEachRow' }),
        clickhouse.query({ query: expensesQuery, query_params: params, format: 'JSONEachRow' }),
      ]);

    const assetsData = await assetsResult.json();
    const liabilitiesData = await liabilitiesResult.json();
    const equityData = await equityResult.json();
    const revenueData = await revenueResult.json();
    const expensesData = await expensesResult.json();

    // Debug: Log results
    console.log('\n=== Query Results ===');
    console.log('[Assets Result]:', JSON.stringify(assetsData, null, 2));
    console.log('[Liabilities Result]:', JSON.stringify(liabilitiesData, null, 2));
    console.log('[Equity Result]:', JSON.stringify(equityData, null, 2));
    console.log('[Revenue Result]:', JSON.stringify(revenueData, null, 2));
    console.log('[Expenses Result]:', JSON.stringify(expensesData, null, 2));
    console.log('=== End Debug ===\n');

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

    return {
      assets: createKPI(assetsData),
      liabilities: createKPI(liabilitiesData),
      equity: createKPI(equityData),
      revenue: createKPI(revenueData),
      expenses: createKPI(expensesData),
    };
  } catch (error) {
    console.error('Error fetching accounting KPIs:', error);
    throw error;
  }
}

/**
 * Get Profit & Loss data by month
 */
export async function getProfitLossData(dateRange: DateRange): Promise<ProfitLossData[]> {
  try {
    const query = `
      SELECT
        toStartOfMonth(doc_datetime) as month,
        sum(if(account_type = 'INCOME', credit - debit, 0)) as revenue,
        sum(if(account_type = 'EXPENSES', debit - credit, 0)) as expenses,
        revenue - expenses as netProfit
      FROM journal_transaction_detail
      WHERE doc_datetime BETWEEN {start_date:String} AND {end_date:String}
      GROUP BY month
      ORDER BY month ASC
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      month: row.month,
      revenue: Number(row.revenue) || 0,
      expenses: Number(row.expenses) || 0,
      netProfit: Number(row.netProfit) || 0,
    }));
  } catch (error) {
    console.error('Error fetching P&L data:', error);
    throw error;
  }
}

/**
 * Get Balance Sheet data
 */
export async function getBalanceSheetData(asOfDate: string): Promise<BalanceSheetItem[]> {
  try {
    const query = `
      SELECT
        substring(account_code, 1, 1) as accountType,
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
        AND doc_datetime <= {as_of_date:String}
      GROUP BY accountType, typeName, account_code, account_name
      HAVING balance != 0
      ORDER BY account_code ASC
    `;

    const result = await clickhouse.query({
      query,
      query_params: { as_of_date: asOfDate },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      accountType: row.accountType,
      typeName: row.typeName,
      accountCode: row.account_code,
      accountName: row.account_name,
      balance: Number(row.balance) || 0,
    }));
  } catch (error) {
    console.error('Error fetching balance sheet data:', error);
    throw error;
  }
}

/**
 * Get Cash Flow data
 */
export async function getCashFlowData(dateRange: DateRange): Promise<CashFlowData[]> {
  try {
    const query = `
      SELECT
        'Operating' as activityType,
        sum(if(account_type = 'INCOME', credit - debit, 0)) as revenue,
        sum(if(account_type = 'EXPENSES', debit - credit, 0)) as expenses,
        revenue - expenses as netCashFlow
      FROM journal_transaction_detail
      WHERE doc_datetime BETWEEN {start_date:String} AND {end_date:String}

      UNION ALL

      SELECT
        'Investing',
        0,
        sum(debit - credit),
        -sum(debit - credit)
      FROM journal_transaction_detail
      WHERE account_code LIKE '12%'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}

      UNION ALL

      SELECT
        'Financing',
        sum(credit - debit),
        0,
        sum(credit - debit)
      FROM journal_transaction_detail
      WHERE (account_code LIKE '21%' OR account_type = 'EQUITY')
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      activityType: row.activityType as 'Operating' | 'Investing' | 'Financing',
      revenue: Number(row.revenue) || 0,
      expenses: Number(row.expenses) || 0,
      netCashFlow: Number(row.netCashFlow) || 0,
    }));
  } catch (error) {
    console.error('Error fetching cash flow data:', error);
    throw error;
  }
}

/**
 * Get AR (Accounts Receivable) Aging data
 */
export async function getARAgingData(): Promise<AgingItem[]> {
  try {
    const query = `
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
      ORDER BY daysOverdue DESC
      LIMIT 100
    `;

    const result = await clickhouse.query({ query, format: 'JSONEachRow' });
    const data = await result.json();

    return data.map((row: any) => ({
      code: row.code,
      name: row.name,
      docNo: row.docNo,
      docDate: row.docDate,
      dueDate: row.dueDate,
      totalAmount: Number(row.totalAmount) || 0,
      paidAmount: Number(row.paidAmount) || 0,
      outstanding: Number(row.outstanding) || 0,
      daysOverdue: Number(row.daysOverdue) || 0,
      agingBucket: row.agingBucket,
    }));
  } catch (error) {
    console.error('Error fetching AR aging data:', error);
    throw error;
  }
}

/**
 * Get AP (Accounts Payable) Aging data
 */
export async function getAPAgingData(): Promise<AgingItem[]> {
  try {
    const query = `
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
      ORDER BY daysOverdue DESC
      LIMIT 100
    `;

    const result = await clickhouse.query({ query, format: 'JSONEachRow' });
    const data = await result.json();

    return data.map((row: any) => ({
      code: row.code,
      name: row.name,
      docNo: row.docNo,
      docDate: row.docDate,
      dueDate: row.dueDate,
      totalAmount: Number(row.totalAmount) || 0,
      paidAmount: Number(row.paidAmount) || 0,
      outstanding: Number(row.outstanding) || 0,
      daysOverdue: Number(row.daysOverdue) || 0,
      agingBucket: row.agingBucket,
    }));
  } catch (error) {
    console.error('Error fetching AP aging data:', error);
    throw error;
  }
}

/**
 * Get Revenue breakdown by category
 */
export async function getRevenueBreakdown(dateRange: DateRange): Promise<CategoryBreakdown[]> {
  try {
    const query = `
      SELECT
        substring(account_code, 1, 2) as accountGroup,
        any(account_name) as accountName,
        sum(credit - debit) as amount,
        (amount / (SELECT sum(credit - debit)
                    FROM journal_transaction_detail
                    WHERE account_type = 'INCOME'
                      AND doc_datetime BETWEEN {start_date:String} AND {end_date:String})) * 100 as percentage
      FROM journal_transaction_detail
      WHERE account_type = 'INCOME'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
      GROUP BY accountGroup
      HAVING amount > 0
      ORDER BY amount DESC
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      accountGroup: row.accountGroup,
      accountName: row.accountName,
      amount: Number(row.amount) || 0,
      percentage: Number(row.percentage) || 0,
    }));
  } catch (error) {
    console.error('Error fetching revenue breakdown:', error);
    throw error;
  }
}

/**
 * Get Expense breakdown by category
 */
export async function getExpenseBreakdown(dateRange: DateRange): Promise<CategoryBreakdown[]> {
  try {
    const query = `
      SELECT
        substring(account_code, 1, 2) as accountGroup,
        any(account_name) as accountName,
        sum(debit - credit) as amount,
        (amount / (SELECT sum(debit - credit)
                    FROM journal_transaction_detail
                    WHERE account_type = 'EXPENSES'
                      AND doc_datetime BETWEEN {start_date:String} AND {end_date:String})) * 100 as percentage
      FROM journal_transaction_detail
      WHERE account_type = 'EXPENSES'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
      GROUP BY accountGroup
      HAVING amount > 0
      ORDER BY amount DESC
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      accountGroup: row.accountGroup,
      accountName: row.accountName,
      amount: Number(row.amount) || 0,
      percentage: Number(row.percentage) || 0,
    }));
  } catch (error) {
    console.error('Error fetching expense breakdown:', error);
    throw error;
  }
}
