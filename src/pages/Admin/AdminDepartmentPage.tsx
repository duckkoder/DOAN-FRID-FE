import React, { useState, useEffect } from "react";
import {
  App,
  Typography,
  Card,
  Table,
  Button,
  Space,
  Input,
  Row,
  Col,
  Modal,
  Form,
  Popconfirm,
  Tag,
  Tooltip,
  Collapse,
  Empty,
  Divider,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  BankOutlined,
  BookOutlined,
  RightOutlined,
  DownOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import Breadcrumb from "@/components/Breadcrumb";
import AdminBulkImportModal, { type AdminImportType } from "@/components/AdminBulkImportModal";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type DepartmentResponse,
  type DepartmentCreateRequest,
  type DepartmentUpdateRequest,
} from "@/apis/departmentAPIs/department";
import {
  getSpecializations,
  createSpecialization,
  updateSpecialization,
  deleteSpecialization,
  type SpecializationResponse,
  type SpecializationCreateRequest,
  type SpecializationUpdateRequest,
} from "@/apis/departmentAPIs/specialization";

const { Title, Text } = Typography;
const { Panel } = Collapse;

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "32px 48px",
  background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)",
};

const panelStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 16,
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
};

const headerIconStyle: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 16,
  background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.16)",
};

const iconBoxStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#e0f2fe",
  color: "#1d4ed8",
  fontSize: 20,
};

