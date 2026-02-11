/**
 * GET /api/revenue-expense
 * ดึงข้อมูลรายได้ vs ค่าใช้จ่าย 12 เดือนล่าสุด
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRevenueExpenseData } from '@/lib/data/dashboard';
import { createCachedQuery, CacheDuration } from '@/lib/cache';
import { formatErrorResponse, logError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const branches = searchParams.getAll('branch');
    let normalizedBranches = branches;
    if (branches.length === 0) {
      normalizedBranches = ['ALL'];
    } else if (branches.length === 1 && branches[0].includes(',')) {
      normalizedBranches = branches[0].split(',');
    }

    const cachedQuery = createCachedQuery(
      async () => {
        return await getRevenueExpenseData(normalizedBranches);
      },
      ['dashboard', 'revenue-expense', ...normalizedBranches],
      CacheDuration.LONG // 10 minutes cache
    );

    const data = await cachedQuery();

    return NextResponse.json(data);
  } catch (error) {
    logError(error, 'GET /api/revenue-expense');
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
