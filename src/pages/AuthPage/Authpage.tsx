import React, { useContext, useState } from "react";
import { Form, Input, Button, Typography, Row, Col, Card, message, Alert } from "antd";
import { LockOutlined, MailOutlined, WarningOutlined } from "@ant-design/icons";
import Footer from "../../components/Footer";
import { login as apiLogin } from "../../apis/authAPIs/auth";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import logoImg from "@/assets/logo_pbl.png";

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

        message.success("Login successful!");

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
        setErrorMessage("Login failed. Please try again!");
      }
    } catch (err) {
      console.error("Login error:", err);

      const error = err as AxiosError<ErrorResponse>;
      const status = error.response?.status;
      const errorData = error.response?.data;

      // Handle different error codes
      if (status === 401) {
        // Unauthorized - Wrong email or password
        setErrorType("error");
        setErrorMessage(
          "Incorrect email or password. Please check again!"
        );
        message.error("Incorrect email or password!");
      } else if (status === 403) {
        // Forbidden - Account locked
        setErrorType("warning");
        setErrorMessage(
          "Your account has been locked. Please contact the administrator for support."
        );
        message.warning("Account has been locked!");
      } else if (status === 422) {
        // Validation Error
        setErrorType("error");
        setErrorMessage(
          "Invalid data. Please check your information!"
        );
        message.error("Invalid data!");
      } else if (status === 429) {
        // Too Many Requests
        setErrorType("warning");
        setErrorMessage("You have tried to login too many times. Please try again later.");
        message.warning("Please try again later!");
      } else if (status && status >= 500) {
        // Server Error
        setErrorType("error");
        setErrorMessage("System error. Please try again later or contact the administrator.");
        message.error("System error!");
      } else {
        // Unknown Error
        setErrorType("error");
        setErrorMessage(
          "An error occurred. Please try again later!"
        );
        message.error("Login failed!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #eaeaea", background: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
        <img src={logoImg} alt="FRID Logo" style={{ height: 48, width: "auto", objectFit: "contain" }} />
        <Title level={3} style={{ margin: 0, color: "#2563eb", fontSize: "clamp(18px, 5vw, 24px)" }}>FRID</Title>
      </div>

      {/* Main content */}
      <Row justify="center" align="middle" style={{ flex: 1, margin: 0, padding: "16px" }}>
        <Col xs={24} sm={22} md={20} lg={16} xl={12}>
          <Card
            style={{
              borderRadius: 16,
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              padding: 0,
              border: "none",
              overflow: "hidden",
              background: "linear-gradient(135deg,#f6f9fc 60%,#fff 100%)"
            }}
            styles={{ body: { padding: 0 } }}
          >
            <Row style={{ width: "100%" }}>
              {/* Left Panel - Hidden on mobile */}
              <Col xs={0} md={12} style={{
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
                  Sign in to manage attendance, classes, and smart reports.
                </Title>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  FRID system helps administrators, teachers, and students connect, manage, and track learning progress effectively.
                </Text>
              </Col>

              {/* Right Panel - Login Form */}
              <Col xs={24} md={12} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fff",
                padding: "24px 16px"
              }}>
                <div style={{
                  width: "100%",
                  maxWidth: 400,
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 2px 8px #f0f1f2",
                  padding: "24px 16px"
                }}>
                  {/* Mobile welcome text */}
                  <div className="mobile-welcome" style={{ textAlign: "center", marginBottom: 16 }}>
                    <Title level={4} style={{ margin: 0, color: "#2563eb", display: "none" }}>
                      Welcome back!
                    </Title>
                  </div>
                  
                  <Title level={3} style={{ textAlign: "center", marginBottom: 24, color: "#2563eb" }}>
                    Sign In
                  </Title>

                  {/* Error Alert */}
                  {errorMessage && errorType && (
                    <Alert
                      message={errorType === "warning" ? "Warning" : "Error"}
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
                        { required: true, message: "Please enter your email!" },
                        { type: "email", message: "Invalid email format!" }
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
                      label="Password"
                      name="password"
                      rules={[
                        { required: true, message: "Please enter your password!" },
                        { min: 8, message: "Password must be at least 8 characters!" }
                      ]}
                    >
                      <Input.Password 
                        prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                        size="large" 
                        placeholder="Enter password" 
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
                        {loading ? "Signing in..." : "Sign In"}
                      </Button>
                    </Form.Item>

                    <div style={{ textAlign: "center" }}>
                      <Link href="#" style={{ fontSize: 12 }}>
                        Forgot password? Contact administrator.
                      </Link>
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