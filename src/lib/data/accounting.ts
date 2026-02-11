// Accounting data queries for ClickHouse
import 'server-only';

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
import { calculateGrowth } from '@/lib/comparison';
import {
  getAssetsQuery,
  getLiabilitiesQuery,
  getEquityQuery,
  getRevenueQuery,
  getExpensesQuery,
  getProfitLossQuery,
  getBalanceSheetQuery,
  getCashFlowQuery,
  getARAgingQuery,
  getAPAgingQuery,
  getRevenueBreakdownQuery,
  getExpenseBreakdownQuery,
} from './accounting-queries';

// Re-export query functions for convenience (server-side usage only)
export * from './accounting-queries';

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * Get Accounting KPIs: Assets, Liabilities, Equity, Revenue, Expenses
 */
export async function getAccountingKPIs(dateRange: DateRange, branchSync?: string[]): Promise<AccountingKPIs> {
  try {
    // Get queries with actual dates
    const assetsQuery = getAssetsQuery(dateRange, branchSync);
    const liabilitiesQuery = getLiabilitiesQuery(dateRange, branchSync);
    const equityQuery = getEquityQuery(dateRange, branchSync);
    const revenueQuery = getRevenueQuery(dateRange, branchSync);
    const expensesQuery = getExpensesQuery(dateRange, branchSync);

    // Debug: Log queries
    console.log('=== Accounting KPIs Debug ===');
    console.log('[Assets Query]:', assetsQuery);
    console.log('[Liabilities Query]:', liabilitiesQuery);
    console.log('[Equity Query]:', equityQuery);
    console.log('[Income Query]:', revenueQuery);
    console.log('[Expenses Query]:', expensesQuery);

    // Execute queries in parallel (NO query_params needed since dates are hardcoded)
    const [assetsResult, liabilitiesResult, equityResult, revenueResult, expensesResult] =
      await Promise.all([
        clickhouse.query({ query: assetsQuery, format: 'JSONEachRow' }),
        clickhouse.query({ query: liabilitiesQuery, format: 'JSONEachRow' }),
        clickhouse.query({ query: equityQuery, format: 'JSONEachRow' }),
        clickhouse.query({ query: revenueQuery, format: 'JSONEachRow' }),
        clickhouse.query({ query: expensesQuery, format: 'JSONEachRow' }),
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
export async function getProfitLossData(dateRange: DateRange, branchSync?: string[]): Promise<ProfitLossData[]> {
  try {
    const query = getProfitLossQuery(dateRange, branchSync);

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
export async function getBalanceSheetData(asOfDate: string, branchSync?: string[]): Promise<BalanceSheetItem[]> {
  try {
    const query = getBalanceSheetQuery(asOfDate, branchSync);

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
export async function getCashFlowData(dateRange: DateRange, branchSync?: string[]): Promise<CashFlowData[]> {
  try {
    const query = getCashFlowQuery(dateRange, branchSync);

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
export async function getARAgingData(branchSync?: string[]): Promise<AgingItem[]> {
  try {
    const query = getARAgingQuery(branchSync);

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
export async function getAPAgingData(branchSync?: string[]): Promise<AgingItem[]> {
  try {
    const query = getAPAgingQuery(branchSync);

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
export async function getRevenueBreakdown(dateRange: DateRange, branchSync?: string[]): Promise<CategoryBreakdown[]> {
  try {
    const query = getRevenueBreakdownQuery(dateRange, branchSync);

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
export async function getExpenseBreakdown(dateRange: DateRange, branchSync?: string[]): Promise<CategoryBreakdown[]> {
  try {
    const query = getExpenseBreakdownQuery(dateRange, branchSync);

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
