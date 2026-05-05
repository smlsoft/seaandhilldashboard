/**
 * Dashboard Overview Data Layer
 * ฟังก์ชันดึงข้อมูลสำหรับหน้า Dashboard หลัก
 */

import { clickhouse } from '../clickhouse';
import type { DateRange } from './types';

export interface DashboardKPIs {
  totalSales: number;
  salesGrowth: number | null;     // null = ไม่มีข้อมูลรอบก่อนหน้า
  totalOrders: number;
  ordersGrowth: number | null;
  totalCustomers: number;
  customersGrowth: number | null;
  avgOrderValue: number;
  avgOrderGrowth: number | null;
}

/**
 * คำนวณ % การเติบโต — return null ถ้าไม่มีข้อมูล period ก่อนหน้า
 */
function calcGrowthPct(current: number, prev: number): number | null {
  if (prev === 0) return null;  // ไม่มีข้อมูลรอบก่อน → แสดง "ไม่มีข้อมูล"
  return ((current - prev) / prev) * 100;
}

export interface SalesChartData {
  date: string;
  amount: number;
  orders: number;
}

export interface RevenueExpenseData {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
}

export interface RecentSale {
  docNo: string;
  customerName: string;
  totalAmount: number;
  docDate: string;
  statusPayment: string;
  branchName?: string;
}

export interface Alert {
  id: number;
  type: 'info' | 'warning' | 'error';  // ตรงกับ alertConfig ใน AlertsCard.tsx
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
}

// Helper to build branch filter
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

/**
 * Get Dashboard KPIs
 * ดึง KPIs หลักสำหรับ Dashboard
 */
export async function getDashboardKPIs(branchSync?: string[], dateRange?: DateRange): Promise<DashboardKPIs> {
  try {
    // ใช้ dateRange ที่ส่งมา หรือ default เป็นวันนี้
    const endDate = dateRange?.end || new Date().toISOString().split('T')[0];
    const startDate = dateRange?.start || endDate;

    // คำนวณช่วงเวลาที่ผ่านมา (previous period) โดยใช้ระยะเวลาเท่ากัน
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevEndDate = new Date(new Date(startDate).getTime() - 86400000).toISOString().split('T')[0]; // วันก่อน startDate
    const prevStartDate = new Date(new Date(prevEndDate).getTime() - (daysDiff - 1) * 86400000).toISOString().split('T')[0];

    const branchFilter = buildBranchFilter(branchSync);

    // ยอดขายช่วงเวลาที่เลือก
    let salesQuery = `
      SELECT
        sum(total_amount) as currentSales,
        count(DISTINCT doc_no) as currentOrders,
        uniq(customer_code) as currentCustomers,
        avg(total_amount) as currentAvgOrder
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND toDate(doc_datetime) >= toDate({startDate:String})
        AND toDate(doc_datetime) <= toDate({endDate:String})
        ${branchFilter.sql}
    `;

    // ยอดขายช่วงเวลาก่อนหน้า
    let prevSalesQuery = `
      SELECT
        sum(total_amount) as prevSales,
        count(DISTINCT doc_no) as prevOrders,
        uniq(customer_code) as prevCustomers,
        avg(total_amount) as prevAvgOrder
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND toDate(doc_datetime) >= toDate({prevStartDate:String})
        AND toDate(doc_datetime) <= toDate({prevEndDate:String})
        ${branchFilter.sql}
    `;

    const [currentResult, prevResult] = await Promise.all([
      clickhouse.query({
        query: salesQuery,
        query_params: {
          startDate,
          endDate,
          ...branchFilter.params
        },
        format: 'JSONEachRow',
      }),
      clickhouse.query({
        query: prevSalesQuery,
        query_params: {
          prevStartDate,
          prevEndDate,
          ...branchFilter.params
        },
        format: 'JSONEachRow',
      }),
    ]);

    const currentData = (await currentResult.json())[0] as Record<string, unknown> || {};
    const prevData = (await prevResult.json())[0] as Record<string, unknown> || {};

    // --- ค่าปัจจุบัน ---
    const currentSales = Number(currentData.currentSales) || 0;
    const currentOrders = Number(currentData.currentOrders) || 0;
    const currentCustomers = Number(currentData.currentCustomers) || 0;
    const currentAvgOrder = Number(currentData.currentAvgOrder) || 0;

    // --- ค่า previous period (อาจเป็น 0 ถ้าไม่มีข้อมูล) ---
    const prevSales = Number(prevData.prevSales) || 0;
    const prevOrders = Number(prevData.prevOrders) || 0;
    const prevCustomers = Number(prevData.prevCustomers) || 0;
    const prevAvgOrder = Number(prevData.prevAvgOrder) || 0;

    return {
      totalSales: currentSales,
      salesGrowth: calcGrowthPct(currentSales, prevSales),
      totalOrders: currentOrders,
      ordersGrowth: calcGrowthPct(currentOrders, prevOrders),
      totalCustomers: currentCustomers,
      customersGrowth: calcGrowthPct(currentCustomers, prevCustomers),
      avgOrderValue: currentAvgOrder,
      avgOrderGrowth: calcGrowthPct(currentAvgOrder, prevAvgOrder),
    };
  } catch (error) {
    console.error('Error fetching dashboard KPIs:', error);
    throw error;
  }
}

