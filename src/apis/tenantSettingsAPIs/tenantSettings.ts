import api from "@/apis/axios";

export interface TenantSecret {
  key_name: string;
  configured: boolean;
  status: string;
  updated_at: string;
}

export interface TenantSecretListResponse {
  secrets: TenantSecret[];
}

export interface TenantSetting {
  key_name: string;
  value: string;
  updated_at?: string | null;
}

export interface TenantSettingListResponse {
  settings: TenantSetting[];
}

export async function listTenantSecrets(): Promise<TenantSecretListResponse> {
  const response = await api.get<TenantSecretListResponse>("/tenant/settings/secrets");
  return response.data;
}

export async function upsertTenantSecret(keyName: string, value: string): Promise<TenantSecret> {
  const response = await api.put<TenantSecret>(`/tenant/settings/secrets/${keyName}`, { value });
  return response.data;
}

export async function deleteTenantSecret(keyName: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/tenant/settings/secrets/${keyName}`);
  return response.data;
}

export async function listTenantSettings(): Promise<TenantSettingListResponse> {
  const response = await api.get<TenantSettingListResponse>("/tenant/settings/values");
  return response.data;
}

export async function upsertTenantSetting(keyName: string, value: string): Promise<TenantSetting> {
  const response = await api.put<TenantSetting>(`/tenant/settings/values/${keyName}`, { value });
  return response.data;
}
