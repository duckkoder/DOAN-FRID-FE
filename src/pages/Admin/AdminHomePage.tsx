import React, { useState, useEffect } from "react";
import { Card, Row, Col, Typography, Statistic, Button, Space, Spin, message } from "antd";
import { PlusOutlined, TeamOutlined, SettingOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getTeachersList } from "@/apis/teacherAPIs/teacher";
import { getStudentsList } from "@/apis/studentAPIs/student";

const { Title, Text } = Typography;

const AdminHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { title: "Total Teachers", value: 0, color: "#2563eb", icon: "👨‍🏫" },
    { title: "Total Students", value: 0, color: "#10b981", icon: "👨‍🎓" },
    { title: "Total Classes", value: 20, color: "#f59e42", icon: "📚" },
    { title: "Active ModalAI", value: 3, color: "#ef4444", icon: "🤖" },
  ]);

  // Fetch statistics from APIs
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch teachers and students data
        const [teachersResponse, studentsResponse] = await Promise.all([
          getTeachersList({ page: 1, limit: 1 }), // Only need stats, so limit to 1
          getStudentsList({ page: 1, limit: 1 })
        ]);

        // Update stats with real data
        setStats([
          { title: "Total Teachers", value: teachersResponse.stats.total, color: "#2563eb", icon: "👨‍🏫" },
          { title: "Total Students", value: studentsResponse.stats.total, color: "#10b981", icon: "👨‍🎓" },
          { title: "Total Classes", value: 20, color: "#f59e42", icon: "📚" },
          { title: "Active ModalAI", value: 3, color: "#ef4444", icon: "🤖" },
        ]);
      } catch (error: any) {
        console.error("Error fetching statistics:", error);
        message.error("Không thể tải thống kê hệ thống");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
            onClick={() => navigate("/admin/teachers")}
          >
            Create Teacher Account
          </Button>
          <Button 
            size="large"
            icon={<TeamOutlined />}
            style={{ borderRadius: 8, height: 48 }}
            onClick={() => navigate("/admin/students")}
          >
            Create Student Account
          </Button>
          <Button 
            size="large"
            icon={<SettingOutlined />}
            style={{ borderRadius: 8, height: 48 }}
            onClick={() => navigate("/admin/modalai")}
          >
            Manage ModalAI
          </Button>
        </Space>
      </Card>

      {/* Statistics Cards */}
      <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
        📊 System Overview
      </Title>
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" tip="Đang tải thống kê..." />
        </div>
      ) : (
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
      )}

    </div>
  );
};

export default AdminHomePage;