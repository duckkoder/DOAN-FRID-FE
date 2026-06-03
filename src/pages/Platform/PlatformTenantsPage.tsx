import React, { useEffect, useMemo, useState } from "react";
import {
  App, Form,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  activateTenant, clearPlatformToken, createTenant, createTenantAdmin,
  downgradeTenantMigration, getTenantMigrationHistory,
  getAiModelEnvConfig,
  inspectTenantDbSchema, inspectTenantStorageUsage, listPlatformAuditLogs, listTenants, listTenantStorageUsage,
  listTenantSecuritySummaries, logoutAllTenantUsers, migrateAllTenants, migrateTenant,
  revokeTenantAdminSessions, suspendTenant, updateTenant,
  updateAiModelEnvConfig,
  uploadTenantLogo,
  upgradeTenantMigration,
  type PlatformEnvConfigItem,
  type PlatformAuditLog,
  type Tenant, type TenantAdminCreateRequest, type TenantCreateRequest,
  type TenantDbSchemaResponse,
  type TenantMigrationHistoryResponse,
  type TenantMigrationBatchResponse,
  type TenantSecuritySummary,
  type TenantStorageUsage,
} from "@/apis/platformAPIs/platform";
import { toTenantSlug } from "./platformUtils";
import {
  CreateTenantAdminModal,
  CreateTenantDrawer,
  DowngradeMigrationModal,
  EditTenantModal,
  MigrationManagerModal,
  RevisionContentModal,
  StorageAnalysisModal,
  TenantDbSchemaModal,
  UpgradeMigrationModal,
} from "./components/PlatformTenantDialogs";
import PlatformTenantsShell, { type PlatformSection } from "./components/PlatformTenantsShell";
import type { TenantEditFormValues, TenantFormValues, TenantMigrationSummary } from "./components/platformPageTypes";
import "./Platform.css";


const getErrorDetail = (err: unknown, fallback: string) => {
  const responseDetail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof responseDetail === "string") return responseDetail;
  if (Array.isArray(responseDetail)) return responseDetail.map(item => item?.msg || JSON.stringify(item)).join("\n");
  if (responseDetail) return JSON.stringify(responseDetail);
  const messageText = (err as { message?: string })?.message;
  return messageText || fallback;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

const getLogoFile = (fileList?: TenantFormValues["logo_file"] | TenantEditFormValues["logo_file"]) =>
  fileList?.[0]?.originFileObj as File | undefined;

const PLATFORM_SECTION_KEY = "platformActiveSection";
const platformSections: PlatformSection[] = ["tenants", "storage", "audit", "security", "ai-model"];

const getInitialPlatformSection = (): PlatformSection => {
  if (typeof window === "undefined") return "tenants";
  const fromUrl = new URLSearchParams(window.location.search).get("tab") as PlatformSection | null;
  if (fromUrl && platformSections.includes(fromUrl)) return fromUrl;
  const stored = window.localStorage.getItem(PLATFORM_SECTION_KEY) as PlatformSection | null;
  return stored && platformSections.includes(stored) ? stored : "tenants";
};

const PlatformTenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [activeSection, setActiveSection] = useState<PlatformSection>(getInitialPlatformSection);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [storageUsages, setStorageUsages] = useState<TenantStorageUsage[]>([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageSyncingTenantId, setStorageSyncingTenantId] = useState<number | null>(null);
  const [storageAnalysisTenant, setStorageAnalysisTenant] = useState<TenantStorageUsage | null>(null);
  const [securitySummaries, setSecuritySummaries] = useState<TenantSecuritySummary[]>([]);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [sessionActionKey, setSessionActionKey] = useState<string | null>(null);
  const [aiModelConfig, setAiModelConfig] = useState<PlatformEnvConfigItem[]>([]);
  const [aiModelLoading, setAiModelLoading] = useState(false);
  const [aiModelSaving, setAiModelSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [migratingAll, setMigratingAll] = useState(false);
  const [migratingTenantId, setMigratingTenantId] = useState<number | null>(null);
  const [adminTenant, setAdminTenant] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [schemaTenant, setSchemaTenant] = useState<TenantDbSchemaResponse | null>(null);
  const [schemaSearchText, setSchemaSearchText] = useState("");
  const [schemaLoadingTenantId, setSchemaLoadingTenantId] = useState<number | null>(null);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [migrationTenant, setMigrationTenant] = useState<Tenant | null>(null);
  const [migrationHistory, setMigrationHistory] = useState<TenantMigrationHistoryResponse | null>(null);
  const [migrationHistoryLoading, setMigrationHistoryLoading] = useState(false);
  const [migrationSummaryByTenant, setMigrationSummaryByTenant] = useState<Record<number, TenantMigrationSummary>>({});
  const [selectedRevisionContent, setSelectedRevisionContent] = useState<string | null>(null);
  const [selectedRevisionTitle, setSelectedRevisionTitle] = useState<string>("");
  const [downgradeTargetRevision, setDowngradeTargetRevision] = useState<string | null>(null);
  const [upgradeTargetRevision, setUpgradeTargetRevision] = useState<string | null>(null);
  const [downgradingRevision, setDowngradingRevision] = useState<string | null>(null);
  const [upgradingRevision, setUpgradingRevision] = useState<string | null>(null);
  const [updatingTenant, setUpdatingTenant] = useState(false);
  const [tenantForm] = Form.useForm<TenantFormValues>();
  const watchedSchoolCode = Form.useWatch("school_code", tenantForm);
  const [adminForm] = Form.useForm<TenantAdminCreateRequest>();
  const [editForm] = Form.useForm<TenantEditFormValues>();
  const [aiModelForm] = Form.useForm<Record<string, string | number | boolean | null>>();

  const changeSection = (section: PlatformSection) => {
    setActiveSection(section);
    window.localStorage.setItem(PLATFORM_SECTION_KEY, section);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", section);
    navigate({ pathname: window.location.pathname, search: params.toString() }, { replace: true });
  };

  const summary = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter(t => t.status === "active").length,
    suspended: tenants.filter(t => t.status === "suspended").length,
  }), [tenants]);

  const storageSummary = useMemo(() => ({
    totalBytes: storageUsages.reduce((sum, item) => sum + item.total_bytes, 0),
    totalObjects: storageUsages.reduce((sum, item) => sum + item.object_count, 0),
    errorCount: storageUsages.filter(item => item.status !== "ok").length,
  }), [storageUsages]);

  const auditSummary = useMemo(() => ({
    total: auditLogs.length,
    success: auditLogs.filter(log => log.status === "success").length,
    failed: auditLogs.filter(log => log.status === "failed").length,
  }), [auditLogs]);

  const securitySummary = useMemo(() => ({
    activeSessions: securitySummaries.reduce((sum, item) => sum + item.active_sessions, 0),
    adminSessions: securitySummaries.reduce((sum, item) => sum + item.active_admin_sessions, 0),
    isolationIssues: securitySummaries.filter(item => !item.db_connected).length,
    geminiConfigured: securitySummaries.filter(item => item.gemini_key_configured).length,
  }), [securitySummaries]);

  const filteredSchemaTables = useMemo(() => {
    if (!schemaTenant) return [];
    const keyword = schemaSearchText.trim().toLowerCase();
    if (!keyword) return schemaTenant.tables;
    return schemaTenant.tables.filter(table =>
      table.table_name.toLowerCase().includes(keyword),
    );
  }, [schemaTenant, schemaSearchText]);

  const isTenantAtHead = (tenantId: number) => {
    const summary = migrationSummaryByTenant[tenantId];
    return Boolean(summary?.current_revision && summary?.head_revision && summary.current_revision === summary.head_revision);
  };

  const allTenantsAtHead = useMemo(() => (
    tenants.length > 0 && tenants.every(tenant => isTenantAtHead(tenant.id))
  ), [tenants, migrationSummaryByTenant]);

  const fetchMigrationSummaries = async (items: Tenant[]) => {
    setMigrationSummaryByTenant(prev => {
      const next = { ...prev };
      items.forEach(tenant => {
        next[tenant.id] = { ...next[tenant.id], loading: true, error: false };
      });
      return next;
    });

    const results = await Promise.all(items.map(async tenant => {
      try {
        return {
          tenantId: tenant.id,
          history: await getTenantMigrationHistory(tenant.id),
          error: false,
        };
      } catch {
        return {
          tenantId: tenant.id,
          history: null,
          error: true,
        };
      }
    }));

    setMigrationSummaryByTenant(prev => {
      const next = { ...prev };
      results.forEach(result => {
        if (!result.error && result.history) {
          next[result.tenantId] = {
            current_revision: result.history.current_revision,
            head_revision: result.history.head_revision,
            loading: false,
            error: false,
          };
        } else {
          next[result.tenantId] = { loading: false, error: true };
        }
      });
      return next;
    });
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await listTenants();
      setTenants(data);
      void fetchMigrationSummaries(data);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) { clearPlatformToken(); navigate("/platform/login"); return; }
      message.error("Không thể tải danh sách tenant");
    } finally { setLoading(false); }
  };

  useEffect(() => { void fetchTenants(); }, []);

  const fetchStorageUsage = async () => {
    try {
      setStorageLoading(true);
      setStorageUsages(await listTenantStorageUsage());
    } catch (err) {
      message.error(getErrorDetail(err, "Không thể tải thống kê lưu trữ"));
    } finally {
      setStorageLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "storage" && storageUsages.length === 0) {
      void fetchStorageUsage();
    }
    if (activeSection === "audit" && auditLogs.length === 0) {
      void fetchAuditLogs();
    }
    if (activeSection === "security" && securitySummaries.length === 0) {
      void fetchSecuritySummaries();
    }
    if (activeSection === "ai-model" && aiModelConfig.length === 0) {
      void fetchAiModelConfig();
    }
  }, [activeSection]);

  const fetchSecuritySummaries = async () => {
    try {
      setSecurityLoading(true);
      setSecuritySummaries(await listTenantSecuritySummaries());
    } catch (err) {
      message.error(getErrorDetail(err, "Không thể tải dữ liệu bảo mật"));
    } finally {
      setSecurityLoading(false);
    }
  };

  const fetchAiModelConfig = async () => {
    try {
      setAiModelLoading(true);
      const data = await getAiModelEnvConfig();
      setAiModelConfig(data.items);
      const formValues = data.items.reduce<Record<string, string | number | boolean | null>>((acc, item) => {
        if (!item.secret) acc[item.key] = item.value;
        return acc;
      }, {});
      aiModelForm.setFieldsValue(formValues);
    } catch (err) {
      message.error(getErrorDetail(err, "Không thể tải cấu hình AI model"));
    } finally {
      setAiModelLoading(false);
    }
  };

  const handleSaveAiModelConfig = async (values: Record<string, string | number | boolean | null>) => {
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== ""),
    );

    try {
      setAiModelSaving(true);
      const data = await updateAiModelEnvConfig(payload);
      setAiModelConfig(data.items);
      aiModelForm.setFieldsValue(
        data.items.reduce<Record<string, string | number | boolean | null>>((acc, item) => {
          if (!item.secret) acc[item.key] = item.value;
          return acc;
        }, {}),
      );
      message.success("Đã lưu cấu hình AI model vào .env");
    } catch (err) {
      message.error(getErrorDetail(err, "Không thể lưu cấu hình AI model"));
    } finally {
      setAiModelSaving(false);
    }
  };

  const handleRevokeAdminSessions = (tenant: TenantSecuritySummary, userId?: number) => {
    const label = userId ? "admin này" : `toàn bộ admin của ${tenant.school_code}`;
    modal.confirm({
      title: "Revoke session admin tenant?",
      content: `Hệ thống sẽ thu hồi refresh token của ${label}. Access token hiện có sẽ tự hết hạn theo thời gian cấu hình.`,
      okText: "Revoke",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        const key = userId ? `${tenant.tenant_id}:admin:${userId}` : `${tenant.tenant_id}:admin`;
        try {
          setSessionActionKey(key);
          const result = await revokeTenantAdminSessions(tenant.tenant_id, userId);
          message.success(`Đã revoke ${result.revoked_sessions} session`);
          await fetchSecuritySummaries();
        } catch (err) {
          message.error(getErrorDetail(err, "Không thể revoke session admin"));
        } finally {
          setSessionActionKey(null);
        }
      },
    });
  };

  const handleLogoutAllTenantUsers = (tenant: TenantSecuritySummary) => {
    modal.confirm({
      title: `Logout toàn bộ user của ${tenant.school_code}?`,
      content: "Toàn bộ refresh token còn hiệu lực trong tenant DB sẽ bị revoke. Người dùng sẽ phải đăng nhập lại.",
      okText: "Logout toàn bộ",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        const key = `${tenant.tenant_id}:all`;
        try {
          setSessionActionKey(key);
          const result = await logoutAllTenantUsers(tenant.tenant_id);
          message.success(`Đã revoke ${result.revoked_sessions} session`);
          await fetchSecuritySummaries();
        } catch (err) {
          message.error(getErrorDetail(err, "Không thể logout toàn bộ user"));
        } finally {
          setSessionActionKey(null);
        }
      },
    });
  };

  const refreshOneStorageUsage = async (tenantId: number) => {
    try {
      setStorageSyncingTenantId(tenantId);
      const usage = await inspectTenantStorageUsage(tenantId);
      setStorageUsages(prev => {
        const exists = prev.some(item => item.tenant_id === tenantId);
        if (!exists) return [...prev, usage];
        return prev.map(item => item.tenant_id === tenantId ? usage : item);
      });
      if (usage.status === "ok") message.success(`Đã đồng bộ lưu trữ ${usage.school_code}`);
      else message.warning(usage.message || `Không thể đọc S3 của ${usage.school_code}`);
    } catch (err) {
      message.error(getErrorDetail(err, "Không thể đồng bộ lưu trữ tenant"));
    } finally {
      setStorageSyncingTenantId(null);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!tenantForm.getFieldValue("school_code"))
      tenantForm.setFieldsValue({ school_code: toTenantSlug(e.target.value) });
  };

  const handleSchoolCodeChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    tenantForm.setFieldsValue({ school_code: toTenantSlug(e.target.value) });

  const handleCreateTenant = async (values: TenantFormValues) => {
    const schoolCode = toTenantSlug(values.school_code);
    const payload: TenantCreateRequest = {
      name: values.name, school_code: schoolCode,
      storage_provider: "s3", storage_region: values.storage_region,
    };
    try {
      setCreating(true);
      let tenant = await createTenant(payload);
      const logoFile = getLogoFile(values.logo_file);
      if (logoFile) {
        try {
          tenant = await uploadTenantLogo(tenant.id, logoFile);
        } catch (logoErr) {
          message.warning(getErrorDetail(logoErr, "Tenant đã tạo nhưng upload logo thất bại"));
        }
      }
      message.success(`Tạo tenant thành công: ${tenant.name}`);
      setDrawerOpen(false); tenantForm.resetFields();
      await fetchTenants(); setAdminTenant(tenant);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Không thể tạo tenant");
    } finally { setCreating(false); }
  };

  const handleCreateAdmin = async (values: TenantAdminCreateRequest) => {
    if (!adminTenant) return;
    try {
      await createTenantAdmin(adminTenant.id, values);
      message.success(`Đã tạo admin cho ${adminTenant.name}`);
      setAdminTenant(null); adminForm.resetFields();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Không thể tạo admin tenant");
    }
  };

  const openEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    editForm.setFieldsValue({ name: tenant.name, logo_file: [] });
  };

  const handleUpdateTenant = async (values: TenantEditFormValues) => {
    if (!editingTenant) return;
    try {
      setUpdatingTenant(true);
      let tenant = await updateTenant(editingTenant.id, { name: values.name.trim() });
      const logoFile = getLogoFile(values.logo_file);
      if (logoFile) tenant = await uploadTenantLogo(editingTenant.id, logoFile);
      message.success(`Đã cập nhật ${tenant.name}`);
      setEditingTenant(null);
      editForm.resetFields();
      await fetchTenants();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Không thể đổi tên trường");
    } finally {
      setUpdatingTenant(false);
    }
  };

  const handleToggleTenant = async (tenant: Tenant) => {
    try {
      if (tenant.status === "active") { await suspendTenant(tenant.id); message.success(`Đã tạm khóa ${tenant.name}`); }
      else { await activateTenant(tenant.id); message.success(`Đã kích hoạt ${tenant.name}`); }
      await fetchTenants();
    } catch { message.error("Không thể cập nhật trạng thái tenant"); }
  };

  const showMigrationResult = (result: TenantMigrationBatchResponse) => {
    const failed = result.results.filter(r => r.status === "failed");
    modal.info({
      title: "Kết quả chạy migration",
      width: 680,
      content: (
        <div className="platform-migration-result">
          <p>{result.succeeded}/{result.total} tenant đã được migrate lên schema mới nhất.</p>
          {failed.length > 0 && (
            <div>
              <strong>Tenant thất bại:</strong>
              {failed.map(item => (
                <div key={item.tenant_id} className="platform-migration-failure">
                  <span>{item.school_code}</span><p>{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    });
  };

  const handleMigrateAll = () => {
    modal.confirm({
      title: "Chạy migration cho tất cả tenant?",
      content: "Thao tác này sẽ chạy Alembic upgrade head cho toàn bộ database tenant.",
      okText: "Chạy migration", cancelText: "Hủy",
      onOk: async () => {
        try {
          setMigratingAll(true);
          const result = await migrateAllTenants();
          showMigrationResult(result);
          if (result.failed === 0) {
            modal.success({
              title: "Migration tất cả thành công",
              content: `${result.succeeded}/${result.total} tenant đã được migrate.`,
            });
          }
          await fetchMigrationSummaries(tenants);
        } catch (err) {
          modal.error({
            title: "Migration tất cả thất bại",
            content: getErrorDetail(err, "Không thể chạy migration"),
            width: 720,
          });
        } finally { setMigratingAll(false); }
      },
    });
  };

  const handleMigrateTenant = async (tenant: Tenant) => {
    try {
      setMigratingTenantId(tenant.id);
      const result = await migrateTenant(tenant.id);
      await fetchMigrationSummaries([tenant]);
      modal.success({
        title: "Migration thành công",
        content: result.message || `Đã migrate ${tenant.name}`,
      });
    } catch (err) {
      modal.error({
        title: "Migration thất bại",
        content: getErrorDetail(err, `Migrate ${tenant.name} thất bại`),
        width: 720,
      });
    } finally { setMigratingTenantId(null); }
  };

  const handleInspectTenantDb = async (tenant: Tenant) => {
    try {
      setSchemaLoadingTenantId(tenant.id);
      setSchemaSearchText("");
      setSchemaTenant(await inspectTenantDbSchema(tenant.id));
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || `Không thể đọc cấu trúc DB của ${tenant.name}`);
    } finally {
      setSchemaLoadingTenantId(null);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      setAuditLogs(await listPlatformAuditLogs(150));
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Không thể tải nhật ký hệ thống");
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchMigrationHistory = async (tenant: Tenant) => {
    try {
      setMigrationHistoryLoading(true);
      setMigrationHistory(await getTenantMigrationHistory(tenant.id));
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Không thể tải lịch sử migration");
    } finally {
      setMigrationHistoryLoading(false);
    }
  };

  const openMigrationManager = (tenant: Tenant) => {
    setMigrationTenant(tenant);
    setMigrationHistory(null);
    setSelectedRevisionContent(null);
    setSelectedRevisionTitle("");
    setDowngradeTargetRevision(null);
    setUpgradeTargetRevision(null);
    void fetchMigrationHistory(tenant);
  };

  const handleDowngradeMigration = (revision: string) => {
    if (!migrationTenant) return;
    setDowngradeTargetRevision(revision);
  };

  const executeDowngradeMigration = async () => {
    if (!migrationTenant || !downgradeTargetRevision) return;
    try {
      setDowngradingRevision(downgradeTargetRevision);
      const result = await downgradeTenantMigration(migrationTenant.id, downgradeTargetRevision);
      modal.success({
        title: "Downgrade thành công",
        content: result.message || `Đã downgrade về ${downgradeTargetRevision}`,
      });
      setDowngradeTargetRevision(null);
      await fetchMigrationHistory(migrationTenant);
      await fetchMigrationSummaries([migrationTenant]);
    } catch (err) {
      modal.error({
        title: "Downgrade thất bại",
        content: getErrorDetail(err, "Downgrade thất bại"),
        width: 720,
      });
    } finally {
      setDowngradingRevision(null);
    }
  };

  const handleUpgradeMigration = (revision: string) => {
    if (!migrationTenant) return;
    setUpgradeTargetRevision(revision);
  };

  const executeUpgradeMigration = async () => {
    if (!migrationTenant || !upgradeTargetRevision) return;
    try {
      setUpgradingRevision(upgradeTargetRevision);
      const result = await upgradeTenantMigration(migrationTenant.id, upgradeTargetRevision);
      modal.success({
        title: "Upgrade thành công",
        content: result.message || `Đã upgrade lên ${upgradeTargetRevision}`,
      });
      setUpgradeTargetRevision(null);
      await fetchMigrationHistory(migrationTenant);
      await fetchMigrationSummaries([migrationTenant]);
    } catch (err) {
      modal.error({
        title: "Upgrade thất bại",
        content: getErrorDetail(err, "Upgrade thất bại"),
        width: 720,
      });
    } finally {
      setUpgradingRevision(null);
    }
  };

  const pageTitle =
    activeSection === "storage" ? "Quản lý lưu trữ" :
    activeSection === "audit" ? "Nhật ký hệ thống" :
    activeSection === "security" ? "Bảo mật" :
    activeSection === "ai-model" ? "AI model config" :
    "Quản lý Tenant";

  return (
    <main className="platform-shell">
      <PlatformTenantsShell
        activeSection={activeSection}
        pageTitle={pageTitle}
        onChangeSection={changeSection}
        onOpenCreateTenant={() => setDrawerOpen(true)}
        onMigrateAll={handleMigrateAll}
        onRefreshTenants={fetchTenants}
        onRefreshStorage={fetchStorageUsage}
        onRefreshAudit={fetchAuditLogs}
        onRefreshSecurity={fetchSecuritySummaries}
        onRefreshAiModel={fetchAiModelConfig}
        migratingAll={migratingAll}
        allTenantsAtHead={allTenantsAtHead}
        tenantsLoading={loading}
        storageLoading={storageLoading}
        auditLoading={auditLoading}
        securityLoading={securityLoading}
        aiModelLoading={aiModelLoading}
        tenants={tenants}
        tenantSummary={summary}
        migrationSummaryByTenant={migrationSummaryByTenant}
        schemaLoadingTenantId={schemaLoadingTenantId}
        migratingTenantId={migratingTenantId}
        isTenantAtHead={isTenantAtHead}
        onEditTenant={openEditTenant}
        onInspectTenantDb={handleInspectTenantDb}
        onMigrateTenant={handleMigrateTenant}
        onOpenMigrationManager={openMigrationManager}
        onCreateAdmin={setAdminTenant}
        onToggleTenant={handleToggleTenant}
        storageSummary={storageSummary}
        storageUsages={storageUsages}
        storageSyncingTenantId={storageSyncingTenantId}
        formatBytes={formatBytes}
        onAnalyzeStorageTenant={setStorageAnalysisTenant}
        onRefreshStorageTenant={refreshOneStorageUsage}
        auditSummary={auditSummary}
        auditLogs={auditLogs}
        onShowAuditDetails={(log) => modal.info({
          title: `Chi tiết: ${log.action}`,
          width: 760,
          content: (
            <pre className="platform-audit-details-modal">
              {JSON.stringify(log.details || {}, null, 2)}
            </pre>
          ),
        })}
        securitySummary={securitySummary}
        securitySummaries={securitySummaries}
        sessionActionKey={sessionActionKey}
        onRevokeAdminSessions={handleRevokeAdminSessions}
        onLogoutAllTenantUsers={handleLogoutAllTenantUsers}
        aiModelConfig={aiModelConfig}
        aiModelForm={aiModelForm}
        aiModelSaving={aiModelSaving}
        onSaveAiModelConfig={handleSaveAiModelConfig}
      />
      <CreateTenantDrawer
        open={drawerOpen}
        form={tenantForm}
        watchedSchoolCode={watchedSchoolCode}
        creating={creating}
        onClose={() => setDrawerOpen(false)}
        onFinish={handleCreateTenant}
        onNameChange={handleNameChange}
        onSchoolCodeChange={handleSchoolCodeChange}
      />

      <EditTenantModal
        tenant={editingTenant}
        form={editForm}
        updating={updatingTenant}
        onCancel={() => {
          setEditingTenant(null);
          editForm.resetFields();
        }}
        onFinish={handleUpdateTenant}
      />

      <TenantDbSchemaModal
        schemaTenant={schemaTenant}
        schemaSearchText={schemaSearchText}
        filteredSchemaTables={filteredSchemaTables}
        onSearchChange={setSchemaSearchText}
        onClose={() => setSchemaTenant(null)}
      />

      <StorageAnalysisModal
        tenantUsage={storageAnalysisTenant}
        formatBytes={formatBytes}
        onClose={() => setStorageAnalysisTenant(null)}
      />

      <MigrationManagerModal
        tenant={migrationTenant}
        history={migrationHistory}
        loading={migrationHistoryLoading}
        upgradingRevision={upgradingRevision}
        downgradingRevision={downgradingRevision}
        onClose={() => setMigrationTenant(null)}
        onRefresh={() => migrationTenant && fetchMigrationHistory(migrationTenant)}
        onShowRevisionFile={(title, content) => {
          setSelectedRevisionTitle(title);
          setSelectedRevisionContent(content);
        }}
        onUpgrade={handleUpgradeMigration}
        onDowngrade={handleDowngradeMigration}
      />

      <RevisionContentModal
        title={selectedRevisionTitle}
        content={selectedRevisionContent}
        onClose={() => setSelectedRevisionContent(null)}
      />

      <DowngradeMigrationModal
        tenant={migrationTenant}
        revision={downgradeTargetRevision}
        loading={!!downgradingRevision}
        onCancel={() => setDowngradeTargetRevision(null)}
        onOk={executeDowngradeMigration}
      />

      <UpgradeMigrationModal
        tenant={migrationTenant}
        revision={upgradeTargetRevision}
        loading={!!upgradingRevision}
        onCancel={() => setUpgradeTargetRevision(null)}
        onOk={executeUpgradeMigration}
      />

      <CreateTenantAdminModal
        tenant={adminTenant}
        form={adminForm}
        onCancel={() => setAdminTenant(null)}
        onFinish={handleCreateAdmin}
      />
    </main>
  );
};

export default PlatformTenantsPage;





