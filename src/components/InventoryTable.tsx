import { ChevronLeft, ChevronRight, Search, Filter, Package, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

interface InventoryTableProps {
    data: any[];
    currentPage: number;
    totalPages: number;
}

export function InventoryTable({ data, currentPage, totalPages }: InventoryTableProps) {
    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[hsl(var(--card))] p-4 rounded-2xl border border-[hsl(var(--border))] shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-[hsl(var(--border))] rounded-xl leading-5 bg-[hsl(var(--background))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] sm:text-sm transition-all"
                        placeholder="ค้นหารหัสสินค้า, ชื่อสินค้า..."
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <button className="inline-flex items-center px-4 py-2 border border-[hsl(var(--border))] rounded-xl text-sm font-medium text-[hsl(var(--foreground))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] transition-colors">
                        <Filter className="h-4 w-4 mr-2" />
                        ตัวกรอง
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl bg-[hsl(var(--card))] shadow-sm border border-[hsl(var(--border))]">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[hsl(var(--border))]">
                        <thead className="bg-[hsl(var(--muted))/50]">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                                    รหัสสินค้า
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                                    ชื่อสินค้า
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                                    คลังสินค้า
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                                    คงเหลือ
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                                    ต้นทุนเฉลี่ย
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                                    มูลค่ารวม
                                </th>
                                <th scope="col" className="relative px-6 py-4">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-[hsl(var(--card))] divide-y divide-[hsl(var(--border))]">
                            {data.map((item) => (
                                <tr key={`${item.item_code}-${item.wh_name}`} className="group hover:bg-[hsl(var(--muted))/30] transition-colors duration-200">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[hsl(var(--primary))]">
                                        {item.item_code}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--foreground))]">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center mr-3 text-[hsl(var(--muted-foreground))]">
                                                <Package className="h-4 w-4" />
                                            </div>
                                            {item.item_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--muted-foreground))]">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                                            {item.wh_name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[hsl(var(--foreground))]">
                                        {item.current_stock.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--muted-foreground))]">
                                        ฿{Math.round(item.avg_cost).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                        ฿{Math.round(item.total_value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-[hsl(var(--card))] px-6 py-4 flex items-center justify-between border-t border-[hsl(var(--border))]">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <Link
                            href={`/inventory?page=${Math.max(1, currentPage - 1)}`}
                            className={`relative inline-flex items-center px-4 py-2 border border-[hsl(var(--border))] text-sm font-medium rounded-lg text-[hsl(var(--foreground))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            ก่อนหน้า
                        </Link>
                        <Link
                            href={`/inventory?page=${Math.min(totalPages, currentPage + 1)}`}
                            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-[hsl(var(--border))] text-sm font-medium rounded-lg text-[hsl(var(--foreground))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            ถัดไป
                        </Link>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                แสดงหน้า <span className="font-bold text-[hsl(var(--foreground))]">{currentPage}</span> จาก <span className="font-bold text-[hsl(var(--foreground))]">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                                <Link
                                    href={`/inventory?page=${Math.max(1, currentPage - 1)}`}
                                    className={`relative inline-flex items-center px-3 py-2 rounded-l-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-colors ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                </Link>
                                <Link
                                    href={`/inventory?page=${Math.min(totalPages, currentPage + 1)}`}
                                    className={`relative inline-flex items-center px-3 py-2 rounded-r-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-colors ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                </Link>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
