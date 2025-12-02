/**
 * Dashboard Overview Data Layer
 * ฟังก์ชันดึงข้อมูลสำหรับหน้า Dashboard หลัก
 */

import { clickhouse } from '../clickhouse';

export interface DashboardKPIs {
  totalSales: number;
  salesGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  totalCustomers: number;
  customersGrowth: number;
  avgOrderValue: number;
  avgOrderGrowth: number;
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
}

export interface Alert {
  id: string;
  type: 'low_stock' | 'overstock' | 'overdue_payment' | 'high_value_order';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
}

/**
 * Get Dashboard KPIs
 * ดึง KPIs หลักสำหรับ Dashboard
 */
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];

    // ยอดขายเดือนนี้
    const salesQuery = `
      SELECT
        sum(total_amount) as currentSales,
        count(DISTINCT doc_no) as currentOrders,
        uniq(customer_code) as currentCustomers,
        avg(total_amount) as currentAvgOrder
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND toStartOfMonth(doc_datetime) = toStartOfMonth(toDate({today:String}))
    `;

    // ยอดขายเดือนที่แล้ว
    const prevSalesQuery = `
      SELECT
        sum(total_amount) as prevSales,
        count(DISTINCT doc_no) as prevOrders,
        uniq(customer_code) as prevCustomers,
        avg(total_amount) as prevAvgOrder
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND toStartOfMonth(doc_datetime) = toStartOfMonth(toDate({lastMonth:String}))
    `;

    const [currentResult, prevResult] = await Promise.all([
      clickhouse.query({
        query: salesQuery,
        query_params: { today },
        format: 'JSONEachRow',
      }),
      clickhouse.query({
        query: prevSalesQuery,
        query_params: { lastMonth },
        format: 'JSONEachRow',
      }),
    ]);

    const currentData = (await currentResult.json())[0] as Record<string, unknown> || {};
    const prevData = (await prevResult.json())[0] as Record<string, unknown> || {};

    const currentSales = Number(currentData.currentSales) || 0;
    const prevSales = Number(prevData.prevSales) || 1;
    const currentOrders = Number(currentData.currentOrders) || 0;
    const prevOrders = Number(prevData.prevOrders) || 1;
    const currentCustomers = Number(currentData.currentCustomers) || 0;
    const prevCustomers = Number(prevData.prevCustomers) || 1;
    const currentAvgOrder = Number(currentData.currentAvgOrder) || 0;
    const prevAvgOrder = Number(prevData.prevAvgOrder) || 1;

    return {
      totalSales: currentSales,
      salesGrowth: ((currentSales - prevSales) / prevSales) * 100,
      totalOrders: currentOrders,
      ordersGrowth: ((currentOrders - prevOrders) / prevOrders) * 100,
      totalCustomers: currentCustomers,
      customersGrowth: ((currentCustomers - prevCustomers) / prevCustomers) * 100,
      avgOrderValue: currentAvgOrder,
      avgOrderGrowth: ((currentAvgOrder - prevAvgOrder) / prevAvgOrder) * 100,
    };
  } catch (error) {
    console.error('Error fetching dashboard KPIs:', error);
    throw error;
  }
}

/**
 * Get Sales Chart Data (Last 30 days)
 * ดึงข้อมูลกราฟยอดขาย 30 วันล่าสุด
 */
