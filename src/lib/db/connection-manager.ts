/**
 * Database Connection Manager
 * Centralized manager for handling multiple database connections
 */

import { DatabaseType, loadDatabaseConfig } from './db-config';
import { DatabaseAdapter } from './database-adapter';
import { ClickHouseAdapter } from './adapters/clickhouse-adapter';
import { PostgreSQLAdapter } from './adapters/postgresql-adapter';

/**
 * Singleton Connection Manager
 */
class ConnectionManager {
    private static instance: ConnectionManager;
    private adapters: Map<DatabaseType, DatabaseAdapter> = new Map();
    private primaryDatabase: DatabaseType;
    private secondaryDatabase?: DatabaseType;
    private initialized = false;

    private constructor() {
        const config = loadDatabaseConfig();
        this.primaryDatabase = config.primary;
        this.secondaryDatabase = config.secondary;
    }

    /**
     * Get singleton instance
     */
    static getInstance(): ConnectionManager {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager();
        }
        return ConnectionManager.instance;
    }

    /**
     * Initialize all configured database connections
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        const config = loadDatabaseConfig();

        // Initialize each configured database
        for (const [type, dbConfig] of config.configs) {
            try {
                let adapter: DatabaseAdapter;

                switch (type) {
                    case DatabaseType.CLICKHOUSE:
                        adapter = new ClickHouseAdapter(dbConfig as any);
                        break;
                    case DatabaseType.POSTGRESQL:
                        adapter = new PostgreSQLAdapter(dbConfig as any);
                        break;
                    default:
                        console.warn(`Unsupported database type: ${type}`);
                        continue;
                }

                await adapter.connect();
                this.adapters.set(type, adapter);
                console.log(`✅ ${type} adapter initialized`);
            } catch (error) {
                console.error(`❌ Failed to initialize ${type}:`, error);
                // Continue with other databases even if one fails
            }
        }

        this.initialized = true;
        console.log('🚀 Database Connection Manager initialized');
    }

    /**
     * Get database adapter by type
     * If no type specified, returns the primary database
     */
    async getAdapter(type?: DatabaseType): Promise<DatabaseAdapter> {
        if (!this.initialized) {
            await this.initialize();
        }

        const dbType = type || this.primaryDatabase;
        const adapter = this.adapters.get(dbType);

        if (!adapter) {
            throw new Error(
                `Database ${dbType} is not configured or failed to initialize. ` +
                `Available databases: ${Array.from(this.adapters.keys()).join(', ')}`
            );
        }

        // Ensure connection is still alive
        const isConnected = await adapter.isConnected();
        if (!isConnected) {
            console.warn(`Reconnecting to ${dbType}...`);
            await adapter.connect();
        }

        return adapter;
    }

    /**
     * Get the primary database adapter
     */
    async getPrimaryAdapter(): Promise<DatabaseAdapter> {
        return this.getAdapter(this.primaryDatabase);
    }

    /**
     * Get the secondary database adapter (if configured)
     */
    async getSecondaryAdapter(): Promise<DatabaseAdapter | null> {
        if (!this.secondaryDatabase) {
            return null;
        }
        return this.getAdapter(this.secondaryDatabase);
    }

    /**
     * Check if a specific database type is available
     */
    isAvailable(type: DatabaseType): boolean {
        return this.adapters.has(type);
    }

    /**
     * Get list of available database types
     */
    getAvailableDatabases(): DatabaseType[] {
        return Array.from(this.adapters.keys());
    }

    /**
     * Close all database connections
     */
    async closeAll(): Promise<void> {
        const closePromises = Array.from(this.adapters.values()).map(adapter =>
            adapter.disconnect().catch(err => console.error('Error closing connection:', err))
        );

        await Promise.all(closePromises);
        this.adapters.clear();
        this.initialized = false;
        console.log('All database connections closed');
    }

    /**
     * Health check for all databases
     */
    async healthCheck(): Promise<Map<DatabaseType, boolean>> {
        const health = new Map<DatabaseType, boolean>();

        for (const [type, adapter] of this.adapters) {
            try {
                const isHealthy = await adapter.isConnected();
                health.set(type, isHealthy);
            } catch (error) {
                health.set(type, false);
            }
        }

        return health;
    }
}

// Export singleton instance methods
const manager = ConnectionManager.getInstance();

export const getDatabase = (type?: DatabaseType) => manager.getAdapter(type);
export const getPrimaryDatabase = () => manager.getPrimaryAdapter();
export const getSecondaryDatabase = () => manager.getSecondaryAdapter();
export const isDatabaseAvailable = (type: DatabaseType) => manager.isAvailable(type);
export const getAvailableDatabases = () => manager.getAvailableDatabases();
export const closeDatabases = () => manager.closeAll();
export const checkDatabaseHealth = () => manager.healthCheck();

export { ConnectionManager };
