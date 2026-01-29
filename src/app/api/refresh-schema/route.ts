import { refreshSchemaCache, getSchemaCacheStatus } from '@/lib/schemaCache';

export async function POST() {
  try {
    console.log('[API] Refreshing schema cache...');
    const result = await refreshSchemaCache();

    if (result.success) {
      console.log(`[API] Schema refreshed: ${result.tableCount} tables`);
      return Response.json({
        success: true,
        message: `Schema refreshed successfully`,
        tableCount: result.tableCount,
        lastUpdated: result.lastUpdated?.toISOString(),
      });
    } else {
      console.error('[API] Schema refresh failed:', result.error);
      return Response.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Refresh schema error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const status = getSchemaCacheStatus();
  return Response.json({
    isLoaded: status.isLoaded,
    tableCount: status.tableCount,
    lastUpdated: status.lastUpdated?.toISOString() || null,
    isLoading: status.isLoading,
  });
}
