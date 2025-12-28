/**
 * Unified API client for user-facing frontend
 * 
 * This module provides a centralized API client that handles all HTTP requests
 * for the student-facing interface. It wraps the shared UnifiedApiClient and
 * handles UI feedback (error messages) at this layer.
 */

import { createApiClient, ApiError, getEnvironmentConfig } from '@shared';
import { message } from 'antd';

// Get environment-specific configuration
const config = getEnvironmentConfig();

/**
 * Main API client instance for user features
 * 
 * Handles errors by displaying antd messages to the user.
 * This keeps the UI logic separate from the shared library.
 */
export const userApiClient = createApiClient(config, {
    onError: (error: ApiError) => {
        // Display user-friendly error messages
        message.error(error.message);
    },
});

/**
 * Convenient API methods that match the original interface
 * This ensures existing components don't need to change
 */
export const api = {
    get: <T = any>(...args: Parameters<typeof userApiClient.get>) =>
        userApiClient.get<T>(...args),

    post: <T = any>(...args: Parameters<typeof userApiClient.post>) =>
        userApiClient.post<T>(...args),

    put: <T = any>(...args: Parameters<typeof userApiClient.put>) =>
        userApiClient.put<T>(...args),

    delete: <T = any>(...args: Parameters<typeof userApiClient.delete>) =>
        userApiClient.delete<T>(...args),
};
