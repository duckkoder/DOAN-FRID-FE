import React from "react";
import { Typography } from "antd";
const { Title } = Typography;

const StudentClassPage: React.FC = () => (
  <div style={{ padding: 32 }}>
    <Title level={2}>Student - Class List</Title>
    <p>Xem danh sách lớp học.</p>
  </div>
);

export default StudentClassPage;
