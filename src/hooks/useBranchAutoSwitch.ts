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

            // If user is NOT on comparison page AND branch includes "ALL"
            // Auto-switch to B1
            if (!pathname.includes('/comparison') && branch.includes('ALL')) {
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
