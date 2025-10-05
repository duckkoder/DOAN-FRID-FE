import React from "react";
import { Typography } from "antd";
const { Title } = Typography;

const AdminStudentPage: React.FC = () => (
  <div style={{ padding: 32 }}>
    <Title level={2}>Admin - Student Management</Title>
    <p>Quản lý học sinh, tạo tài khoản học sinh.</p>
  </div>
);

export default AdminStudentPage;
