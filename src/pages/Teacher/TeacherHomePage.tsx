import React, { useState } from "react";
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Statistic, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Avatar, 
  Progress,
  Calendar,
  Badge,
  List,
  Empty
} from "antd";
import { 
  FileTextOutlined, 
  BookOutlined, 
  UserOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  CalendarOutlined,
  BellOutlined,
  EnvironmentOutlined,
  EyeOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface ClassItem {
  id: string;
  subject: string;
  time: string;
  duration: string;
  room: string;
  studentCount: number;
  maxStudents: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  day: number;
}

interface Notification {
  id: string;
  type: 'leave_request' | 'attendance' | 'announcement';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

interface TodaySession {
  id: string;
  subject: string;
  time: string;
  room: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  attendanceRate?: number;
}

const TeacherHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(dayjs());

  // Mock data for classes
  const recentClasses: ClassItem[] = [
    {
      id: "1",
      subject: "Advanced Java Programming",
      time: "07:30",
      duration: "120",
      room: "A101",
      studentCount: 35,
      maxStudents: 40,
      status: 'upcoming',
      day: 1
    },
    {
      id: "2", 
      subject: "Database Management Systems",
      time: "13:30",
      duration: "90",
      room: "B203",
      studentCount: 28,
      maxStudents: 35,
      status: 'completed',
      day: 2
    },
    {
      id: "3",
      subject: "Software Engineering",
      time: "15:30",
      duration: "90", 
      room: "C105",
      studentCount: 42,
      maxStudents: 45,
      status: 'ongoing',
      day: 3
    },
    {
      id: "4",
      subject: "Computer Networks",
      time: "09:00",
      duration: "105",
      room: "D201",
      studentCount: 38,
      maxStudents: 40,
      status: 'upcoming',
      day: 4
    }
  ];

  // Mock notifications
  const notifications: Notification[] = [
    {
      id: "1",
      type: 'leave_request',
      title: "Đơn xin nghỉ mới",
      message: "Nguyễn Văn An đã gửi đơn xin nghỉ học ngày 15/10/2024",
      time: "2 phút trước",
      isRead: false
    },
    {
      id: "2",
      type: 'attendance',
      title: "Điểm danh hoàn thành",
      message: "Lớp Advanced Java Programming - Tỷ lệ có mặt: 94%",
      time: "1 giờ trước", 
      isRead: false
    },
    {
      id: "3",
      type: 'announcement',
      title: "Thông báo từ Ban Giám Hiệu",
      message: "Lịch thi cuối kỳ đã được cập nhật",
      time: "3 giờ trước",
      isRead: true
    }
  ];

  // Mock today's sessions
  const todaySessions: TodaySession[] = [
    {
      id: "1",
      subject: "Advanced Java Programming",
      time: "07:30",
      room: "A101",
      status: 'completed',
      attendanceRate: 94
    },
    {
      id: "2",
      subject: "Database Management Systems", 
      time: "13:30",
      room: "B203",
      status: 'ongoing'
    },
    {
      id: "3",
      subject: "Software Engineering",
      time: "15:30",
      room: "C105", 
      status: 'upcoming'
    }
  ];

  const stats = [
    { 
      title: "Tổng lớp học", 
      value: recentClasses.length, 
      color: "#2563eb",
      icon: <BookOutlined />,
      suffix: "lớp"
    },
    { 
      title: "Điểm danh hôm nay", 
      value: 94, 
      color: "#10b981",
      icon: <CheckCircleOutlined />,
      suffix: "%"
    },
    { 
      title: "Học sinh vắng", 
      value: 8, 
      color: "#ef4444",
      icon: <CloseCircleOutlined />,
      suffix: "người"
    },
    { 
      title: "Đơn chờ duyệt", 
      value: 3, 
      color: "#f59e42",
      icon: <FileTextOutlined />,
      suffix: "đơn"
    },
  ];

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'upcoming':
        return { color: '#3b82f6', text: 'Sắp diễn ra' };
      case 'ongoing':
        return { color: '#10b981', text: 'Đang diễn ra' };
      case 'completed':
        return { color: '#64748b', text: 'Đã kết thúc' };
      default:
        return { color: '#64748b', text: 'Không xác định' };
    }
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'leave_request':
        return <FileTextOutlined style={{ color: '#f59e42' }} />;
      case 'attendance':
        return <CheckCircleOutlined style={{ color: '#10b981' }} />;
      case 'announcement':
        return <BellOutlined style={{ color: '#3b82f6' }} />;
      default:
        return <BellOutlined />;
    }
  };

  const getEndTime = (startTime: string, duration: string) => {
    const start = dayjs(`2024-01-01 ${startTime}`);
    const end = start.add(parseInt(duration), 'minute');
    return end.format('HH:mm');
  };

  const weekDays = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  // Table columns for recent classes
  const classColumns = [
    {
      title: 'Môn học',
      key: 'subject',
      render: (record: ClassItem) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{record.subject}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            <EnvironmentOutlined /> {record.room} • {weekDays[record.day]}
          </Text>
        </div>
      )
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (record: ClassItem) => (
        <div>
          <Text><ClockCircleOutlined /> {record.time} - {getEndTime(record.time, record.duration)}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.duration} phút
          </Text>
        </div>
      )
    },
    {
      title: 'Sinh viên',
      key: 'students',
      align: 'center' as const,
      render: (record: ClassItem) => (
        <div>
          <Text><UserOutlined /> {record.studentCount}/{record.maxStudents}</Text>
          <br />
          <Progress 
            percent={(record.studentCount / record.maxStudents) * 100} 
            size="small"
            showInfo={false}
            strokeColor="#3b82f6"
          />
        </div>
      )
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center' as const,
      render: (record: ClassItem) => {
        const config = getStatusConfig(record.status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      render: (record: ClassItem) => (
        <Button 
          size="small" 
          icon={<EyeOutlined />}
          onClick={() => navigate(`/teacher/class/${record.id}`, { state: { classData: record } })}
        >
          Chi tiết
        </Button>
      )
    }
  ];

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ 
      padding: 32, 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
      minHeight: "100vh" 
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ 
          marginBottom: 8, 
          color: "#2563eb",
          fontSize: 32,
          fontWeight: 700 
        }}>
          🎓 Teacher Dashboard
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          Chào mừng, Thầy/Cô! Quản lý lớp học, điểm danh và báo cáo một cách hiệu quả.
        </Text>
      </div>

      {/* Quick Actions */}
      <Row gutter={16} style={{ marginBottom: 32 }}>
        <Col>
          <Button 
            icon={<FileTextOutlined />}
            size="large"
            onClick={() => navigate('/teacher/reports')}
            style={{ borderRadius: 8 }}
          >
            Xem báo cáo điểm danh
          </Button>
        </Col>
        <Col>
          <Button 
            icon={<CalendarOutlined />}
            size="large"
            onClick={() => navigate('/teacher/classes')}
            style={{ borderRadius: 8 }}
          >
            Lịch giảng dạy
          </Button>
        </Col>
      </Row>

      {/* Statistics */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        {stats.map((item, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card style={{ 
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              border: "none"
            }}>
              <Statistic
                title={<Text style={{ color: "#888", fontSize: 14 }}>{item.title}</Text>}
                value={item.value}
                suffix={item.suffix}
                prefix={<div style={{ color: item.color, fontSize: 20 }}>{item.icon}</div>}
                valueStyle={{ 
                  color: item.color, 
                  fontWeight: 700, 
                  fontSize: 24 
                }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Main Content */}
      <Row gutter={[24, 24]}>
        {/* Left Column */}
        <Col xs={24} lg={16}>
          {/* Today's Schedule */}
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarOutlined style={{ color: '#2563eb' }} />
                <span>Lịch học hôm nay - {dayjs().format('DD/MM/YYYY')}</span>
              </div>
            }
            style={{ 
              borderRadius: 16,
              marginBottom: 24,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              border: "none"
            }}
          >
            {todaySessions.length > 0 ? (
              <List
                dataSource={todaySessions}
                renderItem={session => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size={48} 
                          style={{ 
                            backgroundColor: getStatusConfig(session.status).color,
                            fontSize: 16
                          }}
                          icon={<BookOutlined />}
                        />
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ fontSize: 16 }}>{session.subject}</Text>
                          <Tag color={getStatusConfig(session.status).color}>
                            {getStatusConfig(session.status).text}
                          </Tag>
                        </div>
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          <Text type="secondary">
                            <ClockCircleOutlined /> {session.time} • <EnvironmentOutlined /> {session.room}
                          </Text>
                          {session.attendanceRate && (
                            <Text style={{ color: '#10b981' }}>
                              <CheckCircleOutlined /> Điểm danh: {session.attendanceRate}%
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Không có lịch học hôm nay" />
            )}
          </Card>

          {/* Recent Classes */}
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOutlined style={{ color: '#2563eb' }} />
                <span>Lớp học gần đây</span>
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
              dataSource={recentClasses}
              columns={classColumns}
              rowKey="id"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        {/* Right Column */}
        <Col xs={24} lg={8}>
          {/* Notifications */}
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge count={unreadNotifications} offset={[10, 0]}>
                  <BellOutlined style={{ color: '#2563eb' }} />
                </Badge>
                <span>Thông báo</span>
              </div>
            }
            style={{ 
              borderRadius: 16,
              marginBottom: 24,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              border: "none"
            }}
          >
            <List
              dataSource={notifications.slice(0, 5)}
              renderItem={notification => (
                <List.Item style={{ 
                  padding: '12px 0',
                  backgroundColor: notification.isRead ? 'transparent' : '#f0f9ff',
                  borderRadius: 8,
                  marginBottom: 8,
                  paddingLeft: notification.isRead ? 0 : 12
                }}>
                  <List.Item.Meta
                    avatar={getNotificationIcon(notification.type)}
                    title={
                      <Text strong={!notification.isRead} style={{ fontSize: 14 }}>
                        {notification.title}
                      </Text>
                    }
                    description={
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {notification.message}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {notification.time}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>

          {/* Mini Calendar */}
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarOutlined style={{ color: '#2563eb' }} />
                <span>Lịch</span>
              </div>
            }
            style={{ 
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              border: "none"
            }}
          >
            <Calendar 
              fullscreen={false} 
              value={selectedDate}
              onSelect={setSelectedDate}
              style={{ fontSize: 12 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherHomePage;