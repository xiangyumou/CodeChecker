import { processAnalysisRequest } from '../services/openai-processor';
import logger from '@/lib/logger';

export class TaskQueue {
    private queue: number[] = [];
    private processing = false;
    private concurrency: number;
    private activeCount = 0;

    constructor() {
        this.concurrency = parseInt(
            process.env.MAX_CONCURRENT_ANALYSIS_TASKS || '3'
        );
    }

    private async updateConcurrency() {
        try {
            const { prisma } = await import('@/lib/db');
            const setting = await prisma.setting.findUnique({
                where: { key: 'MAX_CONCURRENT_ANALYSIS_TASKS' }
            });
            if (setting?.value) {
                this.concurrency = parseInt(setting.value);
            }
        } catch (error) {
            // Silently fail, use previous/default concurrency
        }
    }

    async add(requestId: number) {
        logger.info({ requestId, queueLength: this.queue.length + 1 }, 'Adding request to queue');
        this.queue.push(requestId);

        // Refresh concurrency from DB (fire and forget)
        this.updateConcurrency().finally(() => {
            this.process();
        });

        // Also call process immediately to handle regular case
        this.process();
    }

    private process() {
        if (this.queue.length === 0) {
            return;
        }

        // Process up to concurrency limit
        while (
            this.queue.length > 0 &&
            this.activeCount < this.concurrency
        ) {
            const requestId = this.queue.shift();
            if (requestId === undefined) break;

            this.activeCount++;
            logger.info(
                { requestId, activeCount: this.activeCount, concurrency: this.concurrency },
                'Starting request processing'
            );

            // Process asynchronously
            processAnalysisRequest(requestId)
                .finally(() => {
                    this.activeCount--;
                    logger.info(
                        { requestId, activeCount: this.activeCount, concurrency: this.concurrency },
                        'Finished request processing'
                    );
                    // Try to process next item
                    this.process();
                });
        }
    }

    getQueueLength() {
        return this.queue.length;
    }

    getActiveCount() {
        return this.activeCount;
    }
}

// Singleton instance
export const taskQueue = new TaskQueue();