const AdminDepartmentPage: React.FC = () => {
  const { message } = App.useApp();
  // ==================== State ====================
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [totalSpecializations, setTotalSpecializations] = useState<number>(0);

  // Specializations per department (cached)
  const [specializationsMap, setSpecializationsMap] = useState<
    Record<number, SpecializationResponse[]>
  >({});
  const [specializationsLoading, setSpecializationsLoading] = useState<
    Record<number, boolean>
  >({});
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [importType, setImportType] = useState<AdminImportType | null>(null);

  // Department Modal
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentResponse | null>(null);
  const [deptForm] = Form.useForm();
  const [deptSaving, setDeptSaving] = useState(false);

  // Specialization Modal
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<SpecializationResponse | null>(null);
  const [currentDeptId, setCurrentDeptId] = useState<number | null>(null);
  const [specForm] = Form.useForm();
  const [specSaving, setSpecSaving] = useState(false);

  // ==================== Load Data ====================
  useEffect(() => {
    fetchDepartments();
    fetchTotalSpecializations();
  }, []);

  const fetchTotalSpecializations = async () => {
    try {
      const data = await getSpecializations();
      setTotalSpecializations(data.length);
    } catch (error) {
      console.error("Error fetching total specializations:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await getDepartments(0, 200);
      setDepartments(data);
    } catch (error: any) {
      message.error(
        error?.response?.data?.detail || "Không thể tải danh sách khoa"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecializationsForDept = async (deptId: number, force = false) => {
    if (!force && specializationsMap[deptId] !== undefined) return; // already cached
    try {
      setSpecializationsLoading((prev) => ({ ...prev, [deptId]: true }));
      const data = await getSpecializations(deptId);
      setSpecializationsMap((prev) => ({ ...prev, [deptId]: data }));
    } catch (error: any) {
      message.error("Không thể tải danh sách chuyên ngành");
    } finally {
      setSpecializationsLoading((prev) => ({ ...prev, [deptId]: false }));
    }
  };

  const handleCollapseChange = (keys: string | string[]) => {
    const keyArr = Array.isArray(keys) ? keys : [keys];
    setExpandedKeys(keyArr);
    keyArr.forEach((k) => {
      const deptId = parseInt(k, 10);
      if (!isNaN(deptId)) fetchSpecializationsForDept(deptId);
    });
  };

  // ==================== Department CRUD ====================
  const openCreateDeptModal = () => {
    setEditingDept(null);
    deptForm.resetFields();
    setDeptModalOpen(true);
  };

  const openEditDeptModal = (dept: DepartmentResponse) => {
    setEditingDept(dept);
    deptForm.setFieldsValue({
      name: dept.name,
      code: dept.code,
      description: dept.description,
    });
    setDeptModalOpen(true);
  };

  const handleDeptModalSubmit = async () => {
    try {
      const values = await deptForm.validateFields();
      setDeptSaving(true);
      if (editingDept) {
        const payload: DepartmentUpdateRequest = {
          name: values.name,
          code: values.code,
          description: values.description || null,
        };
        await updateDepartment(editingDept.id, payload);
        message.success("Đã cập nhật khoa thành công!");
      } else {
        const payload: DepartmentCreateRequest = {
          name: values.name,
          code: values.code,
          description: values.description || null,
        };
        await createDepartment(payload);
        message.success("Đã tạo khoa mới thành công!");
      }
      setDeptModalOpen(false);
      fetchDepartments();
    } catch (error: any) {
      if (error?.errorFields) return; // validation error
      message.error(
        error?.response?.data?.detail || "Không thể lưu thông tin khoa"
      );
    } finally {
      setDeptSaving(false);
    }
  };

  const handleDeleteDept = async (deptId: number) => {
    try {
      setLoading(true);
      await deleteDepartment(deptId);
      message.success("Đã xóa khoa thành công!");
      fetchDepartments();
      // Remove from specializations cache
      setSpecializationsMap((prev) => {
        const next = { ...prev };
        delete next[deptId];
        return next;
      });
    } catch (error: any) {
      message.error(
        error?.response?.data?.detail || "Không thể xóa khoa"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================== Specialization CRUD ====================
  const openCreateSpecModal = (deptId: number) => {
    setEditingSpec(null);
    setCurrentDeptId(deptId);
    specForm.resetFields();
    setSpecModalOpen(true);
  };

  const openEditSpecModal = (spec: SpecializationResponse) => {
    setEditingSpec(spec);
    setCurrentDeptId(spec.department_id);
    specForm.setFieldsValue({
      name: spec.name,
      code: spec.code,
      description: spec.description,
    });
    setSpecModalOpen(true);
  };

  const handleSpecModalSubmit = async () => {
    if (!currentDeptId) return;
    try {
      const values = await specForm.validateFields();
      setSpecSaving(true);
      if (editingSpec) {
        const payload: SpecializationUpdateRequest = {
          name: values.name,
          code: values.code,
          description: values.description || null,
        };
        await updateSpecialization(editingSpec.id, payload);
        message.success("Đã cập nhật chuyên ngành thành công!");
      } else {
        const payload: SpecializationCreateRequest = {
          name: values.name,
          code: values.code,
          description: values.description || null,
          department_id: currentDeptId,
        };
        await createSpecialization(payload);
        message.success("Đã tạo chuyên ngành mới thành công!");
      }
      setSpecModalOpen(false);
      await fetchSpecializationsForDept(currentDeptId, true);
      await fetchTotalSpecializations();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(
        error?.response?.data?.detail || "Không thể lưu thông tin chuyên ngành"
      );
    } finally {
      setSpecSaving(false);
    }
  };

  const handleDeleteSpec = async (spec: SpecializationResponse) => {
    try {
      await deleteSpecialization(spec.id);
      message.success("Đã xóa chuyên ngành thành công!");
      await fetchSpecializationsForDept(spec.department_id, true);
      await fetchTotalSpecializations();
    } catch (error: any) {
      message.error(
        error?.response?.data?.detail || "Không thể xóa chuyên ngành"
      );
    }
  };

  const handleImportRow = async (type: AdminImportType, row: Record<string, any>) => {
    if (type === "department") {
      await createDepartment({
        name: row.name,
        code: row.code,
        description: row.description || null,
      });
      return;
    }

    if (type === "specialization") {
      await createSpecialization({
        name: row.name,
        code: row.code,
        department_id: row.department_id,
        description: row.description || null,
      });
    }
  };

  const handleImportSuccess = async () => {
    await fetchDepartments();
    await fetchTotalSpecializations();
    setSpecializationsMap({});
  };

  // ==================== Specialization Table Columns ====================
  const specColumns: ColumnsType<SpecializationResponse> = [
    {
      title: "Mã CN",
      dataIndex: "code",
      key: "code",
      width: 120,
      render: (code: string) => (
        <Tag color="blue" style={{ fontFamily: "monospace" }}>
          {code}
        </Tag>
      ),
    },
    {
      title: "Tên Chuyên ngành",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (desc: string | null) => desc || <Text type="secondary">—</Text>,
    },
    {
      title: "Hành động",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_: any, record: SpecializationResponse) => (
        <Space size={4}>
          <Tooltip title="Sửa chuyên ngành">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openEditSpecModal(record);
              }}
              style={{ color: "#1677ff" }}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa chuyên ngành"
            description={`Bạn có chắc muốn xóa chuyên ngành "${record.name}"?`}
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDeleteSpec(record);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa chuyên ngành">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ==================== Filter ====================
  const filteredDepartments = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchText.toLowerCase()) ||
      d.code.toLowerCase().includes(searchText.toLowerCase())
  );

  // ==================== Render ====================
  return (
    <div style={pageStyle}>
      <Breadcrumb
        items={[
          { title: "Trang chủ", href: "/admin" },
          { title: "Khoa & Chuyên ngành" },
        ]}
      />

      <Row align="middle" justify="space-between" gutter={[16, 16]} style={{ marginTop: 18, marginBottom: 24 }}>
        <Col>
          <Space align="center" size={14}>
            <div style={headerIconStyle}>
              <BankOutlined style={{ fontSize: 26, color: "#2563eb" }} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, color: "#1d4ed8", fontWeight: 800 }}>
                Quản lý Khoa & Chuyên ngành
              </Title>
              <Text type="secondary" style={{ fontSize: 15 }}>
                Tổ chức khoa, phòng ban và chuyên ngành của trường
              </Text>
            </div>
          </Space>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<UploadOutlined />} size="large" onClick={() => setImportType("department")} style={{ borderRadius: 8 }}>
              Import khoa
            </Button>
            <Button icon={<UploadOutlined />} size="large" onClick={() => setImportType("specialization")} style={{ borderRadius: 8 }}>
              Import chuyên ngành
            </Button>
            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreateDeptModal} style={{ borderRadius: 8 }}>
              Thêm khoa
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Summary badges */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card
            style={{
              ...panelStyle,
              height: "100%",
            }}
          >
            <Space align="center" size={14}>
              <div style={iconBoxStyle}>
                <BankOutlined />
              </div>
              <div>
                <Text type="secondary">Tổng số khoa</Text>
                <Title level={3} style={{ margin: "2px 0 0", color: "#0f172a" }}>
                  {departments.length}
                </Title>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            style={{
              ...panelStyle,
              height: "100%",
            }}
          >
            <Space align="center" size={14}>
              <div style={{ ...iconBoxStyle, background: "#dcfce7", color: "#059669" }}>
                <BookOutlined />
              </div>
              <div>
                <Text type="secondary">Tổng số chuyên ngành</Text>
                <Title level={3} style={{ margin: "2px 0 0", color: "#0f172a" }}>
                  {totalSpecializations}
                </Title>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={{ ...panelStyle, height: "100%" }}>
            <Space align="center" size={14}>
              <div style={{ ...iconBoxStyle, background: "#fef3c7", color: "#d97706" }}>
                <SearchOutlined />
              </div>
              <div>
                <Text type="secondary">Đang hiển thị</Text>
                <Title level={3} style={{ margin: "2px 0 0", color: "#0f172a" }}>
                  {filteredDepartments.length}
                </Title>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Search */}
      <Card style={{ ...panelStyle, marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col xs={24} lg={12}>
          <Space size={12}>
            <div style={{ ...iconBoxStyle, width: 36, height: 36, borderRadius: 10, fontSize: 16 }}>
              <BankOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                Danh sách khoa
              </Title>
              <Text type="secondary">Mở từng khoa để quản lý các chuyên ngành trực thuộc.</Text>
            </div>
          </Space>
        </Col>
        <Col xs={24} lg={8}>
          <Input
            placeholder="Tìm theo tên hoặc mã khoa..."
            prefix={<SearchOutlined />}
            allowClear
            size="large"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ borderRadius: 8 }}
          />
        </Col>
        <Col>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setSearchText("");
              setSpecializationsMap({});
              fetchDepartments();
              fetchTotalSpecializations();
            }}
          >
            Làm mới
          </Button>
        </Col>
      </Row>
      </Card>

      {/* Department List with Specializations */}
      <Collapse
        activeKey={expandedKeys}
        onChange={handleCollapseChange}
        expandIcon={({ isActive }) =>
          isActive ? (
            <DownOutlined style={{ color: "#2563eb" }} />
          ) : (
            <RightOutlined style={{ color: "#64748b" }} />
          )
        }
        style={{ background: "transparent", border: "none" }}
      >
        {loading && filteredDepartments.length === 0 ? (
          <Card style={panelStyle}>
            <div style={{ textAlign: "center", padding: 48 }}>
              <Text type="secondary">Đang tải...</Text>
            </div>
          </Card>
        ) : filteredDepartments.length === 0 ? (
          <Card style={panelStyle}>
            <Empty
              description="Chưa có khoa nào"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: 48 }}
            />
          </Card>
        ) : (
          filteredDepartments.map((dept) => (
            <Panel
              key={String(dept.id)}
              style={{
                ...panelStyle,
                overflow: "hidden",
                marginBottom: 14,
                background: "#fff",
              }}
              header={
                <Row align="middle" justify="space-between" style={{ width: "100%" }}>
                  <Col flex="auto">
                    <Space align="center" size={12}>
                      <div style={{ ...iconBoxStyle, width: 38, height: 38, borderRadius: 10, fontSize: 17 }}>
                        <BankOutlined />
                      </div>
                      <div>
                        <Text strong style={{ fontSize: 15 }}>
                          {dept.name}
                        </Text>
                        <Tag
                          color="blue"
                          style={{
                            marginLeft: 8,
                            borderRadius: 6,
                            fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                            fontSize: 12,
                          }}
                        >
                          {dept.code}
                        </Tag>
                        {dept.description && (
                          <Text
                            type="secondary"
                            style={{ marginLeft: 8, fontSize: 13 }}
                          >
                            — {dept.description}
                          </Text>
                        )}
                      </div>
                    </Space>
                  </Col>
                  <Col>
                    <Space
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginRight: 16 }}
                    >
                      <Tag color="green" style={{ margin: 0, borderRadius: 6 }}>
                        {specializationsMap[dept.id]?.length ?? "..."} chuyên ngành
                      </Tag>
                      <Tooltip title="Sửa khoa">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => openEditDeptModal(dept)}
                          style={{ color: "#1677ff" }}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Xóa khoa"
                        description={
                          <>
                            Bạn có chắc muốn xóa khoa <strong>{dept.name}</strong>?<br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Xóa sẽ thất bại nếu khoa còn chuyên ngành.
                            </Text>
                          </>
                        }
                        onConfirm={() => handleDeleteDept(dept.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Xóa khoa">
                          <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            danger
                          />
                        </Tooltip>
                      </Popconfirm>
                    </Space>
                  </Col>
                </Row>
              }
            >
              {/* Specializations Section */}
              <div style={{ padding: "0 8px 8px" }}>
                <Row align="middle" justify="space-between" style={{ marginBottom: 12 }}>
                  <Col>
                    <Space>
                      <BookOutlined style={{ color: "#52c41a" }} />
                      <Text strong style={{ color: "#52c41a" }}>
                        Danh sách Chuyên ngành
                      </Text>
                      {specializationsMap[dept.id] && (
                        <Tag color="green">
                          {specializationsMap[dept.id].length} chuyên ngành
                        </Tag>
                      )}
                    </Space>
                  </Col>
                  <Col>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => openCreateSpecModal(dept.id)}
                      style={{ borderRadius: 6 }}
                      ghost
                    >
                      Thêm Chuyên ngành
                    </Button>
                  </Col>
                </Row>

                <Divider style={{ margin: "0 0 12px 0" }} />

                <Table<SpecializationResponse>
                  columns={specColumns}
                  dataSource={specializationsMap[dept.id] || []}
                  rowKey="id"
                  loading={specializationsLoading[dept.id] || false}
                  pagination={false}
                  size="small"
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <Text type="secondary">
                            Chưa có chuyên ngành. Nhấn "Thêm Chuyên ngành" để bắt đầu.
                          </Text>
                        }
                      />
                    ),
                  }}
                  style={{ borderRadius: 8, overflow: "hidden" }}
                />
              </div>
            </Panel>
          ))
        )}
      </Collapse>

      {/* ====== Department Create/Edit Modal ====== */}
      <Modal
        title={
          <Space>
            <BankOutlined style={{ color: "#1677ff" }} />
            {editingDept ? "Chỉnh sửa Khoa" : "Thêm Khoa mới"}
          </Space>
        }
        open={deptModalOpen}
        onOk={handleDeptModalSubmit}
        onCancel={() => setDeptModalOpen(false)}
        confirmLoading={deptSaving}
        okText={editingDept ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy"
        width={520}
      >
        <Form form={deptForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Tên khoa"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập tên khoa!" },
              { min: 2, max: 100, message: "Tên khoa phải từ 2-100 ký tự" },
            ]}
          >
            <Input placeholder="Ví dụ: Khoa Công nghệ thông tin" />
          </Form.Item>

          <Form.Item
            label="Mã khoa"
            name="code"
            rules={[
              { required: true, message: "Vui lòng nhập mã khoa!" },
              { min: 1, max: 20, message: "Mã khoa tối đa 20 ký tự" },
              {
                pattern: /^[A-Z0-9_-]+$/i,
                message: "Mã khoa chỉ được chứa chữ cái, số, dấu gạch ngang/dưới",
              },
            ]}
          >
            <Input
              placeholder="Ví dụ: CNTT"
              style={{ textTransform: "uppercase" }}
              onChange={(e) =>
                deptForm.setFieldValue("code", e.target.value.toUpperCase())
              }
            />
          </Form.Item>

          <Form.Item
            label="Mô tả"
            name="description"
            rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Mô tả ngắn về khoa (không bắt buộc)"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ====== Specialization Create/Edit Modal ====== */}
      <Modal
        title={
          <Space>
            <BookOutlined style={{ color: "#52c41a" }} />
            {editingSpec ? "Chỉnh sửa Chuyên ngành" : "Thêm Chuyên ngành mới"}
          </Space>
        }
        open={specModalOpen}
        onOk={handleSpecModalSubmit}
        onCancel={() => setSpecModalOpen(false)}
        confirmLoading={specSaving}
        okText={editingSpec ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy"
        width={520}
      >
        {currentDeptId && (
          <div
            style={{
              background: "#e6f4ff",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 16,
              marginTop: 8,
            }}
          >
            <Text style={{ color: "#1677ff" }}>
              <BankOutlined style={{ marginRight: 6 }} />
              Khoa:{" "}
              <strong>
                {departments.find((d) => d.id === currentDeptId)?.name}
              </strong>
            </Text>
          </div>
        )}

        <Form form={specForm} layout="vertical">
          <Form.Item
            label="Tên chuyên ngành"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập tên chuyên ngành!" },
              { min: 2, max: 100, message: "Tên phải từ 2-100 ký tự" },
            ]}
          >
            <Input placeholder="Ví dụ: Kỹ thuật phần mềm" />
          </Form.Item>

          <Form.Item
            label="Mã chuyên ngành"
            name="code"
            rules={[
              { required: true, message: "Vui lòng nhập mã chuyên ngành!" },
              { min: 1, max: 20, message: "Mã tối đa 20 ký tự" },
              {
                pattern: /^[A-Z0-9_-]+$/i,
                message: "Mã chỉ được chứa chữ cái, số, dấu gạch ngang/dưới",
              },
            ]}
          >
            <Input
              placeholder="Ví dụ: KTPM"
              onChange={(e) =>
                specForm.setFieldValue("code", e.target.value.toUpperCase())
              }
            />
          </Form.Item>

          <Form.Item
            label="Mô tả"
            name="description"
            rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Mô tả ngắn về chuyên ngành (không bắt buộc)"
            />
          </Form.Item>
        </Form>
      </Modal>
      {importType && (
        <AdminBulkImportModal
          open={!!importType}
          type={importType}
          departments={departments}
          onCancel={() => setImportType(null)}
          onImportRow={handleImportRow}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
};

export default AdminDepartmentPage;
