/**
 * 简化版内存任务队列
 * 使用 p-queue 替代 Redis + BullMQ
 */

import PQueue from 'p-queue';
import { processAnalysisTask } from './processor';

// 简单的队列实例
const queue = new PQueue({
    concurrency: parseInt(process.env.MAX_CONCURRENT_ANALYSIS_TASKS || '3'),
    autoStart: true,
});

/**
 * 添加分析任务到队列
 * @param requestId - 请求ID
 */
export function addAnalysisTask(requestId: number): void {
    queue.add(async () => {
        try {
            await processAnalysisTask(requestId);
        } catch (error) {
            console.error(`Task ${requestId} failed:`, error);
            // 简单重试一次
            try {
                await processAnalysisTask(requestId);
            } catch (retryError) {
                console.error(`Task ${requestId} failed after retry:`, retryError);
            }
        }
    });
}

// 导出队列实例供需要的地方使用
export { queue };
