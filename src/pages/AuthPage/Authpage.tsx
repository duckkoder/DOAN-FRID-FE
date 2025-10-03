import React, { useState, useContext } from "react";
import { Form, Input, Button, Checkbox, Radio, Typography, Row, Col, Card, message } from "antd";
import Footer from "../../components/Footer";
import { login as apiLogin } from "../../apis/authAPIs/auth";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const { Title, Text, Link } = Typography;

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState("teacher");
  const auth = useContext(AuthContext);

  const onFinish = async (values: any) => {
    try {
      const res = await apiLogin({ ...values, role });
      if (res && res.user) {
        auth?.login(res.user, res.tokens, values.remember);
        message.success("Login successful!");
        navigate("/");
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
              borderRadius: 12,
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              padding: 0,
              border: "none",
              margin: "40px 0",
              width: "100%",
              overflow: "hidden",
            }}
            bodyStyle={{ padding: 0 }}
          >
            <Row style={{ width: "100%" }}>
              <Col xs={24} md={12} style={{
                background: "#f6f9fc",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "24px 16px"
              }}>
                <Title level={1} style={{ marginBottom: 8, fontWeight: 400 }}>Attendance</Title>
                <Title level={2} style={{ marginBottom: 24, fontWeight: 400, color: "#2563eb", lineHeight: 1.1 }}>
                  for your business
                </Title>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit. Eveniet, itaque accusantium odio, soluta, corrupti aliquam quibusdam tempora at cupiditate quis eum maiores libero veritatis? Dicta facilis sint aliquid ipsum atque?
                </Text>
              </Col>
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
                  borderRadius: 8,
                  boxShadow: "none",
                  padding: 0
                }}>
                  <Radio.Group
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    style={{ display: "flex", gap: 16, marginBottom: 24 }}
                  >
                    <Radio.Button value="teacher" style={{ flex: 1, textAlign: "center" }}>Teacher</Radio.Button>
                    <Radio.Button value="admin" style={{ flex: 1, textAlign: "center" }}>Admin</Radio.Button>
                  </Radio.Group>
                  <Form
                    name="login"
                    layout="vertical"
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                  >
                    <Form.Item
                      label="Username"
                      name="username"
                      rules={[{ required: true, message: "Please input your username!" }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                    <Form.Item
                      label="Password"
                      name="password"
                      rules={[{ required: true, message: "Please input your password!" }]}
                    >
                      <Input.Password size="large" />
                    </Form.Item>
                    <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 8 }}>
                      <Checkbox>Remember me</Checkbox>
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 8 }}>
                      <Button type="primary" htmlType="submit" block size="large">
                        Sign in
                      </Button>
                    </Form.Item>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
                      <Link href="#" style={{ fontSize: 12 }}>Forgot password?</Link>
                    </div>
                    <div style={{ marginTop: 16, textAlign: "center" }}>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        Don't have an account?{" "}
                        <Link href="#" style={{ color: "#2563eb" }}>Register here</Link>
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