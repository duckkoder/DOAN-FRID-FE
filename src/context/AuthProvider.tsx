// src/context/AuthProvider.tsx
import React, { useEffect, useState } from "react";
import { setAuthTokens, clearInMemoryAuth, getAccessToken } from "../apis/axios";
import { getCookie } from "../utils/cookies";
import { decryptString } from "../utils/crypto";
import type { User, AuthTokens as AuthTokensType } from "./AuthContext";
import { AuthContext } from "./AuthContext";
import { logout as revokeRefreshToken } from "../apis/authAPIs/auth";

const AUTH_COOKIE = "authState";
const COOKIE_SECRET = (import.meta.env?.VITE_AUTH_COOKIE_SECRET as string) || "dev-local-secret-please-change";

interface PersistedAuth { 
  user?: User | null; 
  tokens?: AuthTokensType;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokensType>({ accessToken: null, refreshToken: null });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate từ cookie (axios đã xử lý)
  useEffect(() => {
    (async () => {
      try {
        const raw = getCookie(AUTH_COOKIE);
        if (raw) {
          try {
            const decrypted = await decryptString(raw, COOKIE_SECRET);
            const parsed = JSON.parse(decrypted) as PersistedAuth;
            
            const nextUser = parsed.user ?? null;
            const nextTokens = parsed.tokens ?? { accessToken: null, refreshToken: null };

            setUser(nextUser);
            setTokens(nextTokens);
            await setAuthTokens(nextTokens.accessToken ?? null, nextTokens.refreshToken ?? null, nextUser);
          } catch {
            // Try plain JSON fallback
            try {
              const parsed = JSON.parse(raw) as PersistedAuth;
              const nextUser = parsed.user ?? null;
              const nextTokens = parsed.tokens ?? { accessToken: null, refreshToken: null };

              setUser(nextUser);
              setTokens(nextTokens);
              await setAuthTokens(nextTokens.accessToken ?? null, nextTokens.refreshToken ?? null, nextUser);
            } catch {
              // Failed to parse
            }
          }
        }
      } catch {
        // Failed to load
      }
      setHydrated(true);
    })();
  }, []);

  const login = async (nextUser: User | string, nextTokens?: AuthTokensType, rememberMe = false) => {
    const actualUser = typeof nextUser === "string" ? null : nextUser;
    
    setUser(actualUser);
    setTokens(nextTokens ?? { accessToken: null, refreshToken: null });
    
    // Sync tokens với axios (axios sẽ tự lưu vào cookie)
    await setAuthTokens(
      nextTokens?.accessToken ?? null,
      nextTokens?.refreshToken ?? null,
      actualUser
    );
  };

  const logout = async () => {
    const refreshToken = tokens?.refreshToken;
    try {
      if (refreshToken) {
        await revokeRefreshToken({ refresh_token: refreshToken });
      }
    } catch (error) {
      console.error("Logout revoke failed:", error);
    } finally {
      setUser(null);
      setTokens({ accessToken: null, refreshToken: null });
      clearInMemoryAuth();
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    
    // Update user in axios cookie
    await setAuthTokens(
      getAccessToken(),
      tokens?.refreshToken ?? null,
      updatedUser
    );
  };

  return (
    <AuthContext.Provider value={{ user, tokens, login, logout, updateUser }}>
      {hydrated ? children : null}
    </AuthContext.Provider>
  );
};
