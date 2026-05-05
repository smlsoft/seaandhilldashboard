import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseByCategorySummary } from '@/lib/data/purchase';
import type { DateRange } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const branches = searchParams.getAll('branch');
    const accountType = searchParams.get('account_type') as 'EXPENSES' | 'ASSETS' | null;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required date parameters' },
        { status: 400 }
      );
    }

    const dateRange: DateRange = {
      start: startDate,
      end: endDate,
    };

    const data = await getPurchaseByCategorySummary(
      dateRange,
      branches.length > 0 ? branches : undefined,
      accountType || 'EXPENSES'
    );

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in purchase by category summary API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase by category summary data' },
      { status: 500 }
    );
  }
}
