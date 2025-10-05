import React from "react";
import { Typography } from "antd";
const { Title } = Typography;

const AdminTeacherPage: React.FC = () => (
  <div style={{ padding: 32 }}>
    <Title level={2}>Admin - Teacher Management</Title>
    <p>Quản lý giáo viên, tạo tài khoản giáo viên.</p>
  </div>
);

export default AdminTeacherPage;
