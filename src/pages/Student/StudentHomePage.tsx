import React, { useEffect, useState } from "react";
import { Card, Row, Col, Typography, Statistic, Button, Progress, Spin, message } from "antd";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { useNavigate } from "react-router-dom";
import { getStudentDashboardData } from "../../apis/studentAPIs/dashboard";
import type { StudentDashboardResponseSchema } from "../../types/studentDashboard";

const { Title, Text } = Typography;

const StudentHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<StudentDashboardResponseSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getStudentDashboardData();
      setDashboardData(data);
    } catch (error: any) {
      message.error(error.message || "Không thể tải dữ liệu bảng điều khiển");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)"
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { summary, attendance_distribution, weekly_attendance, monthly_trend, subject_wise_attendance, recent_activity } = dashboardData;

  const attendanceData = attendance_distribution.map(item => ({
    name: item.status,
    value: item.count,
    percentage: item.percentage,
    color: item.status === 'Có mặt' ? '#10b981' : item.status === 'Vắng' ? '#ef4444' : '#f59e42'
  }));

  const weeklyData = weekly_attendance.map(item => ({
    day: item.day,
    present: item.present_count,
    absent: item.absent_count
  }));

  const monthlyData = monthly_trend.map(item => ({
    month: item.month,
    rate: item.attendance_rate
  }));

  const subjectData = subject_wise_attendance.map(item => ({
    subject: item.subject_name,
    rate: item.attendance_rate,
    sessions: item.total_sessions
  }));

  const stats = [
    { title: "Lớp học của tôi", value: summary.my_classes, color: "#2563eb", icon: "📚" },
    { title: "Tỷ lệ có mặt", value: `${summary.attendance_rate.toFixed(1)}%`, color: "#10b981", icon: "✅" },
    { title: "Tổng số buổi vắng", value: summary.total_absences, color: "#ef4444", icon: "❌" },
    { title: "Tuần này có mặt", value: summary.this_week_attended, color: "#10b981", icon: "📅" },
    { title: "Tổng buổi tuần này", value: summary.this_week_total, color: "#f59e42", icon: "📆" },
  ];

  return (
    <div className="responsive-container" style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)"
    }}>
      <style>
        {`
          @media (max-width: 768px) {
            .stats-grid {
              grid-template-columns: 1fr !important;
            }
            
            .quick-actions-row {
              flex-direction: column !important;
            }
            
            .quick-actions-row > div {
              width: 100% !important;
            }
            
            .chart-card {
              margin-bottom: 16px !important;
            }
          }
          
          @media (max-width: 480px) {
            .page-title {
              font-size: 24px !important;
            }
            
            .page-subtitle {
              font-size: 14px !important;
            }
          }
        `}
      </style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={1} className="page-title" style={{ 
          marginBottom: 8, 
          color: "#2563eb",
          fontSize: 36,
          fontWeight: 700
        }}>
          🎓 Bảng Điều Khiển Sinh Viên
        </Title>
        <Text className="page-subtitle" style={{ 
          fontSize: 18, 
          color: "#64748b",
          display: "block"
        }}>
          Chào mừng trở lại! Theo dõi điểm danh và tiến độ học tập của bạn tại đây.
        </Text>
      </div>

      {/* Quick Actions */}
      <Card style={{ 
        marginBottom: 24, 
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none"
      }}>
        <Row className="quick-actions-row" gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Button 
              type="primary" 
              size="large" 
              block
              style={{ borderRadius: 8, height: 48 }}
              onClick={() => navigate('/student/attendance')}
            >
              Xem Điểm Danh
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button 
              size="large" 
              block
              style={{ borderRadius: 8, height: 48 }}
              onClick={() => navigate('/student/classes')}
            >
              Danh Sách Lớp
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((item) => (
          <Col xs={24} sm={12} md={8} lg={4.8} key={item.title}>
            <Card style={{
              borderRadius: 16,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: "none",
              background: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
              textAlign: "center",
              height: "100%"
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
              <Statistic
                title={<Text style={{ color: "#64748b", fontSize: 13 }}>{item.title}</Text>}
                value={item.value}
                valueStyle={{ color: item.color, fontWeight: 700, fontSize: 22 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Section */}
      <Row gutter={[16, 16]}>
        {/* Attendance Distribution Pie Chart */}
        <Col xs={24} lg={8}>
          <Card className="chart-card" style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none",
            minHeight: 350
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151", fontSize: 16 }}>
              📊 Phân Bố Điểm Danh
            </Title>
            {attendanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    labelLine={true}
                  >
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string, props: any) => [`${value} (${props.payload.percentage.toFixed(1)}%)`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Không có dữ liệu</div>
            )}
          </Card>
        </Col>

        {/* Weekly Attendance Bar Chart */}
        <Col xs={24} lg={8}>
          <Card className="chart-card" style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none",
            minHeight: 350
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151", fontSize: 16 }}>
              📈 Điểm Danh Theo Tuần
            </Title>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" fill="#10b981" name="Có mặt" />
                <Bar dataKey="absent" fill="#ef4444" name="Vắng" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Monthly Trend Line Chart */}
        <Col xs={24} lg={8}>
          <Card className="chart-card" style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none",
            minHeight: 350
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151", fontSize: 16 }}>
              📉 Xu Hướng Theo Tháng
            </Title>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  name="Tỷ lệ có mặt (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Subject-wise Progress */}
        <Col xs={24} lg={12}>
          <Card className="chart-card" style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none"
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151", fontSize: 16 }}>
              📚 Điểm Danh Theo Môn Học
            </Title>
            {subjectData.length > 0 ? (
              subjectData.map((subject, index) => (
                <div key={index} style={{ marginBottom: 16 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: 8 
                  }}>
                    <Text strong>{subject.subject}</Text>
                    <Text>{subject.rate.toFixed(1)}% ({subject.sessions} buổi)</Text>
                  </div>
                  <Progress 
                    percent={subject.rate} 
                    strokeColor={
                      subject.rate >= 90 ? '#10b981' : 
                      subject.rate >= 80 ? '#f59e42' : '#ef4444'
                    }
                    showInfo={false}
                  />
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>Không có môn học nào</div>
            )}
          </Card>
        </Col>

        {/* Recent Activity */}
        <Col xs={24} lg={12}>
          <Card className="chart-card" style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none"
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151", fontSize: 16 }}>
              🕒 Hoạt Động Gần Đây
            </Title>
            <div style={{ color: "#64748b" }}>
              {recent_activity.length > 0 ? (
                recent_activity.map((activity, index) => (
                  <div key={index} style={{ 
                    padding: "12px 0", 
                    borderBottom: index < recent_activity.length - 1 ? "1px solid #f1f5f9" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}>
                    <div style={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: "50%", 
                      background: index === 0 ? "#10b981" : index === 1 ? "#f59e42" : "#2563eb"
                    }}></div>
                    <div>
                      <Text>{activity.description}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(activity.timestamp).toLocaleString('vi-VN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>Không có hoạt động gần đây</div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentHomePage;