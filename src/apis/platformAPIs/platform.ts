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
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicTenant {
  name: string;
  school_code: string;
  slug: string;
  status: string;
  logo_url?: string | null;
}

export interface TenantCreateRequest {
  name: string;
  school_code: string;
  storage_provider: string;
  storage_region?: string;
  logo_url?: string | null;
}

export interface TenantUpdateRequest {
  name: string;
  logo_url?: string | null;
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

export interface TenantMigrationRevisionInfo {
  revision: string;
  down_revision?: string | null;
  message: string;
  filename: string;
  created_at: string;
  content: string;
}

export interface TenantMigrationHistoryResponse {
  tenant_id: number;
  school_code: string;
  db_name: string;
  current_revision?: string | null;
  head_revision?: string | null;
  revisions: TenantMigrationRevisionInfo[];
}

export interface TenantDbTableInfo {
  table_name: string;
  table_type: string;
  column_count: number;
}

export interface TenantDbSchemaResponse {
  tenant_id: number;
  name: string;
  school_code: string;
  db_name: string;
  db_host: string;
  db_port: number;
  alembic_version?: string | null;
  has_tenant_settings: boolean;
  table_count: number;
  tables: TenantDbTableInfo[];
}

export interface TenantStorageCategoryUsage {
  category: string;
  label: string;
  object_count: number;
  total_bytes: number;
}

export interface TenantStorageUsage {
  tenant_id: number;
  name: string;
  school_code: string;
  storage_provider: string;
  bucket?: string | null;
  region?: string | null;
  prefixes: string[];
  object_count: number;
  total_bytes: number;
  total_mb: number;
  categories: TenantStorageCategoryUsage[];
  last_modified?: string | null;
  scanned_at: string;
  status: "ok" | "error" | string;
  message?: string | null;
}

export interface PlatformAuditLog {
  id: number;
  actor_id?: number | null;
  actor_email?: string | null;
  action: string;
  status: "success" | "failed" | "partial" | string;
  tenant_id?: number | null;
  tenant_school_code?: string | null;
  message?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface TenantSecuritySessionUser {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  active_sessions: number;
  last_session_at?: string | null;
}

export interface TenantSecuritySummary {
  tenant_id: number;
  name: string;
  school_code: string;
  status: string;
  db_connected: boolean;
  db_message?: string | null;
  current_revision?: string | null;
  storage_prefix_valid: boolean;
  storage_prefix: string;
  expected_storage_prefix: string;
  gemini_key_configured: boolean;
  active_sessions: number;
  active_admin_sessions: number;
  active_users: number;
  admin_users: TenantSecuritySessionUser[];
}

export interface TenantSessionRevokeResponse {
  tenant_id: number;
  school_code: string;
  revoked_sessions: number;
  message: string;
}

export interface PlatformEnvConfigItem {
  key: string;
  label: string;
  group: string;
  value: string | number | boolean | null;
  value_type: "string" | "int" | "float" | "bool" | string;
  description: string;
  secret: boolean;
  configured: boolean;
  restart_required: boolean;
}

export interface PlatformEnvConfigResponse {
  items: PlatformEnvConfigItem[];
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

export async function uploadTenantLogo(tenantId: number, file: File): Promise<Tenant> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await platformApi.post<Tenant>(
    `/platform/tenants/${tenantId}/logo`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
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

export async function getTenantMigrationHistory(tenantId: number): Promise<TenantMigrationHistoryResponse> {
  const response = await platformApi.get<TenantMigrationHistoryResponse>(
    `/platform/tenants/${tenantId}/migrations`,
    { timeout: 60_000 },
  );
  return response.data;
}

export async function downgradeTenantMigration(tenantId: number, revision: string): Promise<TenantMigrationResult> {
  const response = await platformApi.post<TenantMigrationResult>(
    `/platform/tenants/${tenantId}/migrations/downgrade`,
    { revision },
    { timeout: 120_000 },
  );
  return response.data;
}

export async function upgradeTenantMigration(tenantId: number, revision: string): Promise<TenantMigrationResult> {
  const response = await platformApi.post<TenantMigrationResult>(
    `/platform/tenants/${tenantId}/migrations/upgrade`,
    { revision },
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

export async function inspectTenantDbSchema(tenantId: number): Promise<TenantDbSchemaResponse> {
  const response = await platformApi.get<TenantDbSchemaResponse>(
    `/platform/tenants/${tenantId}/db-schema`,
    { timeout: 60_000 },
  );
  return response.data;
}

export async function listTenantStorageUsage(): Promise<TenantStorageUsage[]> {
  const response = await platformApi.get<TenantStorageUsage[]>("/platform/storage/usage", {
    timeout: 120_000,
  });
  return response.data;
}

export async function inspectTenantStorageUsage(tenantId: number): Promise<TenantStorageUsage> {
  const response = await platformApi.get<TenantStorageUsage>(
    `/platform/tenants/${tenantId}/storage/usage`,
    { timeout: 120_000 },
  );
  return response.data;
}

export async function listPlatformAuditLogs(limit = 100): Promise<PlatformAuditLog[]> {
  const response = await platformApi.get<PlatformAuditLog[]>("/platform/audit-logs", {
    params: { limit },
  });
  return response.data;
}

export async function getAiModelEnvConfig(): Promise<PlatformEnvConfigResponse> {
  const response = await platformApi.get<PlatformEnvConfigResponse>("/platform/env/ai-model");
  return response.data;
}

export async function updateAiModelEnvConfig(values: Record<string, string | number | boolean | null>): Promise<PlatformEnvConfigResponse> {
  const response = await platformApi.put<PlatformEnvConfigResponse>("/platform/env/ai-model", { values });
  return response.data;
}

export async function getSecurityEnvConfig(): Promise<PlatformEnvConfigResponse> {
  const response = await platformApi.get<PlatformEnvConfigResponse>("/platform/env/security");
  return response.data;
}

export async function updateSecurityEnvConfig(values: Record<string, string | number | boolean | null>): Promise<PlatformEnvConfigResponse> {
  const response = await platformApi.put<PlatformEnvConfigResponse>("/platform/env/security", { values });
  return response.data;
}

export async function listTenantSecuritySummaries(): Promise<TenantSecuritySummary[]> {
  const response = await platformApi.get<TenantSecuritySummary[]>("/platform/security/tenants", {
    timeout: 120_000,
  });
  return response.data;
}

export async function revokeTenantAdminSessions(tenantId: number, userId?: number): Promise<TenantSessionRevokeResponse> {
  const response = await platformApi.post<TenantSessionRevokeResponse>(
    `/platform/tenants/${tenantId}/sessions/revoke-admin`,
    undefined,
    { params: userId ? { user_id: userId } : undefined },
  );
  return response.data;
}

export async function logoutAllTenantUsers(tenantId: number): Promise<TenantSessionRevokeResponse> {
  const response = await platformApi.post<TenantSessionRevokeResponse>(
    `/platform/tenants/${tenantId}/sessions/logout-all`,
  );
  return response.data;
}
