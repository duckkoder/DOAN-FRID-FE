import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import PasswordRequirements from './PasswordRequirements';
import { validatePassword } from '../utils/passwordValidation';
import { useAuth } from '../hooks/useAuth';
import {
  changeStudentPassword,
  changeTeacherPassword,
  type PasswordChangeData,
} from '../apis/userAPIs/profile';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const { user } = useAuth();

  const handleSubmit = async (values: PasswordFormValues) => {
    setLoading(true);
    setShowNotification(false);

    try {
      const passwordData: PasswordChangeData = {
        old_password: values.currentPassword,
        new_password: values.newPassword,
      };

      // Gọi API tương ứng với role của user
      if (user?.role === 'student') {
        await changeStudentPassword(passwordData);
      } else if (user?.role === 'teacher') {
        await changeTeacherPassword(passwordData);
      } else {
        throw new Error('Invalid user role');
      }

      // Success notification
      setNotificationType('success');
      setNotificationMessage('Password changed successfully!');
      setShowNotification(true);
      
      // Tự động ẩn thông báo sau 3 giây
      setTimeout(() => {
        setShowNotification(false);
        form.resetFields();
        setNewPassword('');
        onClose();
      }, 2000);
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      const axiosError = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMsg = axiosError?.response?.data?.detail || axiosError?.message || 'Current password is incorrect or an error occurred!';
      
      // Hiển thị lỗi dưới ô mật khẩu hiện tại
      form.setFields([
        {
          name: 'currentPassword',
          errors: [errorMsg],
        },
      ]);
      
      // Thông báo lỗi
      setNotificationType('error');
      setNotificationMessage(errorMsg);
      setShowNotification(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setNewPassword('');
    setShowNotification(false);
    onClose();
  };

  return (
    <Modal
      title="Change Password"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
    >
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

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="Current Password"
          name="currentPassword"
          rules={[
            {
              required: true,
              message: 'Please enter current password!',
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Enter current password"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="New Password"
          name="newPassword"
          rules={[
            {
              required: true,
              message: 'Please enter new password!',
            },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const validation = validatePassword(value);
                if (validation.isValid) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Password does not meet requirements'));
              },
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Enter new password"
            size="large"
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Form.Item>

        <PasswordRequirements password={newPassword} showTitle={true} />

        <Form.Item
          label="Confirm New Password"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            {
              required: true,
              message: 'Please confirm new password!',
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error('Passwords do not match!')
                );
              },
            }),
          ]}
          style={{ marginTop: 16 }}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Confirm new password"
            size="large"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel} size="large">Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              Change Password
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
