import React from "react";
import { Button, Drawer, Form, Image, Input, Modal, Space, Tag, Upload } from "antd";
import type { FormInstance } from "antd";
import { FiCode, FiPlus, FiRefreshCw, FiUploadCloud } from "react-icons/fi";

import type {
  Tenant,
  TenantAdminCreateRequest,
  TenantDbSchemaResponse,
  TenantMigrationHistoryResponse,
  TenantStorageUsage,
} from "@/apis/platformAPIs/platform";
import { toDatabaseName, toDatabaseUser, toStorageBucket, toStoragePrefix } from "../platformUtils";
import type { TenantEditFormValues, TenantFormValues } from "./platformPageTypes";

const normalizeUploadFile = (event: any) => (Array.isArray(event) ? event : event?.fileList);

const logoUploadProps = {
  beforeUpload: () => false,
  maxCount: 1,
  accept: "image/*",
  listType: "picture" as const,
};

type CreateTenantDrawerProps = {
  open: boolean;
  form: FormInstance<TenantFormValues>;
  watchedSchoolCode?: string;
  creating: boolean;
  onClose: () => void;
  onFinish: (values: TenantFormValues) => void;
  onNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSchoolCodeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const CreateTenantDrawer: React.FC<CreateTenantDrawerProps> = ({
  open,
  form,
  watchedSchoolCode,
  creating,
  onClose,
  onFinish,
  onNameChange,
  onSchoolCodeChange,
}) => (
  <Drawer title="Tạo tenant mới" width="min(620px, 100vw)" open={open} onClose={onClose} destroyOnClose>
    <Form<TenantFormValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={{ storage_region: "ap-southeast-1" }}
      onFinish={onFinish}
    >
      <Form.Item label="Tên trường" name="name" rules={[{ required: true, message: "Nhập tên trường" }]}>
        <Input size="large" placeholder="Đại học Sư Phạm Kỹ Thuật TP.HCM" onChange={onNameChange} />
      </Form.Item>

      <Form.Item label="Mã trường / URL slug" name="school_code" rules={[{ required: true, message: "Nhập mã trường" }]}>
        <Input size="large" placeholder="hcmute" onChange={onSchoolCodeChange} />
      </Form.Item>
      <div className="platform-form-note">
        Đường dẫn đăng nhập: /{watchedSchoolCode || "ma-truong"}/login
      </div>

      <div className="platform-preview-grid">
        <div><span>Database</span><strong>{toDatabaseName(watchedSchoolCode || "")}</strong></div>
        <div><span>DB User</span><strong>{toDatabaseUser(watchedSchoolCode || "")}</strong></div>
        <div><span>S3 Bucket</span><strong>{toStorageBucket()}</strong></div>
        <div><span>S3 Prefix</span><strong>{toStoragePrefix(watchedSchoolCode || "")}</strong></div>
        <div><span>Mật khẩu DB</span><strong>Tự động tạo</strong></div>
      </div>

      <div className="platform-form-note" style={{ marginBottom: 16 }}>
        DB host do backend lấy theo cấu hình môi trường.
      </div>

      <Form.Item label="S3 Region" name="storage_region">
        <Input placeholder="ap-southeast-1" />
      </Form.Item>

      <Form.Item
        label="Logo trường (không bắt buộc)"
        name="logo_file"
        valuePropName="fileList"
        getValueFromEvent={normalizeUploadFile}
      >
        <Upload {...logoUploadProps}>
          <Button icon={<FiUploadCloud />}>Chọn logo</Button>
        </Upload>
      </Form.Item>

      <Button block type="primary" htmlType="submit" size="large" loading={creating} icon={<FiPlus />}>
        Tạo tenant và chạy migration
      </Button>
    </Form>
  </Drawer>
);

type EditTenantModalProps = {
  tenant: Tenant | null;
  form: FormInstance<TenantEditFormValues>;
  updating: boolean;
  onCancel: () => void;
  onFinish: (values: TenantEditFormValues) => void;
};

export const EditTenantModal: React.FC<EditTenantModalProps> = ({ tenant, form, updating, onCancel, onFinish }) => (
  <Modal
    title={tenant ? `Chỉnh sửa ${tenant.school_code}` : "Chỉnh sửa trường"}
    open={!!tenant}
    okText="Lưu chỉnh sửa"
    cancelText="Đóng"
    confirmLoading={updating}
    onCancel={onCancel}
    onOk={() => form.submit()}
    destroyOnClose
  >
    <Form<TenantEditFormValues> form={form} layout="vertical" requiredMark={false} onFinish={onFinish}>
      <Form.Item
        label="Tên trường"
        name="name"
        rules={[{ required: true, min: 2, message: "Nhập tên trường" }]}
      >
        <Input placeholder="Tên trường mới" />
      </Form.Item>
      {tenant?.logo_url && (
        <div className="platform-logo-preview">
          <span>Logo hiện tại</span>
          <Image src={tenant.logo_url} alt={tenant.name} width={72} height={72} preview={false} />
        </div>
      )}
      <Form.Item
        label="Logo trường"
        name="logo_file"
        valuePropName="fileList"
        getValueFromEvent={normalizeUploadFile}
      >
        <Upload {...logoUploadProps}>
          <Button icon={<FiUploadCloud />}>Upload logo mới</Button>
        </Upload>
      </Form.Item>
      <div className="platform-form-note">
        Mã trường, slug, database, DB user và storage prefix không đổi.
      </div>
    </Form>
  </Modal>
);

type TenantDbSchemaModalProps = {
  schemaTenant: TenantDbSchemaResponse | null;
  schemaSearchText: string;
  filteredSchemaTables: TenantDbSchemaResponse["tables"];
  onSearchChange: (value: string) => void;
  onClose: () => void;
};

export const TenantDbSchemaModal: React.FC<TenantDbSchemaModalProps> = ({
  schemaTenant,
  schemaSearchText,
  filteredSchemaTables,
  onSearchChange,
  onClose,
}) => (
  <Modal
    title={schemaTenant ? `Cấu trúc DB: ${schemaTenant.school_code}` : "Cấu trúc DB tenant"}
    open={!!schemaTenant}
    onCancel={onClose}
    footer={null}
    width={860}
    destroyOnClose
  >
    {schemaTenant && (
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div className="platform-db-schema-summary">
          <div><span>Database</span><strong>{schemaTenant.db_name}</strong></div>
          <div><span>Kết nối</span><strong>{schemaTenant.db_host}:{schemaTenant.db_port}</strong></div>
          <div><span>Revision</span><strong>{schemaTenant.alembic_version || "Chưa có"}</strong></div>
          <div><span>Bảng</span><strong>{schemaTenant.table_count}</strong></div>
        </div>

        <div className="platform-db-schema-note">
          Chỉ đọc metadata từ information_schema và alembic_version, không đọc dữ liệu trong các bảng tenant.
        </div>

        <div className="platform-db-table-tools">
          <Input
            allowClear
            value={schemaSearchText}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo tên bảng..."
          />
          <span>{filteredSchemaTables.length}/{schemaTenant.table_count} bảng</span>
        </div>

        <div className="platform-db-table-list">
          {filteredSchemaTables.length > 0 ? filteredSchemaTables.map(table => (
            <div className="platform-db-table-row" key={table.table_name}>
              <div>
                <strong>{table.table_name}</strong>
                <span>{table.table_type}</span>
              </div>
              <Tag color="blue">{table.column_count} cột</Tag>
            </div>
          )) : (
            <div className="platform-db-table-empty">Không có bảng phù hợp</div>
          )}
        </div>
      </Space>
    )}
  </Modal>
);

type StorageAnalysisModalProps = {
  tenantUsage: TenantStorageUsage | null;
  formatBytes: (bytes: number) => string;
  onClose: () => void;
};

export const StorageAnalysisModal: React.FC<StorageAnalysisModalProps> = ({ tenantUsage, formatBytes, onClose }) => (
  <Modal
    title={tenantUsage ? `Phân tích lưu trữ: ${tenantUsage.school_code}` : "Phân tích lưu trữ"}
    open={!!tenantUsage}
    onCancel={onClose}
    footer={[<Button key="close" type="primary" onClick={onClose}>Đóng</Button>]}
    width={760}
    destroyOnClose
  >
    {tenantUsage && (
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div className="platform-db-schema-summary">
          <div><span>Bucket</span><strong>{tenantUsage.bucket || "Chưa cấu hình"}</strong></div>
          <div><span>Prefix</span><strong>{tenantUsage.prefixes[0] || `${tenantUsage.school_code}/`}</strong></div>
          <div><span>Tổng dung lượng</span><strong>{formatBytes(tenantUsage.total_bytes)}</strong></div>
          <div><span>Object</span><strong>{tenantUsage.object_count}</strong></div>
        </div>

        <div className="platform-storage-folder-grid">
          {tenantUsage.categories.map(category => (
            <div className="platform-storage-folder-card" key={category.category}>
              <div>
                <strong>{category.label}</strong>
                <span>{tenantUsage.prefixes[0] || `${tenantUsage.school_code}/`}{category.category}/</span>
              </div>
              <div>
                <b>{formatBytes(category.total_bytes)}</b>
                <small>{category.object_count} object</small>
              </div>
            </div>
          ))}
        </div>

        {tenantUsage.message && <div className="platform-storage-error-note">{tenantUsage.message}</div>}
      </Space>
    )}
  </Modal>
);

type MigrationManagerModalProps = {
  tenant: Tenant | null;
  history: TenantMigrationHistoryResponse | null;
  loading: boolean;
  upgradingRevision: string | null;
  downgradingRevision: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onShowRevisionFile: (title: string, content: string) => void;
  onUpgrade: (revision: string) => void;
  onDowngrade: (revision: string) => void;
};

export const MigrationManagerModal: React.FC<MigrationManagerModalProps> = ({
  tenant,
  history,
  loading,
  upgradingRevision,
  downgradingRevision,
  onClose,
  onRefresh,
  onShowRevisionFile,
  onUpgrade,
  onDowngrade,
}) => (
  <Modal
    title={tenant ? `Migration: ${tenant.school_code}` : "Migration"}
    open={!!tenant}
    onCancel={onClose}
    footer={[
      <Button key="refresh" icon={<FiRefreshCw />} loading={loading} onClick={onRefresh}>
        Làm mới
      </Button>,
      <Button key="close" type="primary" onClick={onClose}>
        Đóng
      </Button>,
    ]}
    width={980}
    destroyOnClose
  >
    {tenant && (
      <div className="platform-migration-manager">
        <div className="platform-migration-head">
          <div><span>DB hiện tại</span><strong>{history?.db_name || tenant.db_name}</strong></div>
          <div><span>Version trong DB</span><strong>{history?.current_revision || "Chưa có"}</strong></div>
          <div><span>Head trong code</span><strong>{history?.head_revision || "Chưa đọc được"}</strong></div>
        </div>

        <div className="platform-db-schema-note">
          Migration mới phải được tạo ở máy dev bằng Alembic CLI, review file rồi deploy. Màn hình này chỉ chạy upgrade/downgrade từ file đã có trong source.
        </div>

        <div className="platform-revision-list">
          {(history?.revisions || []).map(revision => {
            const isCurrent = revision.revision === history?.current_revision;
            const isHead = revision.revision === history?.head_revision;
            const currentIndex = history?.revisions.findIndex(item => item.revision === history.current_revision) ?? -1;
            const targetIndex = history?.revisions.findIndex(item => item.revision === revision.revision) ?? -1;
            const shouldUpgrade = !isCurrent && (currentIndex === -1 || targetIndex < currentIndex);
            return (
              <div className={`platform-revision-item ${isCurrent ? "current" : ""} ${isHead ? "head" : ""}`} key={revision.revision}>
                <div>
                  <strong>{revision.message}</strong>
                  <span>{revision.revision}</span>
                  <small>{revision.filename}</small>
                </div>
                <Space>
                  {isCurrent && <Tag color="green">Đang dùng</Tag>}
                  {isHead && <Tag color="blue">Head</Tag>}
                  <Button
                    size="small"
                    icon={<FiCode />}
                    onClick={() => onShowRevisionFile(revision.filename, revision.content || "Không đọc được nội dung file revision.")}
                  >
                    Xem file
                  </Button>
                  {!isCurrent && shouldUpgrade && (
                    <Button
                      size="small"
                      type="primary"
                      loading={upgradingRevision === revision.revision}
                      onClick={() => onUpgrade(revision.revision)}
                    >
                      Upgrade
                    </Button>
                  )}
                  {!isCurrent && !shouldUpgrade && (
                    <Button
                      size="small"
                      danger
                      loading={downgradingRevision === revision.revision}
                      onClick={() => onDowngrade(revision.revision)}
                    >
                      Downgrade
                    </Button>
                  )}
                </Space>
              </div>
            );
          })}
          {!loading && history?.revisions.length === 0 && (
            <div className="platform-db-table-empty">Chưa có file migration</div>
          )}
          {loading && <div className="platform-db-table-empty">Đang tải lịch sử migration...</div>}
        </div>
      </div>
    )}
  </Modal>
);

type RevisionContentModalProps = {
  title: string;
  content: string | null;
  onClose: () => void;
};

export const RevisionContentModal: React.FC<RevisionContentModalProps> = ({ title, content, onClose }) => (
  <Modal
    title={title || "Nội dung file revision"}
    open={!!content}
    onCancel={onClose}
    footer={[<Button key="close" type="primary" onClick={onClose}>Đóng</Button>]}
    width={980}
    destroyOnClose
  >
    <pre className="platform-revision-file-modal">{content}</pre>
  </Modal>
);

type ConfirmMigrationModalProps = {
  tenant: Tenant | null;
  revision: string | null;
  loading: boolean;
  onCancel: () => void;
  onOk: () => void;
};

export const DowngradeMigrationModal: React.FC<ConfirmMigrationModalProps> = ({ tenant, revision, loading, onCancel, onOk }) => (
  <Modal
    title={tenant ? `Downgrade ${tenant.school_code}?` : "Downgrade tenant"}
    open={!!revision}
    onCancel={onCancel}
    okText="Downgrade"
    okButtonProps={{ danger: true }}
    confirmLoading={loading}
    cancelText="Hủy"
    onOk={onOk}
    destroyOnClose
  >
    <div className="platform-db-schema-note">
      DB tenant sẽ chạy Alembic downgrade về revision <strong>{revision}</strong>. Nếu dữ liệu/FK không cho rollback, Postgres sẽ trả lỗi và hệ thống giữ nguyên trạng thái.
    </div>
  </Modal>
);

export const UpgradeMigrationModal: React.FC<ConfirmMigrationModalProps> = ({ tenant, revision, loading, onCancel, onOk }) => (
  <Modal
    title={tenant ? `Upgrade ${tenant.school_code}?` : "Upgrade tenant"}
    open={!!revision}
    onCancel={onCancel}
    okText="Upgrade"
    confirmLoading={loading}
    cancelText="Hủy"
    onOk={onOk}
    destroyOnClose
  >
    <div className="platform-db-schema-note">
      DB tenant sẽ chạy Alembic upgrade lên revision <strong>{revision}</strong>. Nếu migration lỗi, Postgres sẽ rollback transaction của bước đó và hệ thống báo lỗi.
    </div>
  </Modal>
);

type CreateTenantAdminModalProps = {
  tenant: Tenant | null;
  form: FormInstance<TenantAdminCreateRequest>;
  onCancel: () => void;
  onFinish: (values: TenantAdminCreateRequest) => void;
};

export const CreateTenantAdminModal: React.FC<CreateTenantAdminModalProps> = ({ tenant, form, onCancel, onFinish }) => (
  <Modal
    title={tenant ? `Tạo admin cho ${tenant.name}` : "Tạo admin tenant"}
    open={!!tenant}
    okText="Tạo admin"
    cancelText="Đóng"
    onCancel={onCancel}
    onOk={() => form.submit()}
    destroyOnClose
  >
    <Form<TenantAdminCreateRequest> form={form} layout="vertical" requiredMark={false} onFinish={onFinish}>
      <Form.Item label="Họ tên" name="full_name" rules={[{ required: true, message: "Nhập họ tên" }]}>
        <Input placeholder="Nguyễn Văn A" />
      </Form.Item>
      <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Email không hợp lệ" }]}>
        <Input placeholder="admin@truong.edu.vn" />
      </Form.Item>
      <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, min: 8, message: "Tối thiểu 8 ký tự" }]}>
        <Input.Password placeholder="Tối thiểu 8 ký tự" />
      </Form.Item>
      <Form.Item label="Số điện thoại" name="phone">
        <Input placeholder="0901234567" />
      </Form.Item>
    </Form>
  </Modal>
);
