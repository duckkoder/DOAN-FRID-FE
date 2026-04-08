import React, { useState, useEffect } from "react";
import {
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
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Collapse,
  Empty,
  Divider,
  Badge,
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
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import Breadcrumb from "@/components/Breadcrumb";
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

const AdminDepartmentPage: React.FC = () => {
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

  const fetchSpecializationsForDept = async (deptId: number) => {
    if (specializationsMap[deptId] !== undefined) return; // already cached
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
      // Invalidate cache for this dept, reload it, and update total count
      setSpecializationsMap((prev) => {
        const next = { ...prev };
        delete next[currentDeptId];
        return next;
      });
      await fetchSpecializationsForDept(currentDeptId);
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
      // Invalidate cache, reload dept specializations, and update total count
      setSpecializationsMap((prev) => {
        const next = { ...prev };
        delete next[spec.department_id];
        return next;
      });
      await fetchSpecializationsForDept(spec.department_id);
      await fetchTotalSpecializations();
    } catch (error: any) {
      message.error(
        error?.response?.data?.detail || "Không thể xóa chuyên ngành"
      );
    }
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
    <div style={{ padding: "0 24px 40px" }}>
      <Breadcrumb
        items={[
          { title: "Trang chủ", href: "/admin" },
          { title: "Khoa & Chuyên ngành" },
        ]}
      />

      <Row align="middle" justify="space-between" style={{ marginTop: 16, marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <BankOutlined style={{ marginRight: 10, color: "#1677ff" }} />
            Quản lý Khoa & Chuyên ngành
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Quản lý các khoa/phòng ban và chuyên ngành trong trường
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={openCreateDeptModal}
            style={{ borderRadius: 8 }}
          >
            Thêm Khoa mới
          </Button>
        </Col>
      </Row>

      {/* Summary badges */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col>
          <Card
            style={{
              borderRadius: 12,
              background: "linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)",
              border: "none",
              minWidth: 160,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1677ff" }}>
                {departments.length}
              </div>
              <Text style={{ color: "#1677ff", fontWeight: 500 }}>
                <BankOutlined /> Tổng số Khoa
              </Text>
            </div>
          </Card>
        </Col>
        <Col>
          <Card
            style={{
              borderRadius: 12,
              background: "linear-gradient(135deg, #f6ffed 0%, #b7eb8f 100%)",
              border: "none",
              minWidth: 160,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#52c41a" }}>
                {totalSpecializations}
              </div>
              <Text style={{ color: "#52c41a", fontWeight: 500 }}>
                <BookOutlined /> Tổng số Chuyên ngành
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Search */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Input
            placeholder="Tìm kiếm theo tên hoặc mã khoa..."
            prefix={<SearchOutlined />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
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

      {/* Department List with Specializations */}
      <Collapse
        activeKey={expandedKeys}
        onChange={handleCollapseChange}
        expandIcon={({ isActive }) =>
          isActive ? (
            <DownOutlined style={{ color: "#1677ff" }} />
          ) : (
            <RightOutlined style={{ color: "#8c8c8c" }} />
          )
        }
        style={{ borderRadius: 12, overflow: "hidden" }}
      >
        {loading && filteredDepartments.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 32 }}>⏳</div>
            <Text type="secondary">Đang tải...</Text>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <Empty
            description="Chưa có khoa nào"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: 48 }}
          />
        ) : (
          filteredDepartments.map((dept) => (
            <Panel
              key={String(dept.id)}
              header={
                <Row align="middle" justify="space-between" style={{ width: "100%" }}>
                  <Col flex="auto">
                    <Space align="center">
                      <BankOutlined style={{ color: "#1677ff", fontSize: 18 }} />
                      <div>
                        <Text strong style={{ fontSize: 15 }}>
                          {dept.name}
                        </Text>
                        <Tag
                          color="blue"
                          style={{
                            marginLeft: 8,
                            fontFamily: "monospace",
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
                      <Badge
                        count={
                          specializationsMap[dept.id]?.length ?? "?"
                        }
                        style={{ backgroundColor: "#52c41a" }}
                        title="Số chuyên ngành"
                      />
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
    </div>
  );
};

export default AdminDepartmentPage;
