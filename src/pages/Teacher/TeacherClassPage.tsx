import React, { useState, useEffect, useMemo } from "react";
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Tag, 
  Button,
  Space,
  Avatar,
  Statistic,
  Select,
  Spin,
  Empty,
  message
} from "antd";
import { 
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BookOutlined,
  EnvironmentOutlined,
  PlusOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekday from 'dayjs/plugin/weekday';
import { 
  getClassesList, 
  type ClassListItem
} from "../../apis/classesAPIs/teacherClass";

dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.locale('vi');

const { Title, Text } = Typography;

interface ClassSession {
  id: number;
  subject: string;
  name: string;
  time: string;
  endTime: string;
  room: string;
  studentCount: number;
  status: 'active' | 'inactive';
  day: number;
  classCode: string;
  periods: string;
  sessionIndex: number;
}

interface TimeSlot {
  time: string;
  endTime: string;
  label: string;
  isEmpty: boolean;
  classes?: ClassSession[];
}

const TeacherClassPage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | null>(null);
  const navigate = useNavigate();

  // Time slots mapping
  const TIME_SLOTS: Record<number, string> = {
    1: "07:00", 2: "08:00", 3: "09:00", 4: "10:00", 5: "11:00",
    6: "13:00", 7: "14:00", 8: "15:00", 9: "16:00", 10: "17:00"
  };

  const END_TIME_SLOTS: Record<number, string> = {
    1: "07:50", 2: "08:50", 3: "09:50", 4: "10:50", 5: "11:50",
    6: "13:50", 7: "14:50", 8: "15:50", 9: "16:50", 10: "17:50"
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [filterStatus]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await getClassesList(filterStatus || undefined);
      console.log('Fetched classes:', response);
      if (response.success && response.data.classes) {
        const transformedClasses = transformApiDataToSessions(response.data.classes);
        setClasses(transformedClasses);
      }
    } catch (error: any) {
      console.error('Failed to fetch classes:', error);
      message.error('Không thể tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  };

  const transformApiDataToSessions = (apiClasses: ClassListItem[]): ClassSession[] => {
    const sessions: ClassSession[] = [];

    const dayMapping: Record<string, number> = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
      'friday': 5, 'saturday': 6, 'sunday': 7
    };

    apiClasses.forEach(cls => {
      if (!cls.schedule) return;

      Object.entries(cls.schedule).forEach(([day, periods]) => {
        if (!periods || !Array.isArray(periods) || periods.length === 0) return;
        
        const dayNumber = dayMapping[day];
        if (!dayNumber) return;

        (periods as string[]).forEach((periodRange, sessionIndex) => {
          const [start, end] = periodRange.split('-').map(Number);
          
          if (isNaN(start) || isNaN(end) || !TIME_SLOTS[start]) return;
          
          sessions.push({
            id: cls.id,
            subject: cls.subject || cls.name,
            name: cls.name,
            time: TIME_SLOTS[start],
            endTime: END_TIME_SLOTS[end] || "18:00",
            room: cls.location || 'N/A',
            studentCount: cls.studentCount,
            status: cls.status,
            day: dayNumber,
            classCode: cls.classCode,
            periods: periodRange,
            sessionIndex: sessionIndex
          });
        });
      });
    });

    return sessions;
  };

  const breadcrumbItems = [
    { title: "Trang chủ", href: "/teacher" },
    { title: "Lớp học" }
  ];

  const weekDays = [
    { key: 1, name: 'Thứ 2' }, { key: 2, name: 'Thứ 3' },
    { key: 3, name: 'Thứ 4' }, { key: 4, name: 'Thứ 5' },
    { key: 5, name: 'Thứ 6' }, { key: 6, name: 'Thứ 7' },
    { key: 7, name: 'Chủ nhật' }
  ];

  const getClassStatus = (classItem: ClassSession) => {
    const currentDayOfWeek = currentTime.day() === 0 ? 7 : currentTime.day();
    const currentTimeStr = currentTime.format('HH:mm');
    
    if (classItem.status === 'inactive') return 'cancelled';
    if (classItem.day !== currentDayOfWeek) {
      return classItem.day < currentDayOfWeek ? 'completed' : 'upcoming';
    }
    
    if (currentTimeStr < classItem.time) return 'upcoming';
    if (currentTimeStr >= classItem.time && currentTimeStr <= classItem.endTime) return 'ongoing';
    return 'completed';
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      upcoming: { color: '#3b82f6', text: 'Sắp diễn ra' },
      ongoing: { color: '#10b981', text: 'Đang diễn ra' },
      completed: { color: '#64748b', text: 'Đã kết thúc' },
      cancelled: { color: '#ef4444', text: 'Đã hủy' }
    };
    return configs[status] || { color: '#64748b', text: 'Không xác định' };
  };

  // ✅ Memoize để tránh re-render không cần thiết
  const getClassesForDay = useMemo(() => {
    const classesByDay: Record<number, ClassSession[]> = {};
    
    for (let day = 1; day <= 7; day++) {
      classesByDay[day] = classes
        .filter(cls => cls.day === day)
        .sort((a, b) => {
          if (a.time !== b.time) return a.time.localeCompare(b.time);
          return a.sessionIndex - b.sessionIndex;
        });
    }
    
    return classesByDay;
  }, [classes]);

  // ✅ Simplified time slot generation
  const generateTimeSlotsForDay = (day: number): TimeSlot[] => {
    const dayClasses = getClassesForDay[day] || [];
    
    if (dayClasses.length === 0) {
      return [
        { time: '07:00', endTime: '12:00', label: '07:00 - 12:00', isEmpty: true },
        { time: '13:00', endTime: '18:00', label: '13:00 - 18:00', isEmpty: true }
      ];
    }

    const slots: TimeSlot[] = [];
    
    dayClasses.forEach(cls => {
      slots.push({
        time: cls.time,
        endTime: cls.endTime,
        label: `${cls.time} - ${cls.endTime}`,
        isEmpty: false,
        classes: [cls]
      });
    });

    return slots;
  };

  const formatPeriod = (period: string) => `Tiết ${period}`;

  const TimelineView = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 16 }}>Đang tải...</Text>
        </div>
      );
    }

    if (classes.length === 0) {
      return (
        <Empty description="Chưa có lớp học nào" image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/teacher/classes/create')}>
            Tạo lớp học đầu tiên
          </Button>
        </Empty>
      );
    }

    const currentDayOfWeek = currentTime.day() === 0 ? 7 : currentTime.day();

    return (
      <div style={{ overflowX: 'auto' }}>
        <div className="class-timeline-container" style={{ display: 'flex', gap: 16, minWidth: '1400px', paddingBottom: 16 }}>
          {weekDays.map(day => {
            const dayClasses = getClassesForDay[day.key] || [];
            const timeSlots = generateTimeSlotsForDay(day.key);
            const isToday = day.key === currentDayOfWeek;
            
            return (
              <div key={day.key} className="class-day-card" style={{ flex: '0 0 200px' }}>
                <Card 
                  title={
                    <Space size="small">
                      <CalendarOutlined />
                      <Text strong style={{ color: isToday ? '#10b981' : '#374151', fontSize: 14 }}>
                        {day.name}
                      </Text>
                      {isToday && <Tag color="#10b981">Hôm nay</Tag>}
                      <Text type="secondary" style={{ fontSize: 12 }}>({dayClasses.length})</Text>
                    </Space>
                  }
                  style={{ 
                    borderRadius: 12,
                    minHeight: 400,
                    border: isToday ? '2px solid #10b981' : '1px solid #e5e7eb'
                  }}
                  bodyStyle={{ padding: 12 }}
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {timeSlots.map((slot, idx) => (
                      <div key={idx}>
                        <Text strong style={{ fontSize: 12, color: '#374151' }}>
                          {slot.label}
                        </Text>
                        
                        {!slot.isEmpty && slot.classes ? (
                          slot.classes.map((cls) => {
                            const actualStatus = getClassStatus(cls);
                            const statusConfig = getStatusConfig(actualStatus);
                            
                            return (
                              <Card 
                                key={`${cls.id}-${cls.sessionIndex}`}
                                size="small"
                                hoverable
                                onClick={() => navigate(`/teacher/class/${cls.id}`)}
                                style={{ 
                                  marginTop: 8,
                                  background: actualStatus === 'ongoing' 
                                    ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                                    : '#f8fafc',
                                  border: `1px solid ${statusConfig.color}30`,
                                  cursor: 'pointer'
                                }}
                              >
                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                  <Text strong style={{ fontSize: 13 }}>{cls.subject}</Text>
                                  
                                  <Text type="secondary" style={{ fontSize: 11 }}>{cls.name}</Text>
                                  
                                  <Space wrap size={4}>
                                    <Tag color={statusConfig.color} style={{ fontSize: 10 }}>{statusConfig.text}</Tag>
                                    {actualStatus === 'ongoing' && <Tag color="#ef4444" style={{ fontSize: 10 }}>🔴 LIVE</Tag>}
                                  </Space>
                                  
                                  <Space direction="vertical" size={2}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      <ClockCircleOutlined /> {cls.time} - {cls.endTime}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      <BookOutlined /> {formatPeriod(cls.periods)}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      <EnvironmentOutlined /> Phòng {cls.room}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      <UserOutlined /> {cls.studentCount} SV
                                    </Text>
                                  </Space>
                                </Space>
                              </Card>
                            );
                          })
                        ) : (
                          <div style={{ 
                            marginTop: 8, padding: 8, background: '#f9fafb',
                            borderRadius: 6, border: '1px dashed #d1d5db'
                          }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>Trống</Text>
                          </div>
                        )}
                      </div>
                    ))}
                  </Space>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Statistics
  const uniqueClasses = useMemo(() => Array.from(new Set(classes.map(c => c.id))), [classes]);
  const totalClasses = uniqueClasses.length;
  
  const statistics = useMemo(() => {
    const classesWithStatus = classes.map(cls => ({ ...cls, actualStatus: getClassStatus(cls) }));
    return {
      upcoming: classesWithStatus.filter(c => c.actualStatus === 'upcoming').length,
      ongoing: classesWithStatus.filter(c => c.actualStatus === 'ongoing').length,
      total: totalClasses,
      avgStudents: totalClasses > 0 
        ? (uniqueClasses.reduce((sum, id) => sum + (classes.find(c => c.id === id)?.studentCount || 0), 0) / totalClasses).toFixed(0)
        : 0
    };
  }, [classes, uniqueClasses, totalClasses]);

  return (
    <div className="responsive-container" style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)"
    }}>
      <style>
        {`
          @media (max-width: 768px) {
            .class-page-header {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 20px;
            }
            
            .class-page-header-content {
              width: 100%;
            }
            
            .class-page-title {
              font-size: 24px !important;
              margin-bottom: 8px !important;
            }
            
            .class-page-subtitle {
              font-size: 14px !important;
            }
            
            .class-page-time {
              font-size: 12px !important;
              margin-top: 4px !important;
            }
            
            .class-page-actions {
              width: 100%;
              margin-top: 8px;
            }
            
            .class-page-actions .ant-space {
              width: 100%;
              display: flex !important;
              gap: 12px !important;
            }
            
            .class-page-actions .ant-space-item {
              flex: 1;
            }
            
            .class-page-actions .ant-btn {
              width: 100%;
              height: 44px !important;
            }
            
            .class-page-actions .ant-select {
              width: 100% !important;
            }
            
            .class-page-actions .ant-select .ant-select-selector {
              height: 44px !important;
              display: flex;
              align-items: center;
            }
            
            .class-timeline-container {
              min-width: auto !important;
              display: flex !important;
              flex-direction: column !important;
              gap: 16px !important;
            }
            
            .class-day-card {
              flex: none !important;
              width: 100% !important;
            }
          }
          
          @media (min-width: 769px) {
            .class-page-header {
              align-items: flex-start !important;
            }
          }
          
          /* Reset Title margin */
          .class-page-title.ant-typography {
            margin-top: 0 !important;
          }
        `}
      </style>
      
      <Breadcrumb items={breadcrumbItems} />

      <div className="class-page-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div className="class-page-header-content" style={{ flex: 1 }}>
          <Title level={1} className="class-page-title" style={{ margin: 0, marginBottom: 8, color: "#2563eb", fontSize: 36, fontWeight: 700 }}>
            📚 Quản lý lớp học
          </Title>
          <Text className="class-page-subtitle" style={{ fontSize: 16, color: "#64748b", display: "block" }}>
            Quản lý lịch học và thông tin các lớp học
          </Text>
          <Text className="class-page-time" style={{ fontSize: 13, color: "#10b981", fontWeight: 500, display: "block", marginTop: 8 }}>
            🕐 Hiện tại: {currentTime.format('dddd, DD/MM/YYYY HH:mm')}
          </Text>
        </div>

        <div className="class-page-actions">
          <Space size={12}>
            <Button 
              type="primary" icon={<PlusOutlined />} size="large"
              onClick={() => navigate('/teacher/classes/create')}
              style={{ 
                borderRadius: 8, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none', 
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)', 
                fontWeight: 600,
                height: 44
              }}
            >
              Tạo lớp mới
            </Button>
            
            <Select
              value={filterStatus || 'all'}
              onChange={(value) => setFilterStatus(value === 'all' ? null : value as 'active' | 'inactive')}
              style={{ width: 150 }} 
              size="large"
            >
              <Select.Option value="all">Tất cả</Select.Option>
              <Select.Option value="active">Đang hoạt động</Select.Option>
              <Select.Option value="inactive">Đã tắt</Select.Option>
            </Select>
          </Space>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic title="Tổng lớp học" value={statistics.total} prefix={<BookOutlined />} 
              valueStyle={{ color: '#2563eb', fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic title="Đang diễn ra" value={statistics.ongoing} prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#10b981', fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic title="Sắp diễn ra" value={statistics.upcoming} prefix={<CalendarOutlined />}
              valueStyle={{ color: '#f59e0b', fontSize: 24 }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic title="TB SV/lớp" value={statistics.avgStudents}
              prefix={<Avatar size="small" icon={<UserOutlined />} />}
              valueStyle={{ color: '#8b5cf6', fontSize: 24 }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "none", padding: 16 }}>
        <TimelineView />
      </Card>
    </div>
  );
};

export default TeacherClassPage;
