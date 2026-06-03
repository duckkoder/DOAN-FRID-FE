import React from "react";
import { Button, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FiClock, FiPower, FiShield } from "react-icons/fi";

import type { PlatformAuditLog } from "@/apis/platformAPIs/platform";
import PlatformStatCard from "./PlatformStatCard";

const { Text } = Typography;

type AuditTabProps = {
  auditSummary: { total: number; success: number; failed: number };
  auditLogs: PlatformAuditLog[];
  loading: boolean;
  onShowDetails: (log: PlatformAuditLog) => void;
};

const AuditTab: React.FC<AuditTabProps> = ({ auditSummary, auditLogs, loading, onShowDetails }) => {
  const columns: ColumnsType<PlatformAuditLog> = [
    {
      title: "Người thao tác",
      key: "actor",
      render: (_, log) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: "var(--p-text)" }}>{log.actor_email || "system"}</Text>
          <Text style={{ fontSize: 12, color: "var(--p-muted)" }}>ID: {log.actor_id || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_, log) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontFamily: "var(--p-mono)", fontSize: 12 }}>{log.action}</Text>
          <Text style={{ fontSize: 12, color: "var(--p-muted2)" }}>{log.message || "Không có mô tả"}</Text>
        </Space>
      ),
    },
    {
      title: "Tenant",
      key: "tenant",
      render: (_, log) => (
        <Space direction="vertical" size={2}>
          <Text>{log.tenant_school_code || "-"}</Text>
          <Text style={{ fontSize: 12, color: "var(--p-muted)" }}>ID: {log.tenant_id || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (statusText: string) => (
        <Tag color={statusText === "success" ? "green" : statusText === "partial" ? "gold" : "red"}>
          {statusText}
        </Tag>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "created_at",
      key: "created_at",
      render: (value: string) => new Date(value).toLocaleString("vi-VN"),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: "descend",
    },
    {
      title: "Chi tiết",
      key: "details",
      width: 120,
      render: (_, log) => (
        <Button size="small" disabled={!log.details} onClick={() => onShowDetails(log)}>
          Xem
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="platform-stats-row">
        <PlatformStatCard icon={<FiClock />} tone="blue" value={auditSummary.total} label="Tổng số sự kiện" />
        <PlatformStatCard icon={<FiShield />} tone="green" value={auditSummary.success} label="Thành công" />
        <PlatformStatCard icon={<FiPower />} tone="amber" value={auditSummary.failed} label="Thất bại" />
      </div>

      <div className="platform-table-card">
        <div className="platform-toolbar">
          <div>
            <h2>Bảng nhật ký hệ thống</h2>
            <p>Theo dõi ai tạo tenant, migrate, downgrade, tạo admin, khóa hoặc mở tenant.</p>
          </div>
          <span className="platform-toolbar-chip">{auditLogs.length} sự kiện gần nhất</span>
        </div>
        <Table<PlatformAuditLog>
          className="platform-tenants-table platform-audit-table"
          rowKey="id"
          columns={columns}
          dataSource={auditLogs}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </div>
    </>
  );
};

export default AuditTab;
