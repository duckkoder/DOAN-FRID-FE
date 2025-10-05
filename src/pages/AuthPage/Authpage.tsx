import React, { useState } from "react";
import { Form, Input, Button, Checkbox, Radio, Typography, Row, Col, Card } from "antd";

const { Title, Text, Link } = Typography;

const AuthPage: React.FC = () => {
  const [role, setRole] = useState("teacher");

  const onFinish = (values: any) => {
    // Xử lý đăng nhập ở đây
    console.log("Success:", values);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc" }}>
      {/* Header */}
      <div style={{
        background: "#fff",
        boxShadow: "0 2px 8px #f0f1f2",
        padding: "20px 40px"
      }}>
        <span style={{ fontSize: 24, fontWeight: "bold", color: "#2563eb" }}>Attendify</span>
      </div>
      {/* Main content */}
      <Row justify="center" align="middle" style={{ minHeight: "calc(100vh - 72px)" }}>
        <Col>
          <Card
            style={{
              display: "flex",
              flexDirection: "row",
              width: 1100,
              height: 500,
              padding: 0,
              overflow: "hidden",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)"
            }}
            bodyStyle={{ display: "flex", flex: 1, padding: 0 }}
          >
            {/* Left side */}
            <div style={{
              flex: 1,
              background: "#f6f9fc",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 48px"
            }}>
              <Title level={1} style={{ marginBottom: 8, fontWeight: 400 }}>Attendance</Title>
              <Title level={2} style={{ marginBottom: 24, fontWeight: 400, color: "#2563eb", lineHeight: 1.1 }}>
                for your business
              </Title>
              <Text type="secondary" style={{ fontSize: 16 }}>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Eveniet, itaque accusantium odio, soluta, corrupti aliquam quibusdam tempora at cupiditate quis eum maiores libero veritatis? Dicta facilis sint aliquid ipsum atque?
              </Text>
            </div>
            {/* Right side (form) */}
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff"
            }}>
              <div style={{
                width: 400,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 2px 8px #f0f1f2",
                padding: 40
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
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AuthPage;