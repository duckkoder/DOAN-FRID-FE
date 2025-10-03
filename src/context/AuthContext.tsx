import { createContext } from "react";

export type User = {
  id: string;
  username: string;
  name?: string;
  email?: string;
  role?: number;
  avatar?: string;
  is_verified?: boolean;
};

export type AuthTokens = {
  accessToken?: string | null;
  refreshToken?: string | null;
};

export type AuthContextType = {
  user: User | null;
  tokens: AuthTokens;
  // rememberMe: when true, persist refresh token longer
  login: (user: User , tokens?: AuthTokens, rememberMe?: boolean) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
