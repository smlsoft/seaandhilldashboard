/**
 * Branch Change Event System
 * Manages custom events for branch switching across the application
 */

import { useEffect } from 'react';

export const BRANCH_CHANGE_EVENT = 'branch-change';

/**
 * Emit a branch change event
 * Call this when the user switches branches
 */
export function emitBranchChange(branchKeys: string[]) {
    const event = new CustomEvent(BRANCH_CHANGE_EVENT, {
        detail: { branchKeys },
    });
    window.dispatchEvent(event);
}

/**
 * Hook to listen for branch changes
 * Automatically triggers the callback when branch changes
 */
export function useBranchChange(callback: () => void) {
    useEffect(() => {
        const handleBranchChange = () => {
            callback();
        };

        window.addEventListener(BRANCH_CHANGE_EVENT, handleBranchChange);

        return () => {
            window.removeEventListener(BRANCH_CHANGE_EVENT, handleBranchChange);
        };
    }, [callback]);
}