/**
 * Get Sales Chart Data
 * ดึงข้อมูลกราฟยอดขายตามช่วงวันที่
 */
export async function getSalesChartData(branchSync?: string[], dateRange?: DateRange): Promise<SalesChartData[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    // ใช้ dateRange ที่ส่งมา หรือ default เป็น 30 วันล่าสุด
    const endDate = dateRange?.end || new Date().toISOString().split('T')[0];
    const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let query = `
      SELECT
        toDate(doc_datetime) as date,
        sum(total_amount) as amount,
        count(DISTINCT doc_no) as orders
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND toDate(doc_datetime) >= toDate({startDate:String})
        AND toDate(doc_datetime) <= toDate({endDate:String})
        ${branchFilter.sql}
    `;

    query += `
      GROUP BY date
      ORDER BY date ASC
    `;

    const result = await clickhouse.query({
      query,
      query_params: {
        startDate,
        endDate,
        ...branchFilter.params
      },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      date: row.date,
      amount: Number(row.amount) || 0,
      orders: Number(row.orders) || 0,
    }));
  } catch (error) {
    console.error('Error fetching sales chart data:', error);
    throw error;
  }
}

/**
 * Get Revenue vs Expense Data
 * ดึงข้อมูลรายได้ vs ค่าใช้จ่ายตามช่วงวันที่ (กลุ่มเป็นรายเดือน)
 */
