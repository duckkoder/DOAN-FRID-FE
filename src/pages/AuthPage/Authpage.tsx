import React, { useContext } from "react";
import { Form, Input, Button, Checkbox, Typography, Row, Col, Card, message } from "antd";
import Footer from "../../components/Footer";
import { login as apiLogin } from "../../apis/authAPIs/auth";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const { Title, Text, Link } = Typography;

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const onFinish = async (values: any) => {
    try {
      const res = await apiLogin(values);
      if (res && res.user) {
        auth?.login(res.user, res.tokens, values.remember);
        message.success("Login successful!");
        // Điều hướng theo role
        if (res.user.role === "admin") navigate("/admin");
        else if (res.user.role === "teacher") navigate("/teacher");
        else if (res.user.role === "student") navigate("/student");
        else navigate("/");
      } else {
        message.error("Login failed!");
      }
    } catch (err) {
      message.error("Login failed!");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 32px", borderBottom: "1px solid #eaeaea", background: "#fff" }}>
        <Title level={3} style={{ margin: 0, color: "#2563eb" }}>Attendify</Title>
      </div>
      {/* Main content */}
      <Row justify="center" align="middle" style={{ flex: 1, margin: 0 }}>
        <Col xs={24} md={20} lg={16} xl={12} style={{ padding: 0 }}>
          <Card
            style={{
              borderRadius: 16,
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              padding: 0,
              border: "none",
              margin: "40px 0",
              width: "120%",
              overflow: "hidden",
              background: "linear-gradient(135deg,#f6f9fc 60%,#fff 100%)"
            }}
            bodyStyle={{ padding: 0 }}
          >
            <Row style={{ width: "100%" }}>
              <Col xs={24} md={12} style={{
                background: "transparent",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "32px 24px"
              }}>
                <Title level={1} style={{ marginBottom: 8, fontWeight: 700, color: "#2563eb" }}>Welcome Back!</Title>
                <Title level={4} style={{ marginBottom: 24, fontWeight: 400, color: "#333", lineHeight: 1.3 }}>
                  Đăng nhập để quản lý điểm danh, lớp học và báo cáo thông minh.
                </Title>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  Hệ thống Attendify giúp quản trị viên, giáo viên và học sinh kết nối, quản lý và theo dõi tình hình học tập hiệu quả.
                </Text>
              </Col>
              <Col xs={24} md={12} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fff",
                padding: "32px 24px"
              }}>
                <div style={{
                  width: "100%",
                  maxWidth: 400,
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 2px 8px #f0f1f2",
                  padding: "32px 24px"
                }}>
                  <Title level={3} style={{ textAlign: "center", marginBottom: 24, color: "#2563eb" }}>Đăng nhập</Title>
                  <Form
                    name="login"
                    layout="vertical"
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                  >
                    <Form.Item
                      label="Username"
                      name="username"
                      rules={[{ required: true, message: "Vui lòng nhập tên đăng nhập!" }]}
                    >
                      <Input size="large" placeholder="Nhập username hoặc email" />
                    </Form.Item>
                    <Form.Item
                      label="Password"
                      name="password"
                      rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
                    >
                      <Input.Password size="large" placeholder="Nhập mật khẩu" />
                    </Form.Item>
                    <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 8 }}>
                      <Checkbox>Ghi nhớ đăng nhập</Checkbox>
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 8 }}>
                      <Button type="primary" htmlType="submit" block size="large">
                        Đăng nhập
                      </Button>
                    </Form.Item>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
                      <Link href="#" style={{ fontSize: 12 }}>Quên mật khẩu?</Link>
                    </div>
                    <div style={{ marginTop: 16, textAlign: "center" }}>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        Chưa có tài khoản?{" "}
                        <Link href="#" style={{ color: "#2563eb" }}>Đăng ký ngay</Link>
                      </Text>
                    </div>
                  </Form>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AuthPage;