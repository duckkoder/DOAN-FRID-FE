import React, { useState, useEffect, useContext } from "react";
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Alert, 
  Upload, 
  Avatar, 
  Select
} from "antd";
import { 
  UserOutlined, 
  CameraOutlined, 
  SaveOutlined,
  LockOutlined
} from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import { AuthContext } from "../../context/AuthContext";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import { 
  getTeacherProfile, 
  updateTeacherProfile,
  uploadAndUpdateTeacherAvatar,
  type TeacherProfileData
} from "../../apis/userAPIs/profile";
import { 
  getDepartments, 
  type DepartmentResponse,
} from "../../apis/departmentAPIs/department";
import {
  getSpecializations,
  type SpecializationResponse
} from "../../apis/departmentAPIs/specialization";

const TeacherProfilePage: React.FC = () => {
  const [form] = Form.useForm();
  const authContext = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationResponse[]>([]);

  // Fetch departments and specializations
  useEffect(() => {
    const fetchDepartmentsAndSpecializations = async () => {
      try {
        const [depts, specs] = await Promise.all([
          getDepartments(),
          getSpecializations()
        ]);
        setDepartments(depts);
        setSpecializations(specs);
      } catch (error) {
        console.error("Error fetching departments/specializations:", error);
      }
    };
    
    fetchDepartmentsAndSpecializations();
  }, []);

  // Fetch teacher profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getTeacherProfile();
        form.setFieldsValue({
          full_name: data.full_name,
          email: data.email,
          department_id: data.department_id,
          specialization_id: data.specialization_id,
          phone: data.phone || "",
        });
        setAvatarUrl(data.avatar_url || "");
      } catch (error) {
        console.error("Error fetching profile:", error);
        setNotificationType('error');
        setNotificationMessage('Không thể tải thông tin hồ sơ!');
        setShowNotification(true);
        // Use context data as fallback
        const fallbackData = {
          full_name: authContext?.user?.full_name || "",
          email: authContext?.user?.email || "",
          department_id: undefined,
          specialization_id: undefined,
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
      const result = await uploadAndUpdateTeacherAvatar(file);
      setAvatarUrl(result.avatar_url || "");
      
      // Update avatar in AuthContext
      if (authContext?.updateUser) {
        authContext.updateUser({ avatar_url: result.avatar_url });
      }
      
      setNotificationType('success');
      setNotificationMessage('Đã cập nhật ảnh đại diện thành công!');
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

  const handleSubmit = async (values: { department_id?: number; specialization_id?: number; phone?: string }) => {
    setLoading(true);
    try {
      const data: TeacherProfileData = {
        department_id: values.department_id,
        specialization_id: values.specialization_id,
        phone: values.phone,
      };
      
      const result = await updateTeacherProfile(data);
      
      // Update user info in AuthContext
      if (authContext?.updateUser) {
        authContext.updateUser({ 
          phone: result.phone,
        });
      }
      
      setNotificationType('success');
      setNotificationMessage('Đã cập nhật hồ sơ thành công!');
      setShowNotification(true);
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      const axiosError = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMsg = axiosError?.response?.data?.detail || axiosError?.message || "Không thể cập nhật hồ sơ!";
      
      setNotificationType('error');
      setNotificationMessage(errorMsg);
      setShowNotification(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
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
            Đổi Mật Khẩu
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
            label="Họ và Tên"
            name="full_name"
            rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
          >
            <Input placeholder="Nhập họ tên" disabled />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
          >
            <Input placeholder="Email" disabled />
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
            label="Chuyên ngành"
            name="specialization_id"
          >
            <Select 
              placeholder="Chọn chuyên ngành" 
              allowClear
              loading={specializations.length === 0}
            >
              {specializations.map(spec => (
                <Select.Option key={spec.id} value={spec.id}>
                  {spec.name}
                </Select.Option>
              ))}
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

export default TeacherProfilePage;
