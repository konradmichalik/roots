import { logger } from '../utils/logger';
import { isTauri } from '../utils/storage';

let platformFetch: typeof fetch | null = null;

export async function getPlatformFetch(): Promise<typeof fetch> {
  if (!platformFetch) {
    platformFetch = isTauri() ? (await import('@tauri-apps/plugin-http')).fetch : fetch;
  }
  return platformFetch;
}

export interface ApiClientConfig {
  baseUrl: string;
  proxyUrl?: string;
  timeout?: number;
}

export abstract class ApiClient {
  protected config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  protected get effectiveBaseUrl(): string {
    if (isTauri()) {
      return this.config.baseUrl;
    }
    return this.config.proxyUrl || this.config.baseUrl;
  }

  protected abstract getAuthHeaders(): Record<string, string>;

  protected get serviceName(): string {
    return 'API';
  }

  protected async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${this.effectiveBaseUrl}${endpoint}`;
    const timer = logger.time();
    const timeout = this.config.timeout ?? 30000;

    const headers: Record<string, string> = {
      ...this.getAuthHeaders(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extraHeaders
    };

    if (this.config.proxyUrl && !isTauri()) {
      headers['X-Service-Base-Url'] = this.config.baseUrl;
    }

    logger.apiRequest(method, `[${this.serviceName}] ${endpoint}`, body ? { body } : undefined);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchFn = await getPlatformFetch();
      const response = await fetchFn(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = timer();

      const responseText = await response.text();
      let data: unknown;

      try {
        data = JSON.parse(responseText);
      } catch {
        data = { rawResponse: responseText };
      }

      if (!response.ok) {
        const errorMessage = this.extractErrorMessage(data) || 'API request failed';
        logger.apiError(method, `[${this.serviceName}] ${endpoint}`, {
          status: response.status,
          data
        });
        throw new ApiError(errorMessage, response.status, data);
      }

      logger.apiResponse(method, `[${this.serviceName}] ${endpoint}`, response.status, duration);

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        logger.apiError(method, `[${this.serviceName}] ${endpoint}`, 'Request timed out');
        throw new ApiError(`Request timed out after ${timeout / 1000} seconds`, 0, error);
      }

      logger.apiError(method, `[${this.serviceName}] ${endpoint}`, error);
      throw new ApiError(error instanceof Error ? error.message : 'Network error', 0, error);
    }
  }

  protected extractErrorMessage(data: unknown): string | null {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (typeof obj.message === 'string') return obj.message;
      if (typeof obj.error === 'string') return obj.error;
      if (Array.isArray(obj.errorMessages)) return obj.errorMessages.join(', ');
    }
    return null;
  }

  abstract testConnection(): Promise<{ success: boolean; error?: string }>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  isRateLimitError(): boolean {
    return this.status === 429;
  }

  isNotFoundError(): boolean {
    return this.status === 404;
  }
}
