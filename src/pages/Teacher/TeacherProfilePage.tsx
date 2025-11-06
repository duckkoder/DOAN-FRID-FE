import React, { useState, useEffect, useContext } from "react";
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  message, 
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

const TeacherProfilePage: React.FC = () => {
  const [form] = Form.useForm();
  const authContext = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  // Fetch teacher profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getTeacherProfile();
        form.setFieldsValue({
          full_name: data.full_name,
          email: data.email,
          teacher_code: data.teacher_code,
          department_id: data.department_id,
          specialization_id: data.specialization_id,
          phone: data.phone || "",
        });
        setAvatarUrl(data.avatar_url || "");
      } catch (error) {
        console.error("Error fetching profile:", error);
        message.error("Không thể tải thông tin cá nhân!");
        // Use context data as fallback
        const fallbackData = {
          full_name: authContext?.user?.full_name || "",
          email: authContext?.user?.email || "",
          teacher_code: "",
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
      
      message.success("Cập nhật ảnh đại diện thành công!");
    } catch (error: unknown) {
      console.error("Error uploading avatar:", error);
      const axiosError = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMsg = axiosError?.response?.data?.detail || axiosError?.message || "Không thể tải ảnh lên!";
      message.error(errorMsg);
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
      
      message.success("Cập nhật thông tin thành công!");
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      const axiosError = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMsg = axiosError?.response?.data?.detail || axiosError?.message || "Không thể cập nhật thông tin!";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
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
            label="Mã giáo viên"
            name="teacher_code"
          >
            <Input placeholder="Mã giáo viên" disabled />
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
            rules={[{ required: true, message: "Vui lòng chọn khoa!" }]}
          >
            <Select placeholder="Chọn khoa">
              <Select.Option value={1}>Khoa học máy tính</Select.Option>
              <Select.Option value={2}>Công nghệ thông tin</Select.Option>
              <Select.Option value={3}>Kỹ thuật phần mềm</Select.Option>
              <Select.Option value={4}>Điện tử viễn thông</Select.Option>
              <Select.Option value={5}>Cơ khí</Select.Option>
              <Select.Option value={6}>Điện</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Chuyên ngành"
            name="specialization_id"
            rules={[{ required: true, message: "Vui lòng chọn chuyên ngành!" }]}
          >
            <Select placeholder="Chọn chuyên ngành">
              <Select.Option value={1}>Trí tuệ nhân tạo</Select.Option>
              <Select.Option value={2}>An toàn thông tin</Select.Option>
              <Select.Option value={3}>Khoa học dữ liệu</Select.Option>
              <Select.Option value={4}>Phát triển phần mềm</Select.Option>
              <Select.Option value={5}>Mạng máy tính</Select.Option>
              <Select.Option value={6}>Hệ thống nhúng</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại!" },
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
