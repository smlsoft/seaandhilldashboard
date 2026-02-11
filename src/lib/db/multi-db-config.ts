/**
 * Multi-Database Configuration Loader
 * Loads and manages configurations for multiple databases
 */

import { DatabaseType } from './db-config';
import type { DatabaseConfig, ClickHouseConfig, PostgreSQLConfig } from './db-config';

export interface DatabaseInfo {
  key: string;
  name: string;
  type: DatabaseType;
  config: DatabaseConfig;
}

/**
 * Load configuration for a specific database key
 */
export function loadDatabaseConfigByKey(configKey: string): DatabaseInfo {
  const dbName = process.env[`${configKey}_NAME`] || configKey;
  const dbType = process.env[`${configKey}_TYPE`] as DatabaseType;

  if (!dbType) {
    throw new Error(`Database type not found for ${configKey}. Make sure ${configKey}_TYPE is set in .env`);
  }

  let config: DatabaseConfig;

  switch (dbType) {
    case DatabaseType.CLICKHOUSE:
      config = {
        type: DatabaseType.CLICKHOUSE,
        host: process.env[`${configKey}_CLICKHOUSE_HOST`] || '',
        username: process.env[`${configKey}_CLICKHOUSE_USER`] || '',
        password: process.env[`${configKey}_CLICKHOUSE_PASSWORD`] || '',
        database: process.env[`${configKey}_CLICKHOUSE_DB`] || '',
        enabled: true,
      } as ClickHouseConfig;
      break;

    case DatabaseType.POSTGRESQL:
      config = {
        type: DatabaseType.POSTGRESQL,
        host: process.env[`${configKey}_POSTGRES_HOST`] || '',
        port: parseInt(process.env[`${configKey}_POSTGRES_PORT`] || '5432', 10),
        username: process.env[`${configKey}_POSTGRES_USER`] || '',
        password: process.env[`${configKey}_POSTGRES_PASSWORD`] || '',
        database: process.env[`${configKey}_POSTGRES_DB`] || '',
        ssl: process.env[`${configKey}_POSTGRES_SSL`] === 'true',
        maxConnections: parseInt(process.env[`${configKey}_POSTGRES_MAX_CONNECTIONS`] || '10', 10),
        enabled: true,
      } as PostgreSQLConfig;
      break;

    default:
      throw new Error(`Unsupported database type: ${dbType} for ${configKey}`);
  }

  return {
    key: configKey,
    name: dbName,
    type: dbType,
    config,
  };
}

/**
 * Get all available database keys from environment variables
 */
export function getAvailableDatabases(): string[] {
  const keys: string[] = [];
  const envKeys = Object.keys(process.env);

  // Find all keys matching pattern DB*_TYPE
  envKeys.forEach(key => {
    const match = key.match(/^(DB\d+)_TYPE$/);
    if (match) {
      keys.push(match[1]);
    }
  });

  // Sort by number (DB1, DB2, DB3, etc.)
  return keys.sort((a, b) => {
    const numA = parseInt(a.replace('DB', ''));
    const numB = parseInt(b.replace('DB', ''));
    return numA - numB;
  });
}

/**
 * Get all available databases with their info
 */
export function getAllDatabasesInfo(): DatabaseInfo[] {
  const keys = getAvailableDatabases();
  return keys.map(key => {
    try {
      return loadDatabaseConfigByKey(key);
    } catch (error) {
      console.warn(`Failed to load config for ${key}:`, error);
      return null;
    }
  }).filter((info): info is DatabaseInfo => info !== null);
}

/**
 * Get default database key
 */
export function getDefaultDatabase(): string {
  return process.env.DEFAULT_DATABASE || 'DB1';
}
