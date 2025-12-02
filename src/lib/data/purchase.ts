// Purchase data queries for ClickHouse

import { clickhouse } from '@/lib/clickhouse';
import type {
  DateRange,
  PurchaseKPIs,
  PurchaseTrendData,
  TopSupplier,
  PurchaseByCategory,
  PurchaseByBrand,
  APOutstanding,
  KPIData,
} from './types';
import { calculateGrowth, getPreviousPeriod } from '@/lib/comparison';

/**
 * Get Purchase KPIs: Total purchases, items purchased, orders, avg order value
 */
export async function getPurchaseKPIs(dateRange: DateRange): Promise<PurchaseKPIs> {
  try {
    const previousPeriod = getPreviousPeriod(dateRange, 'PreviousPeriod');

    // Total Purchases
    const purchaseQuery = `
      SELECT
        sum(total_amount) as current_value,
        (SELECT sum(total_amount)
         FROM purchase_transaction
         WHERE status_cancel != 'Cancel'
           AND doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM purchase_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
    `;

    // Total Items Purchased
    const itemsQuery = `
      SELECT
        sum(qty) as current_value,
        (SELECT sum(qty)
         FROM purchase_transaction_detail ptd
         JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
         WHERE pt.status_cancel != 'Cancel'
           AND pt.doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM purchase_transaction_detail ptd
      JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
      WHERE pt.status_cancel != 'Cancel'
        AND pt.doc_datetime BETWEEN {start_date:String} AND {end_date:String}
    `;

    // Total Orders
    const ordersQuery = `
      SELECT
        count(DISTINCT doc_no) as current_value,
        (SELECT count(DISTINCT doc_no)
         FROM purchase_transaction
         WHERE status_cancel != 'Cancel'
           AND doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM purchase_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
    `;

    // Average Order Value
    const avgOrderQuery = `
      SELECT
        avg(total_amount) as current_value,
        (SELECT avg(total_amount)
         FROM purchase_transaction
         WHERE status_cancel != 'Cancel'
           AND doc_datetime BETWEEN {previous_start:String} AND {previous_end:String}) as previous_value
      FROM purchase_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
    `;

    const params = {
      start_date: dateRange.start,
      end_date: dateRange.end,
      previous_start: previousPeriod.start,
      previous_end: previousPeriod.end,
    };

    const [purchaseResult, itemsResult, ordersResult, avgOrderResult] = await Promise.all([
      clickhouse.query({ query: purchaseQuery, query_params: params, format: 'JSONEachRow' }),
      clickhouse.query({ query: itemsQuery, query_params: params, format: 'JSONEachRow' }),
      clickhouse.query({ query: ordersQuery, query_params: params, format: 'JSONEachRow' }),
      clickhouse.query({ query: avgOrderQuery, query_params: params, format: 'JSONEachRow' }),
    ]);

    const purchaseData = await purchaseResult.json();
    const itemsData = await itemsResult.json();
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

    return {
      totalPurchases: createKPI(purchaseData),
      totalItemsPurchased: createKPI(itemsData),
      totalPOCount: createKPI(ordersData),
      totalOrders: createKPI(ordersData),
      avgPOValue: createKPI(avgOrderData),
      avgOrderValue: createKPI(avgOrderData),
      apOutstanding: createKPI([{ current_value: 0, previous_value: 0 }]),
    };
  } catch (error) {
    console.error('Error fetching purchase KPIs:', error);
    throw error;
  }
}

/**
 * Get Purchase Trend data by day
 */
export async function getPurchaseTrendData(dateRange: DateRange): Promise<PurchaseTrendData[]> {
  try {
    const query = `
      SELECT
        formatDateTime(toStartOfMonth(doc_datetime), '%Y-%m') as month,
        sum(total_amount) as totalPurchases,
        count(DISTINCT doc_no) as poCount
      FROM purchase_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
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
      totalPurchases: Number(row.totalPurchases) || 0,
      poCount: Number(row.poCount) || 0,
    }));
  } catch (error) {
    console.error('Error fetching purchase trend:', error);
    throw error;
  }
}

/**
 * Get Top Suppliers
 */
export async function getTopSuppliers(dateRange: DateRange): Promise<TopSupplier[]> {
  try {
    const query = `
      SELECT
        supplier_code as supplierCode,
        supplier_name as supplierName,
        count(DISTINCT doc_no) as poCount,
        sum(total_amount) as totalPurchases,
        avg(total_amount) as avgPOValue,
        max(doc_datetime) as lastPurchaseDate
      FROM purchase_transaction
      WHERE status_cancel != 'Cancel'
        AND supplier_code != ''
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
      GROUP BY supplier_code, supplier_name
      ORDER BY totalPurchases DESC
      LIMIT 20
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      supplierCode: row.supplierCode,
      supplierName: row.supplierName,
      poCount: Number(row.poCount) || 0,
      totalPurchases: Number(row.totalPurchases) || 0,
      avgPOValue: Number(row.avgPOValue) || 0,
      lastPurchaseDate: row.lastPurchaseDate,
    }));
  } catch (error) {
    console.error('Error fetching top suppliers:', error);
    throw error;
  }
}

