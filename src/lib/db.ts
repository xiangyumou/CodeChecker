import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './db/schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import logger from './logger';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = process.env.DATA_DIR || './data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const sqlitePath = path.join(dataDir, 'codechecker.db');

// Create database connection
const sqlite = new Database(sqlitePath);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Run migrations on startup
export function runMigrations() {
    try {
        const migrationsFolder = path.join(process.cwd(), 'drizzle');
        migrate(db, { migrationsFolder });
        logger.info('Database migrations completed');
    } catch (error) {
        logger.error({ error }, 'Failed to run migrations');
        throw error;
    }
}

// For tests - allow creating isolated connections
export function createTestDB(dbPath: string) {
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    return drizzle(sqlite, { schema });
}
