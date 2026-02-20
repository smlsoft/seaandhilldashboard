'use client';

import { Download } from 'lucide-react';
import { BranchComparisonData } from '@/lib/data/comparison';

interface ExportButtonProps {
    data: BranchComparisonData[];
    filename?: string;
}

export function ExportButton({ data, filename = 'branch-comparison.csv' }: ExportButtonProps) {
    const handleExport = () => {
        // Convert data to CSV
        const headers = [
            'Branch',
            'Sales',
            'Orders',
            'Profit',
            'Margin %',
            'Avg Ticket',
            'Growth %',
            'Inventory Value',
            'Inventory Turnover',
            'Dead Stock',
            'Customers',
            'Repeat Rate %'
        ];

        const rows = data.map(branch => [
            branch.branchName,
            branch.totalSales.toFixed(2),
            branch.totalOrders,
            branch.netProfit.toFixed(2),
            branch.profitMargin.toFixed(2),
            branch.avgTicketSize.toFixed(2),
            branch.salesGrowth.toFixed(2),
            branch.inventoryValue.toFixed(2),
            branch.inventoryTurnover.toFixed(2),
            branch.deadStockValue.toFixed(2),
            branch.uniqueCustomers,
            branch.repeatCustomerRate.toFixed(2)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create and trigger download
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
        >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
        </button>
    );
}
