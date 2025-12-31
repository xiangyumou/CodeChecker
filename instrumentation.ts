/**
 * This file is used by Next.js to run code during server initialization
 * It's loaded before the server starts, making it ideal for startup tasks
 */

export async function register() {
    // Only run in Node.js runtime (not Edge runtime)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Initialize BullMQ Worker
        const { initializeWorker } = await import('@/lib/queue/analysis-queue');
        await initializeWorker();

        // Mark incomplete tasks as failed on service startup
        const { markIncompleteTasksAsFailed } = await import('@/lib/services/task-recovery');
        await markIncompleteTasksAsFailed();
    }
}
