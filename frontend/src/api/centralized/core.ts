/**
 * Centralized API client core functionality
 * Now uses shared UnifiedApiClient to eliminate code duplication
 */

import { UnifiedApiClient, ApiError } from '@shared';
import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { message } from 'antd';

interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  withAuth?: boolean;
  authTokenKey?: string;
  onAuthFailure?: () => void;
}

/**
 * Wrapper around UnifiedApiClient that maintains backward compatibility
 * with existing code while using the shared library underneath
 */
export class CentralizedApiClient {
  private client: UnifiedApiClient;
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '/api/v1',
      timeout: config.timeout || 10000,
      withAuth: config.withAuth || false,
      authTokenKey: config.authTokenKey || 'admin_token',
      onAuthFailure: config.onAuthFailure || (() => { }),
    };

    // Get initial auth token if withAuth is enabled
    const initialToken = this.config.withAuth
      ? localStorage.getItem(this.config.authTokenKey) || undefined
      : undefined;

    // Create UnifiedApiClient instance with error handling
    this.client = new UnifiedApiClient({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      authToken: initialToken,
      clientType: this.config.withAuth ? 'admin' : 'frontend',
      onError: (error: ApiError) => {
        // Handle 401 errors specially
        if (error.status === 401) {
          if (this.config.withAuth) {
            localStorage.removeItem(this.config.authTokenKey);
            this.config.onAuthFailure();
          }
          // Don't show message for 401 as it triggers redirects
          return;
        }

        // Show error message for other errors
        message.error(error.message);
      },
      onUnauthorized: () => {
        if (this.config.withAuth) {
          localStorage.removeItem(this.config.authTokenKey);
          this.config.onAuthFailure();
        }
      },
    });
  }

  // HTTP Methods - delegate to UnifiedApiClient
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get<T>(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post<T>(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put<T>(url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    // UnifiedApiClient doesn't have patch, use put
    return this.client.put<T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete<T>(url, config);
  }

  // Form data upload - just use post with FormData
  async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post<T>(url, formData, config);
  }

  // Update auth token
  updateAuthToken(token: string | null) {
    if (token) {
      localStorage.setItem(this.config.authTokenKey, token);
      this.client.setAuthToken(token);
    } else {
      localStorage.removeItem(this.config.authTokenKey);
      this.client.setAuthToken(null);
    }
  }

  // Get raw axios instance for advanced usage
  getRawInstance(): AxiosInstance {
    return this.client.getInstance();
  }
}