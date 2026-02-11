import { NextResponse } from 'next/server';
import { getAllDatabasesInfo } from '@/lib/db/multi-db-config';

export async function GET() {
    try {
        const databases = getAllDatabasesInfo().map(db => ({
            key: db.key,
            name: db.name,
            type: db.type
        }));

        return NextResponse.json(databases);
    } catch (error) {
        console.error('Failed to get databases:', error);
        return NextResponse.json(
            { error: 'Failed to fetch database configurations' },
            { status: 500 }
        );
    }
}
