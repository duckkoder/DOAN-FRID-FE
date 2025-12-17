// src/apis/axios.ts
import axios, { AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { getCookie, setCookie, deleteCookie } from "../utils/cookies";
import { decryptString, encryptString } from "../utils/crypto";

// ========================================
// CONSTANTS
// ========================================
const AUTH_COOKIE = "authState";
const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const COOKIE_SECRET = (import.meta.env?.VITE_AUTH_COOKIE_SECRET as string) || "dev-local-secret-please-change";
const REQUEST_TIMEOUT_MS = 15_000;
const REFRESH_TIMEOUT_MS = 10_000;
const CLOCK_SKEW_MS = 300 * 1000; // ✅ 300 seconds (refresh when 300s left)
const COOKIE_EXPIRY_DAYS = 7; // Match refresh token expiry

// ========================================
// TYPES
// ========================================
interface Tokens {
  accessToken?: string | null;
  refreshToken?: string | null;
}

interface PersistedAuthShape {
  user?: unknown;
  tokens?: Tokens;
}

interface RefreshResult {
  access: string;
  refresh?: string | null;
}

// ========================================
// IN-MEMORY STATE
// ========================================
let volatileAccessToken: string | null = null;
let persistedAuthCache: PersistedAuthShape | null = null;
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
// COOKIE PERSISTENCE
// ========================================

/**
 * Read and decrypt auth state from cookie
 */
async function readPersistedAuth(): Promise<PersistedAuthShape | null> {
  if (persistedAuthCache) return persistedAuthCache;
  
  const raw = getCookie(AUTH_COOKIE);
  if (!raw) return (persistedAuthCache = null);

  try {
    // Try encrypted format first
    const dec = await decryptString(raw, COOKIE_SECRET);
    return (persistedAuthCache = JSON.parse(dec) as PersistedAuthShape);
  } catch {
    try {
      // Fallback to plain JSON
      return (persistedAuthCache = JSON.parse(raw) as PersistedAuthShape);
    } catch {
      return (persistedAuthCache = null);
    }
  }
}

/**
 * Encrypt and write auth state to cookie
 */
async function writePersistedAuth(next: PersistedAuthShape, days: number): Promise<void> {
  persistedAuthCache = next;
  const secureFlag = isHttpsOrProd();
  
  try {
    const enc = await encryptString(JSON.stringify(next), COOKIE_SECRET);
    setCookie(AUTH_COOKIE, enc, days, secureFlag, "Lax", "/");
  } catch {
    // Fallback to plain JSON if encryption fails
    setCookie(AUTH_COOKIE, JSON.stringify(next), days, secureFlag, "Lax", "/");
  }
}

/**
 * Clear all auth state (memory + cookie)
 */
function clearAuthState(): void {
  try {
    deleteCookie(AUTH_COOKIE);
  } catch {
    /* ignore */
  }
  volatileAccessToken = null;
  persistedAuthCache = null;
}

// ========================================
// LOGOUT & REDIRECT
// ========================================

/**
 * Handle logout: clear auth state and redirect to login
 * @param reason - Reason for logout (for logging)
 */
function handleLogout(reason: string = "Session expired"): void {
  // Don't redirect if already on auth page
  if (isOnAuthPage()) {
    clearAuthState();
    return;
  }
  
  clearAuthState();
  
  // Redirect to login with return URL
  if (typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/auth?next=${next}`;
  }
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
    const parsed = await readPersistedAuth();
    const refreshToken = parsed?.tokens?.refreshToken;
    
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

      // Update persisted auth
      const toPersist: PersistedAuthShape = {
        user: parsed?.user ?? null,
        tokens: {
          accessToken: newAccess,
          refreshToken: newRefresh ?? refreshToken,
        },
      };

      await writePersistedAuth(toPersist, COOKIE_EXPIRY_DAYS);
      volatileAccessToken = newAccess;

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
 * - If no token: try to read from cookie
 * - If token expired or about to expire: refresh it
 * - Otherwise: return existing token
 */
async function ensureFreshAccessToken(): Promise<string | null> {
  let token = volatileAccessToken;
  
  // Load from cookie if not in memory
  if (!token) {
    const parsed = await readPersistedAuth();
    token = parsed?.tokens?.accessToken ?? null;
    if (token) {
      volatileAccessToken = token;
    }
  }
  
  // Check token expiration
  const expMs = safeJwtExpMs(token);
  const now = Date.now();
  // const timeLeft = expMs ? expMs - now : null;

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
      // Silent fail
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
 * Set access token in memory (for external use)
 */
export function setVolatileAccessToken(token: string | null): void {
  volatileAccessToken = token;
}

/**
 * Set both access and refresh tokens (called by AuthProvider after login)
 * This syncs the tokens to both memory and cookie
 */
export async function setAuthTokens(accessToken: string | null, refreshToken: string | null, user?: unknown): Promise<void> {
  volatileAccessToken = accessToken;
  
  // Persist to cookie (only refresh token needed, access token stays in memory)
  const toPersist: PersistedAuthShape = {
    user: user ?? persistedAuthCache?.user ?? null,
    tokens: {
      accessToken, // Store in cookie for page refresh
      refreshToken,
    },
  };
  
  await writePersistedAuth(toPersist, COOKIE_EXPIRY_DAYS);
}

/**
 * Clear all in-memory auth state (for external use)
 */
export function clearInMemoryAuth(): void {
  volatileAccessToken = null;
  persistedAuthCache = null;
  clearAuthState();
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