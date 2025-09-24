/**
 * Configuration for API endpoints and external services
 * Used by the static frontend to connect to backend services
 */

// API Base URL - can be overridden via environment variable
export const API_BASE_URL = 
  typeof window !== 'undefined' 
    ? (window as any).__GEOMETA_API_URL__ || process.env.NEXT_PUBLIC_API_URL || '/api'
    : process.env.NEXT_PUBLIC_API_URL || '/api';

// Image proxy configuration
export const IMAGE_PROXY_URL = `${API_BASE_URL}/img`;

/**
 * API client for making requests to backend services
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.message || `Request failed: ${response.statusText}`,
      response.status,
      error
    );
  }

  return response.json();
}

/**
 * API service methods
 */
export const api = {
  // Gallery API
  gallery: {
    list: (params?: URLSearchParams) => 
      apiRequest(`/gallery${params ? `?${params}` : ''}`),
    delete: (id: number) => 
      apiRequest(`/gallery?id=${id}`, { method: 'DELETE' }),
  },
  
  // Memorizer API
  memorizer: {
    getNext: () => apiRequest('/memorizer'),
    updateProgress: (data: { id: number; quality: number }) =>
      apiRequest('/memorizer', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  
  // Stats API
  stats: {
    get: () => apiRequest('/stats'),
  },
  
  // Meta API
  meta: {
    getById: (id: string) => apiRequest(`/meta/${id}`),
  },
  
  // Collection API (for userscripts)
  collect: (data: any) =>
    apiRequest('/collect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export default api;