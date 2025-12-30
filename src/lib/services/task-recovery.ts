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
        const processingResult = await prisma.request.updateMany({
            where: {
                status: 'PROCESSING'
            },
            data: {
                status: 'FAILED',
                errorMessage: 'Service restarted while task was processing',
                isSuccess: false,
            }
        });

        // Mark QUEUED tasks as FAILED
        const queuedResult = await prisma.request.updateMany({
            where: {
                status: 'QUEUED'
            },
            data: {
                status: 'FAILED',
                errorMessage: 'Service restarted before task could be processed',
                isSuccess: false,
            }
        });

        const total = processingResult.count + queuedResult.count;

        if (total > 0) {
            logger.warn(
                {
                    processing: processingResult.count,
                    queued: queuedResult.count,
                    total
                },
                'Marked incomplete tasks as FAILED due to service restart'
            );
        } else {
            logger.info('No incomplete tasks found on service startup');
        }

        return {
            processing: processingResult.count,
            queued: queuedResult.count,
            total
        };
    } catch (error) {
        logger.error({ err: error }, 'Failed to mark incomplete tasks as failed');
        // Don't throw - service should continue starting up even if this fails
        return { processing: 0, queued: 0, total: 0 };
    }
}
