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
        setNotificationMessage('Failed to load profile information!');
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
      setNotificationMessage('Profile picture updated successfully!');
      setShowNotification(true);
    } catch (error: unknown) {
      console.error("Error uploading avatar:", error);
      const axiosError = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMsg = axiosError?.response?.data?.detail || axiosError?.message || "Failed to upload image!";
      
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
      setNotificationMessage('Profile updated successfully!');
      setShowNotification(true);
      
      // Update form with latest data
      form.setFieldsValue({
        ...form.getFieldsValue(),
        date_of_birth: result.date_of_birth ? dayjs(result.date_of_birth) : null,
      });
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      const axiosError = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMsg = axiosError?.response?.data?.detail || axiosError?.message || "Failed to update profile!";
      
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
          message={notificationType === 'success' ? 'Success' : 'Error'}
          description={notificationMessage}
          type={notificationType}
          showIcon
          closable
          onClose={() => setShowNotification(false)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card 
        title="Personal Information"
        extra={
          <Button 
            type="primary" 
            icon={<LockOutlined />}
            onClick={() => setPasswordModalVisible(true)}
          >
            Change Password
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
            Click on the photo to change
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Full Name"
            name="full_name"
            rules={[{ required: true, message: "Please enter full name!" }]}
          >
            <Input placeholder="Enter full name" disabled />
          </Form.Item>

          <Form.Item
            label="Student ID"
            name="student_code"
          >
            <Input placeholder="Student ID" disabled />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
          >
            <Input placeholder="Email" disabled />
          </Form.Item>

          <Form.Item
            label="Date of Birth"
            name="date_of_birth"
            rules={[{ required: true, message: "Please select date of birth!" }]}
          >
            <DatePicker 
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="Select date of birth"
              disabledDate={(current) => {
                // Cannot select future dates
                return current && current > dayjs().endOf('day');
              }}
            />
          </Form.Item>

          <Form.Item
            label="Department"
            name="department_id"
          >
            <Select 
              placeholder="Select department" 
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
            label="Academic Year"
            name="academic_year"
          >
            <Select placeholder="Select academic year" allowClear>
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
            label="Phone Number"
            name="phone"
            rules={[
              { pattern: /^[0-9]{10}$/, message: "Invalid phone number!" }
            ]}
          >
            <Input placeholder="Enter phone number" />
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
              Save Changes
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
