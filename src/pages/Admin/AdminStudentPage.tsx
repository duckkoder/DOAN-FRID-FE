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
  DatePicker,
} from "antd";

const { Title, Text } = Typography;
const { Option } = Select;

import {
  UserOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CameraOutlined,
  SafetyOutlined,
  LockOutlined,
} from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import Breadcrumb from "@/components/Breadcrumb";
import {
  getStudentsList,
  createStudent,
  updateStudent,
  deleteStudent,
  generateStudentCode,
  resetStudentPassword,
  getStatusColor,
  getStatusText,
  getVerificationColor,
  getVerificationText,
  type StudentResponse,
  type GetStudentsParams,
  type CreateStudentRequest,
  type UpdateStudentRequest,
} from "@/apis/studentAPIs/student";
import {
  getDepartments,
  type DepartmentResponse,
} from "@/apis/departmentAPIs/department";
import {
  uploadAvatar,
  validateImageFile,
} from "@/apis/fileAPIs/file";
import dayjs from "dayjs";
import AdminFaceRegistrationTable from "@/components/AdminFaceRegistrationTable";
import PasswordRequirements from "@/components/PasswordRequirements";
import ResetPasswordModal from "@/components/ResetPasswordModal";
import { validatePassword } from "@/utils/passwordValidation";

