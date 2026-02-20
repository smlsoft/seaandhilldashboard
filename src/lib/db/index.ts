/**
 * Database Module Entry Point
 * Exports all database utilities and types
 */

// Configuration
export { DatabaseType, loadDatabaseConfig } from './db-config';
export type {
    BaseDatabaseConfig,
    ClickHouseConfig,
    PostgreSQLConfig,
    MySQLConfig,
    DatabaseConfig,
} from './db-config';

// Adapter Interface
export type {
    DatabaseAdapter,
    QueryOptions,
    QueryResult,
} from './database-adapter';

// Adapters
export { ClickHouseAdapter } from './adapters/clickhouse-adapter';
export { PostgreSQLAdapter } from './adapters/postgresql-adapter';

// Connection Manager
export {
    ConnectionManager,
    getDatabase,
    getPrimaryDatabase,
    getSecondaryDatabase,
    isDatabaseAvailable,
    getAvailableDatabases,
    closeDatabases,
    checkDatabaseHealth,
} from './connection-manager';
