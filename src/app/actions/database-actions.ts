'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const DATABASE_COOKIE_NAME = 'selected_database';

/**
 * Get the currently selected database key from cookies
 */
export async function getSelectedDatabaseKey(): Promise<string> {
    const cookieStore = await cookies();
    const selectedDatabase = cookieStore.get(DATABASE_COOKIE_NAME)?.value;
    return selectedDatabase || 'CLICKHOUSE'; // Default to ClickHouse
}

/**
 * Set the selected database key in cookies
 */
export async function setSelectedDatabaseKey(databaseKey: string) {
    const cookieStore = await cookies();
    cookieStore.set(DATABASE_COOKIE_NAME, databaseKey, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        sameSite: 'lax',
    });

    // Revalidate all paths to ensure fresh data using new database
    revalidatePath('/', 'layout');
}
