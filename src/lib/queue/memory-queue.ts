/**
 * 内存任务队列
 * 使用 p-queue 替代 Redis + BullMQ
 * 适用于小团队部署（2-10人），无需外部 Redis 依赖
 */

import PQueue from 'p-queue';
import logger from '@/lib/logger';
import { processAnalysisTask } from './processor';
import { getSetting, AppSettings } from '@/lib/settings';

// 获取并发限制配置
async function getConcurrencyLimit(): Promise<number> {
    try {
        const value = await getSetting(AppSettings.MAX_CONCURRENT_ANALYSIS_TASKS);
        if (value) {
            const parsed = parseInt(value);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
    } catch (error) {
        logger.warn({ error }, 'Failed to get concurrency limit from settings');
    }
    return 3; // 默认并发限制
}

// 延迟函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 重试配置
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2秒

// 计算指数退避延迟
function getRetryDelay(attempt: number): number {
    return INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
}

// 创建队列实例（延迟初始化）
let queue: PQueue | null = null;
let concurrencyLimit = 3;

/**
 * 初始化队列
 * 在应用启动时调用
 */
export async function initializeQueue(): Promise<void> {
    if (queue) {
        logger.warn('Queue already initialized');
        return;
    }

    concurrencyLimit = await getConcurrencyLimit();

    queue = new PQueue({
        concurrency: concurrencyLimit,
        // 自动开始处理队列
        autoStart: true,
    });

    logger.info({ concurrency: concurrencyLimit }, 'Memory queue initialized');
}

/**
 * 获取队列实例（确保已初始化）
 */
function getQueue(): PQueue {
    if (!queue) {
        // 如果未初始化，使用默认配置初始化
        queue = new PQueue({ concurrency: 3 });
        logger.warn('Queue accessed before initialization, using default config');
    }
    return queue;
}

/**
 * 添加分析任务到队列
 * @param requestId - 请求ID
 * @returns Promise，任务完成时 resolve，失败时 reject（所有重试后）
 */
export async function addAnalysisTask(requestId: number): Promise<void> {
    const q = getQueue();

    return q.add(async () => {
        logger.info({ requestId, queueSize: q.size, pending: q.pending }, 'Adding analysis task to queue');

        // 包装重试逻辑
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                logger.info({ requestId, attempt }, 'Processing analysis task');
                await processAnalysisTask(requestId);
                logger.info({ requestId, attempt }, 'Task completed successfully');
                return;
            } catch (error) {
                const isLastAttempt = attempt === MAX_RETRIES;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                logger.error({
                    err: error,
                    requestId,
                    attempt,
                    isLastAttempt,
                    errorMessage,
                }, 'Task attempt failed');

                if (isLastAttempt) {
                    throw error; // 重试耗尽，抛出错误
                }

                // 等待后退避时间
                const delay = getRetryDelay(attempt);
                logger.info({ requestId, attempt, delay }, 'Retrying after delay');
                await sleep(delay);
            }
        }
    }, {
        // 任务优先级（可选，数字越小优先级越高）
        priority: 0,
    });
}

/**
 * 获取队列状态
 */
export function getQueueStatus(): { size: number; pending: number; isPaused: boolean } {
    const q = getQueue();
    return {
        size: q.size,
        pending: q.pending,
        isPaused: q.isPaused,
    };
}

/**
 * 清空队列（谨慎使用）
 */
export function clearQueue(): void {
    const q = getQueue();
    q.clear();
    logger.info('Queue cleared');
}

/**
 * 暂停队列处理
 */
export function pauseQueue(): void {
    const q = getQueue();
    q.pause();
    logger.info('Queue paused');
}

/**
 * 恢复队列处理
 */
export function resumeQueue(): void {
    const q = getQueue();
    q.start();
    logger.info('Queue resumed');
}

/**
 * 等待队列完成所有任务（用于优雅关闭）
 */
export async function waitForQueueIdle(): Promise<void> {
    if (!queue) return;

    logger.info('Waiting for queue to become idle...');
    await queue.onIdle();
    logger.info('Queue is idle');
}

/**
 * 优雅关闭队列
 */
export async function shutdownQueue(): Promise<void> {
    if (!queue) return;

    logger.info('Shutting down queue...');

    // 暂停接受新任务
    queue.pause();

    // 等待当前任务完成（有超时保护）
    const shutdownTimeout = 30000; // 30秒超时
    const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Queue shutdown timeout')), shutdownTimeout);
    });

    try {
        await Promise.race([queue.onIdle(), timeoutPromise]);
        logger.info('Queue shut down gracefully');
    } catch (error) {
        logger.warn({ error }, 'Queue shutdown timed out, forcing close');
    }

    queue.clear();
    queue = null;
}
