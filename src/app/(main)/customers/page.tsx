import { getCustomersData } from '@/lib/data';
import { CustomersTable } from '@/components/CustomersTable';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({
    searchParams,
}: {
    searchParams: { page?: string };
}) {
    const page = Number(searchParams.page) || 1;
    const { data, totalPages } = await getCustomersData(page);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">Customer Overview</h1>
                    <p className="text-[hsl(var(--muted-foreground))] mt-1">Manage and analyze your customer base</p>
                </div>
            </div>

            <CustomersTable data={data} currentPage={page} totalPages={totalPages} />
        </div>
    );
}
