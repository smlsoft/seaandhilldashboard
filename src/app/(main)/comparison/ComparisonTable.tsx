'use client';

import { useState, useMemo } from 'react';
import { BranchComparisonData } from '@/lib/data/comparison';
import { TrendingUp, TrendingDown, Users, Package, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/charts/Sparkline';
import { ExportButton } from '@/components/ExportButton';
import { FilterBar, FilterType } from './FilterBar';

interface ComparisonTableProps {
    data: BranchComparisonData[];
}

export function ComparisonTable({ data }: ComparisonTableProps) {
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    // Apply filters
    const filteredData = useMemo(() => {
        switch (activeFilter) {
            case 'lossMaking':
                return data.filter(b => b.netProfit < 0);
            case 'declining':
                return data.filter(b => b.salesGrowth < 0);
            case 'highInventory':
                return data.filter(b => b.deadStockValue > b.inventoryValue * 0.2); // 20%+ dead stock
            default:
                return data;
        }
    }, [data, activeFilter]);

    // Helper: Get heatmap color for profit margin
    const getMarginColor = (margin: number) => {
        if (margin >= 30) return 'bg-emerald-50 text-emerald-700';
        if (margin >= 20) return 'bg-green-50 text-green-700';
        if (margin >= 10) return 'bg-yellow-50 text-yellow-700';
        if (margin >= 0) return 'bg-orange-50 text-orange-700';
        return 'bg-rose-50 text-rose-700';
    };

    // Helper: Get color for growth
    const getGrowthColor = (growth: number) => {
        if (growth >= 20) return 'text-emerald-600';
        if (growth >= 0) return 'text-green-600';
        return 'text-rose-600';
    };

    // Helper: Format large numbers
    const formatMillion = (value: number) => {
        if (value >= 1000000) return `฿${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `฿${(value / 1000).toFixed(0)}K`;
        return `฿${value.toFixed(0)}`;
    };

    return (
        <div className="space-y-4">
            {/* Filter Bar and Export */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
                <ExportButton data={filteredData} />
            </div>

            {/* Results Count */}
            {activeFilter !== 'all' && (
                <p className="text-sm text-muted-foreground">
                    แสดง {filteredData.length} จาก {data.length} กิจการ
                </p>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">#</th>
                            <th className="px-4 py-3 text-left font-semibold min-w-[200px]">กิจการ</th>
                            <th className="px-4 py-3 text-right font-semibold">ยอดขาย</th>
                            <th className="px-4 py-3 text-right font-semibold">กำไร</th>
                            <th className="px-4 py-3 text-center font-semibold">Margin %</th>
                            <th className="px-4 py-3 text-right font-semibold">Growth %</th>
                            <th className="px-4 py-3 text-center font-semibold">Trend</th>
                            <th className="px-4 py-3 text-right font-semibold">ลูกค้า</th>
                            <th className="px-4 py-3 text-right font-semibold">Repeat %</th>
                            <th className="px-4 py-3 text-right font-semibold">มูลค่าสต็อก</th>
                            <th className="px-4 py-3 text-right font-semibold">หมุนเวียน</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredData.map((branch, index) => (
                            <tr
                                key={branch.branchKey}
                                className="hover:bg-muted/30 transition-colors group"
                            >
                                <td className="px-4 py-3 font-semibold text-muted-foreground">
                                    {index + 1}
                                </td>
                                <td className="px-4 py-3">
                                    <div>
                                        <div className="font-semibold text-foreground">{branch.branchName}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {branch.topProducts.length > 0 ? (
                                                <span title={branch.topProducts.map(p => p.productName).join(', ')}>
                                                    Top: {branch.topProducts[0]?.productName}
                                                </span>
                                            ) : (
                                                <span>ไม่มีข้อมูลสินค้า</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="font-semibold">{formatMillion(branch.totalSales)}</div>
                                    <div className="text-xs text-muted-foreground">{branch.totalOrders.toLocaleString()} บิล</div>
                                </td>
                                <td className={cn(
                                    "px-4 py-3 text-right font-semibold",
                                    branch.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    {formatMillion(branch.netProfit)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className={cn(
                                        "inline-block px-3 py-1 rounded-full font-semibold text-xs",
                                        getMarginColor(branch.profitMargin)
                                    )}>
                                        {branch.profitMargin.toFixed(1)}%
                                    </div>
                                </td>
                                <td className={cn("px-4 py-3 text-right font-semibold", getGrowthColor(branch.salesGrowth))}>
                                    <div className="flex items-center justify-end gap-1">
                                        {branch.salesGrowth >= 0 ? (
                                            <TrendingUp className="h-3 w-3" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3" />
                                        )}
                                        <span>{branch.salesGrowth.toFixed(1)}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Sparkline data={branch.monthlySales} width={80} height={24} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-medium">{branch.totalTransactions.toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-violet-600">
                                    {branch.repeatCustomerRate.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="font-medium">{formatMillion(branch.inventoryValue)}</div>
                                    {branch.deadStockValue > 0 && (
                                        <div className="text-xs text-rose-600">
                                            Dead: {formatMillion(branch.deadStockValue)}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className={cn(
                                        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                                        branch.inventoryTurnover >= 2 ? "bg-emerald-100 text-emerald-700" :
                                            branch.inventoryTurnover >= 1 ? "bg-yellow-100 text-yellow-700" :
                                                "bg-rose-100 text-rose-700"
                                    )}>
                                        <Activity className="h-3 w-3" />
                                        {branch.inventoryTurnover.toFixed(2)}x
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredData.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    ไม่พบกิจการที่ตรงกับเงื่อนไขที่เลือก
                </div>
            )}
        </div>
    );
}
