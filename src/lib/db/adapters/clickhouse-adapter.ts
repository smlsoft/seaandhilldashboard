/**
 * ClickHouse Database Adapter
 * Implements the DatabaseAdapter interface for ClickHouse
 */

import { DatabaseType, ClickHouseConfig } from '../db-config';
import { BaseAdapter, QueryOptions, QueryResult } from '../database-adapter';

export class ClickHouseAdapter extends BaseAdapter {
    private clickhouseClient: any = null;

    constructor(config: ClickHouseConfig) {
        super(config);
    }

    get type(): DatabaseType {
        return DatabaseType.CLICKHOUSE;
    }

    async connect(): Promise<void> {
        if (this.clickhouseClient) {
            return; // Already connected
        }

        try {
            const { createClient } = await import('@clickhouse/client');
            const config = this.config as ClickHouseConfig;

            this.clickhouseClient = createClient({
                url: config.host,
                username: config.username,
                password: config.password,
                database: config.database,
            });

            this.client = this.clickhouseClient;
            console.log('✅ ClickHouse connected successfully');
        } catch (error) {
            console.error('❌ Failed to connect to ClickHouse:', error);
            throw new Error(`ClickHouse connection failed: ${error}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.clickhouseClient) {
            await this.clickhouseClient.close();
            this.clickhouseClient = null;
            this.client = null;
            console.log('ClickHouse disconnected');
        }
    }

    async isConnected(): Promise<boolean> {
        if (!this.clickhouseClient) {
            return false;
        }

        try {
            await this.clickhouseClient.ping();
            return true;
        } catch (error) {
            return false;
        }
    }

    async query<T = any>(options: QueryOptions): Promise<QueryResult<T>> {
        this.ensureConnected();

        try {
            const result = await this.clickhouseClient.query({
                query: options.query,
                format: options.format || 'JSONEachRow',
            });

            const data = await result.json();

            return {
                data: Array.isArray(data) ? data : [data],
                rows: Array.isArray(data) ? data.length : 1,
            };
        } catch (error) {
            console.error('ClickHouse query error:', error);
            throw error;
        }
    }

    async execute(query: string, params?: any[]): Promise<any> {
        this.ensureConnected();

        try {
            const result = await this.clickhouseClient.exec({
                query,
            });

            return result;
        } catch (error) {
            console.error('ClickHouse execute error:', error);
            throw error;
        }
    }

    /**
     * ClickHouse-specific method for streaming queries
     */
    async queryStream(options: QueryOptions): Promise<any> {
        this.ensureConnected();

        return await this.clickhouseClient.query({
            query: options.query,
            format: options.format || 'JSONEachRow',
        });
    }
}
