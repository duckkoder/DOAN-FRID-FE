import React, { useState, useEffect } from "react";
import {
  Typography,
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Row,
  Col,
  Modal,
  Form,
  message,
  Popconfirm,
  Statistic,
  Divider,
  Upload,
  Avatar,
} from "antd";

const { Title, Text } = Typography;
const { Option } = Select;
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CameraOutlined,
  LockOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import Breadcrumb from "@/components/Breadcrumb";
import {
  getTeachersList,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword,
  getStatusColor,
  getStatusText,
  type TeacherResponse,
  type CreateTeacherRequest,
  type UpdateTeacherRequest,
  type GetTeachersParams,
} from "@/apis/teacherAPIs/teacher";
import {
  getDepartments,
  getSpecializations,
  type DepartmentResponse,
  type SpecializationResponse,
} from "@/apis/departmentAPIs/department";
import {
  uploadAvatar,
  validateImageFile,
} from "@/apis/fileAPIs/file";
import PasswordRequirements from "@/components/PasswordRequirements";
import ResetPasswordModal from "@/components/ResetPasswordModal";
import CSVImportModal from "@/components/CSVImportModal";
import { validatePassword } from "@/utils/passwordValidation";

const AdminTeacherPage: React.FC = () => {
  // ==================== State Management ====================
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isCSVImportModalOpen, setIsCSVImportModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherResponse | null>(
    null
  );
  const [viewingTeacher, setViewingTeacher] = useState<TeacherResponse | null>(
    null
  );
  const [resettingTeacher, setResettingTeacher] = useState<TeacherResponse | null>(
    null
  );
  const [form] = Form.useForm();

  // Filters & Pagination
  const [searchText, setSearchText] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<
    string | undefined
  >();
  const [selectedStatus, setSelectedStatus] = useState<boolean | undefined>();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  // Departments & Specializations
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [specializations, setSpecializations] = useState<
    SpecializationResponse[]
  >([]);
  const [filteredSpecializations, setFilteredSpecializations] = useState<
    SpecializationResponse[]
  >([]);

  // Avatar upload state
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);

  // ==================== Helper Functions ====================
  /**
   * Handle avatar file selection and upload
   */
  const handleAvatarChange = async (file: File) => {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      message.error(validation.error);
      return false;
    }

    try {
      setAvatarUploading(true);

      // Upload to S3
      const response = await uploadAvatar(file);
      setAvatarUrl(response.data.url || "");
      
      message.success("Upload ảnh đại diện thành công!");
      return true;
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      message.error(error?.response?.data?.detail || "Không thể upload ảnh");
      return false;
    } finally {
      setAvatarUploading(false);
    }
  };

  /**
   * Generate next teacher code based on existing codes
   * Format: GV001, GV002, ..., GV999
   */
  const generateTeacherCode = async (): Promise<string> => {
    try {
      // Fetch all teachers to check existing codes
      const response = await getTeachersList({ limit: 1000 });
      const existingCodes = response.data
        .map((t) => t.teacher_code)
        .filter((code) => code && code.startsWith("GV"));

      // Extract numbers from codes like GV001, GV002
      const numbers = existingCodes
        .map((code) => {
          const match = code.match(/^GV(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((num) => num > 0);

      // Find next available number
      let nextNumber = 1;
      if (numbers.length > 0) {
        const maxNumber = Math.max(...numbers);
        nextNumber = maxNumber + 1;
      }

      // Format with leading zeros (GV001, GV002, etc.)
      return `GV${String(nextNumber).padStart(3, "0")}`;
    } catch (error) {
      console.error("Error generating teacher code:", error);
      // Fallback to timestamp-based code if API fails
      const timestamp = Date.now().toString().slice(-6);
      return `GV${timestamp}`;
    }
  };

  // ==================== Load Data ====================
  useEffect(() => {
    fetchDepartments();
    fetchSpecializations();
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [pagination.current, pagination.pageSize, searchText, selectedDepartment, selectedStatus]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const params: GetTeachersParams = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (searchText) params.search = searchText;
      if (selectedDepartment) params.department = selectedDepartment;
      if (selectedStatus !== undefined) params.is_active = selectedStatus;

      const response = await getTeachersList(params);
      setTeachers(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.total,
      }));
      setStats(response.stats);
    } catch (error: any) {
      console.error("Error fetching teachers:", error);
      message.error(
        error?.response?.data?.detail || "Không thể tải danh sách giáo viên"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(response);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchSpecializations = async () => {
    try {
      const response = await getSpecializations();
      setSpecializations(response);
      setFilteredSpecializations(response);
    } catch (error) {
      console.error("Error fetching specializations:", error);
    }
  };

  // ==================== Modal Handlers ====================
  const showCreateModal = async () => {
    setEditingTeacher(null);
    form.resetFields();
    setFilteredSpecializations(specializations);
    setAvatarUrl("");
    setPasswordValue(""); // Reset password state
    
    // Generate and set teacher code automatically
    setLoading(true);
    try {
      const newCode = await generateTeacherCode();
      form.setFieldsValue({ teacher_code: newCode });
      message.success(`Mã giáo viên mới: ${newCode}`);
    } catch (error) {
      console.error("Error generating teacher code:", error);
      message.warning("Không thể tạo mã tự động, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
    
    setIsModalOpen(true);
  };

  const showDetailModal = (teacher: TeacherResponse) => {
    setViewingTeacher(teacher);
    setIsDetailModalOpen(true);
  };

  const showEditModal = (teacher: TeacherResponse) => {
    setEditingTeacher(teacher);
    setAvatarUrl(teacher.avatar_url || "");
    
    // Extract email prefix (remove @dut.udn.vn)
    const emailPrefix = teacher.email.replace('@dut.udn.vn', '');
    
    form.setFieldsValue({
      full_name: teacher.full_name,
      email: emailPrefix,
      teacher_code: teacher.teacher_code,
      phone: teacher.phone,
      department_id: teacher.department_id,
      specialization_id: teacher.specialization_id,
      is_active: teacher.is_active,
    });

    // Filter specializations based on selected department
    if (teacher.department_id) {
      const filtered = specializations.filter(
        (spec) => spec.department_id === teacher.department_id
      );
      setFilteredSpecializations(filtered);
    } else {
      setFilteredSpecializations(specializations);
    }

    setIsDetailModalOpen(false); // Close detail modal
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
    setAvatarUrl("");
    setPasswordValue(""); // Reset password state
    form.resetFields();
  };

  const handleDetailModalCancel = () => {
    setIsDetailModalOpen(false);
    setViewingTeacher(null);
  };

  const showResetPasswordModal = (teacher: TeacherResponse) => {
    setResettingTeacher(teacher);
    setIsResetPasswordModalOpen(true);
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resettingTeacher) return;
    
    try {
      setLoading(true);
      await resetTeacherPassword(resettingTeacher.id, newPassword);
      setIsResetPasswordModalOpen(false);
      setResettingTeacher(null);
    } catch (error: any) {
      throw error; // Let modal handle the error
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordCancel = () => {
    setIsResetPasswordModalOpen(false);
    setResettingTeacher(null);
  };

  const handleDepartmentChange = (departmentId: number) => {
    // Filter specializations when department changes
    const filtered = specializations.filter(
      (spec) => spec.department_id === departmentId
    );
    setFilteredSpecializations(filtered);
    // Clear specialization field
    form.setFieldValue("specialization_id", undefined);
  };

  // ==================== CRUD Operations ====================
  const handleCreateTeacher = async (values: any) => {
    try {
      setLoading(true);
      
      // Construct full email
      const fullEmail = `${values.email}@dut.udn.vn`;
      
      const createData: CreateTeacherRequest = {
        full_name: values.full_name,
        email: fullEmail,
        password: values.password,
        teacher_code: values.teacher_code,
        phone: values.phone,
        department_id: values.department_id,
        specialization_id: values.specialization_id,
        avatar_url: avatarUrl || undefined,
      };

      await createTeacher(createData);
      message.success("Tạo tài khoản giáo viên thành công!");
      handleModalCancel();
      fetchTeachers();
    } catch (error: any) {
      console.error("Error creating teacher:", error);
      
      // Check if error is "Email already registered"
      const errorDetail = error?.response?.data?.detail;
      if (errorDetail === "Email already registered" || errorDetail?.includes("Email already registered")) {
        // Set form field error for email
        form.setFields([
          {
            name: "email",
            errors: ["Email này đã được đăng ký. Vui lòng sử dụng email khác."],
          },
        ]);
      } else {
        // Show general error message
        message.error(
          errorDetail || "Không thể tạo tài khoản giáo viên"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeacher = async (values: any) => {
    if (!editingTeacher) return;

    try {
      setLoading(true);
      const updateData: UpdateTeacherRequest = {
        department_id: values.department_id,
        specialization_id: values.specialization_id,
        phone: values.phone,
        is_active: values.is_active,
        avatar_url: avatarUrl || editingTeacher.avatar_url || undefined,
      };

      await updateTeacher(editingTeacher.id, updateData);
      message.success("Cập nhật thông tin giáo viên thành công!");
      handleModalCancel();
      fetchTeachers();
    } catch (error: any) {
      console.error("Error updating teacher:", error);
      message.error(
        error?.response?.data?.detail || "Không thể cập nhật thông tin giáo viên"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: number) => {
    try {
      setLoading(true);
      await deleteTeacher(teacherId);
      message.success("Vô hiệu hóa tài khoản giáo viên thành công!");
      fetchTeachers();
    } catch (error: any) {
      console.error("Error deleting teacher:", error);
      message.error(
        error?.response?.data?.detail || "Không thể vô hiệu hóa tài khoản"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleModalSubmit = () => {
    form.validateFields().then((values) => {
      if (editingTeacher) {
        handleUpdateTeacher(values);
      } else {
        handleCreateTeacher(values);
      }
    });
  };

  // ==================== Filter Handlers ====================
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleDepartmentFilterChange = (value: string | undefined) => {
    setSelectedDepartment(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleStatusFilterChange = (value: boolean | undefined) => {
    setSelectedStatus(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    setSearchText("");
    setSelectedDepartment(undefined);
    setSelectedStatus(undefined);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    setPagination({
      current: newPagination.current || 1,
      pageSize: newPagination.pageSize || 10,
      total: pagination.total,
    });
  };

  // ==================== Table Columns ====================
  const columns: ColumnsType<TeacherResponse> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
      fixed: "left",
    },
    {
      title: "Ảnh",
      dataIndex: "avatar_url",
      key: "avatar_url",
      width: 70,
      fixed: "left",
      render: (avatarUrl: string | null) => (
        <Avatar
          size={40}
          src={avatarUrl}
          icon={<UserOutlined />}
          style={{ border: "1px solid #d9d9d9" }}
        />
      ),
    },
    {
      title: "Mã GV",
      dataIndex: "teacher_code",
      key: "teacher_code",
      width: 110,
      fixed: "left",
    },
    {
      title: "Họ và tên",
      dataIndex: "full_name",
      key: "full_name",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 240,
      ellipsis: true,
    },
    {
      title: "Khoa",
      dataIndex: "department",
      key: "department",
      width: 200,
      ellipsis: true,
      render: (text) => text || "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      width: 130,
      render: (isActive: boolean) => (
        <Tag
          color={getStatusColor(isActive)}
          icon={
            isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />
          }
        >
          {getStatusText(isActive)}
        </Tag>
      ),
    },
  ];

  // ==================== Render ====================
  return (
    <div style={{ padding: "0 24px 24px" }}>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { title: "Trang chủ", href: "/admin" },
          { title: "Quản lý giáo viên" },
        ]}
      />

      {/* Page Title */}
      <Title level={2} style={{ marginTop: 16, marginBottom: 24 }}>
        <UserOutlined style={{ marginRight: 8 }} />
        Quản lý giáo viên
      </Title>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng số giáo viên"
              value={stats.total}
              valueStyle={{ color: "#1890ff" }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Đang hoạt động"
              value={stats.active}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Không hoạt động"
              value={stats.inactive}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content Card */}
      <Card>
        {/* Filters & Actions */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={8} lg={6}>
            <Input
              placeholder="Tìm theo tên, email, mã GV"
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={12} md={6} lg={5}>
            <Select
              placeholder="Lọc theo khoa"
              style={{ width: "100%" }}
              allowClear
              value={selectedDepartment}
              onChange={handleDepartmentFilterChange}
            >
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.name}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={12} md={6} lg={5}>
            <Select
              placeholder="Lọc theo trạng thái"
              style={{ width: "100%" }}
              allowClear
              value={selectedStatus}
              onChange={handleStatusFilterChange}
            >
              <Option value={true}>Hoạt động</Option>
              <Option value={false}>Không hoạt động</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={4} lg={8} style={{ textAlign: "right" }}>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Làm mới
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setIsCSVImportModalOpen(true)}
              >
                Nhập CSV
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={showCreateModal}
              >
                Thêm giáo viên
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider style={{ margin: "16px 0" }} />

        {/* Table */}
        <Table
          columns={columns}
          dataSource={teachers}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} giáo viên`,
            pageSizeOptions: ["10", "20", "50", "100"],
            responsive: true,
          }}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: () => showDetailModal(record),
            style: { cursor: "pointer" },
          })}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={
          editingTeacher ? "Chỉnh sửa giáo viên" : "Thêm giáo viên mới"
        }
        open={isModalOpen}
        onOk={handleModalSubmit}
        onCancel={handleModalCancel}
        confirmLoading={loading}
        width={600}
        okText={editingTeacher ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          {/* Full Name */}
          <Form.Item
            label="Họ và tên"
            name="full_name"
            rules={[
              { required: true, message: "Vui lòng nhập họ và tên!" },
              { min: 2, message: "Họ tên phải có ít nhất 2 ký tự" },
            ]}
          >
            <Input
              placeholder="Nguyễn Văn A"
              disabled={!!editingTeacher}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              {/* Teacher Code - Auto-generated for new teachers */}
              <Form.Item
                label={
                  <span>
                    Mã giáo viên
                    {!editingTeacher && (
                      <Tag color="green" style={{ marginLeft: 8 }}>
                        Tự động
                      </Tag>
                    )}
                  </span>
                }
                name="teacher_code"
                rules={[
                  { required: true, message: "Vui lòng nhập mã giáo viên!" },
                  {
                    pattern: /^[A-Z0-9]+$/,
                    message: "Mã GV chỉ chứa chữ in hoa và số",
                  },
                ]}
                tooltip={
                  !editingTeacher
                    ? "Mã giáo viên được tạo tự động và không thể chỉnh sửa"
                    : undefined
                }
              >
                <Input
                  placeholder="GV001"
                  disabled={true}
                  style={{ 
                    backgroundColor: !editingTeacher ? "#f0f0f0" : undefined,
                    cursor: "not-allowed" 
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              {/* Email */}
              <Form.Item
                label="Email (tên đăng nhập)"
                name="email"
                rules={[
                  { required: true, message: "Vui lòng nhập email!" },
                  {
                    pattern: /^[a-zA-Z0-9._%+-]+$/,
                    message: "Email không hợp lệ!",
                  },
                ]}
                tooltip="Nhập phần trước @. Hệ thống tự động thêm @dut.udn.vn"
              >
                <Input
                  placeholder="ten.giaovien"
                  addonAfter="@dut.udn.vn"
                  disabled={!!editingTeacher}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Password (only for create) */}
          {!editingTeacher && (
            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu!" },
                { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const validation = validatePassword(value);
                    if (validation.isValid) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(validation.errors.join(", ")));
                  },
                },
              ]}
              extra={<PasswordRequirements password={passwordValue} />}
            >
              <Input.Password 
                placeholder="Nhập mật khẩu"
                onChange={(e) => setPasswordValue(e.target.value)}
              />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              {/* Department */}
              <Form.Item
                label="Khoa"
                name="department_id"
                rules={[{ required: true, message: "Vui lòng chọn khoa!" }]}
              >
                <Select
                  placeholder="Chọn khoa"
                  onChange={handleDepartmentChange}
                  showSearch
                  optionFilterProp="children"
                >
                  {departments.map((dept) => (
                    <Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              {/* Specialization */}
              <Form.Item
                label="Chuyên ngành"
                name="specialization_id"
              >
                <Select
                  placeholder="Chọn chuyên ngành"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  disabled={filteredSpecializations.length === 0}
                >
                  {filteredSpecializations.map((spec) => (
                    <Option key={spec.id} value={spec.id}>
                      {spec.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              {/* Phone */}
              <Form.Item
                label="Số điện thoại"
                name="phone"
                rules={[
                  {
                    pattern: /^[0-9]{10,11}$/,
                    message: "SĐT phải có 10-11 chữ số",
                  },
                ]}
              >
                <Input placeholder="0123456789" />
              </Form.Item>
            </Col>
            {editingTeacher && (
              <Col xs={24} sm={12}>
                {/* Active Status (only for edit) */}
                <Form.Item
                  label="Trạng thái"
                  name="is_active"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Select>
                    <Option value={true}>Hoạt động</Option>
                    <Option value={false}>Không hoạt động</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* Avatar Upload */}
          <Form.Item label="Ảnh đại diện">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {avatarUrl ? (
                <Avatar
                  size={120}
                  src={avatarUrl}
                  icon={<UserOutlined />}
                  style={{ border: "2px solid #d9d9d9" }}
                />
              ) : (
                <Avatar
                  size={120}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#f0f0f0", border: "2px solid #d9d9d9" }}
                />
              )}
              <Upload
                accept="image/jpeg,image/png,image/gif"
                beforeUpload={(file) => {
                  handleAvatarChange(file);
                  return false; // Prevent auto upload
                }}
                showUploadList={false}
                maxCount={1}
              >
                <Button 
                  icon={<CameraOutlined />} 
                  loading={avatarUploading}
                  disabled={avatarUploading}
                >
                  {avatarUrl ? "Thay đổi ảnh" : "Chọn ảnh đại diện"}
                </Button>
              </Upload>
              {avatarUrl && (
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    setAvatarUrl("");
                  }}
                >
                  Xóa ảnh
                </Button>
              )}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
              Chấp nhận: JPG, PNG, GIF. Kích thước tối đa: 5MB
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Teacher Detail Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            <span>Thông tin chi tiết giáo viên</span>
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={handleDetailModalCancel}
        footer={null}
        width={800}
      >
        {viewingTeacher && (
          <div>
            {/* Avatar and Basic Info */}
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                <Avatar
                  size={150}
                  src={viewingTeacher.avatar_url}
                  icon={<UserOutlined />}
                  style={{ border: "3px solid #1890ff", marginBottom: 16 }}
                />
                <div style={{ marginTop: 16 }}>
                  <Tag
                    color={getStatusColor(viewingTeacher.is_active)}
                    icon={
                      viewingTeacher.is_active ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )
                    }
                    style={{ fontSize: 14, padding: "4px 12px" }}
                  >
                    {getStatusText(viewingTeacher.is_active)}
                  </Tag>
                </div>
              </Col>
              <Col xs={24} sm={16}>
                <Title level={3} style={{ marginTop: 0 }}>
                  {viewingTeacher.full_name}
                </Title>
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <div>
                    <Text strong>Mã giáo viên:</Text>{" "}
                    <Tag color="blue">{viewingTeacher.teacher_code}</Tag>
                  </div>
                  <div>
                    <Text strong>Email:</Text> {viewingTeacher.email}
                  </div>
                  <div>
                    <Text strong>Số điện thoại:</Text>{" "}
                    {viewingTeacher.phone || "-"}
                  </div>
                </Space>
              </Col>
            </Row>

            <Divider />

            {/* Department and Specialization */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card size="small" title="Khoa">
                  <Text>{viewingTeacher.department || "-"}</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small" title="Chuyên ngành">
                  <Text>{viewingTeacher.specialization || "-"}</Text>
                </Card>
              </Col>
            </Row>

            <Divider />

            {/* Timestamps */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Text type="secondary">
                  <strong>Ngày tạo:</strong>{" "}
                  {new Date(viewingTeacher.created_at).toLocaleString("vi-VN")}
                </Text>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">
                  <strong>Cập nhật:</strong>{" "}
                  {new Date(viewingTeacher.updated_at).toLocaleString("vi-VN")}
                </Text>
              </Col>
            </Row>

            <Divider />

            {/* Action Buttons */}
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => showEditModal(viewingTeacher)}
              >
                Chỉnh sửa
              </Button>
              <Button
                icon={<LockOutlined />}
                onClick={() => showResetPasswordModal(viewingTeacher)}
              >
                Đặt lại mật khẩu
              </Button>
              <Popconfirm
                title="Vô hiệu hóa giáo viên"
                description="Bạn có chắc muốn vô hiệu hóa tài khoản này?"
                onConfirm={() => {
                  handleDeleteTeacher(viewingTeacher.id);
                  handleDetailModalCancel();
                }}
                okText="Có"
                cancelText="Không"
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!viewingTeacher.is_active}
                >
                  Vô hiệu hóa
                </Button>
              </Popconfirm>
              <Button onClick={handleDetailModalCancel}>Đóng</Button>
            </Space>
          </div>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        visible={isResetPasswordModalOpen}
        onCancel={handleResetPasswordCancel}
        onSuccess={handleResetPassword}
        userType="teacher"
        userName={resettingTeacher?.full_name || ""}
        loading={loading}
      />

      {/* CSV Import Modal */}
      <CSVImportModal
        visible={isCSVImportModalOpen}
        onCancel={() => setIsCSVImportModalOpen(false)}
        onSuccess={() => {
          setIsCSVImportModalOpen(false);
          fetchTeachers();
        }}
        type="teacher"
      />
    </div>
  );
};

export default AdminTeacherPage;
