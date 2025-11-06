// src/context/AuthProvider.tsx (hoặc nơi bạn đang quản lý auth state)
import React, { useEffect, useState } from "react";
import { getCookie, setCookie, deleteCookie } from "../utils/cookies";
import { encryptString, decryptString } from "../utils/crypto";
import { setVolatileAccessToken, clearInMemoryAuth } from "../apis/axios";
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
            // if persisted included accessToken, populate in-memory cache
            setVolatileAccessToken(parsed.tokens?.accessToken ?? null);
          } catch {
            // decryption or parse failed - ignore
          }
        }
      } catch {
        // ignore
      }
      // mark hydrated regardless so router can evaluate auth state
      setHydrated(true);
    })();
  }, []);

  const persist = async (next: PersistedAuth, days = 7) => {
    // choose secure flag: only set Secure on https or in production builds
    const secureFlag =
      (typeof window !== "undefined" && window.location.protocol === "https:") ||
      !!(import.meta.env && import.meta.env.PROD);
    // encrypt persisted state before storing in cookie
    try {
      const enc = await encryptString(JSON.stringify(next), COOKIE_SECRET);
      // lưu 'days' ngày, SameSite=Lax
      setCookie(AUTH_COOKIE, enc, days, secureFlag, "Lax");
    } catch {
      // fallback: store plain JSON (not ideal)
      setCookie(AUTH_COOKIE, JSON.stringify(next), days, secureFlag, "Lax");
    }
  };

  const login = (nextUser: User | string, nextTokens?: AuthTokensType, rememberMe = false) => {
    const actualUser = typeof nextUser === "string" ? null : nextUser;
    setUser(actualUser);
    setTokens(nextTokens ?? { accessToken: null, refreshToken: null });
    // sync in-memory token
    setVolatileAccessToken(nextTokens?.accessToken ?? null);
    // choose what to persist according to rememberMe
    // if rememberMe: persist refreshToken for 15 days, do not persist accessToken (keep in memory)
    // if not rememberMe: persist both tokens but with short expiry (12 hours)
    const toPersist: PersistedAuth = rememberMe
      ? {
          user: actualUser,
          tokens: { accessToken: null, refreshToken: nextTokens?.refreshToken ?? null },
        }
      : {
          user: actualUser,
          tokens: {
            accessToken: nextTokens?.accessToken ?? null,
            refreshToken: nextTokens?.refreshToken ?? null,
          },
        };
    const days = rememberMe ? 15 : 0.5; // 0.5 day = 12 hours
    // call async persist but don't await in UI
    void persist(toPersist, days).catch(() => {});
    // Note: access token lifetime in memory should be handled by API client / refresh logic (not implemented here)
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
    // Persist updated user to cookie
    const toPersist: PersistedAuth = {
      user: updatedUser,
      tokens: { accessToken: null, refreshToken: tokens?.refreshToken ?? null },
    };
    void persist(toPersist, 15).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, tokens, login, logout, updateUser }}>
      {hydrated ? children : null}
    </AuthContext.Provider>
  );
};
