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
  UploadOutlined,
} from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/context/ToastContext";
import {
  getStudentsList,
  createStudent,
  updateStudent,
  deleteStudent,
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
import CSVImportModal from "@/components/CSVImportModal";
import { validatePassword } from "@/utils/passwordValidation";

const AdminStudentPage: React.FC = () => {
  // ==================== Hooks ====================
  const toast = useToast();
  
  // ==================== State Management ====================
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isCSVImportModalOpen, setIsCSVImportModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 576);
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

  // ==================== Responsive Detection ====================
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 576);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      toast.error(validation.error || "Invalid file");
      return false;
    }

    try {
      setAvatarUploading(true);

      // Upload to S3
      const response = await uploadAvatar(file);
      setAvatarUrl(response.data.url || "");
      
      toast.success("Avatar uploaded successfully!");
      return true;
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error?.response?.data?.detail || "Cannot upload image");
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
      toast.error(
        error?.response?.data?.detail || "Cannot load students list"
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
    
    // No need to generate student code - it will be auto-filled from email
    
    setIsModalOpen(true);
  };

  const showDetailModal = (student: StudentResponse) => {
    setViewingStudent(student);
    setIsDetailModalOpen(true);
  };

  const showEditModal = (student: StudentResponse) => {
    setEditingStudent(student);
    setAvatarUrl(student.avatar_url || "");
    
    // Extract student code from email (remove @sv1.dut.udn.vn)
    const emailPrefix = student.email.replace('@sv1.dut.udn.vn', '');
    
    form.setFieldsValue({
      full_name: student.full_name,
      student_code: student.student_code,
      email: emailPrefix, // Set email prefix (without domain)
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
      
      // Construct full email from student code
      const fullEmail = `${values.email}@sv1.dut.udn.vn`;
      
      const createData: CreateStudentRequest = {
        full_name: values.full_name,
        email: fullEmail,
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
      toast.success("Student account created successfully!");
      handleModalCancel();
      fetchStudents();
    } catch (error: any) {
      console.error("Error creating student:", error);
      
      // Check if error is "Email already registered"
      const errorDetail = error?.response?.data?.detail;
      if (errorDetail === "Email already registered" || errorDetail?.includes("Email already registered")) {
        // Set form field error for email
        form.setFields([
          {
            name: "email",
            errors: ["This email is already registered. Please use a different student ID."],
          },
        ]);
      } else {
        // Show general error message
        toast.error(
          errorDetail || "Cannot create student account"
        );
      }
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
      toast.success("Student information updated successfully!");
      handleModalCancel();
      fetchStudents();
    } catch (error: any) {
      console.error("Error updating student:", error);
      toast.error(
        error?.response?.data?.detail || "Cannot update student information"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: number) => {
    try {
      setLoading(true);
      await deleteStudent(studentId);
      toast.success("Student account deactivated successfully!");
      fetchStudents();
    } catch (error: any) {
      console.error("Error deleting student:", error);
      toast.error(
        error?.response?.data?.detail || "Cannot deactivate account"
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
      title: "Photo",
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
      title: "Student ID",
      dataIndex: "student_code",
      key: "student_code",
      width: 110,
      fixed: "left",
    },
    {
      title: "Full Name",
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
      title: "Department",
      dataIndex: "department",
      key: "department",
      width: 180,
      ellipsis: true,
      render: (text) => text || "-",
    },
    {
      title: "Year",
      dataIndex: "academic_year",
      key: "academic_year",
      width: 90,
      render: (text) => text || "-",
    },
    {
      title: "Verified",
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
      title: "Status",
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
          { title: "Home", href: "/admin" },
          { title: "Students Management" },
        ]}
      />

      {/* Page Title */}
      <Title level={2} style={{ marginTop: 16, marginBottom: 24 }}>
        <UserOutlined style={{ marginRight: 8 }} />
        Students Management
      </Title>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Students"
              value={stats.total}
              valueStyle={{ color: "#1890ff" }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active"
              value={stats.active}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Inactive"
              value={stats.inactive}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Verified"
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
              placeholder="Search by name, email, student ID"
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              placeholder="Filter by Department"
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
              placeholder="Filter by Year"
              style={{ width: "100%" }}
              allowClear
              value={selectedAcademicYear}
              onChange={handleAcademicYearFilterChange}
            >
              <Option value="2021">Year 2021</Option>
              <Option value="2022">Year 2022</Option>
              <Option value="2023">Year 2023</Option>
              <Option value="2024">Year 2024</Option>
              <Option value="2025">Year 2025</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              placeholder="Status"
              style={{ width: "100%" }}
              allowClear
              value={selectedStatus}
              onChange={handleStatusFilterChange}
            >
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              placeholder="Verification"
              style={{ width: "100%" }}
              allowClear
              value={selectedVerified}
              onChange={handleVerifiedFilterChange}
            >
              <Option value={true}>Verified</Option>
              <Option value={false}>Not Verified</Option>
            </Select>
          </Col>
          <Col xs={24} sm={16} md={6} lg={7}>
            <Row gutter={[8, 8]} justify={{ xs: 'start', sm: 'end', md: 'end' }}>
              <Col flex={isMobile ? "1" : "none"}>
                <Button icon={<ReloadOutlined />} onClick={handleReset} style={{ width: isMobile ? '100%' : 'auto' }}>
                  {!isMobile && "Reset"}
                </Button>
              </Col>
              <Col flex={isMobile ? "1" : "none"}>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => setIsCSVImportModalOpen(true)}
                  style={{ width: isMobile ? '100%' : 'auto' }}
                >
                  {!isMobile && "Import CSV"}
                </Button>
              </Col>
              <Col flex={isMobile ? "1" : "none"}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={showCreateModal}
                  style={{ width: isMobile ? '100%' : 'auto' }}
                >
                  {!isMobile && "Add"}
                </Button>
              </Col>
            </Row>
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
            showSizeChanger: !isMobile,
            showTotal: (total, range) => (
              <span style={{ fontSize: 12 }}>
                {range[0]}-{range[1]} / {total}
              </span>
            ),
            pageSizeOptions: ["10", "20", "50", "100"],
            size: "small",
            simple: isMobile,
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
          editingStudent ? "Edit Student" : "Add New Student"
        }
        open={isModalOpen}
        onOk={handleModalSubmit}
        onCancel={handleModalCancel}
        confirmLoading={loading}
        width={700}
        okText={editingStudent ? "Update" : "Create"}
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          {/* Full Name */}
          <Form.Item
            label="Full Name"
            name="full_name"
            rules={[
              { required: true, message: "Please enter full name!" },
              { min: 2, message: "Name must have at least 2 characters" },
            ]}
          >
            <Input
              placeholder="Nguyen Van A"
              disabled={!!editingStudent}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              {/* Student Code - User input */}
              <Form.Item
                label="Student ID"
                name="student_code"
                rules={[
                  { required: true, message: "Please enter student ID!" },
                  {
                    pattern: /^[0-9]{9}$/,
                    message: "Student ID must be exactly 9 digits!",
                  },
                ]}
                tooltip="Enter 9-digit student ID. Email will be auto-generated"
              >
                <Input
                  placeholder="102220347"
                  disabled={!!editingStudent}
                  maxLength={9}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    form.setFieldValue('student_code', value);
                    // Auto-fill email from student_code
                    if (value.length === 9) {
                      form.setFieldValue('email', value);
                    } else {
                      form.setFieldValue('email', '');
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              {/* Email - Auto-generated from student_code */}
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Email is generated from student ID!" },
                  {
                    pattern: /^[0-9]{9}$/,
                    message: "Email must have 9 digits (from student ID)",
                  },
                ]}
                tooltip={
                  !editingStudent
                    ? "Email is auto-generated from student ID"
                    : undefined
                }
              >
                <Input
                  placeholder="102220347"
                  addonAfter="@sv1.dut.udn.vn"
                  disabled={true}
                  style={{ 
                    backgroundColor: !editingStudent ? "#f0f0f0" : undefined,
                    cursor: "not-allowed" 
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Password (only for create) */}
          {!editingStudent && (
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Please enter password!" },
                { min: 8, message: "Password must have at least 8 characters" },
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
                placeholder="Enter password"
                onChange={(e) => setPasswordValue(e.target.value)}
              />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              {/* Date of Birth */}
              <Form.Item
                label="Date of Birth"
                name="date_of_birth"
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder="Select date of birth"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              {/* Phone */}
              <Form.Item
                label="Phone Number"
                name="phone"
                rules={[
                  {
                    pattern: /^[0-9]{10,11}$/,
                    message: "Phone number must have 10-11 digits",
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
                label="Department"
                name="department_id"
                rules={[{ required: true, message: "Please select department!" }]}
              >
                <Select
                  placeholder="Select department"
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
                label="Academic Year"
                name="academic_year"
                rules={[
                  {
                    pattern: /^\d{4}$/,
                    message: "Academic year must be 4 digits (e.g., 2021)",
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
                  label="Status"
                  name="is_active"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Select>
                    <Option value={true}>Active</Option>
                    <Option value={false}>Inactive</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                {/* Verification Status (only for edit) */}
                <Form.Item
                  label="Face Verification"
                  name="is_verified"
                  valuePropName="checked"
                >
                  <Select>
                    <Option value={true}>Verified</Option>
                    <Option value={false}>Not Verified</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Avatar Upload */}
          <Form.Item label="Profile Picture">
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
                  {avatarUrl ? "Change Photo" : "Select Profile Picture"}
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
                  Remove Photo
                </Button>
              )}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
              Accepted: JPG, PNG, GIF. Maximum size: 5MB
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Student Detail Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            <span>Student Details</span>
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
                    <Text strong>Student ID:</Text>{" "}
                    <Tag color="blue">{viewingStudent.student_code}</Tag>
                  </div>
                  <div>
                    <Text strong>Email:</Text> {viewingStudent.email}
                  </div>
                  <div>
                    <Text strong>Phone Number:</Text>{" "}
                    {viewingStudent.phone || "-"}
                  </div>
                  <div>
                    <Text strong>Date of Birth:</Text>{" "}
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
                <Card size="small" title="Department">
                  <Text>{viewingStudent.department || "-"}</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small" title="Academic Year">
                  <Text>{viewingStudent.academic_year || "-"}</Text>
                </Card>
              </Col>
            </Row>

            <Divider />

            {/* Timestamps */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Text type="secondary">
                  <strong>Created At:</strong>{" "}
                  {new Date(viewingStudent.created_at).toLocaleString("en-US")}
                </Text>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary">
                  <strong>Updated At:</strong>{" "}
                  {new Date(viewingStudent.updated_at).toLocaleString("en-US")}
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
                Edit
              </Button>
              <Button
                icon={<LockOutlined />}
                onClick={() => showResetPasswordModal(viewingStudent)}
              >
                Reset Password
              </Button>
              <Popconfirm
                title="Deactivate Student"
                description="Are you sure you want to deactivate this account?"
                onConfirm={() => {
                  handleDeleteStudent(viewingStudent.id);
                  handleDetailModalCancel();
                }}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!viewingStudent.is_active}
                >
                  Deactivate
                </Button>
              </Popconfirm>
              <Button onClick={handleDetailModalCancel}>Close</Button>
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

      {/* CSV Import Modal */}
      <CSVImportModal
        visible={isCSVImportModalOpen}
        onCancel={() => setIsCSVImportModalOpen(false)}
        onSuccess={() => {
          setIsCSVImportModalOpen(false);
          fetchStudents();
        }}
        type="student"
      />
    </div>
  );
};

export default AdminStudentPage;
