'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calculator,
  ShoppingCart,
  Package,
  Truck,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const comparisonPages = [
  { href: '/dashboard/comparison', label: 'ภาพรวม', icon: LayoutDashboard },
  { href: '/accounting/comparison', label: 'บัญชี', icon: Calculator },
  { href: '/sales/comparison', label: 'การขาย', icon: ShoppingCart },
  { href: '/inventory/comparison', label: 'สินค้าคงคลัง', icon: Package },
  { href: '/purchase/comparison', label: 'จัดซื้อ', icon: Truck },
  { href: '/customers/comparison', label: 'ลูกค้า', icon: Users },
];

const parentPageMap: Record<string, string> = {
  '/dashboard/comparison': '/',
  '/accounting/comparison': '/accounting',
  '/sales/comparison': '/sales',
  '/inventory/comparison': '/inventory',
  '/purchase/comparison': '/purchase',
  '/customers/comparison': '/customers',
};

interface ComparisonPageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export default function ComparisonPageLayout({
  children,
  title,
  description,
}: ComparisonPageLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const parentPage = parentPageMap[pathname] || '/';

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(parentPage)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับ
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">{title}</h1>
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Comparison Tabs">
          {comparisonPages.map((page) => {
            const Icon = page.icon;
            const isActive = pathname === page.href;
            return (
              <Link
                key={page.href}
                href={page.href}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {page.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