const AdminStudentPage: React.FC = () => {
  // ==================== State Management ====================
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentResponse | null>(
    null
  );
  const [viewingStudent, setViewingStudent] = useState<StudentResponse | null>(
    null
  );
  const [resettingStudent, setResettingStudent] = useState<StudentResponse | null>(
    null
  );
  const [form] = Form.useForm();

  // Filters & Pagination
  const [searchText, setSearchText] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<
    string | undefined
  >();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<
    string | undefined
  >();
  const [selectedStatus, setSelectedStatus] = useState<boolean | undefined>();
  const [selectedVerified, setSelectedVerified] = useState<boolean | undefined>();
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
    verified: 0,
    unverified: 0,
  });

  // Departments
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);

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

  // ==================== Load Data ====================
  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [
    pagination.current,
    pagination.pageSize,
    searchText,
    selectedDepartment,
    selectedAcademicYear,
    selectedStatus,
    selectedVerified,
  ]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params: GetStudentsParams = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (searchText) params.search = searchText;
      if (selectedDepartment) params.department = selectedDepartment;
      if (selectedAcademicYear) params.academic_year = selectedAcademicYear;
      if (selectedStatus !== undefined) params.is_active = selectedStatus;
      if (selectedVerified !== undefined) params.is_verified = selectedVerified;

      const response = await getStudentsList(params);
      setStudents(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.total,
      }));
      setStats(response.stats);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      message.error(
        error?.response?.data?.detail || "Không thể tải danh sách sinh viên"
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

  // ==================== Modal Handlers ====================
  const showCreateModal = async () => {
    setEditingStudent(null);
    form.resetFields();
    setAvatarUrl("");
    setPasswordValue(""); // Reset password state
    
    // Generate and set student code automatically
    setLoading(true);
    try {
      const newCode = await generateStudentCode();
      form.setFieldsValue({ student_code: newCode });
      message.success(`Mã sinh viên mới: ${newCode}`);
    } catch (error) {
      console.error("Error generating student code:", error);
      message.warning("Không thể tạo mã tự động, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
    
    setIsModalOpen(true);
  };

  const showDetailModal = (student: StudentResponse) => {
    setViewingStudent(student);
    setIsDetailModalOpen(true);
  };

  const showEditModal = (student: StudentResponse) => {
    setEditingStudent(student);
    setAvatarUrl(student.avatar_url || "");
    
    form.setFieldsValue({
      full_name: student.full_name,
      email: student.email,
      student_code: student.student_code,
      phone: student.phone,
      department_id: student.department_id,
      academic_year: student.academic_year,
      date_of_birth: student.date_of_birth ? dayjs(student.date_of_birth) : null,
      is_active: student.is_active,
      is_verified: student.is_verified,
    });

    setIsDetailModalOpen(false); // Close detail modal
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
    setAvatarUrl("");
    setPasswordValue(""); // Reset password state
    form.resetFields();
  };

  const handleDetailModalCancel = () => {
    setIsDetailModalOpen(false);
    setViewingStudent(null);
  };

  const showResetPasswordModal = (student: StudentResponse) => {
    setResettingStudent(student);
    setIsResetPasswordModalOpen(true);
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resettingStudent) return;
    
    try {
      setLoading(true);
      await resetStudentPassword(resettingStudent.id, newPassword);
      setIsResetPasswordModalOpen(false);
      setResettingStudent(null);
    } catch (error: any) {
      throw error; // Let modal handle the error
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordCancel = () => {
    setIsResetPasswordModalOpen(false);
    setResettingStudent(null);
  };

  // ==================== CRUD Operations ====================
  const handleCreateStudent = async (values: any) => {
    try {
      setLoading(true);
      const createData: CreateStudentRequest = {
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        student_code: values.student_code,
        phone: values.phone,
        department_id: values.department_id,
        academic_year: values.academic_year,
        date_of_birth: values.date_of_birth
          ? dayjs(values.date_of_birth).format("YYYY-MM-DD")
          : undefined,
        avatar_url: avatarUrl || undefined,
      };

      await createStudent(createData);
      message.success("Tạo tài khoản sinh viên thành công!");
      handleModalCancel();
      fetchStudents();
    } catch (error: any) {
      console.error("Error creating student:", error);
      message.error(
        error?.response?.data?.detail || "Không thể tạo tài khoản sinh viên"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStudent = async (values: any) => {
    if (!editingStudent) return;

    try {
      setLoading(true);
      const updateData: UpdateStudentRequest = {
        department_id: values.department_id,
        academic_year: values.academic_year,
        date_of_birth: values.date_of_birth
          ? dayjs(values.date_of_birth).format("YYYY-MM-DD")
          : undefined,
        phone: values.phone,
        is_active: values.is_active,
        is_verified: values.is_verified,
        avatar_url: avatarUrl || editingStudent.avatar_url || undefined,
      };

      await updateStudent(editingStudent.id, updateData);
      message.success("Cập nhật thông tin sinh viên thành công!");
      handleModalCancel();
      fetchStudents();
    } catch (error: any) {
      console.error("Error updating student:", error);
      message.error(
        error?.response?.data?.detail || "Không thể cập nhật thông tin sinh viên"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: number) => {
    try {
      setLoading(true);
      await deleteStudent(studentId);
      message.success("Vô hiệu hóa tài khoản sinh viên thành công!");
      fetchStudents();
    } catch (error: any) {
      console.error("Error deleting student:", error);
      message.error(
        error?.response?.data?.detail || "Không thể vô hiệu hóa tài khoản"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleModalSubmit = () => {
    form.validateFields().then((values) => {
      if (editingStudent) {
        handleUpdateStudent(values);
      } else {
        handleCreateStudent(values);
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

  const handleAcademicYearFilterChange = (value: string | undefined) => {
    setSelectedAcademicYear(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleStatusFilterChange = (value: boolean | undefined) => {
    setSelectedStatus(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleVerifiedFilterChange = (value: boolean | undefined) => {
    setSelectedVerified(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    setSearchText("");
    setSelectedDepartment(undefined);
    setSelectedAcademicYear(undefined);
    setSelectedStatus(undefined);
    setSelectedVerified(undefined);
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
  const columns: ColumnsType<StudentResponse> = [
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
      title: "Mã SV",
      dataIndex: "student_code",
      key: "student_code",
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
      width: 180,
      ellipsis: true,
      render: (text) => text || "-",
    },
    {
      title: "Khóa",
      dataIndex: "academic_year",
      key: "academic_year",
      width: 90,
      render: (text) => text || "-",
    },
    {
      title: "Xác thực",
      dataIndex: "is_verified",
      key: "is_verified",
      width: 120,
      render: (isVerified: boolean) => (
        <Tag
          color={getVerificationColor(isVerified)}
          icon={
            isVerified ? <CheckCircleOutlined /> : <CloseCircleOutlined />
          }
        >
          {getVerificationText(isVerified)}
        </Tag>
      ),
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
          { title: "Quản lý sinh viên" },
        ]}
      />

      {/* Page Title */}
      <Title level={2} style={{ marginTop: 16, marginBottom: 24 }}>
        <UserOutlined style={{ marginRight: 8 }} />
        Quản lý sinh viên
      </Title>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng số sinh viên"
              value={stats.total}
              valueStyle={{ color: "#1890ff" }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đang hoạt động"
              value={stats.active}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Không hoạt động"
              value={stats.inactive}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã xác thực"
              value={stats.verified}
              valueStyle={{ color: "#52c41a" }}
              prefix={<SafetyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Face Registration Management Table */}
      <div style={{ marginBottom: 24 }}>
        <AdminFaceRegistrationTable />
      </div>

      {/* Main Content Card */}
      <Card>
        {/* Filters & Actions */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={6} lg={5}>
            <Input
              placeholder="Tìm theo tên, email, mã SV"
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
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
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              placeholder="Lọc theo khóa"
              style={{ width: "100%" }}
              allowClear
              value={selectedAcademicYear}
              onChange={handleAcademicYearFilterChange}
            >
              <Option value="2021">Khóa 2021</Option>
              <Option value="2022">Khóa 2022</Option>
              <Option value="2023">Khóa 2023</Option>
              <Option value="2024">Khóa 2024</Option>
              <Option value="2025">Khóa 2025</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              placeholder="Trạng thái"
              style={{ width: "100%" }}
              allowClear
              value={selectedStatus}
              onChange={handleStatusFilterChange}
            >
              <Option value={true}>Hoạt động</Option>
              <Option value={false}>Không hoạt động</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              placeholder="Xác thực"
              style={{ width: "100%" }}
              allowClear
              value={selectedVerified}
              onChange={handleVerifiedFilterChange}
            >
              <Option value={true}>Đã xác thực</Option>
              <Option value={false}>Chưa xác thực</Option>
            </Select>
          </Col>
          <Col xs={24} sm={16} md={6} lg={7} style={{ textAlign: "right" }}>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Đặt lại
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={showCreateModal}
              >
                Thêm sinh viên
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider style={{ margin: "16px 0" }} />

        {/* Table */}
        <Table
          columns={columns}
          dataSource={students}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} sinh viên`,
            pageSizeOptions: ["10", "20", "50", "100"],
            responsive: true,
          }}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: () => showDetailModal(record),
            style: { cursor: "pointer" },
          })}
          scroll={{ x: 1100 }}
          size="middle"
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={
          editingStudent ? "Chỉnh sửa sinh viên" : "Thêm sinh viên mới"
        }
        open={isModalOpen}
        onOk={handleModalSubmit}
        onCancel={handleModalCancel}
        confirmLoading={loading}
        width={700}
        okText={editingStudent ? "Cập nhật" : "Tạo mới"}
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
              disabled={!!editingStudent}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              {/* Student Code - Auto-generated */}
              <Form.Item
                label={
                  <span>
                    Mã sinh viên
                    {!editingStudent && (
                      <Tag color="green" style={{ marginLeft: 8 }}>
                        Tự động
                      </Tag>
                    )}
                  </span>
                }
                name="student_code"
                rules={[
                  { required: true, message: "Vui lòng nhập mã sinh viên!" },
                  {
                    pattern: /^[A-Z0-9]+$/,
                    message: "Mã SV chỉ chứa chữ in hoa và số",
                  },
                ]}
                tooltip={
                  !editingStudent
                    ? "Mã sinh viên được tạo tự động và không thể chỉnh sửa"
                    : undefined
                }
              >
                <Input
                  placeholder="SV001"
                  disabled={true}
                  style={{ 
                    backgroundColor: !editingStudent ? "#f0f0f0" : undefined,
                    cursor: "not-allowed" 
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              {/* Email */}
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Vui lòng nhập email!" },
                  { type: "email", message: "Email không hợp lệ!" },
                ]}
              >
                <Input
                  placeholder="example@university.edu.vn"
                  disabled={!!editingStudent}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Password (only for create) */}
          {!editingStudent && (
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
              {/* Date of Birth */}
              <Form.Item
                label="Ngày sinh"
                name="date_of_birth"
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày sinh"
                />
              </Form.Item>
            </Col>
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
          </Row>

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
              {/* Academic Year */}
              <Form.Item
                label="Khóa học"
                name="academic_year"
                rules={[
                  {
                    pattern: /^\d{4}$/,
                    message: "Khóa học phải là 4 chữ số (VD: 2021)",
                  },
                ]}
              >
                <Input placeholder="2021" />
              </Form.Item>
            </Col>
          </Row>

          {editingStudent && (
            <Row gutter={16}>
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
              <Col xs={24} sm={12}>
                {/* Verification Status (only for edit) */}
                <Form.Item
                  label="Xác thực khuôn mặt"
                  name="is_verified"
                  valuePropName="checked"
                >
                  <Select>
                    <Option value={true}>Đã xác thực</Option>
                    <Option value={false}>Chưa xác thực</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

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

      {/* Student Detail Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            <span>Thông tin chi tiết sinh viên</span>
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={handleDetailModalCancel}
        footer={null}
        width={800}
      >
        {viewingStudent && (
          <div>
            {/* Avatar and Basic Info */}
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                <Avatar
                  size={150}
                  src={viewingStudent.avatar_url}
                  icon={<UserOutlined />}
                  style={{ border: "3px solid #1890ff", marginBottom: 16 }}
                />
                <div style={{ marginTop: 16 }}>
                  <Tag
                    color={getStatusColor(viewingStudent.is_active)}
                    icon={
                      viewingStudent.is_active ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )
                    }
                    style={{ fontSize: 14, padding: "4px 12px", marginBottom: 8 }}
                  >
                    {getStatusText(viewingStudent.is_active)}
                  </Tag>
                  <br />
                  <Tag
                    color={getVerificationColor(viewingStudent.is_verified)}
                    icon={
                      viewingStudent.is_verified ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )
                    }
                    style={{ fontSize: 14, padding: "4px 12px" }}
                  >
                    {getVerificationText(viewingStudent.is_verified)}
                  </Tag>
                </div>
              </Col>
              <Col xs={24} sm={16}>
                <Title level={3} style={{ marginTop: 0 }}>
                  {viewingStudent.full_name}
                </Title>
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <div>
                    <Text strong>Mã sinh viên:</Text>{" "}
                    <Tag color="blue">{viewingStudent.student_code}</Tag>
                  </div>
                  <div>
                    <Text strong>Email:</Text> {viewingStudent.email}
                  </div>
                  <div>
                    <Text strong>Số điện thoại:</Text>{" "}
                    {viewingStudent.phone || "-"}
                  </div>
                  <div>
                    <Text strong>Ngày sinh:</Text>{" "}
                    {viewingStudent.date_of_birth
                      ? dayjs(viewingStudent.date_of_birth).format("DD/MM/YYYY")
                      : "-"}
                  </div>
                </Space>
              </Col>
            </Row>

            <Divider />

            {/* Academic Info */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card size="small" title="Khoa">
                  <Text>{viewingStudent.department || "-"}</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small" title="Khóa học">
                  <Text>{viewingStudent.academic_year || "-"}</Text>
                </Card>
              </Col>
            </Row>

            <Divider />

            {/* Timestamps */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Text type="secondary">
                  <strong>Ngày tạo:</strong>{" "}
                  {new Date(viewingStudent.created_at).toLocaleString("vi-VN")}
                </Text>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">
                  <strong>Cập nhật:</strong>{" "}
                  {new Date(viewingStudent.updated_at).toLocaleString("vi-VN")}
                </Text>
              </Col>
            </Row>

            <Divider />

            {/* Action Buttons */}
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => showEditModal(viewingStudent)}
              >
                Chỉnh sửa
              </Button>
              <Button
                icon={<LockOutlined />}
                onClick={() => showResetPasswordModal(viewingStudent)}
              >
                Đặt lại mật khẩu
              </Button>
              <Popconfirm
                title="Vô hiệu hóa sinh viên"
                description="Bạn có chắc muốn vô hiệu hóa tài khoản này?"
                onConfirm={() => {
                  handleDeleteStudent(viewingStudent.id);
                  handleDetailModalCancel();
                }}
                okText="Có"
                cancelText="Không"
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!viewingStudent.is_active}
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
        userType="student"
        userName={resettingStudent?.full_name || ""}
        loading={loading}
      />
    </div>
  );
};

export default AdminStudentPage;
