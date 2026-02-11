/**
 * Database Adapter Interface
 * Defines a common interface for all database adapters
 */

import { DatabaseConfig, DatabaseType } from './db-config';

/**
 * Query options for database queries
 */
export interface QueryOptions {
    query: string;
    params?: any[];
    format?: string;
}

/**
 * Query result interface
 */
export interface QueryResult<T = any> {
    data: T[];
    rows?: number;
    meta?: any;
}

/**
 * Base interface for all database adapters
 */
export interface DatabaseAdapter {
    /**
     * Database type identifier
     */
    readonly type: DatabaseType;

    /**
     * Initialize the database connection
     */
    connect(): Promise<void>;

    /**
     * Close the database connection
     */
    disconnect(): Promise<void>;

    /**
     * Check if the connection is healthy
     */
    isConnected(): Promise<boolean>;

    /**
     * Execute a query and return results
     */
    query<T = any>(options: QueryOptions): Promise<QueryResult<T>>;

    /**
     * Execute a raw query (for specific database features)
     */
    execute(query: string, params?: any[]): Promise<any>;

    /**
     * Get the underlying client (for advanced usage)
     */
    getClient(): any;
}

/**
 * Abstract base class for database adapters
 */
export abstract class BaseAdapter implements DatabaseAdapter {
    protected config: DatabaseConfig;
    protected client: any = null;

    constructor(config: DatabaseConfig) {
        this.config = config;
    }

    abstract get type(): DatabaseType;
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract isConnected(): Promise<boolean>;
    abstract query<T = any>(options: QueryOptions): Promise<QueryResult<T>>;
    abstract execute(query: string, params?: any[]): Promise<any>;

    getClient(): any {
        return this.client;
    }

    protected ensureConnected(): void {
        if (!this.client) {
            throw new Error(`Database ${this.type} is not connected`);
        }
    }
}
