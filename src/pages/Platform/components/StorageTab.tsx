import React from "react";
import { Button, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FiDatabase, FiPower, FiRefreshCw, FiServer } from "react-icons/fi";

import type { TenantStorageUsage } from "@/apis/platformAPIs/platform";
import PlatformStatCard from "./PlatformStatCard";

const { Text } = Typography;

type StorageTabProps = {
  storageSummary: { totalBytes: number; totalObjects: number; errorCount: number };
  storageUsages: TenantStorageUsage[];
  tenantCount: number;
  loading: boolean;
  storageSyncingTenantId: number | null;
  formatBytes: (bytes: number) => string;
  onAnalyzeTenant: (usage: TenantStorageUsage) => void;
  onRefreshTenant: (tenantId: number) => void;
};

const StorageTab: React.FC<StorageTabProps> = ({
  storageSummary,
  storageUsages,
  tenantCount,
  loading,
  storageSyncingTenantId,
  formatBytes,
  onAnalyzeTenant,
  onRefreshTenant,
}) => {
  const columns: ColumnsType<TenantStorageUsage> = [
    {
      title: "Trường học",
      key: "tenant",
      render: (_, item) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: "var(--p-text)" }}>{item.name}</Text>
          <Text style={{ fontSize: 12, color: "#64748b" }}>Mã: {item.school_code}</Text>
          <Tag color={item.status === "ok" ? "green" : "red"}>{item.status === "ok" ? "Kết nối OK" : "Lỗi S3"}</Tag>
        </Space>
      ),
    },
    {
      title: "Dung lượng",
      key: "size",
      render: (_, item) => (
        <Space direction="vertical" size={2}>
          <Text strong>{formatBytes(item.total_bytes)}</Text>
          <Text style={{ fontSize: 12, color: "var(--p-muted)" }}>{item.object_count} object</Text>
        </Space>
      ),
      sorter: (a, b) => a.total_bytes - b.total_bytes,
    },
    {
      title: "Bucket / Prefix",
      key: "bucket",
      render: (_, item) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontFamily: "var(--p-mono)", fontSize: 12 }}>{item.bucket || "Chưa cấu hình"}</Text>
          {item.prefixes.map(prefix => (
            <span className="platform-slug-cell" key={prefix}>{prefix}</span>
          ))}
        </Space>
      ),
    },
    {
      title: "Cập nhật",
      key: "updated",
      render: (_, item) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 12 }}>{new Date(item.scanned_at).toLocaleString("vi-VN")}</Text>
          {item.message && <Text type="danger" style={{ fontSize: 12 }}>{item.message}</Text>}
        </Space>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 210,
      render: (_, item) => (
        <Space>
          <Button size="small" onClick={() => onAnalyzeTenant(item)}>
            Phân tích
          </Button>
          <Button
            size="small"
            icon={<FiRefreshCw />}
            loading={storageSyncingTenantId === item.tenant_id}
            onClick={() => onRefreshTenant(item.tenant_id)}
          >
            Đồng bộ
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="platform-stats-row">
        <PlatformStatCard
          icon={<FiDatabase />}
          tone="blue"
          value={formatBytes(storageSummary.totalBytes)}
          label="Tổng dung lượng"
          valueClassName="platform-stat-value-text"
        />
        <PlatformStatCard icon={<FiServer />} tone="green" value={storageSummary.totalObjects} label="Tổng số object" />
        <PlatformStatCard icon={<FiPower />} tone="amber" value={storageSummary.errorCount} label="Tenant lỗi kết nối S3" />
      </div>

      <div className="platform-table-card">
        <div className="platform-toolbar">
          <div>
            <h2>Dung lượng lưu trữ</h2>
            <p>Thống kê object S3 theo bucket, prefix và từng folder của tenant.</p>
          </div>
          <span className="platform-toolbar-chip">{storageUsages.length}/{tenantCount} tenant đã quét</span>
        </div>
        <Table<TenantStorageUsage>
          className="platform-tenants-table platform-storage-table"
          rowKey="tenant_id"
          columns={columns}
          dataSource={storageUsages}
          loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
        />
      </div>
    </>
  );
};

export default StorageTab;
