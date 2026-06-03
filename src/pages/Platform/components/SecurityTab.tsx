import React from "react";
import { Button, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FiClock, FiShield, FiUserPlus } from "react-icons/fi";

import type { TenantSecuritySummary } from "@/apis/platformAPIs/platform";
import PlatformStatCard from "./PlatformStatCard";

const { Text } = Typography;

type SecurityTabProps = {
  securitySummary: {
    activeSessions: number;
    adminSessions: number;
    isolationIssues: number;
    geminiConfigured: number;
  };
  securitySummaries: TenantSecuritySummary[];
  loading: boolean;
  sessionActionKey: string | null;
  onRevokeAdminSessions: (tenant: TenantSecuritySummary, userId?: number) => void;
  onLogoutAllTenantUsers: (tenant: TenantSecuritySummary) => void;
};

const SecurityTab: React.FC<SecurityTabProps> = ({
  securitySummary,
  securitySummaries,
  loading,
  sessionActionKey,
  onRevokeAdminSessions,
  onLogoutAllTenantUsers,
}) => {
  const columns: ColumnsType<TenantSecuritySummary> = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_, item) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: "var(--p-text)" }}>{item.name}</Text>
          <Text style={{ fontSize: 12, color: "#64748b" }}>Mã: {item.school_code}</Text>
          <span className={`platform-status ${item.status}`}>{item.status === "active" ? "Hoạt động" : "Tạm khóa"}</span>
        </Space>
      ),
    },
    {
      title: "Tenant isolation",
      key: "isolation",
      render: (_, item) => (
        <Space direction="vertical" size={4}>
          <Tag color={item.db_connected ? "green" : "red"}>
            DB {item.db_connected ? "kết nối OK" : "lỗi kết nối"}
          </Tag>
          <Text style={{ fontFamily: "var(--p-mono)", fontSize: 12 }}>
            Rev: {item.current_revision || "-"}
          </Text>
          {!item.db_connected && item.db_message && (
            <Text type="danger" style={{ fontSize: 11 }}>{item.db_message}</Text>
          )}
        </Space>
      ),
    },
    {
      title: "API key",
      key: "api-key",
      render: (_, item) => (
        <Tag color={item.gemini_key_configured ? "green" : "red"}>
          Gemini {item.gemini_key_configured ? "đã cấu hình" : "chưa cấu hình"}
        </Tag>
      ),
    },
    {
      title: "Phiên active",
      key: "sessions",
      render: (_, item) => (
        <Space direction="vertical" size={2}>
          <Text strong>{item.active_sessions} session</Text>
          <Text style={{ fontSize: 12, color: "var(--p-muted)" }}>{item.active_users} user</Text>
          <Text style={{ fontSize: 12, color: "var(--p-muted)" }}>{item.active_admin_sessions} session admin</Text>
        </Space>
      ),
      sorter: (a, b) => a.active_sessions - b.active_sessions,
    },
    {
      title: "Admin tenant",
      key: "admins",
      render: (_, item) => (
        <div className="platform-security-admin-list">
          {item.admin_users.length > 0 ? item.admin_users.map(admin => (
            <div key={admin.user_id}>
              <div>
                <strong>{admin.email}</strong>
                <span>{admin.active_sessions} session</span>
              </div>
              <Button
                size="small"
                danger
                loading={sessionActionKey === `${item.tenant_id}:admin:${admin.user_id}`}
                onClick={() => onRevokeAdminSessions(item, admin.user_id)}
              >
                Revoke
              </Button>
            </div>
          )) : (
            <span className="platform-security-empty">Không có admin session active</span>
          )}
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 210,
      render: (_, item) => (
        <Space direction="vertical" size={6}>
          <Button
            size="small"
            danger
            disabled={item.active_admin_sessions === 0}
            loading={sessionActionKey === `${item.tenant_id}:admin`}
            onClick={() => onRevokeAdminSessions(item)}
          >
            Revoke admin
          </Button>
          <Button
            size="small"
            danger
            disabled={item.active_sessions === 0}
            loading={sessionActionKey === `${item.tenant_id}:all`}
            onClick={() => onLogoutAllTenantUsers(item)}
          >
            Logout toàn bộ
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="platform-stats-row">
        <PlatformStatCard icon={<FiClock />} tone="blue" value={securitySummary.activeSessions} label="Session đang hoạt động" />
        <PlatformStatCard icon={<FiUserPlus />} tone="green" value={securitySummary.adminSessions} label="Session admin tenant" />
        <PlatformStatCard icon={<FiShield />} tone="amber" value={securitySummary.isolationIssues} label="Vấn đề isolation" />
      </div>

      <div className="platform-table-card">
        <div className="platform-toolbar">
          <div>
            <h2>Kiểm tra bảo mật tenant</h2>
            <p>Kiểm tra session active, Gemini key status, kết nối DB, revision và storage prefix của từng tenant.</p>
          </div>
          <span className="platform-toolbar-chip">{securitySummary.geminiConfigured}/{securitySummaries.length} tenant có Gemini key</span>
        </div>
        <Table<TenantSecuritySummary>
          className="platform-tenants-table platform-security-table"
          rowKey="tenant_id"
          columns={columns}
          dataSource={securitySummaries}
          loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
        />
      </div>
    </>
  );
};

export default SecurityTab;
