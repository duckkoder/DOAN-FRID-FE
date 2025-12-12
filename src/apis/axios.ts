// src/apis/axios.ts
import axios, { AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

// ========================================
// CONSTANTS
// ========================================
const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const REQUEST_TIMEOUT_MS = 15_000;
const REFRESH_TIMEOUT_MS = 10_000;
const CLOCK_SKEW_MS = 600 * 1000; // 600 seconds = 10 minutes (refresh when 10min left, backend token = 120min)

// ========================================
// TYPES
// ========================================
interface RefreshResult {
  access: string;
  refresh?: string | null;
}

// ========================================
// IN-MEMORY STATE
// ========================================
let volatileAccessToken: string | null = null;
let refreshTokenCache: string | null = null;
let inflightRefresh: Promise<RefreshResult> | null = null;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Check if running in HTTPS or production environment
 */
function isHttpsOrProd(): boolean {
  return (
    (typeof window !== "undefined" && window.location.protocol === "https:") ||
    !!(import.meta.env && import.meta.env.PROD)
  );
}

/**
 * Safely extract JWT expiration time in milliseconds
 * @param token - JWT token string
 * @returns Expiration time in ms, or null if invalid
 */
function safeJwtExpMs(token?: string | null): number | null {
  if (!token) return null;
  
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    
    const json = JSON.parse(atob(payloadB64));
    const expSec = typeof json?.exp === "number" ? json.exp : null;
    
    return expSec ? expSec * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Check if URL is an auth endpoint
 */
function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/forgot-password") ||
    url.includes("/auth/reset-password")
  );
}

/**
 * Check if current page is auth page
 */
function isOnAuthPage(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/auth");
}

/**
 * Format time remaining for logging
 */
function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// ========================================
// EVENT SYSTEM FOR AUTH SYNC
// ========================================

/**
 * Emit token refresh event để AuthProvider có thể sync
 */
function emitTokenRefresh(accessToken: string, refreshToken?: string | null): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('auth:token-refreshed', {
        detail: { accessToken, refreshToken },
      })
    );
  }
}

/**
 * Emit logout event để AuthProvider có thể sync
 */
function emitLogout(reason: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('auth:logout', {
        detail: { reason },
      })
    );
  }
}

// ========================================
// LOGOUT & REDIRECT
// ========================================

/**
 * Handle logout: clear memory and emit event for AuthProvider
 * @param reason - Reason for logout (for logging)
 */
function handleLogout(reason: string = "Session expired"): void {
  volatileAccessToken = null;
  refreshTokenCache = null;
  
  // Emit event để AuthProvider xử lý logout và redirect
  emitLogout(reason);
}

// ========================================
// TOKEN REFRESH
// ========================================

/**
 * Refresh access token using refresh token (single-flight pattern)
 * Only one refresh request at a time, others wait for result
 */
async function doRefreshSingleFlight(): Promise<RefreshResult> {
  // If already refreshing, return existing promise
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    const refreshToken = refreshTokenCache;
    
    if (!refreshToken) {
      handleLogout("No refresh token found");
      throw new Error("No refresh token");
    }

    // Create plain axios instance (no interceptors)
    const plain = axios.create({ 
      baseURL: BASE_URL, 
      timeout: REFRESH_TIMEOUT_MS 
    });
    
    try {
      const response = await plain.post("/auth/refresh", { 
        refresh_token: refreshToken 
      });
      
      const data = response?.data?.data ?? response?.data;
      
      const newAccess: string | undefined = data?.access_token;
      const newRefresh: string | undefined = data?.refresh_token;
      
      if (!newAccess) {
        throw new Error("Refresh did not return access token");
      }

      // Update memory
      volatileAccessToken = newAccess;
      if (newRefresh) {
        refreshTokenCache = newRefresh;
      }

      // Emit event để AuthProvider update state
      emitTokenRefresh(newAccess, newRefresh ?? null);

      return { access: newAccess, refresh: newRefresh ?? null };
      
    } catch (error: any) {
      const status = error?.response?.status;
      
      // If refresh token expired/invalid, logout
      if (status === 401 || status === 403) {
        handleLogout("Refresh token expired or invalid");
      }
      
      throw error;
    }
  })();

  try {
    return await inflightRefresh;
  } finally {
    inflightRefresh = null;
  }
}

/**
 * Ensure we have a fresh access token
 * - If token expired or about to expire: refresh it
 * - Otherwise: return existing token
 */
async function ensureFreshAccessToken(): Promise<string | null> {
  const token = volatileAccessToken;
  
  // Check token expiration
  const expMs = safeJwtExpMs(token);
  const now = Date.now();

  // Refresh if token is missing or about to expire
  if (!token || (expMs !== null && expMs - CLOCK_SKEW_MS <= now)) {
    try {
      const { access } = await doRefreshSingleFlight();
      return access;
    } catch (err) {
      return null;
    }
  }

  return token;
}

// ========================================
// AXIOS INSTANCE
// ========================================

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

// ========================================
// REQUEST INTERCEPTOR
// ========================================

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Set headers
    config.headers = new AxiosHeaders(config.headers);
    if (!(config.data instanceof FormData)) {
      config.headers.set("Content-Type", "application/json");
    }
    
    // Skip token check for auth endpoints
    if (isAuthEndpoint(config.url)) {
      return config;
    }
    
    // Add access token to header
    try {
      const token = await ensureFreshAccessToken();
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }
    } catch (err) {
      // Token refresh failed, will be handled by response interceptor
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ========================================
// RESPONSE INTERCEPTOR
// ========================================

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error?.response?.status;

    if (!original) return Promise.reject(error);

    // Don't retry auth endpoints
    if (isAuthEndpoint(original.url)) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (status === 401 && !original._retry) {
      original._retry = true;
      
      try {
        const { access } = await doRefreshSingleFlight();
        
        // Retry original request with new token
        original.headers = new AxiosHeaders(original.headers);
        (original.headers as AxiosHeaders).set("Authorization", `Bearer ${access}`);
        
        return api(original);
        
      } catch (refreshError) {
        handleLogout("Refresh failed after 401");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ========================================
// EXPORTS
// ========================================

export default api;

/**
 * Set tokens in memory (called by AuthProvider after login)
 */
export function setAuthTokens(accessToken: string | null, refreshToken: string | null): void {
  volatileAccessToken = accessToken;
  refreshTokenCache = refreshToken;
}

/**
 * Clear all in-memory auth state (called by AuthProvider on logout)
 */
export function clearInMemoryAuth(): void {
  volatileAccessToken = null;
  refreshTokenCache = null;
}

/**
 * Manually trigger logout (for external use)
 */
export function logout(reason?: string): void {
  handleLogout(reason);
}

/**
 * Get current access token (for external use)
 */
export function getAccessToken(): string | null {
  return volatileAccessToken;
}

/**
 * Check if user is authenticated (has valid token)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await ensureFreshAccessToken();
  return !!token;
}
