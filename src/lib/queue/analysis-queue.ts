import { Queue, Worker, QueueEvents } from 'bullmq';
import redis from './redis';
import logger from '@/lib/logger';

/**
 * 代码分析任务队列
 * 使用 BullMQ 替代 Upstash QStash
 */

// 获取并发限制配置
async function getConcurrencyLimit(): Promise<number> {
    try {
        const { prisma } = await import('@/lib/db');
        const setting = await prisma.setting.findUnique({
            where: { key: 'MAX_CONCURRENT_ANALYSIS_TASKS' }
        });
        if (setting?.value) {
            const parsed = parseInt(setting.value);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
    } catch {
        // Fall through to environment variable
    }

    const envValue = process.env.MAX_CONCURRENT_ANALYSIS_TASKS;
    if (envValue) {
        const parsed = parseInt(envValue);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }

    return 3; // Default concurrency limit
}

// 队列定义
export const analysisQueue = new Queue('code-analysis', {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,           // 失败重试 3 次
        backoff: {
            type: 'exponential',
            delay: 2000,         // 2秒、4秒、8秒递增重试
        },
        removeOnComplete: {
            count: 100,           // 保留最近 100 个成功任务
            age: 24 * 3600,      // 24小时后删除
        },
        removeOnFail: {
            count: 200,           // 保留最近 200 个失败任务
            age: 7 * 24 * 3600,  // 7天后删除
        },
    },
});

// Worker（处理任务）- 延迟初始化
let analysisWorker: Worker | null = null;

/**
 * 初始化 Worker
 * 在应用启动时调用（instrumentation.ts）
 */
export async function initializeWorker(): Promise<void> {
    if (analysisWorker) {
        logger.warn('Worker already initialized');
        return;
    }

    const concurrency = await getConcurrencyLimit();

    analysisWorker = new Worker(
        'code-analysis',
        async (job) => {
            logger.info({
                jobId: job.id,
                requestId: job.data.requestId,
                attempt: job.attemptsMade + 1,
            }, 'Processing analysis task');

            // 导入处理逻辑
            const { processAnalysisTask } = await import('./processor');
            await processAnalysisTask(job.data.requestId);

            return {
                success: true,
                requestId: job.data.requestId,
            };
        },
        {
            connection: redis,
            concurrency, // 并发控制

            // 限流配置（防止瞬间压力过大）
            limiter: {
                max: concurrency * 2,  // 允许排队的任务数
                duration: 1000,        // 每秒处理速率
            },
        }
    );

    // 事件监听
    analysisWorker.on('completed', (job) => {
        logger.info({
            jobId: job.id,
            requestId: job.returnvalue?.requestId,
        }, 'Task completed successfully');
    });

    analysisWorker.on('failed', (job, err) => {
        logger.error({
            jobId: job?.id,
            requestId: job?.data?.requestId,
            err,
            attempts: job?.attemptsMade,
        }, 'Task failed');
    });

    analysisWorker.on('error', (err) => {
        logger.error({ err }, 'Worker error');
    });

    logger.info({ concurrency }, 'Analysis worker initialized');
}

/**
 * 优雅关闭
 */
export async function shutdownQueue(): Promise<void> {
    logger.info('Shutting down analysis queue and worker');

    if (analysisWorker) {
        await analysisWorker.close();
        analysisWorker = null;
    }

    await analysisQueue.close();
    redis.disconnect();

    logger.info('Queue and worker shut down');
}

// 注册优雅关闭处理
if (process.env.NODE_ENV === 'production') {
    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, shutting down gracefully');
        await shutdownQueue();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        logger.info('Received SIGINT, shutting down gracefully');
        await shutdownQueue();
        process.exit(0);
    });
}

// 队列事件监听（可选，用于监控）
const queueEvents = new QueueEvents('code-analysis', {
    connection: redis,
});

queueEvents.on('waiting', ({ jobId }) => {
    logger.debug({ jobId }, 'Job waiting');
});

queueEvents.on('active', ({ jobId }) => {
    logger.debug({ jobId }, 'Job active');
});

queueEvents.on('stalled', ({ jobId }) => {
    logger.warn({ jobId }, 'Job stalled');
});

export { queueEvents };
