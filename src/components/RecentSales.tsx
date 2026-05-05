'use client';

import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

interface Sale {
    docNo: string;
    docDate: string;
    customerName: string;
    totalAmount: number;
    statusPayment: string;
    branchName?: string;
}

interface RecentSalesProps {
    sales: Sale[];
    showAll?: boolean;
}

export function RecentSales({ sales, showAll = false }: RecentSalesProps) {
    const router = useRouter();

    if (!sales || sales.length === 0) {
        return (
            <div className="flex h-[200px] items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                ไม่พบรายการขายล่าสุด
            </div>
        );
    }

    const handleRowClick = (sale: Sale) => {
        // ดึงวันที่จาก docDate แล้วนำทางไปรายงานวิเคราะห์ยอดขาย
        // พร้อม filter วันที่ของเอกสารนั้นอัตโนมัติ
        const docDate = new Date(sale.docDate);
        const dateStr = docDate.toISOString().split('T')[0]; // YYYY-MM-DD
        router.push(`/reports/sales?report=sales-trend&start_date=${dateStr}&end_date=${dateStr}`);
    };

    return (
        <div className={showAll ? 'max-h-[520px] overflow-y-auto overscroll-contain rounded-lg' : ''}>
            {showAll && (
                <div className="sticky top-0 z-10 bg-[hsl(var(--card))] px-2 py-2 border-b border-[hsl(var(--border))] mb-1 flex items-center justify-between">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        แสดง <strong>{sales.length}</strong> รายการ ตามวันที่ที่เลือก
                    </span>
                    <span className="text-xs font-medium rounded-full text-[hsl(var(--primary))] px-2 py-0.5">
                        ทั้งหมด
                    </span>
                </div>
            )}
            <div className="divide-y divide-[hsl(var(--border))] -mx-2">
            {sales.map((sale, index) => {
                const initials = sale.customerName
                    ? sale.customerName.substring(0, 2).toUpperCase()
                    : 'XX';
                const uniqueKey = `${sale.docNo}-${sale.branchName || index}`;

                return (
                    <button
                        key={uniqueKey}
                        onClick={() => handleRowClick(sale)}
                        className="w-full flex items-center justify-between px-2 py-3 rounded-lg group hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer text-left"
                    >
                        {/* Left: Avatar + Info */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[hsl(var(--primary))/10] items-center justify-center text-sm font-bold text-[hsl(var(--primary))]">
                                {initials}
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-semibold leading-none text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                                    {sale.customerName || 'ไม่ระบุ'}
                                </p>
                                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                    <span className="font-mono">{sale.docNo}</span>
                                    {' • '}
                                    {new Date(sale.docDate).toLocaleDateString('th-TH', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                    {sale.branchName && (
                                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-500">
                                            {sale.branchName}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Right: Amount + Link icon */}
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold text-[hsl(var(--foreground))]">
                                ฿{sale.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </button>
                );
            })}
            </div>
        </div>
    );
}
