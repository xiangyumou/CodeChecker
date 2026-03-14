import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './db/schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import logger from './logger';
import path from 'path';
import fs from 'fs';
import { eq } from 'drizzle-orm';

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

/**
 * Mark incomplete tasks as FAILED on service startup
 * This handles tasks that were interrupted by service restart/crash
 *
 * Tasks marked as FAILED:
 * - PROCESSING: Tasks that were actively being processed when service stopped
 * - QUEUED: Tasks that were waiting to be processed (memory queue is lost on restart)
 *
 * Users can manually retry failed tasks using the retry functionality
 */
export async function markIncompleteTasksAsFailed() {
    try {
        // Mark PROCESSING tasks as FAILED
        const processingResult = await db
            .update(schema.requests)
            .set({
                status: 'FAILED',
                errorMessage: 'Service restarted while task was processing. You can retry it manually.',
                isSuccess: false,
            })
            .where(eq(schema.requests.status, 'PROCESSING'));

        // Mark QUEUED tasks as FAILED
        // Note: With in-memory queue, queued tasks are lost on restart.
        // Users need to retry these tasks manually.
        const queuedResult = await db
            .update(schema.requests)
            .set({
                status: 'FAILED',
                errorMessage: 'Service restarted while task was queued. You can retry it manually.',
                isSuccess: false,
            })
            .where(eq(schema.requests.status, 'QUEUED'));

        // Get the number of rows changed
        const processingCount = processingResult.changes ?? 0;
        const queuedCount = queuedResult.changes ?? 0;
        const total = processingCount + queuedCount;

        if (total > 0) {
            logger.warn(
                {
                    processing: processingCount,
                    queued: queuedCount,
                    total
                },
                'Marked incomplete tasks as FAILED due to service restart'
            );
        } else {
            logger.info('No incomplete tasks found on service startup');
        }

        return {
            processing: processingCount,
            queued: queuedCount,
            total
        };
    } catch (error) {
        logger.error({ err: error }, 'Failed to mark incomplete tasks as failed');
        return { processing: 0, queued: 0, total: 0 };
    }
}

// For tests - allow creating isolated connections
export function createTestDB(dbPath: string) {
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    return drizzle(sqlite, { schema });
}
