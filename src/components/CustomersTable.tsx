'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Search,
    Filter,
    MoreHorizontal,
} from 'lucide-react';
import { PaginatedTable, type ColumnDef } from './PaginatedTable';

interface Customer {
    customer_code: string;
    customer_name: string;
    total_orders: number;
    total_spent: number;
    last_order_date: string;
}

interface CustomersTableProps {
    data: Customer[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
}

export function CustomersTable({ data, currentPage, totalPages, totalItems }: CustomersTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams);
        if (searchTerm) {
            params.set('search', searchTerm);
        } else {
            params.delete('search');
        }
        params.set('page', '1');
        router.push(`?${params.toString()}`);
    };

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', page.toString());
        router.push(`?${params.toString()}`);
    };

    const columns: ColumnDef<Customer>[] = [
        {
            key: 'customer_code',
            header: 'Customer Code',
            sortable: true,
            align: 'left',
            className: 'font-medium',
        },
        {
            key: 'customer_name',
            header: 'Customer Name',
            sortable: true,
            align: 'left',
        },
        {
            key: 'total_orders',
            header: 'Total Orders',
            sortable: true,
            align: 'right',
            render: (item) => item.total_orders.toLocaleString(),
        },
        {
            key: 'total_spent',
            header: 'Total Spent',
            sortable: true,
            align: 'right',
            render: (item) => (
                <span className="font-medium text-[hsl(var(--primary))]">
                    ฿{item.total_spent.toLocaleString()}
                </span>
            ),
        },
        {
            key: 'last_order_date',
            header: 'Last Order',
            sortable: true,
            align: 'left', // Match original
            render: (item) => new Date(item.last_order_date).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'center',
            render: () => (
                <button className="p-2 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <form onSubmit={handleSearch} className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-10 pr-4 text-sm outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]"
                    />
                </form>
                <div className="flex items-center gap-2">
                    <button className="inline-flex items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm font-medium shadow-sm hover:bg-[hsl(var(--accent))] transition-colors">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden flex flex-col">
                <PaginatedTable
                    data={data}
                    columns={columns}
                    itemsPerPage={20}
                    totalItems={totalItems}
                    currentPage={currentPage}
                    manualPagination={true}
                    onPageChange={handlePageChange}
                    keyExtractor={(item) => item.customer_code}
                    emptyMessage="ไม่พบข้อมูลลูกค้า"
                />
            </div>
        </div>
    );
}
