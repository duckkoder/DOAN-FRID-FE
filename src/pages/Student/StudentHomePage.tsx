import React from "react";
import { Card, Row, Col, Typography, Statistic, Button, Progress } from "antd";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const StudentHomePage: React.FC = () => {
  const navigate = useNavigate();

  // Dữ liệu mẫu cho các biểu đồ
  const attendanceData = [
    { name: 'Có mặt', value: 85, color: '#10b981' },
    { name: 'Vắng', value: 10, color: '#ef4444' },
    { name: 'Muộn', value: 5, color: '#f59e42' }
  ];

  const weeklyAttendance = [
    { day: 'Mon', present: 4, absent: 0 },
    { day: 'Tue', present: 3, absent: 1 },
    { day: 'Wed', present: 4, absent: 0 },
    { day: 'Thu', present: 3, absent: 1 },
    { day: 'Fri', present: 4, absent: 0 },
  ];

  const monthlyTrend = [
    { month: 'Jan', rate: 95 },
    { month: 'Feb', rate: 88 },
    { month: 'Mar', rate: 92 },
    { month: 'Apr', rate: 96 },
    { month: 'May', rate: 89 },
    { month: 'Jun', rate: 94 },
  ];

  const subjectAttendance = [
    { subject: 'Java', rate: 95, sessions: 20 },
    { subject: 'Database', rate: 88, sessions: 16 },
    { subject: 'Web Dev', rate: 92, sessions: 18 },
    { subject: 'AI/ML', rate: 85, sessions: 14 },
  ];

  const stats = [
    { title: "My Classes", value: 4, color: "#2563eb", icon: "📚" },
    { title: "Attendance Rate", value: "95%", color: "#10b981", icon: "✅" },
    { title: "Total Absences", value: 3, color: "#ef4444", icon: "❌" },
    { title: "This Week", value: "4/5", color: "#f59e42", icon: "📅" },
  ];

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
      padding: "32px 48px" 
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Title level={1} style={{ 
          marginBottom: 8, 
          color: "#2563eb",
          fontSize: 36,
          fontWeight: 700
        }}>
          🎓 Student Dashboard
        </Title>
        <Text style={{ 
          fontSize: 18, 
          color: "#64748b",
          display: "block",
          marginBottom: 24
        }}>
          Welcome back! Track your attendance and academic progress here.
        </Text>
      </div>

      {/* Quick Actions */}
      <Card style={{ 
        marginBottom: 32, 
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none"
      }}>
        <Row gutter={16}>
          <Col>
            <Button 
              type="primary" 
              size="large" 
              style={{ borderRadius: 8, height: 48 }}
              onClick={() => navigate('/student/attendance')}
            >
              View My Attendance
            </Button>
          </Col>
          <Col>
            <Button 
              size="large" 
              style={{ borderRadius: 8, height: 48 }}
              onClick={() => navigate('/student/classes')}
            >
              View Class List
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        {stats.map((item) => (
          <Col xs={24} sm={12} md={6} key={item.title}>
            <Card style={{
              borderRadius: 16,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: "none",
              background: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
              textAlign: "center"
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
              <Statistic
                title={<Text style={{ color: "#64748b", fontSize: 14 }}>{item.title}</Text>}
                value={item.value}
                valueStyle={{ color: item.color, fontWeight: 700, fontSize: 24 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Section */}
      <Row gutter={[24, 24]}>
        {/* Attendance Distribution Pie Chart */}
        <Col xs={24} lg={8}>
          <Card style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none",
            height: 400
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
              📊 Attendance Distribution
            </Title>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={attendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Weekly Attendance Bar Chart */}
        <Col xs={24} lg={8}>
          <Card style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none",
            height: 400
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
              📈 Weekly Attendance
            </Title>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyAttendance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#10b981" name="Present" />
                <Bar dataKey="absent" fill="#ef4444" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Monthly Trend Line Chart */}
        <Col xs={24} lg={8}>
          <Card style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none",
            height: 400
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
              📉 Monthly Trend
            </Title>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[80, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  name="Attendance Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Subject-wise Progress */}
        <Col xs={24} lg={12}>
          <Card style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none"
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
              📚 Subject-wise Attendance
            </Title>
            {subjectAttendance.map((subject, index) => (
              <div key={index} style={{ marginBottom: 16 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: 8 
                }}>
                  <Text strong>{subject.subject}</Text>
                  <Text>{subject.rate}% ({subject.sessions} sessions)</Text>
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
            ))}
          </Card>
        </Col>

        {/* Recent Activity */}
        <Col xs={24} lg={12}>
          <Card style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none"
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
              🕒 Recent Activity
            </Title>
            <div style={{ color: "#64748b" }}>
              <div style={{ 
                padding: "12px 0", 
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                gap: 12
              }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  background: "#10b981" 
                }}></div>
                <div>
                  <Text>Attended Java Programming class</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>2 hours ago</Text>
                </div>
              </div>
              <div style={{ 
                padding: "12px 0", 
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                gap: 12
              }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  background: "#f59e42" 
                }}></div>
                <div>
                  <Text>Appeal submitted for Database class</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>1 day ago</Text>
                </div>
              </div>
              <div style={{ 
                padding: "12px 0",
                display: "flex",
                alignItems: "center",
                gap: 12
              }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  background: "#2563eb" 
                }}></div>
                <div>
                  <Text>Joined Web Development class</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>3 days ago</Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentHomePage;