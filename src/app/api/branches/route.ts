import { NextResponse } from 'next/server';
import { clickhouse } from '@/lib/clickhouse';

// Branch mapping configuration
const BRANCH_MAPPING: Record<string, string> = {
    'b000': 'บริษัท ช้าง สยาม กัมปนี จำกัด',
    'b001': 'บริษัท ช้างสยามรวย จำกัด',
    'b002': 'บริษัท ช้าง ทรัพย์ ทวี จำกัด',
    'b003': 'บริษัท ชาวทะเลเฮฮา จำกัด',
    'b004': 'บริษัท ดีจิงจัง 5665 จำกัด',
    'b005': 'บริษัท ฮอมฮัก จำกัด',
};

export async function GET() {
    try {
        // Query distinct branch_sync from ClickHouse
        const query = `
            SELECT DISTINCT branch_sync
            FROM saleinvoice_transaction
            WHERE branch_sync != ''
            ORDER BY branch_sync
        `;

        const result = await clickhouse.query({
            query,
            format: 'JSONEachRow',
        });

        const data = await result.json();

        // Transform to branch info format using the mapping
        const branches = [
            { key: 'ALL', name: 'ทุกกิจการ' }, // All branches option
            ...data.map((row: any) => {
                const branchCode = row.branch_sync;
                return {
                    key: branchCode,
                    name: BRANCH_MAPPING[branchCode] || `กิจการ ${branchCode}`, // Fallback if not in mapping
                };
            })
        ];

        return NextResponse.json(branches);
    } catch (error) {
        console.error('Failed to fetch branches:', error);
        return NextResponse.json(
            { error: 'Failed to fetch branches from ClickHouse' },
            { status: 500 }
        );
    }
}
