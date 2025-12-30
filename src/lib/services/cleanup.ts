import { prisma } from '@/lib/db';
import { requestUpdateEmitter } from './openai-processor';
import logger from '@/lib/logger';

export class CleanupService {
    static async cleanup() {
        logger.info('Starting analysis cleanup process');
        const results = {
            markedFailed: 0,
            errors: [] as string[]
        };

        try {
            // Get timeout from env (default 180 seconds)
            const timeoutSeconds = parseInt(process.env.REQUEST_TIMEOUT_SECONDS || '180');
            const timeoutMs = timeoutSeconds * 1000;

            // Find requests stuck in PROCESSING for too long
            const staleThreshold = new Date(Date.now() - timeoutMs);

            const staleRequests = await prisma.request.findMany({
                where: {
                    status: 'PROCESSING',
                    updatedAt: {
                        lt: staleThreshold
                    }
                }
            });

            logger.info(
                { count: staleRequests.length, timeoutSeconds },
                'Found stale processing requests'
            );

            for (const request of staleRequests) {
                try {
                    await prisma.request.update({
                        where: { id: request.id },
                        data: {
                            status: 'FAILED',
                            errorMessage: 'Analysis timed out',
                            isSuccess: false
                        }
                    });

                    requestUpdateEmitter.emit('request_updated', {
                        id: request.id,
                        status: 'FAILED'
                    });

                    results.markedFailed++;
                    logger.info({ requestId: request.id }, 'Marked stale request as FAILED');
                } catch (err) {
                    const msg = `Failed to update stale request ${request.id}: ${err}`;
                    logger.error({ requestId: request.id, err }, 'Failed to update stale request');
                    results.errors.push(msg);
                }
            }

        } catch (error) {
            logger.error({ err: error }, 'Critical error during cleanup');
            results.errors.push(String(error));
        }

        logger.info({ results }, 'Cleanup finished');
        return results;
    }
}
