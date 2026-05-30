import React, { useEffect, useMemo, useState } from "react";
import {
  Button, Drawer, Form, Input, Modal, Space, Table, Typography, message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import {
  FiDatabase, FiEdit2, FiGrid, FiLogOut, FiPlus, FiPower, FiRefreshCw,
  FiServer, FiShield, FiUploadCloud, FiUserPlus,
} from "react-icons/fi";
import {
  activateTenant, clearPlatformToken, createTenant, createTenantAdmin,
  listTenants, migrateAllTenants, migrateTenant, suspendTenant, updateTenant,
  type Tenant, type TenantAdminCreateRequest, type TenantCreateRequest,
  type TenantMigrationBatchResponse,
} from "@/apis/platformAPIs/platform";
import { tenantLoginPath, toDatabaseName, toDatabaseUser, toStorageBucket, toTenantSlug } from "./platformUtils";
import "./Platform.css";

const { Text } = Typography;

interface TenantFormValues {
  name: string; school_code: string;
  storage_region?: string;
}

interface TenantEditFormValues {
  name: string;
}

const PlatformTenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [migratingAll, setMigratingAll] = useState(false);
  const [migratingTenantId, setMigratingTenantId] = useState<number | null>(null);
  const [adminTenant, setAdminTenant] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [updatingTenant, setUpdatingTenant] = useState(false);
  const [tenantForm] = Form.useForm<TenantFormValues>();
  const watchedSchoolCode = Form.useWatch("school_code", tenantForm);
  const [adminForm] = Form.useForm<TenantAdminCreateRequest>();
  const [editForm] = Form.useForm<TenantEditFormValues>();

  const summary = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter(t => t.status === "active").length,
    suspended: tenants.filter(t => t.status === "suspended").length,
  }), [tenants]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setTenants(await listTenants());
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) { clearPlatformToken(); navigate("/platform/login"); return; }
      message.error("Không thể tải danh sách tenant");
    } finally { setLoading(false); }
  };

  useEffect(() => { void fetchTenants(); }, []);

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
      const tenant = await createTenant(payload);
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
    editForm.setFieldsValue({ name: tenant.name });
  };

  const handleUpdateTenant = async (values: TenantEditFormValues) => {
    if (!editingTenant) return;
    try {
      setUpdatingTenant(true);
      const tenant = await updateTenant(editingTenant.id, { name: values.name.trim() });
      message.success(`Đã đổi tên trường thành ${tenant.name}`);
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
    Modal.info({
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
    Modal.confirm({
      title: "Chạy migration cho tất cả tenant?",
      content: "Thao tác này sẽ chạy Alembic upgrade head cho toàn bộ database tenant.",
      okText: "Chạy migration", cancelText: "Hủy",
      onOk: async () => {
        try {
          setMigratingAll(true);
          showMigrationResult(await migrateAllTenants());
        } catch (err) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          message.error(detail || "Không thể chạy migration");
        } finally { setMigratingAll(false); }
      },
    });
  };

  const handleMigrateTenant = async (tenant: Tenant) => {
    try {
      setMigratingTenantId(tenant.id);
      await migrateTenant(tenant.id);
      message.success(`Migrate ${tenant.name} thành công`);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || `Migrate ${tenant.name} thất bại`);
    } finally { setMigratingTenantId(null); }
  };

  const columns: ColumnsType<Tenant> = [
    {
      title: "Trường học", dataIndex: "name", key: "name",
      render: (_, t) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: "var(--p-text)" }}>{t.name}</Text>
          <Text style={{ fontSize: 12, color: "#64748b" }}>Mã: {t.school_code}</Text>
          <span className="platform-slug-cell">{tenantLoginPath(t.slug)}</span>
        </Space>
      ),
    },
    {
      title: "Database", key: "database",
      render: (_, t) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontFamily: "var(--p-mono)", fontSize: 12, color: "var(--p-text)" }}>{t.db_name}</Text>
          <Text style={{ fontSize: 11, color: "var(--p-muted)" }}>{t.db_user}@{t.db_host}:{t.db_port}</Text>
        </Space>
      ),
    },
    {
      title: "Storage prefix", dataIndex: "storage_prefix", key: "storage_prefix",
      render: (v: string) => <span className="platform-slug-cell">{v}</span>,
    },
    {
      title: "Trạng thái", dataIndex: "status", key: "status",
      render: (s: string) => <span className={`platform-status ${s}`}>{s === "active" ? "Hoạt động" : "Tạm khóa"}</span>,
    },
    {
      title: "Thao tác", key: "actions", width: 320,
      render: (_, t) => (
        <Space wrap>
          <Button size="small" icon={<FiEdit2 />} onClick={() => openEditTenant(t)}>
            Sửa tên
          </Button>
          <Button size="small" icon={<FiUploadCloud />} loading={migratingTenantId === t.id} onClick={() => handleMigrateTenant(t)}>
            Migration
          </Button>
          <Button size="small" icon={<FiUserPlus />} onClick={() => setAdminTenant(t)}>
            Tạo admin
          </Button>
          <Button size="small" danger={t.status === "active"} icon={<FiPower />} onClick={() => handleToggleTenant(t)}>
            {t.status === "active" ? "Khóa" : "Mở khóa"}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <main className="platform-shell">
      {/* ── SIDEBAR ── */}
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
          <button className="active" type="button"><FiGrid /> Quản lý Tenant</button>
          <button type="button" disabled><FiDatabase /> Lưu trữ</button>
          <button type="button" disabled><FiShield /> Bảo mật</button>
        </nav>

        <button className="platform-rail-logout" type="button" onClick={() => { clearPlatformToken(); navigate("/platform/login"); }}>
          <FiLogOut /> Đăng xuất
        </button>
      </aside>

      {/* ── MAIN ── */}
      <section className="platform-main">
        <header className="platform-topbar">
          <div>
            <p className="platform-page-kicker">Super admin workspace</p>
            <h1>Quản lý Tenant</h1>
          </div>
          <Space>
            <Button icon={<FiRefreshCw />} onClick={fetchTenants}>Làm mới</Button>
            <Button icon={<FiUploadCloud />} loading={migratingAll} onClick={handleMigrateAll}>
              Chạy migration tất cả
            </Button>
            <Button type="primary" icon={<FiPlus />} onClick={() => setDrawerOpen(true)}>
              Thêm tenant
            </Button>
          </Space>
        </header>

        <div className="platform-content">
          {/* Stats */}
          <div className="platform-stats-row">
            <div className="platform-stat-card">
              <div className="platform-stat-icon blue"><FiServer /></div>
              <div>
                <div className="platform-stat-value">{summary.total}</div>
                <div className="platform-stat-label">Tổng số tenant</div>
              </div>
            </div>
            <div className="platform-stat-card">
              <div className="platform-stat-icon green"><FiShield /></div>
              <div>
                <div className="platform-stat-value">{summary.active}</div>
                <div className="platform-stat-label">Đang hoạt động</div>
              </div>
            </div>
            <div className="platform-stat-card">
              <div className="platform-stat-icon amber"><FiPower /></div>
              <div>
                <div className="platform-stat-value">{summary.suspended}</div>
                <div className="platform-stat-label">Đang tạm khóa</div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="platform-table-card">
            <div className="platform-toolbar">
              <div>
                <h2>Danh sách Tenant</h2>
                <p>Database, storage prefix và trạng thái hoạt động của từng trường.</p>
              </div>
              <span className="platform-toolbar-chip">{summary.active}/{summary.total} đang hoạt động</span>
            </div>
            <Table<Tenant>
              rowKey="id"
              columns={columns}
              dataSource={tenants}
              loading={loading}
              scroll={{ x: 1000 }}
              pagination={{ pageSize: 8, showSizeChanger: false }}
            />
          </div>
        </div>
      </section>

      {/* ── DRAWER: Tạo tenant ── */}
      <Drawer title="Tạo tenant mới" width={620} open={drawerOpen} onClose={() => setDrawerOpen(false)} destroyOnClose>
        <Form<TenantFormValues>
          form={tenantForm} layout="vertical" requiredMark={false}
          initialValues={{ storage_region: "ap-southeast-1" }}
          onFinish={handleCreateTenant}
        >
          <Form.Item label="Tên trường" name="name" rules={[{ required: true, message: "Nhập tên trường" }]}>
            <Input size="large" placeholder="Đại học Sư Phạm Kỹ Thuật TP.HCM" onChange={handleNameChange} />
          </Form.Item>

          <Form.Item label="Mã trường / URL slug" name="school_code" rules={[{ required: true, message: "Nhập mã trường" }]}>
            <Input size="large" placeholder="hcmute" onChange={handleSchoolCodeChange} />
          </Form.Item>
          <div className="platform-form-note">
            Đường dẫn đăng nhập: /{watchedSchoolCode || "ma-truong"}/login
          </div>

          <div className="platform-preview-grid">
            <div><span>Database</span><strong>{toDatabaseName(watchedSchoolCode || "")}</strong></div>
            <div><span>DB User</span><strong>{toDatabaseUser(watchedSchoolCode || "")}</strong></div>
            <div><span>S3 Bucket</span><strong>{toStorageBucket(watchedSchoolCode || "")}</strong></div>
            <div><span>Mật khẩu DB</span><strong>Tự động tạo</strong></div>
          </div>

          <div className="platform-form-note" style={{ marginBottom: 16 }}>
            DB host do backend tá»± chá»n theo APP_ENV: development = localhost, production = db.
          </div>

          <Form.Item label="S3 Region" name="storage_region">
            <Input placeholder="ap-southeast-1" />
          </Form.Item>

          <Button block type="primary" htmlType="submit" size="large" loading={creating} icon={<FiPlus />}>
            Tạo tenant và chạy migration
          </Button>
        </Form>
      </Drawer>

      <Modal
        title={editingTenant ? `Đổi tên ${editingTenant.school_code}` : "Đổi tên trường"}
        open={!!editingTenant}
        okText="Lưu tên mới"
        cancelText="Đóng"
        confirmLoading={updatingTenant}
        onCancel={() => {
          setEditingTenant(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        destroyOnClose
      >
        <Form<TenantEditFormValues> form={editForm} layout="vertical" requiredMark={false} onFinish={handleUpdateTenant}>
          <Form.Item
            label="Tên trường"
            name="name"
            rules={[{ required: true, min: 2, message: "Nhập tên trường" }]}
          >
            <Input placeholder="Tên trường mới" />
          </Form.Item>
          <div className="platform-form-note">
            Mã trường, slug, database, DB user và storage prefix không đổi.
          </div>
        </Form>
      </Modal>

      {/* ── MODAL: Tạo admin ── */}
      <Modal
        title={adminTenant ? `Tạo admin cho ${adminTenant.name}` : "Tạo admin tenant"}
        open={!!adminTenant}
        okText="Tạo admin" cancelText="Đóng"
        onCancel={() => setAdminTenant(null)}
        onOk={() => adminForm.submit()}
        destroyOnClose
      >
        <Form<TenantAdminCreateRequest> form={adminForm} layout="vertical" requiredMark={false} onFinish={handleCreateAdmin}>
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
    </main>
  );
};

export default PlatformTenantsPage;
