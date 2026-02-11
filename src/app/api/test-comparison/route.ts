import { NextRequest, NextResponse } from 'next/server';
import { getBranchComparisonData, BranchComparisonData } from '@/lib/data/comparison';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;

        const data = await getBranchComparisonData(from, to);
        return NextResponse.json({
            period: { from, to },
            count: data.length,
            totalSales: data.reduce((sum: number, b: BranchComparisonData) => sum + b.totalSales, 0),
            data
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
