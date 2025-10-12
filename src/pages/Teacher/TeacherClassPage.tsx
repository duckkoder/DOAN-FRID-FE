import React, { useState, useEffect } from "react";
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Timeline, 
  Tag, 
  Button, 
  Switch,
  Space,
  Avatar,
  Statistic,
  Select
} from "antd";
import { 
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BookOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
  PlusOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface ClassSession {
  id: string;
  subject: string;
  time: string;
  duration: string;
  room: string;
  studentCount: number;
  maxStudents: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  day: number; // 1-7 (Monday-Sunday)
}

const TeacherClassPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [selectedWeek, setSelectedWeek] = useState<string>('current');
  const [currentTime, setCurrentTime] = useState(dayjs());
  const navigate = useNavigate();

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Dữ liệu mẫu lớp học
  const classes: ClassSession[] = [
    {
      id: "1",
      subject: "Advanced Java Programming",
      time: "07:30",
      duration: "120",
      room: "A101",
      studentCount: 35,
      maxStudents: 40,
      status: 'upcoming',
      day: 1 // Monday
    },
    {
      id: "2", 
      subject: "Database Design",
      time: "09:45",
      duration: "120",
      room: "B203",
      studentCount: 28,
      maxStudents: 35,
      status: 'upcoming',
      day: 1
    },
    {
      id: "3",
      subject: "Web Development",
      time: "13:30",
      duration: "120", 
      room: "C304",
      studentCount: 32,
      maxStudents: 40,
      status: 'upcoming',
      day: 1
    },
    {
      id: "4",
      subject: "Advanced Java Programming", 
      time: "07:30",
      duration: "120",
      room: "A101",
      studentCount: 35,
      maxStudents: 40,
      status: 'upcoming',
      day: 2 // Tuesday
    },
    {
      id: "5",
      subject: "Artificial Intelligence",
      time: "15:45",
      duration: "120",
      room: "D405",
      studentCount: 25,
      maxStudents: 30,
      status: 'upcoming',
      day: 3 // Wednesday
    },
    {
      id: "6",
      subject: "Database Design",
      time: "09:45", 
      duration: "120",
      room: "B203",
      studentCount: 28,
      maxStudents: 35,
      status: 'upcoming',
      day: 4 // Thursday
    },
    {
      id: "7",
      subject: "Web Development",
      time: "13:30",
      duration: "120",
      room: "C304", 
      studentCount: 32,
      maxStudents: 40,
      status: 'upcoming',
      day: 5 // Friday
    }
  ];

  const breadcrumbItems = [
    { title: "Dashboard", href: "/teacher" },
    { title: "Class Management" }
  ];

  const weekDays = [
    { key: 1, name: 'Thứ 2', shortName: 'T2' },
    { key: 2, name: 'Thứ 3', shortName: 'T3' },
    { key: 3, name: 'Thứ 4', shortName: 'T4' },
    { key: 4, name: 'Thứ 5', shortName: 'T5' },
    { key: 5, name: 'Thứ 6', shortName: 'T6' },
    { key: 6, name: 'Thứ 7', shortName: 'T7' },
    { key: 7, name: 'Chủ nhật', shortName: 'CN' }
  ];

  const timeSlots = [
    { time: '07:30', label: '7:30 - 9:30' },
    { time: '09:45', label: '9:45 - 11:45' },
    { time: '13:30', label: '13:30 - 15:30' },
    { time: '15:45', label: '15:45 - 17:45' }
  ];

  // Function to navigate to class detail
  const handleClassClick = (classItem: ClassSession) => {
    navigate(`/teacher/class/${classItem.id}`, { 
      state: { 
        classData: classItem,
        fromPage: 'class-management'
      } 
    });
  };

  // Function to navigate to create class
  const handleCreateClass = () => {
    navigate('/teacher/classes/create');
  };

  // Function to determine class status based on current time
  const getClassStatus = (classItem: ClassSession) => {
    const currentDayOfWeek = currentTime.day() === 0 ? 7 : currentTime.day(); // Convert Sunday from 0 to 7
    const currentTimeStr = currentTime.format('HH:mm');
    
    const classStartTime = classItem.time;
    const classEndTime = getEndTime(classItem.time, classItem.duration);
    
    // If it's not the same day, determine based on day comparison
    if (classItem.day !== currentDayOfWeek) {
      return classItem.day < currentDayOfWeek ? 'completed' : 'upcoming';
    }
    
    // Same day - check time
    if (currentTimeStr < classStartTime) {
      return 'upcoming';
    } else if (currentTimeStr >= classStartTime && currentTimeStr <= classEndTime) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'upcoming':
        return { color: '#3b82f6', text: 'Sắp diễn ra' };
      case 'ongoing':
        return { color: '#10b981', text: 'Đang diễn ra' };
      case 'completed':
        return { color: '#64748b', text: 'Đã kết thúc' };
      case 'cancelled':
        return { color: '#ef4444', text: 'Đã hủy' };
      default:
        return { color: '#64748b', text: 'Không xác định' };
    }
  };

  const getEndTime = (startTime: string, duration: string) => {
    const start = dayjs(`2024-01-01 ${startTime}`);
    const end = start.add(parseInt(duration), 'minute');
    return end.format('HH:mm');
  };

  const getClassesForDay = (day: number) => {
    return classes.filter(cls => cls.day === day).sort((a, b) => a.time.localeCompare(b.time));
  };

  // Timeline View Component
  const TimelineView = () => (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 16, minWidth: '1400px', paddingBottom: 16 }}>
        {weekDays.map(day => {
          const dayClasses = getClassesForDay(day.key);
          const currentDayOfWeek = currentTime.day() === 0 ? 7 : currentTime.day();
          const isToday = day.key === currentDayOfWeek;
          
          return (
            <div key={day.key} style={{ flex: '0 0 200px' }}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarOutlined />
                    <Text strong style={{ color: isToday ? '#10b981' : '#374151' }}>
                      {day.name}
                    </Text>
                    {isToday && (
                      <Tag color="#10b981" size="small">Hôm nay</Tag>
                    )}
                    <Text type="secondary">({dayClasses.length})</Text>
                  </div>
                }
                style={{ 
                  borderRadius: 12,
                  height: '100%',
                  minHeight: 500,
                  border: isToday ? '2px solid #10b981' : '1px solid #e5e7eb'
                }}
                bodyStyle={{ padding: 16 }}
              >
                <Timeline mode="left" style={{ marginTop: 8 }}>
                  {timeSlots.map(slot => {
                    const classInSlot = dayClasses.find(cls => cls.time === slot.time);
                    const actualStatus = classInSlot ? getClassStatus(classInSlot) : null;
                    
                    // Check if this time slot has passed today
                    const slotEndTime = slot.time === '07:30' ? '09:30' : 
                                      slot.time === '09:45' ? '11:45' :
                                      slot.time === '13:30' ? '15:30' : '17:45';
                    
                    const isSlotPassed = isToday && currentTime.format('HH:mm') > slotEndTime;
                    
                    return (
                      <Timeline.Item
                        key={slot.time}
                        color={classInSlot ? getStatusConfig(actualStatus).color : (isSlotPassed ? '#d1d5db' : '#e5e7eb')}
                        dot={classInSlot ? <ClockCircleOutlined /> : null}
                      >
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ 
                            color: isSlotPassed && !classInSlot ? '#9ca3af' : '#374151',
                            fontSize: 12
                          }}>
                            {slot.label}
                          </Text>
                          
                          {classInSlot ? (
                            <Card 
                              size="small" 
                              hoverable
                              onClick={() => handleClassClick(classInSlot)}
                              style={{ 
                                marginTop: 8,
                                background: actualStatus === 'ongoing' 
                                  ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                                  : actualStatus === 'completed'
                                  ? 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
                                  : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                                border: `1px solid ${getStatusConfig(actualStatus).color}30`,
                                opacity: actualStatus === 'completed' ? 0.7 : 1,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                transform: 'scale(1)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div style={{ marginBottom: 8 }}>
                                <Text strong style={{ 
                                  fontSize: 13,
                                  color: actualStatus === 'completed' ? '#64748b' : '#1f2937'
                                }}>
                                  {classInSlot.subject}
                                </Text>
                                <br />
                                <Space>
                                  <Tag color={getStatusConfig(actualStatus).color} size="small">
                                    {getStatusConfig(actualStatus).text}
                                  </Tag>
                                  {actualStatus === 'ongoing' && (
                                    <Tag color="#ef4444" size="small">
                                      🔴 LIVE
                                    </Tag>
                                  )}
                                </Space>
                              </div>
                              
                              <Space direction="vertical" size={2}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <EnvironmentOutlined style={{ color: '#64748b', fontSize: 10 }} />
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    Phòng {classInSlot.room}
                                  </Text>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <UserOutlined style={{ color: '#64748b', fontSize: 10 }} />
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    {classInSlot.studentCount}/{classInSlot.maxStudents} SV
                                  </Text>
                                </div>
                              </Space>

                              <div style={{ 
                                marginTop: 8, 
                                paddingTop: 8, 
                                borderTop: '1px solid #e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4
                              }}>
                                <Text style={{ fontSize: 10, color: '#6b7280' }}>
                                  Click để xem chi tiết
                                </Text>
                                <ArrowRightOutlined style={{ fontSize: 10, color: '#6b7280' }} />
                              </div>
                            </Card>
                          ) : (
                            <div style={{ 
                              marginTop: 8,
                              padding: 8,
                              background: isSlotPassed ? '#f9fafb' : '#f9fafb',
                              borderRadius: 6,
                              border: '1px dashed #d1d5db',
                              opacity: isSlotPassed ? 0.5 : 1
                            }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {isSlotPassed ? 'Đã qua' : 'Trống'}
                              </Text>
                            </div>
                          )}
                        </div>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );

  // List View Component  
  const ListView = () => {
    const classesWithStatus = classes.map(cls => ({
      ...cls,
      actualStatus: getClassStatus(cls)
    }));

    const upcomingClasses = classesWithStatus
      .filter(cls => cls.actualStatus === 'upcoming' || cls.actualStatus === 'ongoing')
      .sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.time.localeCompare(b.time);
      });

    return (
      <Row gutter={[16, 16]}>
        {upcomingClasses.map(cls => (
          <Col xs={24} sm={12} lg={8} key={cls.id}>
            <Card
              hoverable
              onClick={() => handleClassClick(cls)}
              style={{ 
                borderRadius: 12,
                border: `2px solid ${getStatusConfig(cls.actualStatus).color}20`,
                cursor: 'pointer'
              }}
              bodyStyle={{ padding: 20 }}
            >
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 16, color: '#1f2937' }}>
                  {cls.subject}
                </Text>
                <br />
                <Space style={{ marginTop: 4 }}>
                  <Tag color={getStatusConfig(cls.actualStatus).color}>
                    {getStatusConfig(cls.actualStatus).text}
                  </Tag>
                  {cls.actualStatus === 'ongoing' && (
                    <Tag color="#ef4444" size="small">
                      🔴 LIVE
                    </Tag>
                  )}
                </Space>
              </div>

              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarOutlined style={{ color: '#6b7280' }} />
                  <Text>{weekDays.find(d => d.key === cls.day)?.name}</Text>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClockCircleOutlined style={{ color: '#6b7280' }} />
                  <Text>{cls.time} - {getEndTime(cls.time, cls.duration)}</Text>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <EnvironmentOutlined style={{ color: '#6b7280' }} />
                  <Text>Phòng {cls.room}</Text>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserOutlined style={{ color: '#6b7280' }} />
                  <Text>{cls.studentCount}/{cls.maxStudents} sinh viên</Text>
                </div>
              </Space>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                <Button 
                  type="primary" 
                  block
                  icon={<ArrowRightOutlined />}
                  style={{
                    background: cls.actualStatus === 'ongoing' ? '#10b981' : undefined,
                    borderColor: cls.actualStatus === 'ongoing' ? '#10b981' : undefined
                  }}
                >
                  {cls.actualStatus === 'ongoing' ? 'Vào lớp học' : 'Xem chi tiết'}
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  // Statistics
  const classesWithStatus = classes.map(cls => ({
    ...cls,
    actualStatus: getClassStatus(cls)
  }));

  const totalClasses = classes.length;
  const upcomingClasses = classesWithStatus.filter(c => c.actualStatus === 'upcoming').length;
  const ongoingClasses = classesWithStatus.filter(c => c.actualStatus === 'ongoing').length;
  const totalStudents = classes.reduce((sum, cls) => sum + cls.studentCount, 0);
  const avgStudentsPerClass = (totalStudents / totalClasses).toFixed(0);

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
      padding: "32px 48px" 
    }}>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-start", 
        marginBottom: 32 
      }}>
        <div style={{ flex: 1 }}>
          <Title level={1} style={{ 
            marginBottom: 8, 
            color: "#2563eb",
            fontSize: 36,
            fontWeight: 700
          }}>
            📚 Class Management
          </Title>
          <Text style={{ 
            fontSize: 18, 
            color: "#64748b"
          }}>
            Quản lý lịch học và thông tin các lớp học
          </Text>
          <br />
          <Text style={{ 
            fontSize: 14, 
            color: "#10b981",
            fontWeight: 500
          }}>
            🕐 Hiện tại: {currentTime.format('dddd, DD/MM/YYYY HH:mm')}
          </Text>
        </div>

        <Space size={16}>
          <Button 
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={handleCreateClass}
            style={{ 
              borderRadius: 8,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              fontWeight: 600
            }}
          >
            Tạo lớp học mới
          </Button>
          
          <Select
            value={selectedWeek}
            onChange={setSelectedWeek}
            style={{ width: 150 }}
            size="large"
          >
            <Select.Option value="current">Tuần hiện tại</Select.Option>
            <Select.Option value="next">Tuần tới</Select.Option>
          </Select>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>Timeline</Text>
            <Switch 
              checked={viewMode === 'list'}
              onChange={(checked) => setViewMode(checked ? 'list' : 'timeline')}
            />
            <Text>List</Text>
          </div>
        </Space>
      </div>

      {/* Statistics */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Tổng lớp học"
              value={totalClasses}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#2563eb', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Đang diễn ra"
              value={ongoingClasses}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#10b981', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Sắp diễn ra"
              value={upcomingClasses}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#f59e42', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="TB sinh viên/lớp"
              value={avgStudentsPerClass}
              prefix={<Avatar size="small" icon={<UserOutlined />} />}
              valueStyle={{ color: '#8b5cf6', fontSize: 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Content */}
      <Card style={{
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none",
        padding: 16
      }}>
        {viewMode === 'timeline' ? <TimelineView /> : <ListView />}
      </Card>
    </div>
  );
};

export default TeacherClassPage;
