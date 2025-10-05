import React from "react";
import { Typography } from "antd";
const { Title } = Typography;

const TeacherAttendancePage: React.FC = () => (
  <div style={{ padding: 32 }}>
    <Title level={2}>Teacher - Attendance</Title>
    <p>Điểm danh, xem báo cáo điểm danh.</p>
  </div>
);

export default TeacherAttendancePage;
