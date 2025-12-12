// src/context/AuthProvider.tsx
import React, { useEffect, useState } from "react";
import { getCookie, setCookie, deleteCookie } from "../utils/cookies";
import { encryptString, decryptString } from "../utils/crypto";
import { setAuthTokens, clearInMemoryAuth } from "../apis/axios";
import type { User, AuthTokens as AuthTokensType } from "./AuthContext";
import { AuthContext } from "./AuthContext";

type PersistedAuth = { user: User | null; tokens: AuthTokensType };

const AUTH_COOKIE = "authState";
// Use a build-time secret injected via Vite (VITE_AUTH_COOKIE_SECRET).
// IMPORTANT: keep this secret out of version control and make it long in production.
const COOKIE_SECRET =
  (import.meta.env?.VITE_AUTH_COOKIE_SECRET as string) || "dev-local-secret-please-change";

// use AuthContext from AuthContext.tsx (keeps fast-refresh stable)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokensType>({ accessToken: null, refreshToken: null });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate từ cookie
  useEffect(() => {
    (async () => {
      try {
        const raw = getCookie(AUTH_COOKIE);
        if (raw) {
          try {
            const decrypted = await decryptString(raw, COOKIE_SECRET);
            const parsed = JSON.parse(decrypted) as PersistedAuth;
            setUser(parsed.user ?? null);
            setTokens(parsed.tokens ?? { accessToken: null, refreshToken: null });
            // Sync tokens với axios memory
            setAuthTokens(
              parsed.tokens?.accessToken ?? null,
              parsed.tokens?.refreshToken ?? null
            );
          } catch {
            // decryption or parse failed - ignore
          }
        }
      } catch {
        // ignore
      }
      setHydrated(true);
    })();
  }, []);

  // Lắng nghe token refresh từ axios
  useEffect(() => {
    const handleTokenRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<{
        accessToken: string;
        refreshToken?: string | null;
      }>;
      const { accessToken, refreshToken } = customEvent.detail;
      
      // Update tokens state
      setTokens((prev) => ({
        accessToken,
        refreshToken: refreshToken ?? prev.refreshToken,
      }));
      
      // Persist to cookie (chỉ lưu refreshToken, không lưu accessToken)
      const toPersist: PersistedAuth = {
        user,
        tokens: {
          accessToken: null,
          refreshToken: refreshToken ?? tokens.refreshToken,
        },
      };
      void persist(toPersist, 7).catch(() => {}); // Match backend refresh token expiry
    };

    const handleLogout = (event: Event) => {
      const customEvent = event as CustomEvent<{ reason: string }>;
      
      // Clear state
      setUser(null);
      setTokens({ accessToken: null, refreshToken: null });
      deleteCookie(AUTH_COOKIE);
      clearInMemoryAuth();
      
      // Redirect to login if not on auth page
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/auth?next=${next}`;
      }
    };

    window.addEventListener('auth:token-refreshed', handleTokenRefresh);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:token-refreshed', handleTokenRefresh);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [user, tokens.refreshToken]);

  const persist = async (next: PersistedAuth, days = 7) => {
    const secureFlag =
      (typeof window !== "undefined" && window.location.protocol === "https:") ||
      !!(import.meta.env && import.meta.env.PROD);
    
    try {
      const enc = await encryptString(JSON.stringify(next), COOKIE_SECRET);
      setCookie(AUTH_COOKIE, enc, days, secureFlag, "Lax", "/");
    } catch {
      // fallback: store plain JSON (not ideal)
      setCookie(AUTH_COOKIE, JSON.stringify(next), days, secureFlag, "Lax", "/");
    }
  };

  const login = (nextUser: User | string, nextTokens?: AuthTokensType, rememberMe = false) => {
    const actualUser = typeof nextUser === "string" ? null : nextUser;
    setUser(actualUser);
    setTokens(nextTokens ?? { accessToken: null, refreshToken: null });
    
    // Sync tokens với axios memory
    setAuthTokens(
      nextTokens?.accessToken ?? null,
      nextTokens?.refreshToken ?? null
    );
    
    // Lưu vào cookie: CHỈ lưu user + refreshToken, KHÔNG lưu accessToken
    // accessToken chỉ ở memory trong axios
    const toPersist: PersistedAuth = {
      user: actualUser,
      tokens: {
        accessToken: null, // ✅ Không persist access token
        refreshToken: nextTokens?.refreshToken ?? null,
      },
    };
    
    // Match backend: refresh token = 7 days
    const days = rememberMe ? 7 : 3; // rememberMe: 7 days, else: 3 days
    void persist(toPersist, days).catch(() => {});
  };

  const logout = () => {
    setUser(null);
    setTokens({ accessToken: null, refreshToken: null });
    deleteCookie(AUTH_COOKIE);
    clearInMemoryAuth();
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    
    // Persist updated user to cookie (không lưu accessToken)
    const toPersist: PersistedAuth = {
      user: updatedUser,
      tokens: {
        accessToken: null,
        refreshToken: tokens?.refreshToken ?? null,
      },
    };
    void persist(toPersist, 7).catch(() => {}); // Match backend refresh token expiry
  };

  return (
    <AuthContext.Provider value={{ user, tokens, login, logout, updateUser }}>
      {hydrated ? children : null}
    </AuthContext.Provider>
  );
};
