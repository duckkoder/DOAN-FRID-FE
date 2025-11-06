import React, { useState, useEffect, useContext } from "react";
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Alert, 
  Upload, 
  Avatar,
  Select,
  DatePicker
} from "antd";
import { 
  UserOutlined, 
  CameraOutlined, 
  SaveOutlined,
  LockOutlined
} from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import { AuthContext } from "../../context/AuthContext";
import dayjs from "dayjs";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import { 
  getStudentProfile, 
  updateStudentProfile,
  uploadAndUpdateStudentAvatar,
  type StudentProfileData
} from "../../apis/userAPIs/profile";
import { 
  getDepartments,
  type DepartmentResponse
} from "../../apis/departmentAPIs/department";

const StudentProfilePage: React.FC = () => {
  const [form] = Form.useForm();
  const authContext = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const depts = await getDepartments();
        setDepartments(depts);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };
    
    fetchDepartments();
  }, []);

  // Fetch student profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getStudentProfile();
        form.setFieldsValue({
          full_name: data.full_name,
          email: data.email,
          student_code: data.student_code,
          date_of_birth: data.date_of_birth ? dayjs(data.date_of_birth) : null,
          department_id: data.department_id,
          academic_year: data.academic_year,
          phone: data.phone || "",
        });
        setAvatarUrl(data.avatar_url || "");
      } catch (error) {
        console.error("Error fetching profile:", error);
        setNotificationType('error');
        setNotificationMessage('Không thể tải thông tin cá nhân!');
        setShowNotification(true);
        // Use context data as fallback
        const fallbackData = {
          full_name: authContext?.user?.full_name || "",
          email: authContext?.user?.email || "",
          student_code: "",
          date_of_birth: null,
          department_id: undefined,
          academic_year: "",
          phone: "",
        };
        form.setFieldsValue(fallbackData);
      }
    };
    
    fetchProfile();
  }, [form, authContext]);

  const handleAvatarChange = async (file: RcFile) => {
    setLoading(true);
    try {
      const result = await uploadAndUpdateStudentAvatar(file);
      setAvatarUrl(result.avatar_url || "");
      
      // Update avatar in AuthContext
      if (authContext?.updateUser) {
        authContext.updateUser({ avatar_url: result.avatar_url });
      }
      
      setNotificationType('success');
      setNotificationMessage('Cập nhật ảnh đại diện thành công!');
      setShowNotification(true);
    } catch (error: unknown) {
      console.error("Error uploading avatar:", error);
      const axiosError = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMsg = axiosError?.response?.data?.detail || axiosError?.message || "Không thể tải ảnh lên!";
      
      setNotificationType('error');
      setNotificationMessage(errorMsg);
      setShowNotification(true);
    } finally {
      setLoading(false);
    }
    return false; // Prevent default upload behavior
  };

  const handleSubmit = async (values: { date_of_birth?: dayjs.Dayjs; department_id?: number; academic_year?: string; phone?: string }) => {
    setLoading(true);
    try {
      const data: StudentProfileData = {
        date_of_birth: values.date_of_birth ? values.date_of_birth.format("YYYY-MM-DD") : undefined,
        department_id: values.department_id,
        academic_year: values.academic_year,
        phone: values.phone,
      };
      
      const result = await updateStudentProfile(data);
      
      // Update user info in AuthContext
      if (authContext?.updateUser) {
        authContext.updateUser({ 
          phone: result.phone,
        });
      }
      
      setNotificationType('success');
      setNotificationMessage('Cập nhật thông tin thành công!');
      setShowNotification(true);
      
      // Update form with latest data
      form.setFieldsValue({
        ...form.getFieldsValue(),
        date_of_birth: result.date_of_birth ? dayjs(result.date_of_birth) : null,
      });
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      const axiosError = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMsg = axiosError?.response?.data?.detail || axiosError?.message || "Không thể cập nhật thông tin!";
      
      setNotificationType('error');
      setNotificationMessage(errorMsg);
      setShowNotification(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Notification Alert */}
      {showNotification && (
        <Alert
          message={notificationType === 'success' ? 'Thành công' : 'Lỗi'}
          description={notificationMessage}
          type={notificationType}
          showIcon
          closable
          onClose={() => setShowNotification(false)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card 
        title="Thông tin cá nhân"
        extra={
          <Button 
            type="primary" 
            icon={<LockOutlined />}
            onClick={() => setPasswordModalVisible(true)}
          >
            Đổi mật khẩu
          </Button>
        }
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Upload
            name="avatar"
            showUploadList={false}
            beforeUpload={handleAvatarChange}
            accept="image/*"
          >
            <div style={{ position: "relative", display: "inline-block" }}>
              <Avatar
                size={120}
                icon={!avatarUrl && <UserOutlined />}
                src={avatarUrl}
                style={{ cursor: "pointer" }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  background: "#1890ff",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "3px solid white",
                }}
              >
                <CameraOutlined style={{ color: "white", fontSize: "16px" }} />
              </div>
            </div>
          </Upload>
          <div style={{ marginTop: "12px", color: "#8c8c8c", fontSize: "14px" }}>
            Nhấp vào ảnh để thay đổi
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Họ và tên"
            name="full_name"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên!" }]}
          >
            <Input placeholder="Nhập họ và tên" disabled />
          </Form.Item>

          <Form.Item
            label="Mã sinh viên"
            name="student_code"
          >
            <Input placeholder="Mã sinh viên" disabled />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
          >
            <Input placeholder="Email" disabled />
          </Form.Item>

          <Form.Item
            label="Ngày sinh"
            name="date_of_birth"
            rules={[{ required: true, message: "Vui lòng chọn ngày sinh!" }]}
          >
            <DatePicker 
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày sinh"
              disabledDate={(current) => {
                // Không cho chọn ngày trong tương lai
                return current && current > dayjs().endOf('day');
              }}
            />
          </Form.Item>

          <Form.Item
            label="Khoa"
            name="department_id"
          >
            <Select 
              placeholder="Chọn khoa" 
              allowClear
              loading={departments.length === 0}
            >
              {departments.map(dept => (
                <Select.Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Niên khóa"
            name="academic_year"
          >
            <Select placeholder="Chọn niên khóa" allowClear>
              <Select.Option value="2019">2019</Select.Option>
              <Select.Option value="2020">2020</Select.Option>
              <Select.Option value="2021">2021</Select.Option>
              <Select.Option value="2022">2022</Select.Option>
              <Select.Option value="2023">2023</Select.Option>
              <Select.Option value="2024">2024</Select.Option>
              <Select.Option value="2025">2025</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { pattern: /^[0-9]{10}$/, message: "Số điện thoại không hợp lệ!" }
            ]}
          >
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />}
              loading={loading}
              block
              size="large"
            >
              Lưu thay đổi
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Password Change Modal */}
      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />
    </div>
  );
};

export default StudentProfilePage;
