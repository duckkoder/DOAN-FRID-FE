import React, { useState, useEffect } from "react";
import { Card, Row, Col, Typography, Statistic, Button, Space, Spin, message } from "antd";
import { PlusOutlined, TeamOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getTeachersList } from "@/apis/teacherAPIs/teacher";
import { getStudentsList } from "@/apis/studentAPIs/student";
import { getClassesStats } from "@/apis/classesAPIs/adminClass";

const { Title, Text } = Typography;

const AdminHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { title: "Tổng số Giáo viên", value: 0, color: "#2563eb", icon: "👨‍🏫" },
    { title: "Tổng số Sinh viên", value: 0, color: "#10b981", icon: "👨‍🎓" },
    { title: "Tổng số Lớp học", value: 20, color: "#f59e42", icon: "📚" },
  ]);

  // Fetch statistics from APIs
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch teachers, students, and classes data in parallel
        const [teachersResponse, studentsResponse, classesResponse] = await Promise.all([
          getTeachersList({ page: 1, limit: 1 }), // Only need stats, so limit to 1
          getStudentsList({ page: 1, limit: 1 }),
          getClassesStats() // Get classes statistics
        ]);

        // Update stats with real data
        setStats([
          { title: "Tổng số Giáo viên", value: teachersResponse.stats.total, color: "#2563eb", icon: "👨‍🏫" },
          { title: "Tổng số Sinh viên", value: studentsResponse.stats.total, color: "#10b981", icon: "👨‍🎓" },
          { title: "Tổng số Lớp học", value: classesResponse.data.total, color: "#f59e42", icon: "📚" },
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
          🎯 Bảng điều khiển Quản trị
        </Title>
        <Text style={{ 
          fontSize: 18, 
          color: "#64748b", 
          display: "block",
          marginBottom: 24
        }}>
          Chào mừng trở lại! Quản lý toàn bộ hệ thống giáo dục từ đây.
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
          ⚡ Thao tác nhanh
        </Title>
        <Space size={16} wrap>
          <Button 
            type="primary" 
            size="large"
            icon={<PlusOutlined />}
            style={{ borderRadius: 8, height: 48 }}
            onClick={() => navigate("/admin/teachers")}
          >
            Tạo tài khoản Giáo viên
          </Button>
          <Button 
            size="large"
            icon={<TeamOutlined />}
            style={{ borderRadius: 8, height: 48 }}
            onClick={() => navigate("/admin/students")}
          >
            Tạo tài khoản Sinh viên
          </Button>
        </Space>
      </Card>

      {/* Statistics Cards */}
      <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
        📊 Tổng quan Hệ thống
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