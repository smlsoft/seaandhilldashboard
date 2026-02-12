'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSelectedBranch, setSelectedBranch } from '@/app/actions/branch-actions';

/**
 * Hook to auto-switch from "ALL" branch to "B1" when navigating 
 * from Comparison page to other pages
 */
export function useBranchAutoSwitch() {
    const pathname = usePathname();
    const [currentBranch, setCurrentBranch] = useState<string[]>([]);

    useEffect(() => {
        const checkAndSwitch = async () => {
            const branch = await getSelectedBranch();
            setCurrentBranch(branch);

            // Only auto-switch if:
            // 1. User is NOT on comparison page
            // 2. Branch is EXACTLY ['ALL'] (not a specific branch selection)
            // 3. Prevent switching if user has manually selected specific branches
            if (
                !pathname.includes('/comparison') &&
                branch.length === 1 &&
                branch[0] === 'ALL'
            ) {
                await setSelectedBranch(['B1']);
                setCurrentBranch(['B1']);
                // Refresh to show new branch data
                window.location.reload();
            }
        };

        checkAndSwitch();
    }, [pathname]);

    return currentBranch;
}
