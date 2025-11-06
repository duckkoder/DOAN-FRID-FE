import api from "../axios";

// ==================== Types ====================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  role: "teacher" | "student";
  phone?: string;
  // Teacher-specific
  department?: string;
  // Student-specific
  student_code?: string;
  major?: string;
  academic_year?: number;
}

export interface UserResponse {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar_url?: string | null;
  phone?: string | null;
  is_verified: boolean;
  created_at: string;
  // Role-specific info
  teacher_id?: number | null;
  student_id?: number | null;
  department?: string | null;
  student_code?: string | null;
  major?: string | null;
  academic_year?: number | null;
}

export interface LoginResponse {
  message: string;
  user: UserResponse;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterResponse {
  message: string;
  user: UserResponse;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface LogoutResponse {
  message: string;
}

// ==================== API Functions ====================

/**
 * Login with email and password
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

/**
 * Register a new user (teacher or student)
 */
export const register = async (userData: RegisterRequest): Promise<RegisterResponse> => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

/**
 * Refresh access token using refresh token
 * Requires: Valid JWT access token in Authorization header
 */
export const refreshToken = async (refreshTokenData: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
  const response = await api.post("/auth/refresh", refreshTokenData);
  return response.data;
};

/**
 * Logout and revoke refresh token
 * Requires: Valid JWT access token in Authorization header
 */
export const logout = async (logoutData: LogoutRequest): Promise<LogoutResponse> => {
  const response = await api.post("/auth/logout", logoutData);
  return response.data;
};
