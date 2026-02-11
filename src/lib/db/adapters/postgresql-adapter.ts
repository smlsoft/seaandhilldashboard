/**
 * PostgreSQL Database Adapter
 * Implements the DatabaseAdapter interface for PostgreSQL
 */

import { DatabaseType, PostgreSQLConfig } from '../db-config';
import { BaseAdapter, QueryOptions, QueryResult } from '../database-adapter';

export class PostgreSQLAdapter extends BaseAdapter {
    private pool: any = null;

    constructor(config: PostgreSQLConfig) {
        super(config);
    }

    get type(): DatabaseType {
        return DatabaseType.POSTGRESQL;
    }

    async connect(): Promise<void> {
        if (this.pool) {
            return; // Already connected
        }

        try {
            const { Pool } = await import('pg');
            const config = this.config as PostgreSQLConfig;

            this.pool = new Pool({
                host: config.host,
                port: config.port,
                user: config.username,
                password: config.password,
                database: config.database,
                ssl: config.ssl ? { rejectUnauthorized: false } : false,
                max: config.maxConnections || 10,
            });

            this.client = this.pool;

            // Test connection
            const client = await this.pool.connect();
            client.release();

            console.log('✅ PostgreSQL connected successfully');
        } catch (error) {
            console.error('❌ Failed to connect to PostgreSQL:', error);
            throw new Error(`PostgreSQL connection failed: ${error}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.client = null;
            console.log('PostgreSQL disconnected');
        }
    }

    async isConnected(): Promise<boolean> {
        if (!this.pool) {
            return false;
        }

        try {
            const client = await this.pool.connect();
            client.release();
            return true;
        } catch (error) {
            return false;
        }
    }

    async query<T = any>(options: QueryOptions): Promise<QueryResult<T>> {
        this.ensureConnected();

        try {
            const result = await this.pool.query(options.query, options.params || []);

            return {
                data: result.rows,
                rows: result.rowCount || 0,
                meta: result.fields,
            };
        } catch (error) {
            console.error('PostgreSQL query error:', error);
            throw error;
        }
    }

    async execute(query: string, params?: any[]): Promise<any> {
        this.ensureConnected();

        try {
            const result = await this.pool.query(query, params || []);
            return result;
        } catch (error) {
            console.error('PostgreSQL execute error:', error);
            throw error;
        }
    }

    /**
     * PostgreSQL-specific method for transactions
     */
    async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
        this.ensureConnected();

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
