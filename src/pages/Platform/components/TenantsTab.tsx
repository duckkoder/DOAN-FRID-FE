import React from "react";
import { Avatar, Button, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FiCode, FiDatabase, FiEdit2, FiPower, FiServer, FiShield, FiUploadCloud, FiUserPlus } from "react-icons/fi";

import type { Tenant } from "@/apis/platformAPIs/platform";
import { tenantLoginPath } from "../platformUtils";
import PlatformStatCard from "./PlatformStatCard";
import type { TenantMigrationSummary } from "./platformPageTypes";

const { Text } = Typography;

type TenantsTabProps = {
  summary: { total: number; active: number; suspended: number };
  tenants: Tenant[];
  loading: boolean;
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
};

const TenantsTab: React.FC<TenantsTabProps> = ({
  summary,
  tenants,
  loading,
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
}) => {
  const columns: ColumnsType<Tenant> = [
    {
      title: "Trường học",
      dataIndex: "name",
      key: "name",
      render: (_, tenant) => (
        <Space align="start" size={10}>
          <Avatar
            shape="square"
            size={42}
            src={tenant.logo_url || undefined}
            className="platform-tenant-logo"
          >
            {tenant.name?.charAt(0)}
          </Avatar>
          <Space direction="vertical" size={2}>
            <Text strong style={{ color: "var(--p-text)" }}>{tenant.name}</Text>
            <Text style={{ fontSize: 12, color: "#64748b" }}>Mã: {tenant.school_code}</Text>
            <span className="platform-slug-cell">{tenantLoginPath(tenant.slug)}</span>
          </Space>
        </Space>
      ),
    },
    {
      title: "Database",
      key: "database",
      render: (_, tenant) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontFamily: "var(--p-mono)", fontSize: 12, color: "var(--p-text)" }}>{tenant.db_name}</Text>
          <Text style={{ fontSize: 11, color: "var(--p-muted)" }}>
            {tenant.db_user}@{tenant.db_host}:{tenant.db_port}
          </Text>
        </Space>
      ),
    },
    {
      title: "Storage prefix",
      dataIndex: "storage_prefix",
      key: "storage_prefix",
      render: (value: string) => <span className="platform-slug-cell">{value}</span>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <span className={`platform-status ${status}`}>
          {status === "active" ? "Hoạt động" : "Tạm khóa"}
        </span>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 390,
      render: (_, tenant) => {
        const migrationSummary = migrationSummaryByTenant[tenant.id];
        const atHead = isTenantAtHead(tenant.id);
        return (
          <Space wrap>
            <Button size="small" icon={<FiEdit2 />} onClick={() => onEditTenant(tenant)}>
              Chỉnh sửa
            </Button>
            <Button
              size="small"
              icon={<FiDatabase />}
              loading={schemaLoadingTenantId === tenant.id}
              onClick={() => onInspectTenantDb(tenant)}
            >
              DB
            </Button>
            <Button
              size="small"
              icon={<FiUploadCloud />}
              loading={migratingTenantId === tenant.id || migrationSummary?.loading}
              disabled={atHead}
              title={atHead ? "Tenant đã ở revision mới nhất" : "Chạy migration lên head"}
              onClick={() => onMigrateTenant(tenant)}
            >
              {atHead ? "Đã mới nhất" : "Migration"}
            </Button>
            <Button size="small" icon={<FiCode />} onClick={() => onOpenMigrationManager(tenant)}>
              Version
            </Button>
            <Button size="small" icon={<FiUserPlus />} onClick={() => onCreateAdmin(tenant)}>
              Tạo admin
            </Button>
            <Button
              size="small"
              danger={tenant.status === "active"}
              icon={<FiPower />}
              onClick={() => onToggleTenant(tenant)}
            >
              {tenant.status === "active" ? "Khóa" : "Mở khóa"}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <div className="platform-stats-row">
        <PlatformStatCard icon={<FiServer />} tone="blue" value={summary.total} label="Tổng số tenant" />
        <PlatformStatCard icon={<FiShield />} tone="green" value={summary.active} label="Đang hoạt động" />
        <PlatformStatCard icon={<FiPower />} tone="amber" value={summary.suspended} label="Đang tạm khóa" />
      </div>

      <div className="platform-table-card">
        <div className="platform-toolbar">
          <div>
            <h2>Danh sách Tenant</h2>
            <p>Database, storage prefix và trạng thái hoạt động của từng trường.</p>
          </div>
          <span className="platform-toolbar-chip">{summary.active}/{summary.total} đang hoạt động</span>
        </div>
        <Table<Tenant>
          className="platform-tenants-table"
          rowKey="id"
          columns={columns}
          dataSource={tenants}
          loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
        />
      </div>
    </>
  );
};

export default TenantsTab;
