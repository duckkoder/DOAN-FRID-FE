import type { UploadFile } from "antd";

export interface TenantFormValues {
  name: string;
  school_code: string;
  storage_region?: string;
  logo_file?: UploadFile[];
}

export interface TenantEditFormValues {
  name: string;
  logo_file?: UploadFile[];
}

export interface TenantMigrationSummary {
  current_revision?: string | null;
  head_revision?: string | null;
  loading?: boolean;
  error?: boolean;
}
