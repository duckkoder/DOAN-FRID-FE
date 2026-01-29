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
import logoImg from "@/assets/logo_pbl.png";

const { Title, Text, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <RobotOutlined style={{ fontSize: 48, color: "#2563eb" }} />,
      title: "AI Face Recognition",
      description: "Advanced AI technology with high accuracy, fast recognition and security"
    },
    {
      icon: <ClockCircleOutlined style={{ fontSize: 48, color: "#10b981" }} />,
      title: "Automatic Attendance",
      description: "Automatically record attendance in real-time, saving time"
    },
    {
      icon: <BarChartOutlined style={{ fontSize: 48, color: "#f59e42" }} />,
      title: "Detailed Reports",
      description: "Visual statistics and reports on attendance status for each class and subject"
    },
    {
      icon: <SafetyCertificateOutlined style={{ fontSize: 48, color: "#ef4444" }} />,
      title: "Safe & Secure",
      description: "Data is encrypted and protected according to international standards"
    }
  ];

  const roles = [
    {
      icon: <UserOutlined style={{ fontSize: 40, color: "#2563eb" }} />,
      title: "Administrator",
      description: "Manage the entire system, accounts, AI configuration and monitor activities"
    },
    {
      icon: <TeamOutlined style={{ fontSize: 40, color: "#10b981" }} />,
      title: "Teacher",
      description: "Create classes, manage attendance, approve leave requests and view reports"
    },
    {
      icon: <UserOutlined style={{ fontSize: 40, color: "#f59e42" }} />,
      title: "Student",
      description: "Register face, take attendance, view schedule and track learning progress"
    }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc" }}>
      {/* Header */}
      <div style={{
        width: "100%",
        background: "#fff",
        borderBottom: "1px solid #eaeaea",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 12, 
          flex: "1 1 auto",
          minWidth: 0,
          marginRight: "16px"
        }}>
          <img src={logoImg} alt="FRID Logo" style={{ height: 48, width: "auto", objectFit: "contain", flexShrink: 0 }} />
          <span 
            className="homepage-header-logo"
            style={{ 
              fontSize: 24, 
              fontWeight: "bold", 
              color: "#2563eb",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            FRID
          </span>
        </div>
        <div 
          className="homepage-header-buttons"
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12, 
            flexShrink: 0 ,
            minWidth: 0,          // Cho phép text truncate
            marginRight: "32px",  // Khoảng cách với buttons

          }}
        >
          <Button 
            size="large"
            onClick={() => navigate("/auth")}
          >
            Sign In
          </Button>
        </div>
      </div>

      <style>
        {`
          @media (max-width: 768px) {
            .homepage-header-logo {
              font-size: 18px !important;
            }
            .homepage-header-buttons button {
              font-size: 14px !important;
              padding: 4px 12px !important;
              height: auto !important;
            }
          }
        `}
      </style>

      {/* Hero Section */}
      <div style={{
        background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
        padding: "clamp(40px, 10vw, 80px) clamp(20px, 5vw, 48px)",
        textAlign: "center",
        color: "#fff"
      }}>
        <Title level={1} style={{ 
          color: "#fff", 
          fontSize: "clamp(28px, 6vw, 48px)", 
          marginBottom: 24,
          fontWeight: 700
        }}>
          Smart Attendance System
        </Title>
        <Title level={2} style={{ 
          color: "#e0e7ff", 
          fontSize: "clamp(18px, 4vw, 28px)", 
          fontWeight: 400,
          marginBottom: 16
        }}>
          Da Nang University of Science and Technology
        </Title>
        <Paragraph style={{ 
          fontSize: "clamp(14px, 2.5vw, 18px)", 
          color: "#e0e7ff",
          maxWidth: 800,
          margin: "0 auto 32px",
          padding: "0 16px"
        }}>
          Modern attendance solution with AI face recognition technology, 
          automating the attendance process, saving time and improving management efficiency.
        </Paragraph>
        <Button 
          type="primary" 
          size="large" 
          style={{ 
            height: "clamp(44px, 8vw, 56px)", 
            fontSize: "clamp(14px, 2.5vw, 18px)",
            borderRadius: 8,
            background: "#fff",
            color: "#2563eb",
            border: "none",
            fontWeight: 600,
            padding: "0 24px"
          }}
          onClick={() => navigate("/auth")}
        >
          Get Started →
        </Button>
      </div>

      {/* Features Section */}
      <div style={{ 
        padding: "clamp(40px, 10vw, 80px) clamp(20px, 5vw, 48px)", 
        background: "#fff" 
      }}>
        <Title level={2} style={{ 
          textAlign: "center", 
          marginBottom: 48,
          color: "#1f2937",
          fontSize: "clamp(24px, 5vw, 36px)"
        }}>
          ✨ Outstanding Features
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
        padding: "clamp(40px, 10vw, 80px) clamp(20px, 5vw, 48px)", 
        background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)" 
      }}>
        <Title level={2} style={{ 
          textAlign: "center", 
          marginBottom: 48,
          color: "#1f2937",
          fontSize: "clamp(24px, 5vw, 36px)"
        }}>
          👥 Who is it for?
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
        padding: "clamp(40px, 10vw, 80px) clamp(20px, 5vw, 48px)",
        background: "#fff",
        textAlign: "center"
      }}>
        <Title level={2} style={{ 
          marginBottom: 24,
          color: "#1f2937",
          fontSize: "clamp(24px, 5vw, 36px)"
        }}>
          Ready to experience?
        </Title>
        <Paragraph style={{ 
          fontSize: "clamp(14px, 2.5vw, 18px)", 
          color: "#64748b",
          marginBottom: 32,
          maxWidth: 600,
          margin: "0 auto 32px",
          padding: "0 16px"
        }}>
          Sign up now to explore the amazing features of DUT smart attendance system!
        </Paragraph>
        <Button 
          type="primary" 
          size="large"
          style={{ 
            height: "clamp(44px, 8vw, 56px)", 
            fontSize: "clamp(14px, 2.5vw, 18px)",
            borderRadius: 8,
            fontWeight: 600,
            padding: "0 24px"
          }}
          onClick={() => navigate("/auth")}
        >
          Sign Up Free
        </Button>
      </div>

      {/* Footer */}
      <div style={{
        padding: "24px 20px",
        background: "#fff",
        textAlign: "center",
        borderTop: "1px solid #eaeaea"
      }}>
        <Text type="secondary">
          © {new Date().getFullYear()} FRID. All rights reserved. | Developed by&nbsp;
          <a href="https://github.com/PBL6-FRID" target="_blank" rel="noopener" style={{ color: "#2563eb" }}>
            SV-DUT
          </a>
        </Text>
      </div>
    </div>
  );
};

export default HomePage;