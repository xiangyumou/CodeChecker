/**
 * This file is used by Next.js to run code during server initialization
 * It's loaded before the server starts, making it ideal for startup tasks
 */

export async function register() {
    // Only run in Node.js runtime (not Edge runtime)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Initialize in-memory task queue
        const { initializeQueue } = await import('@/lib/queue/memory-queue');
        await initializeQueue();

        // Mark incomplete tasks as failed on service startup
        // This handles cases where the server was restarted while tasks were processing
        const { markIncompleteTasksAsFailed } = await import('@/lib/services/task-recovery');
        await markIncompleteTasksAsFailed();
    }
}
