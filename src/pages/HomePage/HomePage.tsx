import React from "react";
import { Card, Row, Col, Typography, Statistic } from "antd";

const { Title, Text } = Typography;

const HomePage: React.FC = () => {
  // Dữ liệu mẫu, bạn có thể thay bằng dữ liệu thực tế từ API
  const stats = [
    { title: "Total Users", value: 120, color: "#2563eb" },
    { title: "Total Classes", value: 8, color: "#10b981" },
    { title: "Attendance Today", value: 98, color: "#f59e42" },
    { title: "Absent Today", value: 3, color: "#ef4444" },
  ];

  return (
    <div style={{ padding: 32, background: "#f6f9fc", minHeight: "100vh" }}>
      <Title level={2} style={{ marginBottom: 24 }}>Dashboard Overview</Title>
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
      {/* Thêm các phần khác của trang chủ ở đây */}
    </div>
  );
};

export default HomePage;