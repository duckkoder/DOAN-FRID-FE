import React from "react";
import { Typography } from "antd";
const { Title } = Typography;

const TeacherReportPage: React.FC = () => (
  <div style={{ padding: 32 }}>
    <Title level={2}>Teacher - Attendance Report</Title>
    <p>Xem báo cáo tổng hợp điểm danh.</p>
  </div>
);

export default TeacherReportPage;
