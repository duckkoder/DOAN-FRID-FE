import React, { useState } from "react";
import { Modal, Form, Input, message } from "antd";
import { LockOutlined } from "@ant-design/icons";
import PasswordRequirements from "./PasswordRequirements";
import { validatePassword } from "../utils/passwordValidation";

interface ResetPasswordModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (newPassword: string) => Promise<void>;
  userType: "student" | "teacher";
  userName: string;
  loading?: boolean;
}

/**
 * Modal component for resetting user password
 * Can be used for both students and teachers
 */
const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  userType,
  userName,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      
      await onSuccess(values.new_password);
      
      message.success(`Đặt lại mật khẩu cho ${userType === "student" ? "sinh viên" : "giáo viên"} ${userName} thành công!`);
      form.resetFields();
      setPasswordValue("");
      onCancel();
    } catch (error: any) {
      console.error("Error resetting password:", error);
      if (error.errorFields) {
        // Validation error - do nothing, form will show errors
        return;
      }
      message.error(
        error?.response?.data?.detail || "Không thể đặt lại mật khẩu"
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setPasswordValue("");
    onCancel();
  };

  return (
    <Modal
      title={
        <span>
          <LockOutlined style={{ marginRight: 8 }} />
          Đặt lại mật khẩu
        </span>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading || loading}
      okText="Đặt lại mật khẩu"
      cancelText="Hủy"
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <p>
          Đặt lại mật khẩu cho {userType === "student" ? "sinh viên" : "giáo viên"}:{" "}
          <strong>{userName}</strong>
        </p>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          label="Mật khẩu mới"
          name="new_password"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu mới!" },
            { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const validation = validatePassword(value);
                if (validation.isValid) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(validation.errors.join(", "))
                );
              },
            },
          ]}
          extra={<PasswordRequirements password={passwordValue} />}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Nhập mật khẩu mới"
            onChange={(e) => setPasswordValue(e.target.value)}
          />
        </Form.Item>

        <Form.Item
          label="Xác nhận mật khẩu"
          name="confirm_password"
          dependencies={["new_password"]}
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("new_password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Mật khẩu xác nhận không khớp!")
                );
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Nhập lại mật khẩu mới"
          />
        </Form.Item>
      </Form>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: "#fff7e6",
          border: "1px solid #ffd591",
          borderRadius: 4,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: "#ad6800" }}>
          <strong>Lưu ý:</strong> Sau khi đặt lại mật khẩu, {userType === "student" ? "sinh viên" : "giáo viên"} sẽ
          cần sử dụng mật khẩu mới để đăng nhập.
        </p>
      </div>
    </Modal>
  );
};

export default ResetPasswordModal;
