import React from "react";
import { Button, Typography, Row, Col, Card } from "antd";
import { useNavigate } from "react-router-dom";
import { 
  UserOutlined, 
  TeamOutlined, 
  BarChartOutlined, 
  SafetyCertificateOutlined,
  RobotOutlined,
  ClockCircleOutlined 
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <RobotOutlined style={{ fontSize: 48, color: "#2563eb" }} />,
      title: "Nhận diện khuôn mặt AI",
      description: "Công nghệ AI tiên tiến với độ chính xác cao, nhận diện nhanh chóng và bảo mật"
    },
    {
      icon: <ClockCircleOutlined style={{ fontSize: 48, color: "#10b981" }} />,
      title: "Điểm danh tự động",
      description: "Tự động ghi nhận điểm danh theo thời gian thực, tiết kiệm thời gian"
    },
    {
      icon: <BarChartOutlined style={{ fontSize: 48, color: "#f59e42" }} />,
      title: "Báo cáo chi tiết",
      description: "Thống kê và báo cáo trực quan về tình hình điểm danh của từng lớp, môn học"
    },
    {
      icon: <SafetyCertificateOutlined style={{ fontSize: 48, color: "#ef4444" }} />,
      title: "An toàn & bảo mật",
      description: "Dữ liệu được mã hóa và bảo vệ theo tiêu chuẩn quốc tế"
    }
  ];

  const roles = [
    {
      icon: <UserOutlined style={{ fontSize: 40, color: "#2563eb" }} />,
      title: "Quản trị viên",
      description: "Quản lý toàn bộ hệ thống, tài khoản, cấu hình AI và giám sát hoạt động"
    },
    {
      icon: <TeamOutlined style={{ fontSize: 40, color: "#10b981" }} />,
      title: "Giảng viên",
      description: "Tạo lớp học, quản lý điểm danh, duyệt đơn xin nghỉ và xem báo cáo"
    },
    {
      icon: <UserOutlined style={{ fontSize: 40, color: "#f59e42" }} />,
      title: "Sinh viên",
      description: "Đăng ký khuôn mặt, điểm danh, xem lịch học và theo dõi tình hình học tập"
    }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc" }}>
      {/* Header */}
      <div style={{
        width: "100%",
        background: "#fff",
        borderBottom: "1px solid #eaeaea",
        padding: "20px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <RobotOutlined style={{ fontSize: 32, color: "#2563eb" }} />
          <span style={{ fontSize: 28, fontWeight: "bold", color: "#2563eb" }}>
            DUT Attendance System
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button size="large" onClick={() => navigate("/auth")}>
            Đăng nhập
          </Button>
          <Button type="primary" size="large" onClick={() => navigate("/auth")}>
            Đăng ký
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{
        background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
        padding: "80px 48px",
        textAlign: "center",
        color: "#fff"
      }}>
        <Title level={1} style={{ 
          color: "#fff", 
          fontSize: 48, 
          marginBottom: 24,
          fontWeight: 700
        }}>
          Hệ Thống Điểm Danh Thông Minh
        </Title>
        <Title level={2} style={{ 
          color: "#e0e7ff", 
          fontSize: 28, 
          fontWeight: 400,
          marginBottom: 16
        }}>
          Trường Đại học Bách Khoa - Đại học Đà Nẵng
        </Title>
        <Paragraph style={{ 
          fontSize: 18, 
          color: "#e0e7ff",
          maxWidth: 800,
          margin: "0 auto 32px"
        }}>
          Giải pháp điểm danh hiện đại với công nghệ nhận diện khuôn mặt AI, 
          giúp tự động hóa quy trình điểm danh, tiết kiệm thời gian và nâng cao hiệu quả quản lý.
        </Paragraph>
        <Button 
          type="primary" 
          size="large" 
          style={{ 
            height: 56, 
            fontSize: 18,
            borderRadius: 8,
            background: "#fff",
            color: "#2563eb",
            border: "none",
            fontWeight: 600
          }}
          onClick={() => navigate("/auth")}
        >
          Bắt đầu ngay →
        </Button>
      </div>

      {/* Features Section */}
      <div style={{ padding: "80px 48px", background: "#fff" }}>
        <Title level={2} style={{ 
          textAlign: "center", 
          marginBottom: 48,
          color: "#1f2937",
          fontSize: 36
        }}>
          ✨ Tính năng nổi bật
        </Title>
        <Row gutter={[32, 32]} justify="center">
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card style={{
                height: "100%",
                borderRadius: 16,
                border: "none",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                textAlign: "center",
                transition: "transform 0.3s",
                cursor: "pointer"
              }}
              hoverable
              >
                <div style={{ marginBottom: 16 }}>{feature.icon}</div>
                <Title level={4} style={{ marginBottom: 12 }}>
                  {feature.title}
                </Title>
                <Text style={{ color: "#64748b" }}>
                  {feature.description}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Roles Section */}
      <div style={{ 
        padding: "80px 48px", 
        background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)" 
      }}>
        <Title level={2} style={{ 
          textAlign: "center", 
          marginBottom: 48,
          color: "#1f2937",
          fontSize: 36
        }}>
          👥 Dành cho ai?
        </Title>
        <Row gutter={[32, 32]} justify="center">
          {roles.map((role, index) => (
            <Col xs={24} md={8} key={index}>
              <Card style={{
                height: "100%",
                borderRadius: 16,
                border: "none",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                textAlign: "center"
              }}>
                <div style={{ marginBottom: 16 }}>{role.icon}</div>
                <Title level={4} style={{ marginBottom: 12 }}>
                  {role.title}
                </Title>
                <Text style={{ color: "#64748b" }}>
                  {role.description}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* CTA Section */}
      <div style={{
        padding: "80px 48px",
        background: "#fff",
        textAlign: "center"
      }}>
        <Title level={2} style={{ 
          marginBottom: 24,
          color: "#1f2937",
          fontSize: 36
        }}>
          Sẵn sàng trải nghiệm?
        </Title>
        <Paragraph style={{ 
          fontSize: 18, 
          color: "#64748b",
          marginBottom: 32,
          maxWidth: 600,
          margin: "0 auto 32px"
        }}>
          Đăng ký ngay để khám phá các tính năng tuyệt vời của hệ thống điểm danh thông minh DUT!
        </Paragraph>
        <Button 
          type="primary" 
          size="large"
          style={{ 
            height: 56, 
            fontSize: 18,
            borderRadius: 8,
            fontWeight: 600
          }}
          onClick={() => navigate("/auth")}
        >
          Đăng ký miễn phí
        </Button>
      </div>

      {/* Footer */}
      <div style={{
        padding: "32px 48px",
        background: "#1f2937",
        color: "#fff",
        textAlign: "center"
      }}>
        <Text style={{ color: "#9ca3af" }}>
          © 2025 Trường Đại học Bách Khoa - Đại học Đà Nẵng. All rights reserved.
        </Text>
      </div>
    </div>
  );
};

export default HomePage;