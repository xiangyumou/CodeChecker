import { db } from '@/lib/db';
import { requests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import logger from '@/lib/logger';

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
            .update(requests)
            .set({
                status: 'FAILED',
                errorMessage: 'Service restarted while task was processing. You can retry it manually.',
                isSuccess: false,
            })
            .where(eq(requests.status, 'PROCESSING'));

        // Mark QUEUED tasks as FAILED
        // Note: With in-memory queue, queued tasks are lost on restart.
        // Users need to retry these tasks manually.
        const queuedResult = await db
            .update(requests)
            .set({
                status: 'FAILED',
                errorMessage: 'Service restarted while task was queued. You can retry it manually.',
                isSuccess: false,
            })
            .where(eq(requests.status, 'QUEUED'));

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
