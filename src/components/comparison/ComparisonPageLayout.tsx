'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Tab } from '@headlessui/react';
import { motion } from 'framer-motion';
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
  { href: '/comparison', label: 'ภาพรวม', icon: LayoutDashboard },
  { href: '/accounting/comparison', label: 'บัญชี', icon: Calculator },
  { href: '/sales/comparison', label: 'การขาย', icon: ShoppingCart },
  { href: '/inventory/comparison', label: 'สินค้าคงคลัง', icon: Package },
  { href: '/purchase/comparison', label: 'จัดซื้อ', icon: Truck },
];

const parentPageMap: Record<string, string> = {
  '/comparison': '/',
  '/accounting/comparison': '/accounting',
  '/sales/comparison': '/sales',
  '/inventory/comparison': '/inventory',
  '/purchase/comparison': '/purchase',
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
  const selectedIndex = comparisonPages.findIndex((page) => page.href === pathname);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => router.push(parentPage)}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับ
          </motion.button>
          <div className="h-6 w-px bg-gray-200" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">{title}</h1>
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation - Headless UI */}
      <Tab.Group selectedIndex={selectedIndex === -1 ? 0 : selectedIndex}>
        <Tab.List className="flex gap-1 overflow-x-auto border-b border-gray-200 -mb-px">
          {comparisonPages.map((page, index) => {
            const Icon = page.icon;
            const isActive = pathname === page.href;

            return (
              <Tab key={page.href} as={Link} href={page.href}>
                {({ selected }) => (
                  <motion.div
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors outline-none',
                      selected
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    layout
                  >
                    <Icon className="w-4 h-4" />
                    {page.label}
                  </motion.div>
                )}
              </Tab>
            );
          })}
        </Tab.List>

        <Tab.Panels>
          {comparisonPages.map((page) => (
            <Tab.Panel key={page.href} unmount={false}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </motion.div>
  );
}
