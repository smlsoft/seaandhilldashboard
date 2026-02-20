import { getCustomersData } from '@/lib/data';
import { CustomersTable } from '@/components/CustomersTable';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const { data, totalPages, total } = await getCustomersData(page);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">Customer Overview</h1>
                    <p className="text-[hsl(var(--muted-foreground))] mt-1">Manage and analyze your customer base</p>
                </div>
            </div>

            <CustomersTable data={data} currentPage={page} totalPages={totalPages} totalItems={total} />
        </div>
    );
}
