'use client';

import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarProvider, useSidebar } from '@/lib/SidebarContext';
import { cn } from '@/lib/utils';

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isCollapsed ? "ml-20" : "ml-72"
      )}>
        <Header />
        <main className="flex-1 p-4 lg:p-8 max-w-7.5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  );
}
