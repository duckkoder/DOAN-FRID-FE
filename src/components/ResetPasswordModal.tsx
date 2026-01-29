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
      
      message.success(`Password reset for ${userType === "student" ? "student" : "teacher"} ${userName} successful!`);
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
        error?.response?.data?.detail || "Cannot reset password"
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
          Reset Password
        </span>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading || loading}
      okText="Reset Password"
      cancelText="Cancel"
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <p>
          Reset password for {userType === "student" ? "student" : "teacher"}:{" "}
          <strong>{userName}</strong>
        </p>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          label="New Password"
          name="new_password"
          rules={[
            { required: true, message: "Please enter new password!" },
            { min: 8, message: "Password must be at least 8 characters" },
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
            placeholder="Enter new password"
            onChange={(e) => setPasswordValue(e.target.value)}
          />
        </Form.Item>

        <Form.Item
          label="Confirm Password"
          name="confirm_password"
          dependencies={["new_password"]}
          rules={[
            { required: true, message: "Please confirm password!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("new_password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Passwords do not match!")
                );
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Re-enter new password"
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
          <strong>Note:</strong> After resetting password, {userType === "student" ? "student" : "teacher"} will
          need to use the new password to sign in.
        </p>
      </div>
    </Modal>
  );
};

export default ResetPasswordModal;
