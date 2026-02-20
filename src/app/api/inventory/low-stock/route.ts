import { NextRequest, NextResponse } from 'next/server';
import { getLowStockItems } from '@/lib/data/inventory';
import { createCachedQuery, CacheDuration } from '@/lib/cache';
import { formatErrorResponse, logError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('as_of_date') || new Date().toISOString().split('T')[0];

    let branches = searchParams.getAll('branch');
    if (branches.length === 0) {
      branches = ['ALL'];
    } else if (branches.length === 1 && branches[0].includes(',')) {
      branches = branches[0].split(',');
    }

    const cachedQuery = createCachedQuery(
      () => getLowStockItems(asOfDate, branches),
      ['inventory', 'low-stock', asOfDate, ...branches],
      CacheDuration.MEDIUM
    );

    const data = await cachedQuery();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    logError(error, 'GET /api/inventory/low-stock');
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
