import { NextResponse } from 'next/server';
import { getBranchComparisonData } from '@/lib/data/comparison';
import { formatErrorResponse, logError } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;

    let branches = searchParams.getAll('branch');
    if (branches.length === 0) {
      branches = ['ALL'];
    } else if (branches.length === 1 && branches[0].includes(',')) {
      branches = branches[0].split(',');
    }

    const data = await getBranchComparisonData(startDate, endDate, branches);

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(error, 'GET /api/comparison');
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
