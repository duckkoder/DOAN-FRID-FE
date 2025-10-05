import React from "react";
import { Card, Row, Col, Typography, Statistic, Button } from "antd";

const { Title, Text } = Typography;

const TeacherHomePage: React.FC = () => {
  // Dữ liệu mẫu, thay bằng dữ liệu thực tế nếu cần
  const stats = [
    { title: "My Classes", value: 5, color: "#2563eb" },
    { title: "Attendance Today", value: 98, color: "#10b981" },
    { title: "Absent Today", value: 2, color: "#ef4444" },
    { title: "Reports", value: 12, color: "#f59e42" },
  ];

  return (
    <div style={{ padding: 32, background: "#f6f9fc", minHeight: "100vh" }}>
      <Title level={2} style={{ marginBottom: 8 }}>Teacher Dashboard</Title>
      <Text type="secondary" style={{ marginBottom: 24, display: "block" }}>
        Welcome, Teacher! Here you can manage your classes, attendance, and reports.
      </Text>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col>
          <Button type="primary">Create Class</Button>
        </Col>
        <Col>
          <Button>View Attendance Report</Button>
        </Col>
      </Row>
      <Row gutter={[24, 24]}>
        {stats.map((item) => (
          <Col xs={24} sm={12} md={6} key={item.title}>
            <Card>
              <Statistic
                title={<Text style={{ color: "#888" }}>{item.title}</Text>}
                value={item.value}
                valueStyle={{ color: item.color, fontWeight: 700 }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default TeacherHomePage;