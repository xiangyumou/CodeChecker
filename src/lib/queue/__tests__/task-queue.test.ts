import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TaskQueue } from '../task-queue';
import * as processor from '../../services/openai-processor';

// Mock dependencies
vi.mock('../../services/openai-processor', () => ({
    processAnalysisRequest: vi.fn(),
    requestUpdateEmitter: new (require('events').EventEmitter)(),
}));

describe('TaskQueue', () => {
    let queue: TaskQueue;

    beforeEach(() => {
        vi.resetAllMocks();
        // Reset env for each test just in case
        process.env.MAX_CONCURRENT_ANALYSIS_TASKS = '3';
        queue = new TaskQueue();
    });

    afterEach(() => {
        delete process.env.MAX_CONCURRENT_ANALYSIS_TASKS;
    });

    it('should add tasks to queue', async () => {
        // Prevent immediate resolution so we can check active count
        (processor.processAnalysisRequest as any).mockReturnValue(new Promise(() => { }));

        await queue.add(1);
        expect(queue.getActiveCount()).toBe(1); // Since it starts immediately
        expect(queue.getQueueLength()).toBe(0); // Removed from queue and processing
        expect(processor.processAnalysisRequest).toHaveBeenCalledWith(1);
    });

    it('should respect concurrency limit', async () => {
        // lower concurrency for testing
        process.env.MAX_CONCURRENT_ANALYSIS_TASKS = '2';
        queue = new TaskQueue();

        let resolveTask1: (value: void) => void;
        let resolveTask3: (value: void) => void;

        // Create controlled promises
        (processor.processAnalysisRequest as any)
            .mockReturnValueOnce(new Promise((resolve) => { resolveTask1 = resolve; }))
            .mockReturnValueOnce(new Promise(() => { })) // Task 2 hangs indefinitely
            .mockReturnValueOnce(new Promise((resolve) => { resolveTask3 = resolve; })); // Task 3 controlled

        // Add 3 tasks
        queue.add(1);
        queue.add(2);
        queue.add(3);

        // Concurrency is 2. 
        // 1 and 2 should be active. 3 should be in queue.
        expect(queue.getActiveCount()).toBe(2);
        expect(queue.getQueueLength()).toBe(1);

        expect(processor.processAnalysisRequest).toHaveBeenCalledWith(1);
        expect(processor.processAnalysisRequest).toHaveBeenCalledWith(2);
        expect(processor.processAnalysisRequest).not.toHaveBeenCalledWith(3);

        // Finish task 1
        resolveTask1!();

        // Wait for microtasks so queue can process next
        await new Promise((r) => setTimeout(r, 0));

        // Now active count should still be 2 (task 2 running, task 3 started)
        expect(queue.getActiveCount()).toBe(2);
        expect(queue.getQueueLength()).toBe(0);
        expect(processor.processAnalysisRequest).toHaveBeenCalledWith(3);
    });

    it('should continue processing when queue is empty', async () => {
        // Allow tasks to finish immediately
        (processor.processAnalysisRequest as any).mockResolvedValue(undefined);

        await queue.add(1);
        // Wait for it to finish (microtask)
        await new Promise((r) => setTimeout(r, 0));

        expect(queue.getActiveCount()).toBe(0);
        expect(queue.getQueueLength()).toBe(0);
    });
});
