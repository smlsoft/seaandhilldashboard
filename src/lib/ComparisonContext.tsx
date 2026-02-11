'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSelectedBranch } from '@/app/actions/branch-actions';
import { BRANCH_CHANGE_EVENT } from '@/lib/branch-events';

interface BranchInfo {
  key: string;
  name: string;
}

interface ComparisonContextType {
  /** Individual branches to compare (expanded from 'ALL' if needed) */
  selectedBranches: string[];
  /** Available branches list (excluding 'ALL') */
  availableBranches: BranchInfo[];
  /** Whether the context is loaded */
  isLoaded: boolean;
  /** Whether comparison mode is active (persisted in localStorage) */
  isComparisonMode: boolean;
  /** Toggle comparison mode on/off */
  toggleComparisonMode: () => void;
  /** Directly set comparison mode */
  setComparisonMode: (mode: boolean) => void;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const COMPARISON_MODE_KEY = 'comparison_mode_active';

export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const [rawSelection, setRawSelection] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<BranchInfo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isComparisonMode, setIsComparisonModeState] = useState(false);

  // Load comparison mode from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMPARISON_MODE_KEY);
      if (stored === 'true') {
        setIsComparisonModeState(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Load initial branch selection from cookie + fetch available branches
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const [keys, res] = await Promise.all([
          getSelectedBranch(),
          fetch('/api/branches'),
        ]);

        setRawSelection(keys);

        if (res.ok) {
          const data: BranchInfo[] = await res.json();
          const filtered = data.filter((b: BranchInfo) => b.key !== 'ALL');
          setAvailableBranches(filtered);
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadBranches();
  }, []);

  // Listen for branch change events from BranchSwitcher
  useEffect(() => {
    const handleBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.branchKeys) {
        setRawSelection(customEvent.detail.branchKeys);
      }
    };
    window.addEventListener(BRANCH_CHANGE_EVENT, handleBranchChange);
    return () => window.removeEventListener(BRANCH_CHANGE_EVENT, handleBranchChange);
  }, []);

  // Compute selectedBranches: if 'ALL' is selected, expand to all individual branches
  const selectedBranches = rawSelection.includes('ALL')
    ? availableBranches.map((b: BranchInfo) => b.key)
    : rawSelection;

  const toggleComparisonMode = useCallback(() => {
    setIsComparisonModeState((prev: boolean) => {
      const next = !prev;
      try {
        localStorage.setItem(COMPARISON_MODE_KEY, String(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const setComparisonMode = useCallback((mode: boolean) => {
    setIsComparisonModeState(mode);
    try {
      localStorage.setItem(COMPARISON_MODE_KEY, String(mode));
    } catch { /* ignore */ }
  }, []);

  return (
    <ComparisonContext.Provider value={{
      selectedBranches,
      availableBranches,
      isLoaded,
      isComparisonMode,
      toggleComparisonMode,
      setComparisonMode,
    }}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
}
