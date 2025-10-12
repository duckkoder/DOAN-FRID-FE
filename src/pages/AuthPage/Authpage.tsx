import React, { useContext, useState } from "react";
import { Form, Input, Button, Typography, Row, Col, Card, message, Alert } from "antd";
import { LockOutlined, MailOutlined, WarningOutlined } from "@ant-design/icons";
import Footer from "../../components/Footer";
import { login as apiLogin } from "../../apis/authAPIs/auth";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";

const { Title, Text, Link } = Typography;

interface ErrorResponse {
  detail?: string;
  message?: string;
}

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorType, setErrorType] = useState<"error" | "warning" | "">("");

  const onFinish = async (values: { email: string; password: string; remember?: boolean }) => {
    setLoading(true);
    setErrorMessage("");
    setErrorType("");

    try {
      const res = await apiLogin({
        email: values.email,
        password: values.password,
      });

      if (res && res.user) {
        // Lưu thông tin user và tokens
        auth?.login(
          res.user,
          {
            accessToken: res.access_token,
            refreshToken: res.refresh_token,
          },
        );

        message.success("Đăng nhập thành công!");

        // Điều hướng theo role
        const role = res.user.role;
        if (role === "admin") {
          navigate("/admin");
        } else if (role === "teacher") {
          navigate("/teacher");
        } else if (role === "student") {
          navigate("/student");
        } else {
          navigate("/");
        }
      } else {
        setErrorType("error");
        setErrorMessage("Đăng nhập thất bại. Vui lòng thử lại!");
      }
    } catch (err) {
      console.error("Login error:", err);

      const error = err as AxiosError<ErrorResponse>;
      const status = error.response?.status;
      const errorData = error.response?.data;

      // Handle different error codes
      if (status === 401) {
        // Unauthorized - Sai email hoặc mật khẩu
        setErrorType("error");
        setErrorMessage(
          "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!"
        );
        message.error("Email hoặc mật khẩu không chính xác!");
      } else if (status === 403) {
        // Forbidden - Tài khoản bị khóa
        setErrorType("warning");
        setErrorMessage(
          "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với quản trị viên để được hỗ trợ."
        );
        message.warning("Tài khoản đã bị khóa!");
      } else if (status === 422) {
        // Validation Error
        setErrorType("error");
        setErrorMessage(
          "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin!"
        );
        message.error("Dữ liệu không hợp lệ!");
      } else if (status === 429) {
        // Too Many Requests
        setErrorType("warning");
        setErrorMessage("Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ít phút.");
        message.warning("Vui lòng thử lại sau!");
      } else if (status && status >= 500) {
        // Server Error
        setErrorType("error");
        setErrorMessage("Lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên.");
        message.error("Lỗi hệ thống!");
      } else {
        // Unknown Error
        setErrorType("error");
        setErrorMessage(
          "Đã xảy ra lỗi. Vui lòng thử lại sau!"
        );
        message.error("Đăng nhập thất bại!");
      }
    } finally {
      setLoading(false);
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
              {/* Left Panel */}
              <Col xs={24} md={12} style={{
                background: "transparent",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "32px 24px"
              }}>
                <Title level={1} style={{ marginBottom: 8, fontWeight: 700, color: "#2563eb" }}>
                  Welcome Back!
                </Title>
                <Title level={4} style={{ marginBottom: 24, fontWeight: 400, color: "#333", lineHeight: 1.3 }}>
                  Đăng nhập để quản lý điểm danh, lớp học và báo cáo thông minh.
                </Title>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  Hệ thống Attendify giúp quản trị viên, giáo viên và học sinh kết nối, quản lý và theo dõi tình hình học tập hiệu quả.
                </Text>
              </Col>

              {/* Right Panel - Login Form */}
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
                  <Title level={3} style={{ textAlign: "center", marginBottom: 24, color: "#2563eb" }}>
                    Đăng nhập
                  </Title>

                  {/* Error Alert */}
                  {errorMessage && errorType && (
                    <Alert
                      message={errorType === "warning" ? "Cảnh báo" : "Lỗi"}
                      description={errorMessage}
                      type={errorType}
                      showIcon
                      icon={<WarningOutlined />}
                      closable
                      onClose={() => {
                        setErrorMessage("");
                        setErrorType("");
                      }}
                      style={{ marginBottom: 24 }}
                    />
                  )}

                  <Form
                    name="login"
                    layout="vertical"
                    initialValues={{ remember: false }}
                    onFinish={onFinish}
                    autoComplete="off"
                  >
                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[
                        { required: true, message: "Vui lòng nhập email!" },
                        { type: "email", message: "Email không hợp lệ!" }
                      ]}
                    >
                      <Input 
                        prefix={<MailOutlined style={{ color: "#bfbfbf" }} />}
                        size="large" 
                        placeholder="example@email.com" 
                        disabled={loading}
                      />
                    </Form.Item>

                    <Form.Item
                      label="Mật khẩu"
                      name="password"
                      rules={[
                        { required: true, message: "Vui lòng nhập mật khẩu!" },
                        { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự!" }
                      ]}
                    >
                      <Input.Password 
                        prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                        size="large" 
                        placeholder="Nhập mật khẩu" 
                        disabled={loading}
                      />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 16 }}>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        block 
                        size="large"
                        loading={loading}
                      >
                        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                      </Button>
                    </Form.Item>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
                      <Link href="#" style={{ fontSize: 12 }}>
                        Quên mật khẩu?
                      </Link>
                    </div>

                    <div style={{ marginTop: 16, textAlign: "center" }}>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        Chưa có tài khoản?{" "}
                        <Link href="/register" style={{ color: "#2563eb" }}>
                          Đăng ký ngay
                        </Link>
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