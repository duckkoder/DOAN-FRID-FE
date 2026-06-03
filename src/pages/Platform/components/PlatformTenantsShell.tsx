import React from "react";
import { Button, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { FiClock, FiCpu, FiDatabase, FiGrid, FiLogOut, FiPlus, FiRefreshCw, FiServer, FiShield, FiUploadCloud } from "react-icons/fi";

import type {
  PlatformAuditLog,
  PlatformEnvConfigItem,
  Tenant,
  TenantSecuritySummary,
  TenantStorageUsage,
} from "@/apis/platformAPIs/platform";
import { clearPlatformToken } from "@/apis/platformAPIs/platform";
import AiModelConfigTab from "./AiModelConfigTab";
import AuditTab from "./AuditTab";
import SecurityTab from "./SecurityTab";
import StorageTab from "./StorageTab";
import TenantsTab from "./TenantsTab";
import type { TenantMigrationSummary } from "./platformPageTypes";

export type PlatformSection = "tenants" | "storage" | "audit" | "security" | "ai-model";

type PlatformTenantsShellProps = {
  activeSection: PlatformSection;
  pageTitle: string;
  onChangeSection: (section: PlatformSection) => void;
  onOpenCreateTenant: () => void;
  onMigrateAll: () => void;
  onRefreshTenants: () => void;
  onRefreshStorage: () => void;
  onRefreshAudit: () => void;
  onRefreshSecurity: () => void;
  onRefreshAiModel: () => void;
  migratingAll: boolean;
  allTenantsAtHead: boolean;
  tenantsLoading: boolean;
  storageLoading: boolean;
  auditLoading: boolean;
  securityLoading: boolean;
  aiModelLoading: boolean;
  tenants: Tenant[];
  tenantSummary: { total: number; active: number; suspended: number };
  migrationSummaryByTenant: Record<number, TenantMigrationSummary>;
  schemaLoadingTenantId: number | null;
  migratingTenantId: number | null;
  isTenantAtHead: (tenantId: number) => boolean;
  onEditTenant: (tenant: Tenant) => void;
  onInspectTenantDb: (tenant: Tenant) => void;
  onMigrateTenant: (tenant: Tenant) => void;
  onOpenMigrationManager: (tenant: Tenant) => void;
  onCreateAdmin: (tenant: Tenant) => void;
  onToggleTenant: (tenant: Tenant) => void;
  storageSummary: { totalBytes: number; totalObjects: number; errorCount: number };
  storageUsages: TenantStorageUsage[];
  storageSyncingTenantId: number | null;
  formatBytes: (bytes: number) => string;
  onAnalyzeStorageTenant: (usage: TenantStorageUsage) => void;
  onRefreshStorageTenant: (tenantId: number) => void;
  auditSummary: { total: number; success: number; failed: number };
  auditLogs: PlatformAuditLog[];
  onShowAuditDetails: (log: PlatformAuditLog) => void;
  securitySummary: {
    activeSessions: number;
    adminSessions: number;
    isolationIssues: number;
    geminiConfigured: number;
  };
  securitySummaries: TenantSecuritySummary[];
  sessionActionKey: string | null;
  onRevokeAdminSessions: (tenant: TenantSecuritySummary, userId?: number) => void;
  onLogoutAllTenantUsers: (tenant: TenantSecuritySummary) => void;
  aiModelConfig: PlatformEnvConfigItem[];
  aiModelForm: Parameters<typeof AiModelConfigTab>[0]["form"];
  aiModelSaving: boolean;
  onSaveAiModelConfig: Parameters<typeof AiModelConfigTab>[0]["onSave"];
};

const PlatformTenantsShell: React.FC<PlatformTenantsShellProps> = ({
  activeSection,
  pageTitle,
  onChangeSection,
  onOpenCreateTenant,
  onMigrateAll,
  onRefreshTenants,
  onRefreshStorage,
  onRefreshAudit,
  onRefreshSecurity,
  onRefreshAiModel,
  migratingAll,
  allTenantsAtHead,
  tenantsLoading,
  storageLoading,
  auditLoading,
  securityLoading,
  aiModelLoading,
  tenants,
  tenantSummary,
  migrationSummaryByTenant,
  schemaLoadingTenantId,
  migratingTenantId,
  isTenantAtHead,
  onEditTenant,
  onInspectTenantDb,
  onMigrateTenant,
  onOpenMigrationManager,
  onCreateAdmin,
  onToggleTenant,
  storageSummary,
  storageUsages,
  storageSyncingTenantId,
  formatBytes,
  onAnalyzeStorageTenant,
  onRefreshStorageTenant,
  auditSummary,
  auditLogs,
  onShowAuditDetails,
  securitySummary,
  securitySummaries,
  sessionActionKey,
  onRevokeAdminSessions,
  onLogoutAllTenantUsers,
  aiModelConfig,
  aiModelForm,
  aiModelSaving,
  onSaveAiModelConfig,
}) => {
  const navigate = useNavigate();

  return (
    <>
      <aside className="platform-rail">
        <div className="platform-rail-mark">
          <div className="platform-rail-logo"><FiServer /></div>
          <div>
            <p>Attendance</p>
            <span>Super Admin</span>
          </div>
        </div>

        <p className="platform-rail-section-title">Điều hướng</p>
        <nav className="platform-rail-nav">
          <button className={activeSection === "tenants" ? "active" : ""} type="button" onClick={() => onChangeSection("tenants")}><FiGrid /> Quản lý Tenant</button>
          <button className={activeSection === "storage" ? "active" : ""} type="button" onClick={() => onChangeSection("storage")}><FiDatabase /> Lưu trữ</button>
          <button className={activeSection === "audit" ? "active" : ""} type="button" onClick={() => onChangeSection("audit")}><FiClock /> Nhật ký</button>
          <button className={activeSection === "security" ? "active" : ""} type="button" onClick={() => onChangeSection("security")}><FiShield /> Bảo mật</button>
          <button className={activeSection === "ai-model" ? "active" : ""} type="button" onClick={() => onChangeSection("ai-model")}><FiCpu /> AI model</button>
        </nav>

        <button className="platform-rail-logout" type="button" onClick={() => { clearPlatformToken(); navigate("/platform/login"); }}>
          <FiLogOut /> Đăng xuất
        </button>
      </aside>

      <section className="platform-main">
        <header className="platform-topbar">
          <div>
            <p className="platform-page-kicker">Super admin workspace</p>
            <h1>{pageTitle}</h1>
          </div>
          <Space>
            {activeSection === "storage" ? (
              <Button icon={<FiRefreshCw />} loading={storageLoading} onClick={onRefreshStorage}>Làm mới dung lượng</Button>
            ) : activeSection === "audit" ? (
              <Button icon={<FiRefreshCw />} loading={auditLoading} onClick={onRefreshAudit}>Làm mới nhật ký</Button>
            ) : activeSection === "security" ? (
              <Button icon={<FiRefreshCw />} loading={securityLoading} onClick={onRefreshSecurity}>Làm mới bảo mật</Button>
            ) : activeSection === "ai-model" ? (
              <Button icon={<FiRefreshCw />} loading={aiModelLoading} onClick={onRefreshAiModel}>Làm mới cấu hình</Button>
            ) : (
              <>
                <Button icon={<FiRefreshCw />} onClick={onRefreshTenants}>Làm mới</Button>
                <Button
                  icon={<FiUploadCloud />}
                  loading={migratingAll}
                  disabled={allTenantsAtHead}
                  title={allTenantsAtHead ? "Tất cả tenant đã ở revision mới nhất" : "Chạy migration tất cả tenant"}
                  onClick={onMigrateAll}
                >
                  Chạy migration tất cả
                </Button>
                <Button type="primary" icon={<FiPlus />} onClick={onOpenCreateTenant}>Thêm tenant</Button>
              </>
            )}
          </Space>
        </header>

        <div className="platform-content">
          {activeSection === "storage" ? (
            <StorageTab
              storageSummary={storageSummary}
              storageUsages={storageUsages}
              tenantCount={tenants.length}
              loading={storageLoading}
              storageSyncingTenantId={storageSyncingTenantId}
              formatBytes={formatBytes}
              onAnalyzeTenant={onAnalyzeStorageTenant}
              onRefreshTenant={onRefreshStorageTenant}
            />
          ) : activeSection === "audit" ? (
            <AuditTab
              auditSummary={auditSummary}
              auditLogs={auditLogs}
              loading={auditLoading}
              onShowDetails={onShowAuditDetails}
            />
          ) : activeSection === "security" ? (
            <SecurityTab
              securitySummary={securitySummary}
              securitySummaries={securitySummaries}
              loading={securityLoading}
              sessionActionKey={sessionActionKey}
              onRevokeAdminSessions={onRevokeAdminSessions}
              onLogoutAllTenantUsers={onLogoutAllTenantUsers}
            />
          ) : activeSection === "ai-model" ? (
            <AiModelConfigTab
              aiModelConfig={aiModelConfig}
              form={aiModelForm}
              loading={aiModelLoading}
              saving={aiModelSaving}
              onReload={onRefreshAiModel}
              onSave={onSaveAiModelConfig}
            />
          ) : (
            <TenantsTab
              summary={tenantSummary}
              tenants={tenants}
              loading={tenantsLoading}
              migrationSummaryByTenant={migrationSummaryByTenant}
              schemaLoadingTenantId={schemaLoadingTenantId}
              migratingTenantId={migratingTenantId}
              isTenantAtHead={isTenantAtHead}
              onEditTenant={onEditTenant}
              onInspectTenantDb={onInspectTenantDb}
              onMigrateTenant={onMigrateTenant}
              onOpenMigrationManager={onOpenMigrationManager}
              onCreateAdmin={onCreateAdmin}
              onToggleTenant={onToggleTenant}
            />
          )}
        </div>
      </section>
    </>
  );
};

export default PlatformTenantsShell;
