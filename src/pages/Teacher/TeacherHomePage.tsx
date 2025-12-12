import React, { useState, useEffect } from "react";
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Statistic, 
  Button, 
  Table, 
  Tag, 
  Spin,
  message,
  Progress
} from "antd";
import { 
  BookOutlined, 
  UserOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  TeamOutlined,
  CalendarOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { getClassesList, type ClassListItem } from "../../apis/classesAPIs/teacherClass";
import { getClassSessions, type SessionWithStats } from "../../apis/attendanceAPIs/attendanceAPIs";

const { Title, Text } = Typography;

interface Statistics {
  totalClasses: number;
  activeClasses: number;
  totalStudents: number;
  avgAttendanceRate: number;
}

const TeacherHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionWithStats[]>([]);
  const [stats, setStats] = useState<Statistics>({
    totalClasses: 0,
    activeClasses: 0,
    totalStudents: 0,
    avgAttendanceRate: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch teacher classes and sessions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const classesResponse = await getClassesList();
        
        
        if (classesResponse.success && classesResponse.data) {
          const classesData = classesResponse.data.classes;
          setClasses(classesData);
          
          const activeClasses = classesData.filter((c: ClassListItem) => c.status === 'active').length;
          const totalStudents = classesData.reduce((sum: number, c: ClassListItem) => 
            sum + (c.studentCount || 0), 0
          );
          
          const allSessions: SessionWithStats[] = [];
          for (const cls of classesData) {
            try {
              const sessionsResponse = await getClassSessions(cls.id);
              
              if (sessionsResponse.sessions) {
                const sessions = sessionsResponse.sessions.map((session: SessionWithStats) => ({
                  ...session,
                  class_name: cls.subject || cls.name,
                  subject: cls.subject || cls.name,
                  room: cls.location
                }));
                allSessions.push(...sessions);
              }
            } catch (error) {
              console.error(`❌ Error fetching sessions for class ${cls.id}:`, error);
            }
          }
          
          const sortedSessions = allSessions
            .sort((a, b) => dayjs(b.start_time).diff(dayjs(a.start_time)))
            .slice(0, 10);
          
          setRecentSessions(sortedSessions);
          
          const sessionsWithStats = sortedSessions.filter(s => s.statistics);
          const avgRate = sessionsWithStats.length > 0
            ? sessionsWithStats.reduce((sum, s) => sum + (s.statistics?.attendance_rate || 0), 0) / sessionsWithStats.length
            : 0;
          
          setStats({
            totalClasses: classesData.length,
            activeClasses,
            totalStudents,
            avgAttendanceRate: avgRate
          });
        }
      } catch (error: any) {
        console.error('❌ Error fetching data:', error);
        message.error(error.message || 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getStatusConfig = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return { color: '#10b981', text: 'Đang hoạt động' };
      case 'inactive':
        return { color: '#64748b', text: 'Không hoạt động' };
      case 'completed':
        return { color: '#64748b', text: 'Đã kết thúc' };
      case 'cancelled':
        return { color: '#ef4444', text: 'Đã hủy' };
      default:
        return { color: '#64748b', text: 'Không xác định' };
    }
  };

  // ✅ Table columns for classes - REMOVED schedule column
  const classColumns = [
    {
      title: 'Tên lớp',
      key: 'name',
      render: (record: ClassListItem) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{record.name || record.subject}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12, color: '#2563eb' }}>
            {record.classCode}
          </Text>
        </div>
      )
    },
    {
      title: 'Địa điểm',
      dataIndex: 'location',
      key: 'location',
      render: (text: string) => (
        <Text><EnvironmentOutlined /> {text || 'N/A'}</Text>
      )
    },
    {
      title: 'Sinh viên',
      dataIndex: 'studentCount',
      key: 'studentCount',
      align: 'center' as const,
      render: (count: number) => (
        <Text><TeamOutlined /> {count || 0}</Text>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      render: (record: ClassListItem) => (
        <Button 
          size="small" 
          icon={<EyeOutlined />}
          onClick={() => navigate(`/teacher/class/${record.id}`)}
        >
          Chi tiết
        </Button>
      )
    }
  ];

  // ✅ Table columns for sessions - REMOVED location, navigate to session detail
  const sessionColumns = [
    {
      title: 'Lớp học',
      key: 'class',
      render: (record: SessionWithStats & { class_name?: string; subject?: string }) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{record.class_name || 'N/A'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.subject || ''}
          </Text>
        </div>
      )
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (record: SessionWithStats) => (
        <div>
          <Text><CalendarOutlined /> {dayjs(record.start_time).format('DD/MM/YYYY')}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            <ClockCircleOutlined /> {dayjs(record.start_time).format('HH:mm')} - {record.end_time ? dayjs(record.end_time).format('HH:mm') : 'N/A'}
          </Text>
        </div>
      )
    },
    {
      title: 'Điểm danh',
      key: 'attendance',
      align: 'center' as const,
      render: (record: SessionWithStats) => {
        const stats = record.statistics;
        if (!stats) return <Text type="secondary">N/A</Text>;
        
        return (
          <div>
            <Text strong style={{ color: '#10b981' }}>
              {stats.attendance_rate.toFixed(1)}%
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {stats.present_count}/{stats.total_students}
            </Text>
          </div>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      render: (record: SessionWithStats) => (
        <Button 
          size="small" 
          icon={<EyeOutlined />}
          onClick={() => navigate(`/teacher/session/${record.id}`)} // ✅ Navigate to session detail
        >
          Chi tiết
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }

  return (
    <div className="responsive-container" style={{ 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
      minHeight: "100vh" 
    }}>
      <style>
        {`
          @media (max-width: 768px) {
            .teacher-page-title {
              font-size: 24px !important;
            }
            
            .teacher-page-subtitle {
              font-size: 14px !important;
            }
            
            .ant-table-wrapper {
              overflow-x: auto;
            }
            
            .ant-table {
              min-width: 600px;
            }
          }
        `}
      </style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} className="teacher-page-title" style={{ 
          marginBottom: 8, 
          color: "#2563eb",
          fontSize: 32,
          fontWeight: 700 
        }}>
          🎓 Trang chủ
        </Title>
        <Text type="secondary" className="teacher-page-subtitle" style={{ fontSize: 16 }}>
          Chào mừng, Thầy/Cô! Tổng quan về các lớp học và điểm danh.
        </Text>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ 
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "none"
          }}>
            <Statistic
              title={<Text style={{ color: "#888", fontSize: 14 }}>Tổng lớp học</Text>}
              value={stats.totalClasses}
              suffix="lớp"
              prefix={<BookOutlined style={{ color: '#2563eb', fontSize: 20 }} />}
              valueStyle={{ 
                color: '#2563eb', 
                fontWeight: 700, 
                fontSize: 24 
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ 
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "none"
          }}>
            <Statistic
              title={<Text style={{ color: "#888", fontSize: 14 }}>Lớp đang hoạt động</Text>}
              value={stats.activeClasses}
              suffix="lớp"
              prefix={<CheckCircleOutlined style={{ color: '#10b981', fontSize: 20 }} />}
              valueStyle={{ 
                color: '#10b981', 
                fontWeight: 700, 
                fontSize: 24 
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ 
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "none"
          }}>
            <Statistic
              title={<Text style={{ color: "#888", fontSize: 14 }}>Tổng sinh viên</Text>}
              value={stats.totalStudents}
              suffix="SV"
              prefix={<TeamOutlined style={{ color: '#f59e0b', fontSize: 20 }} />}
              valueStyle={{ 
                color: '#f59e0b', 
                fontWeight: 700, 
                fontSize: 24 
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ 
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "none"
          }}>
            <Statistic
              title={<Text style={{ color: "#888", fontSize: 14 }}>Tỷ lệ điểm danh TB</Text>}
              value={stats.avgAttendanceRate.toFixed(1)}
              suffix="%"
              prefix={<UserOutlined style={{ color: '#9333ea', fontSize: 20 }} />}
              valueStyle={{ 
                color: '#9333ea', 
                fontWeight: 700, 
                fontSize: 24 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* ✅ Attendance Stats by Class - Show progress bars for each class */}
      {classes.length > 0 && (
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircleOutlined style={{ color: '#2563eb' }} />
              <span>Tỷ lệ điểm danh các lớp đang dạy</span>
            </div>
          }
          style={{ 
            borderRadius: 16,
            marginBottom: 24,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "none"
          }}
        >
          <Row gutter={[16, 16]}>
            {classes.map((cls) => {
              // Calculate attendance rate for this class from sessions
              const classSessions = recentSessions.filter(s => s.class_id === cls.id && s.statistics);
              const avgRate = classSessions.length > 0
                ? classSessions.reduce((sum, s) => sum + (s.statistics?.attendance_rate || 0), 0) / classSessions.length
                : 0;
              
              const color = avgRate >= 80 ? '#10b981' : avgRate >= 60 ? '#f59e0b' : '#ef4444';
              
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={cls.id}>
                  <Card size="small" style={{ borderRadius: 12, height: '100%' }}>
                    <div style={{ marginBottom: 12 }}>
                      <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
                        {cls.subject || cls.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {cls.classCode}
                      </Text>
                    </div>
                    <Progress 
                      percent={avgRate} 
                      strokeColor={color}
                      format={(percent) => (
                        <Text strong style={{ color }}>
                          {percent?.toFixed(1)}%
                        </Text>
                      )}
                    />
                    <div style={{ marginTop: 8, textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {classSessions.length} phiên điểm danh
                      </Text>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}

      {/* Main Content */}
      <Row gutter={[16, 16]}>
        {/* Classes Table */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOutlined style={{ color: '#2563eb' }} />
                <span>Danh sách lớp học</span>
              </div>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/teacher/classes')}
              >
                Xem tất cả
              </Button>
            }
            style={{ 
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              border: "none"
            }}
          >
            <Table
              dataSource={classes.slice(0, 5)}
              columns={classColumns}
              rowKey="id"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        {/* Recent Sessions Table */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarOutlined style={{ color: '#2563eb' }} />
                <span>Phiên điểm danh gần đây</span>
              </div>
            }
            style={{ 
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              border: "none"
            }}
          >
            <Table
              dataSource={recentSessions.slice(0, 5)}
              columns={sessionColumns}
              rowKey="id"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherHomePage;