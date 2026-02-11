'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    Settings,
    LogOut,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    PieChart,
    Calculator,
    FileText,
    TrendingUp,
    Wallet,
    BarChart3,
    ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/SidebarContext';
import { useComparison } from '@/lib/ComparisonContext';

const menuItems = [
    { name: 'ภาพรวม', icon: LayoutDashboard, href: '/' },
    { name: 'บัญชี', icon: Calculator, href: '/accounting' },
    { name: 'การขาย', icon: ShoppingCart, href: '/sales' },
    { name: 'สินค้าคงคลัง', icon: Package, href: '/inventory' },
    { name: 'จัดซื้อ', icon: ClipboardList, href: '/purchase' },
    { name: 'ลูกค้า', icon: Users, href: '/customers' },
];

// Map main hrefs to comparison hrefs
const comparisonHrefMap: Record<string, string> = {
    '/': '/dashboard/comparison',
    '/accounting': '/accounting/comparison',
    '/sales': '/sales/comparison',
    '/inventory': '/inventory/comparison',
    '/purchase': '/purchase/comparison',
    '/customers': '/customers/comparison',
};

// Report menu with submenus
const reportMenu = {
    name: 'รายงาน',
    icon: FileText,
    subItems: [
        { name: 'รายงานบัญชี', icon: Calculator, href: '/reports/accounting' },
        { name: 'รายงานการขาย', icon: TrendingUp, href: '/reports/sales' },
        { name: 'รายงานสินค้าคงคลัง', icon: BarChart3, href: '/reports/inventory' },
        { name: 'รายงานการจัดซื้อ', icon: ClipboardList, href: '/reports/purchase' },
    ]
};

const secondaryItems = [
    { name: 'ตั้งค่า', icon: Settings, href: '/settings' },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const { isComparisonMode } = useComparison();
    const [isReportOpen, setIsReportOpen] = useState(false);

    // Check if any report submenu is active
    const isReportActive = reportMenu.subItems.some(item => pathname.startsWith(item.href));

    return (
        <aside className={cn(
            "fixed inset-y-0 left-0 z-50 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] flex flex-col transition-all duration-300",
            isCollapsed ? "w-20" : "w-72"
        )}>
            {/* Logo Section */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-[hsl(var(--border))]">
                <div className={cn(
                    "flex items-center gap-3 transition-all duration-300",
                    isCollapsed && "justify-center w-full"
                )}>
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
                        <PieChart className="h-5 w-5 text-white" />
                    </div>
                    {!isCollapsed && (
                        <span className="text-lg font-bold tracking-tight text-[hsl(var(--foreground))] whitespace-nowrap">
                            MIS Dashboard
                        </span>
                    )}
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-13 h-6 w-6 rounded-full bg-[hsl(var(--primary))] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
            >
                {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                ) : (
                    <ChevronLeft className="h-4 w-4" />
                )}
            </button>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
                <div>
                    {!isCollapsed && (
                        <p className="px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                            Menu
                        </p>
                    )}
                    <nav className="space-y-1">
                        {menuItems.map((item) => {
                            const actualHref = isComparisonMode
                                ? (comparisonHrefMap[item.href] || item.href)
                                : item.href;
                            const isActive = isComparisonMode
                                ? pathname === comparisonHrefMap[item.href]
                                : pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={actualHref}
                                    title={isCollapsed ? item.name : undefined}
                                    className={cn(
                                        "flex items-center gap-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 group",
                                        isCollapsed ? "px-3 justify-center" : "px-4",
                                        isActive
                                            ? "bg-[hsl(var(--primary))] text-white shadow-lg shadow-indigo-500/25"
                                            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "h-5 w-5 transition-colors flex-shrink-0",
                                        isActive ? "text-white" : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]"
                                    )} />
                                    {!isCollapsed && (
                                        <>
                                            <span className="flex-1">{item.name}</span>
                                            {isActive && (
                                                <ChevronRight className="ml-auto h-4 w-4 text-white/50" />
                                            )}
                                        </>
                                    )}
                                </Link>
                            );
                        })}

                        {/* Report Dropdown Menu */}
                        <div>
                            <button
                                onClick={() => setIsReportOpen(!isReportOpen)}
                                title={isCollapsed ? reportMenu.name : undefined}
                                className={cn(
                                    "w-full flex items-center gap-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 group",
                                    isCollapsed ? "px-3 justify-center" : "px-4",
                                    isReportActive
                                        ? "bg-[hsl(var(--primary))] text-white shadow-lg shadow-indigo-500/25"
                                        : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                                )}
                            >
                                <reportMenu.icon className={cn(
                                    "h-5 w-5 transition-colors flex-shrink-0",
                                    isReportActive ? "text-white" : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]"
                                )} />
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-left">{reportMenu.name}</span>
                                        <ChevronDown className={cn(
                                            "h-4 w-4 transition-transform duration-200",
                                            isReportOpen && "rotate-180",
                                            isReportActive ? "text-white/50" : ""
                                        )} />
                                    </>
                                )}
                            </button>

                            {/* Submenu */}
                            {!isCollapsed && isReportOpen && (
                                <div className="mt-1 ml-4 pl-4 border-l-2 border-[hsl(var(--border))] space-y-1">
                                    {reportMenu.subItems.map((subItem) => {
                                        const isSubActive = pathname === subItem.href;
                                        return (
                                            <Link
                                                key={subItem.href}
                                                href={subItem.href}
                                                className={cn(
                                                    "flex items-center gap-3 py-2.5 px-3 text-sm font-medium rounded-lg transition-all duration-200 group",
                                                    isSubActive
                                                        ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                                                        : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                                                )}
                                            >
                                                <subItem.icon className={cn(
                                                    "h-4 w-4 transition-colors flex-shrink-0",
                                                    isSubActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]"
                                                )} />
                                                <span>{subItem.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Collapsed submenu tooltip */}
                            {isCollapsed && (
                                <div className="hidden group-hover:block absolute left-full ml-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg py-2 min-w-48 z-50">
                                    {reportMenu.subItems.map((subItem) => (
                                        <Link
                                            key={subItem.href}
                                            href={subItem.href}
                                            className="flex items-center gap-5 py-4 px-4 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                                        >
                                            <subItem.icon className="h-4 w-4" />
                                            {subItem.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </nav>
                </div>

                <div>
                    {!isCollapsed && (
                        <p className="px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                            Other
                        </p>
                    )}
                    <nav className="space-y-1">
                        {secondaryItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={isCollapsed ? item.name : undefined}
                                className={cn(
                                    "flex items-center gap-3 py-3 text-sm font-medium rounded-xl text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] transition-all duration-200 group",
                                    isCollapsed ? "px-3 justify-center" : "px-4"
                                )}
                            >
                                <item.icon className="h-5 w-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors flex-shrink-0" />
                                {!isCollapsed && item.name}
                            </Link>
                        ))}
                        <button
                            title={isCollapsed ? "ออกจากระบบ" : undefined}
                            className={cn(
                                "w-full flex items-center gap-3 py-3 text-sm font-medium rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-200 group",
                                isCollapsed ? "px-3 justify-center" : "px-4"
                            )}
                        >
                            <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform flex-shrink-0" />
                            {!isCollapsed && "ออกจากระบบ"}
                        </button>
                    </nav>
                </div>
            </div>

            {/* User Profile */}
            <div className={cn(
                "p-4 m-3 mt-2 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm transition-all duration-300",
                isCollapsed && "p-2 m-2"
            )}>
                <div className={cn(
                    "flex items-center",
                    isCollapsed ? "justify-center" : "space-x-3"
                )}>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-inner ring-2 ring-white/10 flex-shrink-0">
                        <span className="text-xs font-bold text-white">AD</span>
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">Admin User</p>
                            <p className="text-xs text-slate-400 truncate">admin@company.com</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
