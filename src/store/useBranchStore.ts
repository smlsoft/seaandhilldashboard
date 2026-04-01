/**
 * useBranchStore - Zustand Store for Branch Selection
 *
 * Replaces:
 * - Custom Event Bus (branch-events.ts)
 * - Local useState in BranchSwitcher.tsx
 * - Branch-related state in ComparisonContext.tsx
 *
 * React Query still handles data fetching (server state).
 * This store manages which branches are selected (UI/client state).
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface BranchInfo {
  key: string;
  name: string;
}

interface BranchStore {
  // --- State ---
  /** Currently selected branch keys, e.g. ['ALL'] or ['B001', 'B002'] */
  selectedBranches: string[];
  /** All available branches fetched from API (excludes 'ALL' virtual option) */
  availableBranches: BranchInfo[];
  /** Whether the initial branch data has been loaded */
  isLoaded: boolean;

  // --- Actions ---
  setSelectedBranches: (keys: string[]) => void;
  setAvailableBranches: (branches: BranchInfo[]) => void;
  setLoaded: (loaded: boolean) => void;
}

export const useBranchStore = create<BranchStore>()(
  subscribeWithSelector((set) => ({
    selectedBranches: ['ALL'],
    availableBranches: [],
    isLoaded: false,

    setSelectedBranches: (keys) => set({ selectedBranches: keys }),
    setAvailableBranches: (branches) => set({ availableBranches: branches }),
    setLoaded: (loaded) => set({ isLoaded: loaded }),
  }))
);

/**
 * Derived selector: expands 'ALL' into individual branch keys.
 * Use this in components that need specific branch keys for API calls.
 */
export function useExpandedBranches(): string[] {
  const { selectedBranches, availableBranches } = useBranchStore();

  if (selectedBranches.includes('ALL')) {
    return availableBranches.map((b) => b.key);
  }
  return selectedBranches;
}

/**
 * Convenience selector for the display label shown in BranchSwitcher button.
 */
export function useBranchDisplayText(): string {
  const { selectedBranches, availableBranches } = useBranchStore();

  if (selectedBranches.includes('ALL')) return 'ทุกกิจการ';
  if (selectedBranches.length === 1) {
    const branch = availableBranches.find((b) => b.key === selectedBranches[0]);
    return branch?.name || 'เลือกกิจการ';
  }
  return `${selectedBranches.length} กิจการ`;
}
