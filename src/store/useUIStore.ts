/**
 * useUIStore - Zustand Store for UI-level state
 *
 * Replaces:
 * - SidebarContext.tsx
 * - isComparisonMode + localStorage handling in ComparisonContext.tsx
 *
 * Uses Zustand `persist` middleware to automatically sync
 * `isComparisonMode` to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  // --- Sidebar ---
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // --- Mobile Sidebar ---
  isMobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;

  // --- Comparison Mode ---
  isComparisonMode: boolean;
  toggleComparisonMode: () => void;
  setComparisonMode: (mode: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Sidebar
      isSidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ isSidebarCollapsed: collapsed }),

      // Mobile Sidebar
      isMobileSidebarOpen: false,
      openMobileSidebar: () => set({ isMobileSidebarOpen: true }),
      closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),

      // Comparison Mode
      isComparisonMode: false,
      toggleComparisonMode: () =>
        set((state) => ({ isComparisonMode: !state.isComparisonMode })),
      setComparisonMode: (mode) => set({ isComparisonMode: mode }),
    }),
    {
      name: 'ui-store', // key in localStorage
      // Only persist isComparisonMode and sidebar state
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        isComparisonMode: state.isComparisonMode,
      }),
    }
  )
);
