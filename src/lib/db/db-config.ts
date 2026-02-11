/**
 * Database Configuration Types and Enums
 * Defines the configuration structure for different database types
 */

export enum DatabaseType {
    CLICKHOUSE = 'CLICKHOUSE',
    POSTGRESQL = 'POSTGRESQL',
    MYSQL = 'MYSQL',
}

/**
 * Base configuration interface for all databases
 */
export interface BaseDatabaseConfig {
    type: DatabaseType;
    enabled?: boolean;
}

/**
 * ClickHouse specific configuration
 */
export interface ClickHouseConfig extends BaseDatabaseConfig {
    type: DatabaseType.CLICKHOUSE;
    host: string;
    username: string;
    password: string;
    database: string;
    port?: number;
}

/**
 * PostgreSQL specific configuration
 */
export interface PostgreSQLConfig extends BaseDatabaseConfig {
    type: DatabaseType.POSTGRESQL;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl?: boolean;
    maxConnections?: number;
}

/**
 * MySQL specific configuration (for future use)
 */
export interface MySQLConfig extends BaseDatabaseConfig {
    type: DatabaseType.MYSQL;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl?: boolean;
}

/**
 * Union type for all database configurations
 */
export type DatabaseConfig = ClickHouseConfig | PostgreSQLConfig | MySQLConfig;

/**
 * Load database configuration from environment variables
 */
export function loadDatabaseConfig(): {
    primary: DatabaseType;
    secondary?: DatabaseType;
    configs: Map<DatabaseType, DatabaseConfig>;
} {
    const configs = new Map<DatabaseType, DatabaseConfig>();

    // Load primary database selection
    const defaultDb = process.env.DEFAULT_DATABASE || 'DB1';
    const primary = (process.env.DB_PRIMARY as DatabaseType) || DatabaseType.CLICKHOUSE;
    const secondary = process.env.DB_SECONDARY as DatabaseType | undefined;

    // Helper function to get env variable with fallback to DB1_ prefix
    const getEnv = (key: string, dbPrefix: string = defaultDb) => {
        // Try direct key first (e.g., CLICKHOUSE_HOST)
        if (process.env[key]) {
            return process.env[key];
        }
        // Try with DB prefix (e.g., DB1_CLICKHOUSE_HOST)
        const prefixedKey = `${dbPrefix}_${key}`;
        return process.env[prefixedKey];
    };

    // Load ClickHouse configuration
    const clickhouseHost = getEnv('CLICKHOUSE_HOST');
    if (clickhouseHost) {
        configs.set(DatabaseType.CLICKHOUSE, {
            type: DatabaseType.CLICKHOUSE,
            host: clickhouseHost,
            username: getEnv('CLICKHOUSE_USER') || '',
            password: getEnv('CLICKHOUSE_PASSWORD') || '',
            database: getEnv('CLICKHOUSE_DB') || '',
            enabled: true,
        });
    }

    // Load PostgreSQL configuration
    const postgresHost = getEnv('POSTGRES_HOST');
    if (postgresHost) {
        configs.set(DatabaseType.POSTGRESQL, {
            type: DatabaseType.POSTGRESQL,
            host: postgresHost,
            port: parseInt(getEnv('POSTGRES_PORT') || '5432', 10),
            username: getEnv('POSTGRES_USER') || '',
            password: getEnv('POSTGRES_PASSWORD') || '',
            database: getEnv('POSTGRES_DB') || '',
            ssl: getEnv('POSTGRES_SSL') === 'true',
            maxConnections: parseInt(getEnv('POSTGRES_MAX_CONNECTIONS') || '10', 10),
            enabled: true,
        });
    }

    // Load MySQL configuration (if needed in the future)
    if (process.env.MYSQL_HOST) {
        configs.set(DatabaseType.MYSQL, {
            type: DatabaseType.MYSQL,
            host: process.env.MYSQL_HOST,
            port: parseInt(process.env.MYSQL_PORT || '3306', 10),
            username: process.env.MYSQL_USER || '',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DB || '',
            ssl: process.env.MYSQL_SSL === 'true',
            enabled: true,
        });
    }

    return { primary, secondary, configs };
}