export async function getRevenueExpenseData(branchSync?: string[], dateRange?: DateRange): Promise<RevenueExpenseData[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    // ใช้ dateRange ที่ส่งมา หรือ default เป็น 12 เดือนล่าสุด
    const endDate = dateRange?.end || new Date().toISOString().split('T')[0];
    const startDate = dateRange?.start || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Query revenue from sales
    let revenueQuery = `
      SELECT
        formatDateTime(toStartOfMonth(doc_datetime), '%Y-%m') as month,
        sum(total_amount) as revenue
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND toDate(doc_datetime) >= toDate({startDate:String})
        AND toDate(doc_datetime) <= toDate({endDate:String})
        ${branchFilter.sql}
    `;

    revenueQuery += `
      GROUP BY month
      ORDER BY month ASC
    `;

    // Query expenses from purchases
    let expenseQuery = `
      SELECT
        formatDateTime(toStartOfMonth(doc_datetime), '%Y-%m') as month,
        sum(total_amount) as expense
      FROM purchase_transaction
      WHERE status_cancel != 'Cancel'
        AND toDate(doc_datetime) >= toDate({startDate:String})
        AND toDate(doc_datetime) <= toDate({endDate:String})
        ${branchFilter.sql}
    `;

    expenseQuery += `
      GROUP BY month
      ORDER BY month ASC
    `;

    const [revenueResult, expenseResult] = await Promise.all([
      clickhouse.query({
        query: revenueQuery,
        query_params: {
          startDate,
          endDate,
          ...branchFilter.params
        },
        format: 'JSONEachRow',
      }),
      clickhouse.query({
        query: expenseQuery,
        query_params: {
          startDate,
          endDate,
          ...branchFilter.params
        },
        format: 'JSONEachRow',
      }),
    ]);

    const revenueData = await revenueResult.json();
    const expenseData = await expenseResult.json();

    // Create a map of expenses by month
    const expenseMap = new Map<string, number>();
    expenseData.forEach((row: any) => {
      expenseMap.set(row.month, Number(row.expense) || 0);
    });

    // Combine revenue and expense data
    const combined: RevenueExpenseData[] = revenueData.map((row: any) => {
      const month = row.month;
      const revenue = Number(row.revenue) || 0;
      const expense = expenseMap.get(month) || 0;
      return {
        month,
        revenue,
        expense,
        profit: revenue - expense,
      };
    });

    // Add any months that have expenses but no revenue
    expenseData.forEach((row: any) => {
      const month = row.month;
      if (!combined.find((item: RevenueExpenseData) => item.month === month)) {
        const expense = Number(row.expense) || 0;
        combined.push({
          month,
          revenue: 0,
          expense,
          profit: -expense,
        });
      }
    });

    // Sort by month
    combined.sort((a: RevenueExpenseData, b: RevenueExpenseData) => a.month.localeCompare(b.month));

    return combined;
  } catch (error) {
    console.error('Error fetching revenue/expense data:', error);
    throw error;
  }
}

/**
 * Get Recent Sales
 * ดึงรายการขายล่าสุด 10 รายการตามช่วงวันที่
 */
export async function getRecentSales(branchSync?: string[], dateRange?: DateRange, limit: number = 10): Promise<RecentSale[]> {
  try {
    const branchFilter = buildBranchFilter(branchSync);

    // ใช้ dateRange ที่ส่งมา หรือ default เป็น 30 วันล่าสุด
    const endDate = dateRange?.end || new Date().toISOString().split('T')[0];
    const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let query = `
      SELECT
        doc_no as docNo,
        customer_name as customerName,
        total_amount as totalAmount,
        toTimeZone(doc_datetime, 'Asia/Bangkok') as docDate,
        status_payment as statusPayment,
        branch_sync_name as branchName
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND toDate(doc_datetime) >= toDate({startDate:String})
        AND toDate(doc_datetime) <= toDate({endDate:String})
        ${branchFilter.sql}
    `;

    query += `
      ORDER BY doc_datetime DESC
      LIMIT ${limit}
    `;

    const result = await clickhouse.query({
      query,
      query_params: {
        startDate,
        endDate,
        ...branchFilter.params
      },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      docNo: row.docNo,
      customerName: row.customerName || 'ไม่ระบุ',
      totalAmount: Number(row.totalAmount) || 0,
      docDate: row.docDate,
      statusPayment: row.statusPayment || 'รอชำระ',
      branchName: row.branchName || '',
    }));
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    throw error;
  }
}

/**
 * Get Dashboard Alerts
 * ดึงการแจ้งเตือนสำคัญต่างๆ
 */
