import { NextRequest, NextResponse } from 'next/server';
import { getInventoryKPIs } from '@/lib/data/inventory';
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
      () => getInventoryKPIs(asOfDate, branches),
      ['inventory', 'kpis', asOfDate, ...branches],
      CacheDuration.MEDIUM
    );

    const data = await cachedQuery();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    logError(error, 'GET /api/inventory/kpis');
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
