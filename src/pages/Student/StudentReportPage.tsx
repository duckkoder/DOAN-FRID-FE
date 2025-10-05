import React from "react";
import { Typography } from "antd";
const { Title } = Typography;

const StudentReportPage: React.FC = () => (
  <div style={{ padding: 32 }}>
    <Title level={2}>Student - Personal Report</Title>
    <p>Xem báo cáo cá nhân.</p>
  </div>
);

export default StudentReportPage;
