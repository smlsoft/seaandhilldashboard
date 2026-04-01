/**
 * branch-events.ts — Deprecated / Compatibility shim
 *
 * Branch selection is now managed by Zustand `useBranchStore`.
 * Components should use `useBranchStore` directly instead of this event system.
 *
 * - `emitBranchChange`  → No longer needed. Updating useBranchStore.setSelectedBranches()
 *                          automatically notifies all subscribers.
 * - `useBranchChange`   → No longer needed. Use Zustand store subscription instead:
 *                          const selectedBranches = useBranchStore(s => s.selectedBranches)
 *                          and include it in React Query queryKey.
 *
 * These exports are kept as no-ops for backward compatibility during migration.
 */

import { useEffect } from 'react';

/** @deprecated Use useBranchStore.setSelectedBranches() instead */
export function emitBranchChange(_branchKeys: string[]) {
  // No-op: state is now managed by Zustand
}

/** @deprecated Use useBranchStore(s => s.selectedBranches) in queryKey instead */
export function useBranchChange(_callback: () => void) {
  // No-op: kept to prevent import errors during migration
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {}, [_callback]);
}

export const BRANCH_CHANGE_EVENT = 'branch-change'; // kept for any remaining references