export async function getDashboardAlerts(branchSync?: string[]): Promise<Alert[]> {
  try {
    const alerts: Alert[] = [];
    const today = new Date().toISOString().split('T')[0];
    const branchFilter = buildBranchFilter(branchSync);

    // 1. Low Stock Items
    // ใช้ subquery GROUP BY item_code เพื่อนับจำนวนสินค้า (SKU)
    // threshold = Days on Hand <= 7 (อิงจากอัตราขายย้อนหลัง 30 วัน)
    const lowStockQuery = `
      SELECT count(*) as count
      FROM (
        SELECT
          item_code,
          sum(qty) as totalQty,
          abs(sumIf(qty, qty < 0 AND toDate(doc_datetime) >= toDate({today:String}) - INTERVAL 30 DAY)) as totalOut30d,
          totalOut30d / 30 as avgDailyOut,
          if(avgDailyOut > 0, totalQty / avgDailyOut, 999999) as daysOnHand
        FROM stock_transaction
        WHERE toDate(doc_datetime) <= toDate({today:String})
          ${branchFilter.sql}
        GROUP BY item_code
        HAVING totalQty > 0 AND avgDailyOut > 0 AND daysOnHand <= 7
      )
    `;

    // 2. Overstock Items
    // threshold = Days on Hand > 90 (อิงจากอัตราขายย้อนหลัง 30 วัน)
    const overstockQuery = `
      SELECT count(*) as count
      FROM (
        SELECT
          item_code,
          sum(qty) as totalQty,
          abs(sumIf(qty, qty < 0 AND toDate(doc_datetime) >= toDate({today:String}) - INTERVAL 30 DAY)) as totalOut30d,
          totalOut30d / 30 as avgDailyOut,
          if(avgDailyOut > 0, totalQty / avgDailyOut, 999999) as daysOnHand
        FROM stock_transaction
        WHERE toDate(doc_datetime) <= toDate({today:String})
          ${branchFilter.sql}
        GROUP BY item_code
        HAVING totalQty > 0 AND daysOnHand > 90
      )
    `;

    // 3. Overdue Payments (AR)
    // นับเอกสารขายที่ค้างชำระเกินกำหนด
    const overdueQuery = `
      SELECT count(*) as count, sum(outstanding) as amount
      FROM (
        SELECT
          doc_no,
          total_amount - sum_pay_money as outstanding
        FROM saleinvoice_transaction
        WHERE status_cancel != 'Cancel'
          AND status_payment != 'Fully Paid'
          AND due_date < today()
          AND (total_amount - sum_pay_money) > 0
          ${branchFilter.sql}
      )
    `;

    const queryParams = {
      today,
      ...branchFilter.params
    };

    const [lowStockRes, overstockRes, overdueRes] = await Promise.all([
      clickhouse.query({ query: lowStockQuery, query_params: queryParams, format: 'JSONEachRow' }),
      clickhouse.query({ query: overstockQuery, query_params: queryParams, format: 'JSONEachRow' }),
      clickhouse.query({ query: overdueQuery, query_params: queryParams, format: 'JSONEachRow' }),
    ]);

    const lowStockData = (await lowStockRes.json())[0] as Record<string, unknown> | undefined;
    const overstockData = (await overstockRes.json())[0] as Record<string, unknown> | undefined;
    const overdueData = (await overdueRes.json())[0] as Record<string, unknown> | undefined;

    const lowStockCount = Number(lowStockData?.count) || 0;
    const overstockCount = Number(overstockData?.count) || 0;
    const overdueCount = Number(overdueData?.count) || 0;
    const overdueAmount = Number(overdueData?.amount) || 0;

    if (lowStockCount > 0) {
      alerts.push({
        id: 1,
        type: 'warning',
        title: 'สินค้าใกล้หมด',
        message: `มีสินค้า ${lowStockCount} SKU ที่สต็อกคงเหลือใช้งานได้ ≤ 7 วัน`,
        severity: 'warning',
        timestamp: new Date().toISOString(),
      });
    }

    if (overstockCount > 0) {
      alerts.push({
        id: 2,
        type: 'info',
        title: 'สินค้าเกินคลัง',
        message: `มีสินค้า ${overstockCount} SKU ที่คาดว่าจะขายได้นานกว่า > 90 วัน`,
        severity: 'info',
        timestamp: new Date().toISOString(),
      });
    }

    if (overdueCount > 0) {
      alerts.push({
        id: 3,
        type: 'error',
        title: 'ลูกหนี้ค้างชำระ',
        message: `มี ${overdueCount} บิลเกินกำหนดชำระ มูลค่า ฿${overdueAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        severity: 'error',
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching dashboard alerts:', error);
    return [];
  }
}
