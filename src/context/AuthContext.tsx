import { createContext } from "react";

export type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar_url?: string | null;
  phone?: string | null;  
  is_verified: boolean;
  created_at: string;
  // Teacher-specific fields
  teacher_id?: number | null;
  department?: string | null;
  // Student-specific fields
  student_code?: string | null;
  student_id?: number | null;
  major?: string | null;
  academic_year?: number | null;
};

export type AuthTokens = {
  accessToken?: string | null;
  refreshToken?: string | null;
};

export type AuthContextType = {
  user: User | null;
  tokens: AuthTokens;
  login: (user: User, tokens?: AuthTokens, rememberMe?: boolean) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
