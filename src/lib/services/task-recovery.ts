import { prisma } from '@/lib/db';
import logger from '@/lib/logger';

/**
 * Mark incomplete tasks as FAILED on service startup
 * This handles tasks that were interrupted by service restart/crash
 * 
 * Tasks marked as FAILED:
 * - PROCESSING: Tasks that were actively being processed when service stopped
 * - QUEUED: Tasks that were waiting to be processed
 * 
 * Users can manually retry failed tasks using the retry functionality
 */
export async function markIncompleteTasksAsFailed() {
    try {
        // Mark PROCESSING tasks as FAILED
        // Note: With BullMQ, stalled jobs will be automatically retried.
        // But for UI consistency, we mark tasks that were left in PROCESSING state
        // during a crash.
        const processingResult = await prisma.request.updateMany({
            where: {
                status: 'PROCESSING'
            },
            data: {
                status: 'FAILED',
                errorMessage: 'Service restarted while task was processing. You can retry it manually.',
                isSuccess: false,
            }
        });

        // We NO LONGER mark QUEUED tasks as FAILED.
        // Because with BullMQ + Redis, these tasks are persisted in Redis 
        // and will be picked up by the Worker once it identifies itself.

        const total = processingResult.count;

        if (total > 0) {
            logger.warn(
                {
                    processing: processingResult.count,
                    total
                },
                'Marked processing tasks as FAILED due to service restart'
            );
        } else {
            logger.info('No processing tasks found on service startup');
        }

        return {
            processing: processingResult.count,
            queued: 0,
            total
        };
    } catch (error) {
        logger.error({ err: error }, 'Failed to mark incomplete tasks as failed');
        return { processing: 0, queued: 0, total: 0 };
    }
}
