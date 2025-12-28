import { adminApiClient } from '@/api/centralized';

// Export the raw axios instance from the centralized client
// This maintains backward compatibility for files importing 'axiosInstance'
// while ensuring they use the centralized configuration and interceptors.
const axiosInstance = adminApiClient.getRawInstance();

export default axiosInstance;