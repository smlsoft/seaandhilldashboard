'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, BarChart3, LayoutDashboard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/utils';
import { BranchSwitcher } from './layout/BranchSwitcher';
import { cn } from '@/lib/utils';
import { useComparison } from '@/lib/ComparisonContext';

const pageNames: Record<string, string> = {
    '/': 'ภาพรวมธุรกิจ',
    '/accounting': 'การเงิน',
    '/purchase': 'จัดซื้อ',
    '/sales': 'การขาย',
    '/inventory': 'คลังสินค้า',
    '/customers': 'ลูกค้า',
    '/settings': 'ตั้งค่า',
    '/comparison': 'เปรียบเทียบกิจการ',
    '/accounting/comparison': 'เปรียบเทียบการเงิน',
    '/sales/comparison': 'เปรียบเทียบการขาย',
    '/purchase/comparison': 'เปรียบเทียบจัดซื้อ',
    '/inventory/comparison': 'เปรียบเทียบคลังสินค้า',
    '/customers/comparison': 'เปรียบเทียบลูกค้า',
    '/reports/sales': 'รายงานการขาย',
    '/reports/purchase': 'รายงานการจัดซื้อ',
    '/reports/inventory': 'รายงานคลังสินค้า',
    '/reports/accounting': 'รายงานการเงิน',
    '/test-chat': 'ทดสอบ Chat',
};

// Map from main page to comparison page
const comparisonRouteMap: Record<string, string> = {
    '/': '/comparison',
    '/accounting': '/accounting/comparison',
    '/sales': '/sales/comparison',
    '/inventory': '/inventory/comparison',
    '/purchase': '/purchase/comparison',
    '/customers': '/customers/comparison',
};

// Reverse: comparison page back to main page
const mainRouteFromComparison: Record<string, string> = {
    '/comparison': '/',
    '/accounting/comparison': '/accounting',
    '/sales/comparison': '/sales',
    '/inventory/comparison': '/inventory',
    '/purchase/comparison': '/purchase',
    '/customers/comparison': '/customers',
};

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());
    const { isComparisonMode, setComparisonMode } = useComparison();

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const pageName = pageNames[pathname] || 'Dashboard';
    
    // ตรวจสอบว่าอยู่ในหน้าเปรียบเทียบหรือไม่
    const isComparisonView = pathname.includes('/comparison');
    
    // สลับโหมดเปรียบเทียบ
    const handleToggleComparison = () => {
        if (isComparisonView) {
            // ปิดโหมดเปรียบเทียบ → ไปหน้าหลัก
            setComparisonMode(false);
            const mainRoute = mainRouteFromComparison[pathname] || '/';
            router.push(mainRoute);
        } else {
            // เปิดโหมดเปรียบเทียบ → ไปหน้าเปรียบเทียบ
            setComparisonMode(true);
            const comparisonRoute = comparisonRouteMap[pathname] || '/comparison';
            router.push(comparisonRoute);
        }
    };

    return (
        <header className="h-16 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
            {/* Left: Breadcrumbs or Page Title */}
            <div className="flex items-center gap-4">
                <div className="flex items-center text-sm text-[hsl(var(--muted-foreground))]">
                    <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">Dashboard</span>
                    <span className="mx-2">/</span>
                    <span className="font-medium text-[hsl(var(--foreground))]">{pageName}</span>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                {/* Branch Switcher */}
                <BranchSwitcher />

                {/* Search */}
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <input
                        type="text"
                        placeholder="ค้นหา..."
                        className="h-9 w-64 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
                    />
                </div>

                {/* Comparison Toggle Button */}
                <button
                    onClick={handleToggleComparison}
                    className={cn(
                        "inline-flex items-center gap-2 h-9 px-4 rounded-lg border text-sm font-medium transition-colors",
                        isComparisonView || isComparisonMode
                            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                    )}
                >
                    {isComparisonView ? (
                        <>
                            <LayoutDashboard className="h-4 w-4" />
                            <span className="hidden lg:inline">ภาพรวม</span>
                        </>
                    ) : (
                        <>
                            <BarChart3 className="h-4 w-4" />
                            <span className="hidden lg:inline">เปรียบเทียบกิจการ</span>
                        </>
                    )}
                </button>

                {/* Notifications */}
                <button
                    type="button"
                    className="relative rounded-lg bg-[var(--background)] p-2 text-[var(--foreground-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                    aria-label="Notifications"
                >
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-1.5 top-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                </button>
            </div>
        </header>
    );
}
