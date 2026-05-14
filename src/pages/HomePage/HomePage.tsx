import React from "react";
import { Button, Typography, Row, Col, Card } from "antd";
import { useNavigate } from "react-router-dom";
import {
  UserOutlined,
  TeamOutlined,
  BarChartOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  BookOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import logoImg from "@/assets/logo_pbl.png";

const { Title, Text, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <ClockCircleOutlined />,
      title: "Điểm danh thông minh",
      description: "Ghi nhận chuyên cần theo thời gian thực, giảm thao tác thủ công cho giảng viên và bộ phận quản lý.",
    },
    {
      icon: <RobotOutlined />,
      title: "Nhận diện AI",
      description: "Hỗ trợ xác nhận sinh viên bằng camera, theo dõi trạng thái phiên điểm danh rõ ràng.",
    },
    {
      icon: <BookOutlined />,
      title: "Trợ giảng tài liệu",
      description: "Hỏi đáp trên tài liệu học tập đã được chọn, phù hợp cho lớp học và học phần.",
    },
    {
      icon: <FileSearchOutlined />,
      title: "Nguồn tham khảo",
      description: "Câu trả lời từ RAG đi kèm trang tài liệu để người dùng kiểm tra lại nội dung gốc.",
    },
    {
      icon: <BarChartOutlined />,
      title: "Báo cáo chuyên cần",
      description: "Tổng hợp dữ liệu điểm danh, vắng phép và tiến độ theo lớp, học phần, sinh viên.",
    },
    {
      icon: <SafetyCertificateOutlined />,
      title: "Phân quyền rõ ràng",
      description: "Tách vai trò quản trị viên, giảng viên và sinh viên để vận hành trong môi trường đại học.",
    },
  ];

  const roles = [
    {
      icon: <UserOutlined />,
      title: "Quản trị viên",
      description: "Quản lý tài khoản, phòng học, lớp học, học phần và dữ liệu hệ thống.",
    },
    {
      icon: <TeamOutlined />,
      title: "Giảng viên",
      description: "Mở phiên điểm danh, quản lý tài liệu, duyệt đơn vắng và xem báo cáo lớp.",
    },
    {
      icon: <UserOutlined />,
      title: "Sinh viên",
      description: "Đăng ký khuôn mặt, theo dõi chuyên cần, gửi đơn vắng và hỏi đáp tài liệu.",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#172033" }}>
      <header
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "rgba(255,255,255,0.96)",
          borderBottom: "1px solid #e5eaf2",
          padding: "14px clamp(18px, 4vw, 48px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 auto", marginRight: 16 }}>
          <img src={logoImg} alt="FRID" style={{ height: 44, width: 44, objectFit: "cover", borderRadius: 12 }} />
          <div style={{ minWidth: 0 }}>
            <Text style={{ display: "block", fontSize: 22, fontWeight: 800, color: "#1e3a8a", lineHeight: 1 }}>
              FRID
            </Text>
            <Text className="homepage-subbrand" style={{ fontSize: 12, color: "#64748b" }}>
              Quản lý điểm danh đại học
            </Text>
          </div>
        </div>

        <Button size="large" type="primary" onClick={() => navigate("/auth")} style={{ borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>
          Đăng nhập
        </Button>
      </header>

      <main>
        <section
          className="homepage-hero"
          style={{
            minHeight: "calc(100vh - 72px)",
            padding: "clamp(48px, 8vw, 96px) clamp(20px, 5vw, 72px) 56px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 440px)",
            gap: "clamp(32px, 6vw, 72px)",
            alignItems: "center",
            background: "linear-gradient(135deg, #ffffff 0%, #f1f5ff 100%)",
          }}
        >
          <div>
            <Title
              level={1}
              style={{
                color: "#10213f",
                fontSize: "clamp(38px, 6vw, 68px)",
                lineHeight: 1.04,
                marginBottom: 18,
                fontWeight: 850,
                letterSpacing: 0,
              }}
            >
              FRID
            </Title>
            <Title
              level={2}
              style={{
                color: "#1e3a8a",
                fontSize: "clamp(22px, 3vw, 36px)",
                lineHeight: 1.24,
                marginTop: 0,
                marginBottom: 18,
                fontWeight: 650,
              }}
            >
              Nền tảng quản lý điểm danh và học tập cho trường đại học
            </Title>
            <Paragraph style={{ fontSize: 17, color: "#475569", maxWidth: 760, lineHeight: 1.75, marginBottom: 28 }}>
              FRID hỗ trợ nhà trường quản lý lớp học, phiên điểm danh, dữ liệu chuyên cần, tài liệu học tập và hỏi đáp AI trong một hệ thống thống nhất.
            </Paragraph>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button
                type="primary"
                size="large"
                onClick={() => navigate("/auth")}
                style={{ height: 48, borderRadius: 10, fontWeight: 750, paddingInline: 24 }}
              >
                Vào hệ thống
              </Button>
              <Button size="large" onClick={() => navigate("/auth")} style={{ height: 48, borderRadius: 10, fontWeight: 650 }}>
                Đăng nhập tài khoản
              </Button>
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #dbe6f5",
              borderRadius: 12,
              boxShadow: "0 24px 70px rgba(15, 35, 75, 0.12)",
              padding: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <img src={logoImg} alt="FRID" style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover" }} />
              <div>
                <Text style={{ display: "block", fontWeight: 800, color: "#172033" }}>Bảng điều hành</Text>
                <Text style={{ color: "#64748b", fontSize: 12 }}>Tổng quan vận hành lớp học</Text>
              </div>
            </div>
            {[
              ["Lớp đang hoạt động", "24"],
              ["Phiên điểm danh hôm nay", "12"],
              ["Tài liệu hỗ trợ AI", "86"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 0",
                  borderTop: "1px solid #eef2f7",
                }}
              >
                <Text style={{ color: "#64748b" }}>{label}</Text>
                <Text style={{ color: "#10213f", fontSize: 22, fontWeight: 800 }}>{value}</Text>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: "64px clamp(20px, 5vw, 72px)", background: "#fff" }}>
          <Title level={2} style={{ textAlign: "center", marginBottom: 12, color: "#172033", fontSize: "clamp(26px, 4vw, 38px)" }}>
            Chức năng chính
          </Title>
          <Paragraph style={{ textAlign: "center", color: "#64748b", maxWidth: 720, margin: "0 auto 40px", fontSize: 16 }}>
            Các chức năng tập trung vào vận hành lớp học, chuyên cần và hỗ trợ học tập bằng AI.
          </Paragraph>
          <Row gutter={[20, 20]}>
            {features.map((feature) => (
              <Col xs={24} sm={12} lg={8} key={feature.title}>
                <Card hoverable style={{ height: "100%", borderRadius: 10, border: "1px solid #e5eaf2", boxShadow: "none" }}>
                  <div style={{ color: "#2563eb", fontSize: 30, marginBottom: 14 }}>{feature.icon}</div>
                  <Title level={4} style={{ marginBottom: 10, color: "#172033" }}>{feature.title}</Title>
                  <Text style={{ color: "#64748b", lineHeight: 1.7 }}>{feature.description}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </section>

        <section style={{ padding: "64px clamp(20px, 5vw, 72px)", background: "#f8fafc" }}>
          <Title level={2} style={{ textAlign: "center", marginBottom: 40, color: "#172033", fontSize: "clamp(26px, 4vw, 38px)" }}>
            Phù hợp cho quản lý trường đại học
          </Title>
          <Row gutter={[20, 20]} justify="center">
            {roles.map((role) => (
              <Col xs={24} md={8} key={role.title}>
                <Card style={{ height: "100%", borderRadius: 10, border: "1px solid #e5eaf2", textAlign: "center", boxShadow: "none" }}>
                  <div style={{ color: "#2563eb", fontSize: 32, marginBottom: 14 }}>{role.icon}</div>
                  <Title level={4} style={{ marginBottom: 10 }}>{role.title}</Title>
                  <Text style={{ color: "#64748b", lineHeight: 1.7 }}>{role.description}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </section>

        <section style={{ padding: "58px 20px", background: "#10213f", textAlign: "center" }}>
          <Title level={2} style={{ color: "#fff", marginBottom: 14, fontSize: "clamp(26px, 4vw, 38px)" }}>
            Bắt đầu quản lý với FRID
          </Title>
          <Paragraph style={{ color: "#cbd5e1", fontSize: 16, maxWidth: 660, margin: "0 auto 26px", lineHeight: 1.8 }}>
            Đăng nhập để quản lý lớp học, phiên điểm danh, báo cáo chuyên cần và trợ giảng tài liệu.
          </Paragraph>
          <Button type="primary" size="large" onClick={() => navigate("/auth")} style={{ height: 48, borderRadius: 10, fontWeight: 750, paddingInline: 28 }}>
            Đăng nhập
          </Button>
        </section>
      </main>

      <footer style={{ padding: "22px 20px", background: "#fff", textAlign: "center", borderTop: "1px solid #e5eaf2" }}>
        <Text type="secondary">
          © {new Date().getFullYear()} FRID. Phát triển bởi{" "}
          <a href="https://github.com/PBL6-FRID" target="_blank" rel="noopener" style={{ color: "#2563eb", fontWeight: 700 }}>
            SV-DUT
          </a>
        </Text>
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .homepage-hero {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
          }
        }
        @media (max-width: 560px) {
          .homepage-subbrand {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
