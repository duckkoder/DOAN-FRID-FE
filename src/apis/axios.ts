// src/apis/axios.ts
import axios, { AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { getCookie, setCookie, deleteCookie } from "../utils/cookies";
import { decryptString, encryptString } from "../utils/crypto";

const AUTH_COOKIE = "authState";
const baseURL = import.meta.env.VITE_API_BASE_URL as string;
const COOKIE_SECRET =
  (import.meta.env?.VITE_AUTH_COOKIE_SECRET as string) || "dev-local-secret-please-change";
const REQUEST_TIMEOUT_MS = 15_000;
const REFRESH_TIMEOUT_MS = 10_000;
const CLOCK_SKEW_MS = 30_000; // if token expires within 30s, proactively refresh

interface Tokens {
  accessToken?: string | null;
  refreshToken?: string | null;
}

interface PersistedAuthShape {
  user?: unknown;
  tokens?: Tokens;
}

// in-memory state to avoid repeated cookie decrypts
let volatileAccessToken: string | null = null;
let persistedAuthCache: PersistedAuthShape | null = null;
let inflightRefresh: Promise<{ access: string; refresh?: string | null }> | null = null;

function isHttpsOrProd(): boolean {
  return (
    (typeof window !== "undefined" && window.location.protocol === "https:") ||
    !!(import.meta.env && import.meta.env.PROD)
  );
}

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

async function readPersistedAuth(): Promise<PersistedAuthShape | null> {
  if (persistedAuthCache) return persistedAuthCache;
  const raw = getCookie(AUTH_COOKIE);
  if (!raw) return (persistedAuthCache = null);

  try {
    const dec = await decryptString(raw, COOKIE_SECRET);
    return (persistedAuthCache = JSON.parse(dec) as PersistedAuthShape);
  } catch {
    try {
      return (persistedAuthCache = JSON.parse(raw) as PersistedAuthShape);
    } catch {
      return (persistedAuthCache = null);
    }
  }
}

async function writePersistedAuth(next: PersistedAuthShape, days: number): Promise<void> {
  persistedAuthCache = next;
  const secureFlag = isHttpsOrProd();
  try {
    const enc = await encryptString(JSON.stringify(next), COOKIE_SECRET);
    setCookie(AUTH_COOKIE, enc, days, secureFlag, "Lax", "/");
  } catch {
    setCookie(AUTH_COOKIE, JSON.stringify(next), days, secureFlag, "Lax", "/");
  }
}

function getRememberDays(wasRemember: boolean): number {
  return wasRemember ? 15 : 0.5; // 15 days vs 12 hours
}

const api: AxiosInstance = axios.create({
  baseURL,
  timeout: REQUEST_TIMEOUT_MS,
});

async function doRefreshSingleFlight(): Promise<{ access: string; refresh?: string | null }> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    const parsed = await readPersistedAuth();
    const refreshToken = parsed?.tokens?.refreshToken;
    if (!refreshToken) throw new Error("No refresh token");

    const plain = axios.create({ baseURL, timeout: REFRESH_TIMEOUT_MS });
    const resp = await plain.post("/auth/refresh", { refresh_token: refreshToken });
    const data = resp?.data?.data ?? resp?.data;

    const newAccess: string | undefined = data?.access_token;
    const newRefresh: string | undefined = data?.refresh_token;
    if (!newAccess) throw new Error("Refresh did not return access token");

    // rememberMe: nếu trước đó accessToken === null → tiếp tục KHÔNG persist access
    const wasRemember = parsed?.tokens?.accessToken == null;
    const days = getRememberDays(wasRemember);

    const toPersist: PersistedAuthShape = wasRemember
      ? {
          user: parsed?.user ?? null,
          tokens: {
            accessToken: null,
            refreshToken: newRefresh ?? parsed?.tokens?.refreshToken ?? null,
          },
        }
      : {
          user: parsed?.user ?? null,
          tokens: {
            accessToken: newAccess ?? null,
            refreshToken: newRefresh ?? parsed?.tokens?.refreshToken ?? null,
          },
        };

    await writePersistedAuth(toPersist, days);

    // Luôn cập nhật access token vào memory để các request sau dùng mà ko cần lưu cái access-token
    volatileAccessToken = newAccess;

    return { access: newAccess, refresh: newRefresh ?? null };
  })();

  try {
    return await inflightRefresh;
  } finally {
    inflightRefresh = null;
  }
}

// request interceptor: attach volatile token or read persisted cookie
// Đảm bảo có access token hợp lệ trong memory; nếu sắp hết hạn → refresh trước
async function ensureFreshAccessToken(): Promise<string | null> {
  // 1/ Ưu tiên token trong memory
  let token = volatileAccessToken;
  let expMs = safeJwtExpMs(token);
  const now = Date.now();

  if (!token) {
    const parsed = await readPersistedAuth();
    token = parsed?.tokens?.accessToken ?? null;
    volatileAccessToken = token || null;
    expMs = safeJwtExpMs(token);
  }

  // 2/ Nếu không có token hoặc hết hạn (hoặc sắp hết hạn) → thử refresh 1 lần
  if (!token || (expMs !== null && expMs - CLOCK_SKEW_MS <= now)) {
    try {
      const { access } = await doRefreshSingleFlight();
      return access;
    } catch {
      return null;
    }
  }

  return token;
}

// Request interceptor dùng async, LIFO là đc rồi ko cần interceptor “no-op” đâu
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  config.headers = new AxiosHeaders(config.headers);
  if (!(config.data instanceof FormData)) {
    config.headers.set("Content-Type", "application/json");
  }
  try {
    const token = await ensureFreshAccessToken();
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
  } catch {
    // noop
  }
  return config;
});

// response interceptor: handle 401 by attempting single-flight refresh then retry
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error?.response?.status;

    if (!original) return Promise.reject(error);

    if (status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { access } = await doRefreshSingleFlight();
        original.headers = new AxiosHeaders(original.headers);
        (original.headers as AxiosHeaders).set("Authorization", `Bearer ${access}`);
        return api(original);
      } catch (e) {
        // Nếu request gốc là login thì KHÔNG redirect
        if (original.url?.includes("/auth")) {
          return Promise.reject(e);
        }

        try {
          deleteCookie(AUTH_COOKIE);
        } catch {
          /* ignore */
        }
        volatileAccessToken = null;

        const next = encodeURIComponent(
          (typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/") || "/",
        );

        if (typeof window !== "undefined") {
          window.location.href = `/auth?next=${next}`;
        }

        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// Helpers for external modules (e.g. AuthProvider) to keep in-memory cache in sync
export function setVolatileAccessToken(token: string | null) {
  volatileAccessToken = token;
}

export function clearInMemoryAuth() {
  volatileAccessToken = null;
  persistedAuthCache = null;
}
