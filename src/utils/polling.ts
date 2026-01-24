// Polling intervals (in milliseconds)
export const POLLING_INTERVAL_ACTIVE = 5000; // 5s when tracking active tasks
export const POLLING_INTERVAL_IDLE = 30000; // 30s when idle

/**
 * Determines the polling interval for a single request based on its status.
 * @param status - The current status of the request (QUEUED, PROCESSING, COMPLETED, FAILED)
 * @returns The polling interval in milliseconds, or false to stop polling
 */
export const getRequestPollingInterval = (status?: string): number | false => {
    if (!status) return POLLING_INTERVAL_ACTIVE;

    // Only poll for active statuses
    if (status === 'QUEUED' || status === 'PROCESSING') {
        return POLLING_INTERVAL_ACTIVE;
    }

    // COMPLETED or FAILED - stop polling
    return false;
};

/**
 * Determines the polling interval for a list of requests (Infinite Query).
 * @param data - The data returned from the infinite query
 * @returns The polling interval in milliseconds, or false to stop polling
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getRequestListPollingInterval = (data: any): number | false => {
    // Stop polling when page is not visible
    if (typeof document !== 'undefined' && document.hidden) {
        return false;
    }

    // Check if there are any active tasks
    if (!data || !data.pages) {
        return POLLING_INTERVAL_IDLE;
    }

    const allRequests = data.pages.flat();
    const hasActiveTasks = allRequests.some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => r.status === 'QUEUED' || r.status === 'PROCESSING'
    );

    // High frequency when tracking active tasks
    // Low frequency when idle (can still detect new requests)
    return hasActiveTasks ? POLLING_INTERVAL_ACTIVE : POLLING_INTERVAL_IDLE;
};
