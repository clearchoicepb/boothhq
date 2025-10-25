/**
 * Enhanced API Client with retry logic, error handling, and type safety
 * Built on top of the native fetch API
 */

export interface ApiClientConfig {
  baseUrl?: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

export interface RequestConfig extends RequestInit {
  timeout?: number
  retry?: boolean
  retryAttempts?: number
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Enhanced API Client with automatic retry, error handling, and interceptors
 */
export class ApiClient {
  private baseUrl: string
  private timeout: number
  private retryAttempts: number
  private retryDelay: number

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || ''
    this.timeout = config.timeout || 30000 // 30 seconds default
    this.retryAttempts = config.retryAttempts || 3
    this.retryDelay = config.retryDelay || 1000 // 1 second base delay
  }

  /**
   * Make an HTTP request with automatic retry on failure
   */
  private async fetchWithRetry(
    url: string,
    config: RequestConfig = {},
    attempt: number = 1
  ): Promise<Response> {
    const {
      timeout = this.timeout,
      retry = true,
      retryAttempts = this.retryAttempts,
      ...fetchConfig
    } = config

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // If response is ok, return it
      if (response.ok) {
        return response
      }

      // If it's a client error (4xx), don't retry
      if (response.status >= 400 && response.status < 500) {
        throw await this.handleErrorResponse(response)
      }

      // If it's a server error (5xx) and we have retries left, retry
      if (retry && attempt < retryAttempts) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
        console.warn(
          `Request failed (attempt ${attempt}/${retryAttempts}). Retrying in ${delay}ms...`,
          url
        )
        await sleep(delay)
        return this.fetchWithRetry(url, config, attempt + 1)
      }

      // No more retries, throw error
      throw await this.handleErrorResponse(response)
    } catch (error) {
      clearTimeout(timeoutId)

      // If it's already an ApiError, rethrow it
      if (error instanceof ApiError) {
        throw error
      }

      // Handle network errors with retry
      if (retry && attempt < retryAttempts) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1)
        console.warn(
          `Network error (attempt ${attempt}/${retryAttempts}). Retrying in ${delay}ms...`,
          error
        )
        await sleep(delay)
        return this.fetchWithRetry(url, config, attempt + 1)
      }

      // Network error, no more retries
      throw new ApiError(
        error instanceof Error ? error.message : 'Network request failed',
        0,
        'Network Error'
      )
    }
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<ApiError> {
    let errorData: any
    let errorMessage = response.statusText

    try {
      errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorData.details || errorMessage
    } catch {
      // Response body is not JSON
    }

    return new ApiError(
      errorMessage,
      response.status,
      response.statusText,
      errorData
    )
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config: RequestConfig = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`
    const response = await this.fetchWithRetry(fullUrl, {
      ...config,
      method: 'GET',
    })
    return response.json()
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`
    const response = await this.fetchWithRetry(fullUrl, {
      ...config,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
    return response.json()
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`
    const response = await this.fetchWithRetry(fullUrl, {
      ...config,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
    return response.json()
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`
    const response = await this.fetchWithRetry(fullUrl, {
      ...config,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
    return response.json()
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config: RequestConfig = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`
    const response = await this.fetchWithRetry(fullUrl, {
      ...config,
      method: 'DELETE',
    })

    // Handle empty responses for DELETE
    const text = await response.text()
    return text ? JSON.parse(text) : ({} as T)
  }
}

// Create a singleton instance
export const apiClient = new ApiClient()

// Export a factory function for creating configured instances
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config)
}
