import React, { useMemo } from "react";
import { Button, Form, InputNumber, Popover, Space, Table, Tag, Typography } from "antd";
import type { FormInstance } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FiClock, FiHelpCircle, FiSave, FiShield, FiUserPlus } from "react-icons/fi";

import type { PlatformEnvConfigItem, TenantSecuritySummary } from "@/apis/platformAPIs/platform";
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
  securityConfig: PlatformEnvConfigItem[];
  form: FormInstance<Record<string, string | number | boolean | null>>;
  loading: boolean;
  configSaving: boolean;
  sessionActionKey: string | null;
  onRevokeAdminSessions: (tenant: TenantSecuritySummary, userId?: number) => void;
  onLogoutAllTenantUsers: (tenant: TenantSecuritySummary) => void;
  onSaveSecurityConfig: (values: Record<string, string | number | boolean | null>) => void;
};

const securityHelp: Record<string, { title: string; summary: string; tips: string[]; suffix: string }> = {
  ACCESS_TOKEN_EXPIRE_MINUTES: {
    title: "Thời hạn đăng nhập",
    summary: "Thời gian access token còn hiệu lực. Khi hết hạn, frontend sẽ dùng refresh token để xin token mới.",
    tips: ["120 phút tương đương khoảng 2 giờ.", "Giảm nếu muốn tài khoản tự hết hạn nhanh hơn trên máy lạ.", "Thay đổi này áp dụng cho token mới, token đã cấp vẫn giữ hạn cũ."],
    suffix: "phút",
  },
  REFRESH_TOKEN_EXPIRE_DAYS: {
    title: "Thời hạn duy trì phiên",
    summary: "Refresh token quyết định người dùng có thể duy trì đăng nhập bao lâu nếu chưa logout hoặc chưa bị revoke.",
    tips: ["Logout sẽ revoke refresh token ngay.", "Revoke trong bảng tenant cũng thu hồi refresh token.", "7 ngày là mức cân bằng cho hệ thống nội bộ trường."],
    suffix: "ngày",
  },
  AI_WEBSOCKET_TOKEN_EXPIRE_MINUTES: {
    title: "Phiên điểm danh realtime",
    summary: "Token WebSocket dùng khi giáo viên/sinh viên tham gia phiên điểm danh AI realtime.",
    tips: ["120 phút phù hợp với lớp dài hoặc thao tác chậm.", "Nếu đặt quá ngắn, phiên điểm danh có thể rớt giữa chừng.", "Nếu lớp thường ngắn, có thể đặt 60-90 phút."],
    suffix: "phút",
  },
};

const getNumericValue = (item: PlatformEnvConfigItem) => {
  if (typeof item.value === "number") return item.value;
  const parsed = Number(item.value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const SecurityTab: React.FC<SecurityTabProps> = ({
  securitySummary,
  securitySummaries,
  securityConfig,
  form,
  loading,
  configSaving,
  sessionActionKey,
  onRevokeAdminSessions,
  onLogoutAllTenantUsers,
  onSaveSecurityConfig,
}) => {
  const configByKey = useMemo(
    () => Object.fromEntries(securityConfig.map(item => [item.key, item])),
    [securityConfig],
  );

  const accessMinutes = getNumericValue(configByKey.ACCESS_TOKEN_EXPIRE_MINUTES);
  const websocketMinutes = getNumericValue(configByKey.AI_WEBSOCKET_TOKEN_EXPIRE_MINUTES);

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
    <div className="platform-security-page">
      <div className="platform-stats-row">
        <PlatformStatCard icon={<FiClock />} tone="blue" value={securitySummary.activeSessions} label="Session đang hoạt động" />
        <PlatformStatCard icon={<FiUserPlus />} tone="green" value={securitySummary.adminSessions} label="Session admin tenant" />
        <PlatformStatCard icon={<FiShield />} tone="amber" value={securitySummary.isolationIssues} label="Vấn đề isolation" />
      </div>

      <div className="platform-ai-metrics platform-session-metrics">
        <div>
          <FiClock />
          <strong>{accessMinutes || "-"}</strong>
          <span>Phút access token</span>
        </div>
        <div>
          <FiShield />
          <strong>{websocketMinutes || "-"}</strong>
          <span>Phút phiên AI realtime</span>
        </div>
        <div>
          <FiUserPlus />
          <strong>{securitySummary.activeSessions}</strong>
          <span>Refresh token active</span>
        </div>
      </div>

      <div className="platform-table-card platform-security-config-card">
        <div className="platform-ai-card-head">
          <div>
            <h2>Thông số phiên</h2>
            <p>Chỉnh thời hạn token đăng nhập và token điểm danh realtime. Giá trị mới áp dụng cho token được cấp sau khi lưu.</p>
          </div>
          <Button type="primary" icon={<FiSave />} loading={configSaving} onClick={() => form.submit()}>
            Lưu cấu hình
          </Button>
        </div>

        <Form form={form} layout="vertical" onFinish={onSaveSecurityConfig} className="platform-env-config-form">
          <section className="platform-env-group">
            <div className="platform-env-list">
              {securityConfig.map(item => {
                const help = securityHelp[item.key];
                return (
                  <div className="platform-env-row" key={item.key}>
                    <div className="platform-env-meta">
                      <div className="platform-env-title-line">
                        <strong>{help?.title || item.label}</strong>
                        <Popover
                          placement="left"
                          title={help?.title || item.label}
                          content={
                            <div className="platform-env-help">
                              <p>{help?.summary || item.description}</p>
                              {help?.tips?.map(tip => <div key={tip}>• {tip}</div>)}
                            </div>
                          }
                        >
                          <button className="platform-env-help-button" type="button" aria-label={`Giải thích ${item.key}`}>
                            <FiHelpCircle />
                          </button>
                        </Popover>
                      </div>
                      <code>{item.key}</code>
                      <p>{help?.summary || item.description}</p>
                    </div>

                    <Form.Item name={item.key} style={{ marginBottom: 0 }}>
                      <InputNumber min={1} addonAfter={help?.suffix} controls style={{ width: "100%" }} />
                    </Form.Item>
                  </div>
                );
              })}
            </div>
          </section>
        </Form>
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
    </div>
  );
};

export default SecurityTab;
