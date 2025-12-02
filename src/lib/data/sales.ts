// Sales data queries for ClickHouse

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
  KPIData,
} from './types';
import { calculateGrowth, getPreviousPeriod } from '@/lib/comparison';

/**
 * Get Sales KPIs: Total sales, gross profit, orders, avg order value
 */
export async function getSalesKPIs(dateRange: DateRange): Promise<SalesKPIs> {
  try {
    const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');

    // Total Sales
    const salesQuery = `
      SELECT
        sum(total_amount) as current_value,
        (SELECT sum(total_amount)
         FROM saleinvoice_transaction
         WHERE status_cancel != 'Cancel'
           AND doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
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
           AND si2.doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM saleinvoice_transaction_detail sid
      JOIN saleinvoice_transaction si ON sid.doc_no = si.doc_no AND sid.branch_sync = si.branch_sync
      WHERE si.status_cancel != 'Cancel'
        AND si.doc_datetime BETWEEN {start_date:String} AND {end_date:String}
    `;

    // Total Orders
    const ordersQuery = `
      SELECT
        count(DISTINCT doc_no) as current_value,
        (SELECT count(DISTINCT doc_no)
         FROM saleinvoice_transaction
         WHERE status_cancel != 'Cancel'
           AND doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
    `;

    // Average Order Value
    const avgOrderQuery = `
      SELECT
        avg(total_amount) as current_value,
        (SELECT avg(total_amount)
         FROM saleinvoice_transaction
         WHERE status_cancel != 'Cancel'
           AND doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
    `;

    const params = {
      start_date: dateRange.start,
      end_date: dateRange.end,
      previous_start: previousPeriod.start,
      previous_end: previousPeriod.end,
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
export async function getSalesTrendData(dateRange: DateRange): Promise<SalesTrendData[]> {
  try {
    const query = `
      SELECT
        toStartOfDay(doc_datetime) as date,
        sum(total_amount) as sales,
        count(DISTINCT doc_no) as orderCount
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
      GROUP BY date
      ORDER BY date ASC
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
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
export async function getTopProducts(dateRange: DateRange): Promise<TopProduct[]> {
  try {
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
      GROUP BY sid.item_code, sid.item_name, sid.item_brand_name, sid.item_category_name
      ORDER BY totalSales DESC
      LIMIT 10
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
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
export async function getSalesByBranch(dateRange: DateRange): Promise<SalesByBranch[]> {
  try {
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
      GROUP BY branch_code, branch_name
      ORDER BY totalSales DESC
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
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
export async function getSalesBySalesperson(dateRange: DateRange): Promise<SalesBySalesperson[]> {
  try {
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
      GROUP BY sale_code, sale_name
      ORDER BY totalSales DESC
      LIMIT 20
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
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
export async function getTopCustomers(dateRange: DateRange): Promise<TopCustomer[]> {
  try {
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
      GROUP BY customer_code, customer_name
      ORDER BY totalSpent DESC
      LIMIT 20
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
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
export async function getARStatus(dateRange: DateRange): Promise<ARStatus[]> {
  try {
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
      GROUP BY statusPayment
      ORDER BY totalOutstanding DESC
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
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
