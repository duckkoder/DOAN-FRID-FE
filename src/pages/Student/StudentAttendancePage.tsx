import React from "react";
import { Typography } from "antd";
const { Title } = Typography;

const StudentAttendancePage: React.FC = () => (
  <div style={{ padding: 32 }}>
    <Title level={2}>Student - Attendance</Title>
    <p>Xem tình hình điểm danh theo lớp học.</p>
  </div>
);

export default StudentAttendancePage;
