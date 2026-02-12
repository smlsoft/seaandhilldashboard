/**
 * GET /api/dashboard
 * ดึงข้อมูล KPIs, Recent Sales, และ Alerts สำหรับหน้า Dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDashboardKPIs, getRecentSales, getDashboardAlerts } from '@/lib/data/dashboard';
import { createCachedQuery, CacheDuration } from '@/lib/cache';
import { formatErrorResponse, logError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const branches = searchParams.getAll('branch');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let normalizedBranches = branches;
    if (branches.length === 0) {
      normalizedBranches = ['ALL'];
    } else if (branches.length === 1 && branches[0].includes(',')) {
      normalizedBranches = branches[0].split(',');
    }

    const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

    const cachedQuery = createCachedQuery(
      async () => {
        const [kpis, recentSales, alerts] = await Promise.all([
          getDashboardKPIs(normalizedBranches, dateRange),
          getRecentSales(normalizedBranches, dateRange),
          getDashboardAlerts(normalizedBranches),
        ]);

        return {
          ...kpis,
          recentSales,
          alerts,
        };
      },
      ['dashboard', 'overview', ...normalizedBranches, startDate || '', endDate || ''],
      CacheDuration.SHORT // 1 minute cache
    );

    const data = await cachedQuery();

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error); // Debug log
    logError(error, 'GET /api/dashboard');
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
