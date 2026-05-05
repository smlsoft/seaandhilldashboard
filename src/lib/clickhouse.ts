/**
 * ClickHouse Client (Backward Compatible)
 * 
 * This file maintains backward compatibility with existing code.
 * It now uses the new Database Connection Manager under the hood.
 * 
 * For new code, consider using:
 * import { getDatabase, DatabaseType } from '@/lib/db';
 */

import { getDatabase, DatabaseType } from './db/index';

let clickhouseInstance: any = null;

/**
 * @deprecated Use getDatabase(DatabaseType.CLICKHOUSE) instead
 */
async function initClickHouse() {
  if (!clickhouseInstance) {
    try {
      const adapter = await getDatabase(DatabaseType.CLICKHOUSE);
      clickhouseInstance = adapter.getClient();
    } catch (error) {
      console.error('Failed to initialize ClickHouse client:', error);
      throw error;
    }
  }
  return clickhouseInstance;
}

/**
 * @deprecated Use getDatabase(DatabaseType.CLICKHOUSE) instead
 */
export async function getClickHouse() {
  return await initClickHouse();
}

// For backward compatibility, create a proxy object with proper typing
interface ClickHouseClient {
  query(options: any): Promise<any>;
  [key: string]: any;
}

/**
 * @deprecated Use getDatabase(DatabaseType.CLICKHOUSE) instead
 * 
 * Legacy proxy for backward compatibility.
 * This maintains the same API as before but uses the connection manager.
 */
export const clickhouse: ClickHouseClient = new Proxy({} as ClickHouseClient, {
  get: (target, prop) => {
    if (typeof prop === 'symbol') {
      return undefined;
    }

    return async (...args: any[]) => {
      const adapter = await getDatabase(DatabaseType.CLICKHOUSE);
      const client = adapter.getClient();

      if (!client) {
        throw new Error('ClickHouse client is not initialized');
      }

      const method = (client as any)[prop];
      if (typeof method === 'function') {
        return method.apply(client, args);
      }
      return method;
    };
  },
}) as ClickHouseClient;

import { auth } from './auth';
import { headers } from 'next/headers';

/**
 * Executes a ClickHouse query with automatic branch-level permissions applied.
 * @param baseQuery The original SQL query
 * @param params Query parameters
 */
export async function queryWithBranchAuth(baseQuery: string, params: Record<string, any> = {}) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    throw new Error("Unauthorized: No session found");
  }

  let allowedBranches: string[] = [];
  try {
    const rawBranches = (session.user as any).allowed_branches;
    if (typeof rawBranches === 'string') {
      allowedBranches = JSON.parse(rawBranches) || [];
    } else if (Array.isArray(rawBranches)) {
      allowedBranches = rawBranches;
    }
  } catch (e) {
    console.error("Failed to parse allowed_branches:", e);
  }

  const userRole = (session.user as any).role || '';

  // Admin or user with '*' branch has access to everything
  if (userRole === 'admin' || allowedBranches.includes('*')) {
    return clickhouse.query({
      query: baseQuery,
      query_params: params
    });
  }

  // If user has no branches allowed, they shouldn't see anything.
  // We can inject a dummy condition that's always false, or just throw an error.
  // Let's inject a condition that's always false for safety, or just an empty array which IN () will fail on ClickHouse.
  // ClickHouse IN () with empty array might throw a syntax error depending on the version.
  // Let's handle empty branches by forcing a no-match.
  let branchesToFilter = allowedBranches;
  if (branchesToFilter.length === 0) {
    branchesToFilter = ['__NO_ACCESS__'];
  }

  const hasWhere = baseQuery.toUpperCase().includes("WHERE");
  const authFilter = `branch_syns IN ({auth_branches:Array(String)})`;
  
  const finalQuery = hasWhere 
    ? baseQuery.replace(/WHERE/i, `WHERE ${authFilter} AND `) 
    : `${baseQuery} WHERE ${authFilter}`;

  return clickhouse.query({
    query: finalQuery,
    query_params: {
      ...params,
      auth_branches: branchesToFilter
    }
  });
}

