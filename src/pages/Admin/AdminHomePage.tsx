import React from "react";
import { Card, Row, Col, Typography, Statistic, Button, Space } from "antd";
import { PlusOutlined, TeamOutlined, SettingOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const AdminHomePage: React.FC = () => {
  // Dữ liệu mẫu, thay bằng dữ liệu thực tế nếu cần
  const stats = [
    { title: "Total Teachers", value: 12, color: "#2563eb", icon: "👨‍🏫" },
    { title: "Total Students", value: 320, color: "#10b981", icon: "👨‍🎓" },
    { title: "Total Classes", value: 20, color: "#f59e42", icon: "📚" },
    { title: "Active ModalAI", value: 3, color: "#ef4444", icon: "🤖" },
  ];

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
      padding: "32px 48px" 
    }}>
      {/* Welcome Section */}
      <div style={{ marginBottom: 32 }}>
        <Title level={1} style={{ 
          marginBottom: 8, 
          color: "#2563eb",
          fontSize: 36,
          fontWeight: 700
        }}>
          🎯 Admin Dashboard
        </Title>
        <Text style={{ 
          fontSize: 18, 
          color: "#64748b", 
          display: "block",
          marginBottom: 24
        }}>
          Welcome back! Manage your entire educational ecosystem from here.
        </Text>
      </div>

      {/* Quick Actions */}
      <Card style={{ 
        marginBottom: 32, 
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none"
      }}>
        <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
          ⚡ Quick Actions
        </Title>
        <Space size={16} wrap>
          <Button 
            type="primary" 
            size="large"
            icon={<PlusOutlined />}
            style={{ borderRadius: 8, height: 48 }}
          >
            Create Teacher Account
          </Button>
          <Button 
            size="large"
            icon={<TeamOutlined />}
            style={{ borderRadius: 8, height: 48 }}
          >
            Create Student Account
          </Button>
          <Button 
            size="large"
            icon={<SettingOutlined />}
            style={{ borderRadius: 8, height: 48 }}
          >
            Manage ModalAI
          </Button>
        </Space>
      </Card>

      {/* Statistics Cards */}
      <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
        📊 System Overview
      </Title>
      <Row gutter={[24, 24]}>
        {stats.map((item) => (
          <Col xs={24} sm={12} md={6} key={item.title}>
            <Card style={{
              borderRadius: 16,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: "none",
              background: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
              transition: "transform 0.2s ease",
              cursor: "pointer"
            }}
            hoverable
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
                <Statistic
                  title={
                    <Text style={{ 
                      color: "#64748b", 
                      fontSize: 14,
                      fontWeight: 500
                    }}>
                      {item.title}
                    </Text>
                  }
                  value={item.value}
                  valueStyle={{ 
                    color: item.color, 
                    fontWeight: 700,
                    fontSize: 28
                  }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Recent Activity */}
      <Card style={{ 
        marginTop: 32,
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none"
      }}>
        <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
          🕒 Recent Activity
        </Title>
        <div style={{ color: "#64748b" }}>
          <Text>• New teacher account created - 2 hours ago</Text><br />
          <Text>• ModalAI system updated - 4 hours ago</Text><br />
          <Text>• 15 new students registered - 1 day ago</Text><br />
        </div>
      </Card>
    </div>
  );
};

export default AdminHomePage;