export async function getSalesChartData(): Promise<SalesChartData[]> {
  try {
    const query = `
      SELECT
        toDate(doc_datetime) as date,
        sum(total_amount) as amount,
        count(DISTINCT doc_no) as orders
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime >= now() - INTERVAL 30 DAY
      GROUP BY date
      ORDER BY date ASC
    `;

    const result = await clickhouse.query({
      query,
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
 * Get Revenue vs Expense Data (Last 12 months)
 * ดึงข้อมูลรายได้ vs ค่าใช้จ่าย 12 เดือนล่าสุด
 */
export async function getRevenueExpenseData(): Promise<RevenueExpenseData[]> {
  try {
    const query = `
      SELECT
        formatDateTime(toStartOfMonth(doc_datetime), '%Y-%m') as month,
        sum(total_amount) as revenue,
        sum(total_cost) as expense,
        revenue - expense as profit
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
        AND doc_datetime >= now() - INTERVAL 12 MONTH
      GROUP BY month
      ORDER BY month ASC
    `;

    const result = await clickhouse.query({
      query,
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      month: row.month,
      revenue: Number(row.revenue) || 0,
      expense: Number(row.expense) || 0,
      profit: Number(row.profit) || 0,
    }));
  } catch (error) {
    console.error('Error fetching revenue/expense data:', error);
    throw error;
  }
}

/**
 * Get Recent Sales (Last 10 transactions)
 * ดึงรายการขายล่าสุด 10 รายการ
 */
export async function getRecentSales(): Promise<RecentSale[]> {
  try {
    const query = `
      SELECT
        doc_no as docNo,
        customer_name as customerName,
        total_amount as totalAmount,
        doc_datetime as docDate,
        status_payment as statusPayment
      FROM saleinvoice_transaction
      WHERE status_cancel != 'Cancel'
      ORDER BY doc_datetime DESC
      LIMIT 10
    `;

    const result = await clickhouse.query({
      query,
      format: 'JSONEachRow',
    });

    const data = await result.json();
    return data.map((row: any) => ({
      docNo: row.docNo,
      customerName: row.customerName || 'ไม่ระบุ',
      totalAmount: Number(row.totalAmount) || 0,
      docDate: row.docDate,
      statusPayment: row.statusPayment || 'รอชำระ',
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
export async function getDashboardAlerts(): Promise<Alert[]> {
  try {
    const alerts: Alert[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. Low Stock Items
    const lowStockQuery = `
      SELECT count(*) as count
      FROM stock_transaction
      WHERE toDate(doc_datetime) <= toDate({today:String})
        AND qty_onhand > 0
        AND qty_onhand < reorder_point
        AND reorder_point > 0
    `;

    // 2. Overstock Items
    const overstockQuery = `
      SELECT count(*) as count
      FROM stock_transaction
      WHERE toDate(doc_datetime) <= toDate({today:String})
        AND qty_onhand > max_stock_level
        AND max_stock_level > 0
    `;

    // 3. Overdue Payments (AR)
    const overdueQuery = `
      SELECT count(*) as count, sum(outstanding) as amount
      FROM (
        SELECT
          doc_no,
          total_amount - paid_amount as outstanding,
          dateDiff('day', due_date, now()) as daysOverdue
        FROM saleinvoice_transaction
        WHERE status_cancel != 'Cancel'
          AND status_payment != 'ชำระแล้ว'
          AND due_date < now()
          AND outstanding > 0
      )
    `;

    const [lowStockRes, overstockRes, overdueRes] = await Promise.all([
      clickhouse.query({ query: lowStockQuery, query_params: { today }, format: 'JSONEachRow' }),
      clickhouse.query({ query: overstockQuery, query_params: { today }, format: 'JSONEachRow' }),
      clickhouse.query({ query: overdueQuery, format: 'JSONEachRow' }),
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
        id: '1',
        type: 'low_stock',
        title: 'สินค้าใกล้หมด',
        message: `มีสินค้า ${lowStockCount} รายการที่ต่ำกว่า Reorder Point`,
        severity: 'warning',
        timestamp: new Date().toISOString(),
      });
    }

    if (overstockCount > 0) {
      alerts.push({
        id: '2',
        type: 'overstock',
        title: 'สินค้าเกินคลัง',
        message: `มีสินค้า ${overstockCount} รายการที่เกิน Max Stock Level`,
        severity: 'info',
        timestamp: new Date().toISOString(),
      });
    }

    if (overdueCount > 0) {
      alerts.push({
        id: '3',
        type: 'overdue_payment',
        title: 'ลูกหนี้ค้างชำระ',
        message: `มีลูกหนี้ ${overdueCount} รายการเกินกำหนด มูลค่า ฿${overdueAmount.toLocaleString()}`,
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
