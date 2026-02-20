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

