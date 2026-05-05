'use client';

/**
 * SidebarContext — Compatibility shim
 *
 * Sidebar state (isCollapsed, toggleSidebar, setSidebarCollapsed) has been
 * migrated to Zustand `useUIStore`. This file keeps the `useSidebar()` hook
 * API intact for backward compatibility.
 *
 * `SidebarProvider` is now a no-op passthrough since no React Context is needed.
 */

import { type ReactNode } from 'react';
import { useUIStore } from '@/store/useUIStore';

export interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

/**
 * Drop-in replacement for the old `useSidebar()` hook.
 * Now reads from Zustand `useUIStore` instead of React Context.
 */
export function useSidebar(): SidebarContextType {
  const {
    isSidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar,
  } = useUIStore();

  return {
    isCollapsed: isSidebarCollapsed,
    setIsCollapsed: setSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar,
  };
}

/**
 * SidebarProvider is now a no-op passthrough.
 * Kept for layout.tsx backward compatibility.
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
