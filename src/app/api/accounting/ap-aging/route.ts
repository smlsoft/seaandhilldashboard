import { NextResponse } from 'next/server';
import { getAPAgingData } from '@/lib/data/accounting';
import { formatErrorResponse, logError } from '@/lib/errors';
import { createCachedQuery, CacheDuration } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let branches = searchParams.getAll('branch');
    if (branches.length === 0) {
      branches = ['ALL'];
    } else if (branches.length === 1 && branches[0].includes(',')) {
      branches = branches[0].split(',');
    }

    const cachedQuery = createCachedQuery(
      () => getAPAgingData(branches),
      ['accounting', 'ap-aging', ...branches],
      CacheDuration.SHORT
    );

    const data = await cachedQuery();

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(error, 'GET /api/accounting/ap-aging');
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
