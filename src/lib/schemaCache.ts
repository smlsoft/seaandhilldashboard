import { getClickHouse } from './clickhouse';

interface TableColumn {
  name: string;
  type: string;
  default_type?: string;
  default_expression?: string;
  comment?: string;
}

interface TableSchema {
  tableName: string;
  columns: TableColumn[];
}

interface SchemaCache {
  tables: TableSchema[];
  lastUpdated: Date | null;
  isLoading: boolean;
}

// Global cache stored in memory
let schemaCache: SchemaCache = {
  tables: [],
  lastUpdated: null,
  isLoading: false,
};

/**
 * Load all table schemas from ClickHouse database
 * This should be called once at startup or when schema needs refresh
 */
export async function loadSchemaCache(): Promise<TableSchema[]> {
  if (schemaCache.isLoading) {
    // Wait for existing load to complete
    while (schemaCache.isLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return schemaCache.tables;
  }

  schemaCache.isLoading = true;
  console.log('[SchemaCache] Loading schema from ClickHouse...');

  try {
    const clickhouse = await getClickHouse();

    // Get all tables
    const tablesResult = await clickhouse.query({
      query: 'SHOW TABLES',
      format: 'JSONEachRow',
    });
    const tables = (await tablesResult.json()) as Array<{ name: string }>;
    console.log(`[SchemaCache] Found ${tables.length} tables`);

    // Get schema for each table
    const tableSchemas: TableSchema[] = [];
    for (const table of tables) {
      const schemaResult = await clickhouse.query({
        query: `DESCRIBE TABLE ${table.name}`,
        format: 'JSONEachRow',
      });
      const columns = (await schemaResult.json()) as TableColumn[];
      tableSchemas.push({
        tableName: table.name,
        columns,
      });
    }

    // Update cache
    schemaCache.tables = tableSchemas;
    schemaCache.lastUpdated = new Date();
    schemaCache.isLoading = false;

    console.log(`[SchemaCache] Schema loaded successfully at ${schemaCache.lastUpdated.toISOString()}`);
    return tableSchemas;
  } catch (error) {
    schemaCache.isLoading = false;
    console.error('[SchemaCache] Failed to load schema:', error);
    throw error;
  }
}

/**
 * Get cached schema, loading if not available
 */
export async function getSchemaCache(): Promise<TableSchema[]> {
  if (schemaCache.tables.length === 0) {
    return await loadSchemaCache();
  }
  return schemaCache.tables;
}

/**
 * Get schema info for system prompt
 * Returns a formatted string describing all tables and columns
 */
export async function getSchemaForPrompt(): Promise<string> {
  const tables = await getSchemaCache();

  if (tables.length === 0) {
    return 'No tables found in database.';
  }

  let schemaText = `Database Schema (${tables.length} tables):\n\n`;

  for (const table of tables) {
    schemaText += `Table: ${table.tableName}\n`;
    schemaText += `Columns:\n`;
    for (const col of table.columns) {
      schemaText += `  - ${col.name} (${col.type})`;
      if (col.comment) {
        schemaText += ` -- ${col.comment}`;
      }
      schemaText += '\n';
    }
    schemaText += '\n';
  }

  return schemaText;
}

/**
 * Force refresh the schema cache
 */
export async function refreshSchemaCache(): Promise<{
  success: boolean;
  tableCount: number;
  lastUpdated: Date | null;
  error?: string;
}> {
  try {
    // Clear existing cache
    schemaCache.tables = [];
    schemaCache.lastUpdated = null;

    // Reload
    const tables = await loadSchemaCache();

    return {
      success: true,
      tableCount: tables.length,
      lastUpdated: schemaCache.lastUpdated,
    };
  } catch (error) {
    return {
      success: false,
      tableCount: 0,
      lastUpdated: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get cache status
 */
export function getSchemaCacheStatus(): {
  isLoaded: boolean;
  tableCount: number;
  lastUpdated: Date | null;
  isLoading: boolean;
} {
  return {
    isLoaded: schemaCache.tables.length > 0,
    tableCount: schemaCache.tables.length,
    lastUpdated: schemaCache.lastUpdated,
    isLoading: schemaCache.isLoading,
  };
}