/**
 * Get Purchase by Category
 */
export async function getPurchaseByCategory(dateRange: DateRange): Promise<PurchaseByCategory[]> {
  try {
    const query = `
      SELECT
        ptd.item_category_code as categoryCode,
        ptd.item_category_name as categoryName,
        sum(ptd.qty) as totalQty,
        sum(ptd.sum_amount) as totalPurchaseValue,
        count(DISTINCT ptd.item_code) as uniqueItems
      FROM purchase_transaction_detail ptd
      JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
      WHERE pt.status_cancel != 'Cancel'
        AND pt.doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        AND ptd.item_category_name != ''
      GROUP BY ptd.item_category_code, ptd.item_category_name
      ORDER BY totalPurchaseValue DESC
      LIMIT 15
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      categoryCode: row.categoryCode || '',
      categoryName: row.categoryName || 'ไม่ระบุ',
      totalQty: Number(row.totalQty) || 0,
      totalPurchaseValue: Number(row.totalPurchaseValue) || 0,
      uniqueItems: Number(row.uniqueItems) || 0,
    }));
  } catch (error) {
    console.error('Error fetching purchase by category:', error);
    throw error;
  }
}

/**
 * Get Purchase by Brand
 */
export async function getPurchaseByBrand(dateRange: DateRange): Promise<PurchaseByBrand[]> {
  try {
    const query = `
      SELECT
        ptd.item_brand_code as brandCode,
        ptd.item_brand_name as brandName,
        sum(ptd.sum_amount) as totalPurchaseValue,
        uniq(ptd.item_code) as uniqueItems
      FROM purchase_transaction_detail ptd
      JOIN purchase_transaction pt ON ptd.doc_no = pt.doc_no AND ptd.branch_sync = pt.branch_sync
      WHERE pt.status_cancel != 'Cancel'
        AND pt.doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        AND ptd.item_brand_name != ''
      GROUP BY ptd.item_brand_code, ptd.item_brand_name
      ORDER BY totalPurchaseValue DESC
      LIMIT 15
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      brandCode: row.brandCode || '',
      brandName: row.brandName || 'ไม่ระบุ',
      totalPurchaseValue: Number(row.totalPurchaseValue) || 0,
      uniqueItems: Number(row.uniqueItems) || 0,
    }));
  } catch (error) {
    console.error('Error fetching purchase by brand:', error);
    throw error;
  }
}

/**
 * Get AP Outstanding (Accounts Payable)
 */
export async function getAPOutstanding(dateRange: DateRange): Promise<APOutstanding[]> {
  try {
    const query = `
      SELECT
        supplier_code as supplierCode,
        supplier_name as supplierName,
        sum(total_amount - sum_pay_money) as totalOutstanding,
        sum(CASE WHEN due_date < today() AND total_amount > sum_pay_money THEN total_amount - sum_pay_money ELSE 0 END) as overdueAmount,
        count(DISTINCT doc_no) as docCount
      FROM purchase_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_type = 'CREDIT'
        AND doc_datetime BETWEEN {start_date:String} AND {end_date:String}
        AND total_amount > sum_pay_money
      GROUP BY supplier_code, supplier_name
      ORDER BY totalOutstanding DESC
      LIMIT 20
    `;

    const result = await clickhouse.query({
      query,
      query_params: { start_date: dateRange.start, end_date: dateRange.end },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      supplierCode: row.supplierCode || '',
      supplierName: row.supplierName || 'ไม่ระบุ',
      totalOutstanding: Number(row.totalOutstanding) || 0,
      overdueAmount: Number(row.overdueAmount) || 0,
      docCount: Number(row.docCount) || 0,
    }));
  } catch (error) {
    console.error('Error fetching AP outstanding:', error);
    throw error;
  }
}
