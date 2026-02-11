'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const BRANCH_COOKIE_NAME = 'selected_branch';

/**
 * Get the currently selected branches from cookies
 * Returns an array of branch keys
 */
export async function getSelectedBranch(): Promise<string[]> {
    const cookieStore = await cookies();
    const selectedBranch = cookieStore.get(BRANCH_COOKIE_NAME)?.value;

    if (!selectedBranch) {
        return ['ALL']; // Default to all branches
    }

    try {
        // Try to parse as JSON array
        const parsed = JSON.parse(selectedBranch);
        return Array.isArray(parsed) ? parsed : ['ALL'];
    } catch {
        // Backward compatibility: if it's a plain string, wrap it in array
        return [selectedBranch];
    }
}

/**
 * Set the selected branches in cookies
 * Accepts an array of branch keys
 */
export async function setSelectedBranch(branches: string[]) {
    const cookieStore = await cookies();
    cookieStore.set(BRANCH_COOKIE_NAME, JSON.stringify(branches), {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        sameSite: 'lax',
    });

    // Revalidate all paths to ensure fresh data using new branch filter
    revalidatePath('/', 'layout');
}
