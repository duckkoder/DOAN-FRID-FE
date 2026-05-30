import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const PLATFORM_TOKEN_KEY = "platformAccessToken";

const platformApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
});

platformApi.interceptors.request.use((config) => {
  const token = getPlatformToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface PlatformUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface PlatformLoginResponse {
  message: string;
  user: PlatformUser;
  access_token: string;
  token_type: string;
}

export interface Tenant {
  id: number;
  name: string;
  school_code: string;
  slug: string;
  status: "active" | "suspended" | string;
  db_name: string;
  db_host: string;
  db_port: number;
  db_user: string;
  storage_provider: string;
  storage_bucket?: string | null;
  storage_region?: string | null;
  storage_prefix: string;
  created_at: string;
  updated_at: string;
}

export interface PublicTenant {
  name: string;
  school_code: string;
  slug: string;
  status: string;
}

export interface TenantCreateRequest {
  name: string;
  school_code: string;
  storage_provider: string;
  storage_region?: string;
}

export interface TenantUpdateRequest {
  name: string;
}

export interface TenantAdminCreateRequest {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface TenantStorageUpdateRequest {
  storage_provider?: string;
  storage_bucket?: string;
  storage_region?: string;
  storage_prefix?: string;
}

export interface TenantMigrationResult {
  tenant_id: number;
  name: string;
  school_code: string;
  db_name: string;
  status: "success" | "failed" | string;
  message: string;
}

export interface TenantMigrationBatchResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: TenantMigrationResult[];
}

export function getPlatformToken(): string | null {
  return localStorage.getItem(PLATFORM_TOKEN_KEY);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isValidPlatformToken(): boolean {
  const token = getPlatformToken();
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  const isExpired = exp > 0 && exp * 1000 <= Date.now();

  return payload.scope === "platform" && payload.role === "super_admin" && !isExpired;
}

export function setPlatformToken(token: string): void {
  localStorage.setItem(PLATFORM_TOKEN_KEY, token);
}

export function clearPlatformToken(): void {
  localStorage.removeItem(PLATFORM_TOKEN_KEY);
}

export async function platformLogin(email: string, password: string): Promise<PlatformLoginResponse> {
  const response = await platformApi.post<PlatformLoginResponse>("/platform/auth/login", { email, password });
  return response.data;
}

export async function listTenants(): Promise<Tenant[]> {
  const response = await platformApi.get<Tenant[]>("/platform/tenants");
  return response.data;
}

export async function getPublicTenant(slug: string): Promise<PublicTenant> {
  const response = await platformApi.get<PublicTenant>(`/platform/public/tenants/${slug}`);
  return response.data;
}

export async function listPublicTenants(): Promise<PublicTenant[]> {
  const response = await platformApi.get<PublicTenant[]>("/platform/public/tenants");
  return response.data;
}

export async function createTenant(payload: TenantCreateRequest): Promise<Tenant> {
  const response = await platformApi.post<Tenant>("/platform/tenants", payload, { timeout: 300_000 });
  return response.data;
}

export async function updateTenant(tenantId: number, payload: TenantUpdateRequest): Promise<Tenant> {
  const response = await platformApi.patch<Tenant>(`/platform/tenants/${tenantId}`, payload);
  return response.data;
}

export async function suspendTenant(tenantId: number): Promise<Tenant> {
  const response = await platformApi.patch<Tenant>(`/platform/tenants/${tenantId}/suspend`);
  return response.data;
}

export async function activateTenant(tenantId: number): Promise<Tenant> {
  const response = await platformApi.patch<Tenant>(`/platform/tenants/${tenantId}/activate`);
  return response.data;
}

export async function updateTenantStorage(tenantId: number, payload: TenantStorageUpdateRequest): Promise<Tenant> {
  const response = await platformApi.patch<Tenant>(`/platform/tenants/${tenantId}/storage`, payload);
  return response.data;
}

export async function createTenantAdmin(tenantId: number, payload: TenantAdminCreateRequest): Promise<PlatformUser> {
  const response = await platformApi.post<PlatformUser>(`/platform/tenants/${tenantId}/admin`, payload);
  return response.data;
}

export async function migrateTenant(tenantId: number): Promise<TenantMigrationResult> {
  const response = await platformApi.post<TenantMigrationResult>(
    `/platform/tenants/${tenantId}/migrations`,
    undefined,
    { timeout: 120_000 },
  );
  return response.data;
}

export async function migrateAllTenants(): Promise<TenantMigrationBatchResponse> {
  const response = await platformApi.post<TenantMigrationBatchResponse>(
    "/platform/migrations/tenants",
    undefined,
    { timeout: 300_000 },
  );
  return response.data;
}
