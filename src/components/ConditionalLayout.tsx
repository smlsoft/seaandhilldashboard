'use client';

import { usePathname } from 'next/navigation';
import { MainLayout } from './MainLayout';
import ChatWidget from './ChatWidget';

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Full-screen routes without MainLayout (Header/Sidebar)
  const isFullScreen = pathname?.startsWith('/chat-bot');
  
  if (isFullScreen) {
    return <>{children}</>;
  }
  
  // Regular routes with MainLayout
  return (
    <MainLayout>
      {children}
      <ChatWidget />
    </MainLayout>
  );
}
