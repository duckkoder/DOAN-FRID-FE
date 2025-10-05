import React from "react";
import { Typography } from "antd";
const { Title } = Typography;

const TeacherClassPage: React.FC = () => (
  <div style={{ padding: 32 }}>
    <Title level={2}>Teacher - Class Management</Title>
    <p>Tạo lớp học, quản lý lớp học.</p>
  </div>
);

export default TeacherClassPage;
