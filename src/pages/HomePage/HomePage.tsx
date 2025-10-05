import React from "react";
import { Button, Typography, Row, Col } from "antd";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc", display: "flex", flexDirection: "column" }}>
      {/* Header với nút đăng nhập/đăng ký */}
      <div style={{
        width: "100%",
        background: "#fff",
        borderBottom: "1px solid #eaeaea",
        padding: "20px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxSizing: "border-box",
        minWidth: 0
      }}>
        <span style={{ fontSize: 28, fontWeight: "bold", color: "#2563eb" }}>Attendify</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button type="default" onClick={() => navigate("/auth")}>
            Đăng nhập
          </Button>
          <Button type="primary" onClick={() => navigate("/auth")}>
            Đăng ký
          </Button>
        </div>
      </div>
      {/* Nội dung giới thiệu */}
      <Row justify="center" align="middle" style={{ flex: 1, margin: 0, width: "100%" }}>
        <Col xs={24} md={16} lg={12} style={{ minWidth: 0 }}>
          <div style={{
            padding: "24px 12px",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            maxWidth: "100%",
            boxSizing: "border-box"
          }}>
            <Title level={1} style={{ color: "#2563eb", marginBottom: 16 }}>Chào mừng đến với Attendify!</Title>
            <Text style={{ fontSize: 18, color: "#333" }}>
              Attendify là hệ thống quản lý điểm danh thông minh dành cho trường học và doanh nghiệp.
              <br /><br />
              - <b>Admin</b>: Quản lý tài khoản giáo viên, học sinh, và hệ thống ModalAI.<br />
              - <b>Giáo viên</b>: Tạo lớp học, điểm danh, xem báo cáo.<br />
              - <b>Học sinh</b>: Xem tình hình điểm danh, lịch sử lớp học.<br /><br />
              Hãy đăng ký hoặc đăng nhập để trải nghiệm các tính năng tuyệt vời của chúng tôi!
            </Text>
            <div style={{ marginTop: 32 }}>
              <Button type="primary" size="large" onClick={() => navigate("/auth")}>
                Bắt đầu ngay
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default HomePage;