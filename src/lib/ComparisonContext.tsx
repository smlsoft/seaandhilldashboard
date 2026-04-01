'use client';

/**
 * ComparisonContext — Compatibility shim
 *
 * isComparisonMode and selectedBranches logic have been migrated to Zustand:
 *   - useUIStore   → isComparisonMode, toggleComparisonMode, setComparisonMode
 *   - useBranchStore → selectedBranches, availableBranches, isLoaded
 *
 * This file keeps the original `useComparison()` hook API intact so that
 * any existing components using `useComparison()` continue to work without changes.
 * Internally it simply reads from the Zustand stores.
 */

import { useBranchStore } from '@/store/useBranchStore';
import { useUIStore } from '@/store/useUIStore';

export interface BranchInfo {
  key: string;
  name: string;
}

export interface ComparisonContextType {
  selectedBranches: string[];
  availableBranches: BranchInfo[];
  isLoaded: boolean;
  isComparisonMode: boolean;
  toggleComparisonMode: () => void;
  setComparisonMode: (mode: boolean) => void;
}

/**
 * Drop-in replacement for the old `useComparison()` hook.
 * Now reads from Zustand stores instead of React Context.
 */
export function useComparison(): ComparisonContextType {
  const {
    selectedBranches: rawSelection,
    availableBranches,
    isLoaded,
  } = useBranchStore();

  const { isComparisonMode, toggleComparisonMode, setComparisonMode } = useUIStore();

  // Expand 'ALL' → individual branch keys (same logic as before)
  const selectedBranches = rawSelection.includes('ALL')
    ? availableBranches.filter((b) => b.key !== 'ALL').map((b) => b.key)
    : rawSelection;

  return {
    selectedBranches,
    availableBranches: availableBranches.filter((b) => b.key !== 'ALL'),
    isLoaded,
    isComparisonMode,
    toggleComparisonMode,
    setComparisonMode,
  };
}

/**
 * ComparisonProvider is now a no-op passthrough.
 * Keep it exported so layout.tsx doesn't need to change imports immediately.
 * Can be removed once layout.tsx is cleaned up.
 */
export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
