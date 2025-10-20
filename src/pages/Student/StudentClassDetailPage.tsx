import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Button,
  Tag,
  Space,
  Statistic,
  Table,
  Timeline,
  Progress,
  Empty,
  message,
  Tooltip,
  Spin,
  Alert
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  CopyOutlined,
  UserOutlined,
  BookOutlined,
  EnvironmentOutlined,
  TeamOutlined
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import Breadcrumb from "../../components/Breadcrumb";
import LeaveRequestModal from "../../components/LeaveRequestModal";
import { getStudentClassDetails, type StudentClassDetailsData } from "../../apis/classesAPIs/studentClass";
import { createLeaveRequest, getLeaveRequests, type LeaveRequestDetail } from "../../apis/leaveRequestAPIs/leaveRequest";
import { uploadDocument } from "../../apis/fileAPIs/file";

const { Title, Text, Paragraph } = Typography;

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  checkInTime?: string;
  note?: string;
}

const StudentClassDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ classId: string }>();
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);

  // State management
  const [classData, setClassData] = useState<StudentClassDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ NEW: Leave requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDetail[]>([]);
  const [leaveRequestsLoading, setLeaveRequestsLoading] = useState(false);
  const [submittingLeaveRequest, setSubmittingLeaveRequest] = useState(false);

  // Parse classId from URL
  const classId = useMemo(() => {
    if (params.classId) {
      const parsed = parseInt(params.classId, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }, [params.classId]);

  // Fetch class details on mount
  useEffect(() => {
    if (classId) {
      fetchClassDetails(classId);
      fetchLeaveRequests(classId);
    } else {
      setError("ID lớp học không hợp lệ");
    }
  }, [classId]);

  // Fetch class details from API
  const fetchClassDetails = async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getStudentClassDetails(id);
      console.log("Fetched class details:", response.data);
      setClassData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch class details:', err);
      const errorMsg = err.message || 'Không thể tải thông tin lớp học';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Fetch leave requests for this class
  const fetchLeaveRequests = async (id: number) => {
    setLeaveRequestsLoading(true);
    try {
      const response = await getLeaveRequests(id);
      console.log("Fetched leave requests:", response.data);
      setLeaveRequests(response.data.leaveRequests);
    } catch (err: any) {
      console.error('Failed to fetch leave requests:', err);
      message.error('Không thể tải danh sách đơn xin nghỉ');
    } finally {
      setLeaveRequestsLoading(false);
    }
  };

  // Mock data for attendance (TODO: Replace with API)
  const attendanceRecords: AttendanceRecord[] = [
    {
      id: '1',
      date: '2024-10-07',
      status: 'present',
      checkInTime: '08:58'
    },
    {
      id: '2',
      date: '2024-10-05',
      status: 'present',
      checkInTime: '09:02'
    },
    {
      id: '3',
      date: '2024-10-02',
      status: 'late',
      checkInTime: '09:15',
      note: 'Tắc đường'
    },
    {
      id: '4',
      date: '2024-09-30',
      status: 'absent',
      note: 'Ốm'
    }
  ];

  const breadcrumbItems = [
    { title: "Dashboard", href: "/student" },
    { title: "Classes", href: "/student/classes" },
    { title: classData?.class.className || "Chi tiết lớp học" }
  ];

  // Calculate attendance statistics
  const totalSessions = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
  const attendanceRate = totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 0;

  // Get status configurations
  const getStatusConfig = (isActive: boolean) => {
    return isActive 
      ? { color: '#10b981', text: 'Đang hoạt động' }
      : { color: '#64748b', text: 'Không hoạt động' };
  };

  const getAttendanceStatusConfig = (status: string) => {
    switch(status) {
      case 'present': return { color: '#10b981', text: 'Có mặt' };
      case 'late': return { color: '#f59e42', text: 'Muộn' };
      case 'absent': return { color: '#ef4444', text: 'Vắng' };
      default: return { color: '#64748b', text: 'Không xác định' };
    }
  };

  const getLeaveStatusConfig = (status: string) => {
    switch(status) {
      case 'pending': return { color: '#f59e42', text: 'Đang xử lý' };
      case 'approved': return { color: '#10b981', text: 'Đã duyệt' };
      case 'rejected': return { color: '#ef4444', text: 'Từ chối' };
      case 'cancelled': return { color: '#64748b', text: 'Đã hủy' };
      default: return { color: '#64748b', text: 'Không xác định' };
    }
  };

  // Format schedule with time ranges
  const formatScheduleDetailed = (schedule?: Record<string, string[]>) => {
    if (!schedule || Object.keys(schedule).length === 0) {
      return null;
    }

    const dayMapping: Record<string, string> = {
      monday: 'Thứ 2',
      tuesday: 'Thứ 3',
      wednesday: 'Thứ 4',
      thursday: 'Thứ 5',
      friday: 'Thứ 6',
      saturday: 'Thứ 7',
      sunday: 'Chủ nhật'
    };

    const periodToTime = (period: number): string => {
      const startHour = 6 + Math.floor((period - 1) * 0.75);
      const startMin = ((period - 1) % 4) * 15;
      const endHour = startHour + (startMin === 45 ? 1 : 0);
      const endMin = startMin === 45 ? 5 : startMin + 50;
      
      return `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')} - ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    };

    const scheduleByDay: Array<{ day: string; periods: Array<{ range: string; time: string }> }> = [];
    
    Object.entries(schedule).forEach(([day, periodRanges]) => {
      if (!periodRanges || periodRanges.length === 0) return;
      
      const dayLabel = dayMapping[day.toLowerCase()] || day;
      const periods = periodRanges.map(range => {
        const [start, end] = range.split('-').map(Number);
        const startTime = periodToTime(start);
        const endTime = end > start ? periodToTime(end).split(' - ')[1] : startTime.split(' - ')[1];
        
        return {
          range: start === end ? `Tiết ${start}` : `Tiết ${start}-${end}`,
          time: `${startTime.split(' - ')[0]} - ${endTime}`
        };
      });
      
      scheduleByDay.push({ day: dayLabel, periods });
    });

    return scheduleByDay;
  };

  // Simple format for header
  const formatScheduleSimple = (schedule?: Record<string, string[]>): string => {
    if (!schedule || Object.keys(schedule).length === 0) {
      return 'Chưa có lịch học';
    }

    const dayMapping: Record<string, string> = {
      monday: 'T2',
      tuesday: 'T3',
      wednesday: 'T4',
      thursday: 'T5',
      friday: 'T6',
      saturday: 'T7',
      sunday: 'CN'
    };

    const scheduleParts: string[] = [];
    
    Object.entries(schedule).forEach(([day, periodRanges]) => {
      if (!periodRanges || periodRanges.length === 0) return;
      
      const dayLabel = dayMapping[day.toLowerCase()] || day;
      scheduleParts.push(dayLabel);
    });

    return scheduleParts.length > 0 ? scheduleParts.join(', ') : 'Chưa có lịch học';
  };

  // ✅ UPDATED: Handle leave request submission with correct payload keys
  const handleSubmitLeaveRequest = async (values: any) => {
    if (!classId) {
      message.error('Không tìm thấy thông tin lớp học');
      return;
    }

    setSubmittingLeaveRequest(true);
    
    try {
      let evidenceFileId: number | null = null;

      // ✅ Step 1: Upload document if evidence file exists
      if (values.evidenceFile && values.evidenceFile.length > 0) {
        const file = values.evidenceFile[0].originFileObj;
        
        if (file) {
          try {
            message.loading({ content: 'Đang tải file minh chứng...', key: 'uploadFile', duration: 0 });
            
            const uploadResponse = await uploadDocument(file, (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                message.loading({ 
                  content: `Đang tải file: ${percentCompleted}%`, 
                  key: 'uploadFile',
                  duration: 0
                });
              }
            });

            if (uploadResponse.success && uploadResponse.data.file_id) {
              evidenceFileId = uploadResponse.data.file_id;
              message.success({ 
                content: '✅ Đã tải file minh chứng thành công!', 
                key: 'uploadFile',
                duration: 2
              });
            } else {
              throw new Error(uploadResponse.message || 'Upload file thất bại');
            }
          } catch (uploadErr: any) {
            message.error({ 
              content: `❌ Lỗi upload file: ${uploadErr.message || 'Vui lòng thử lại'}`,
              key: 'uploadFile',
              duration: 4
            });
            throw new Error(`Upload file thất bại: ${uploadErr.message}`);
          }
        }
      }

      // ✅ Step 2: Create leave request with correct snake_case keys
      message.loading({ content: 'Đang gửi đơn xin nghỉ học...', key: 'createLeave', duration: 0 });

      const leaveRequestPayload = {
        class_id: classId,
        reason: values.reason,
        leave_date: values.date.toISOString(),
        day_of_week: values.dayOfWeek,
        time_slot: values.timeSlot,
        evidence_file_id: evidenceFileId
      };

      console.log('Creating leave request:', leaveRequestPayload);

      const response = await createLeaveRequest(leaveRequestPayload);

      if (response.success) {
        message.success({ 
          content: '🎉 Đã gửi đơn xin nghỉ học thành công! Giáo viên sẽ xem xét trong thời gian sớm nhất.', 
          key: 'createLeave',
          duration: 4
        });
        
        // ✅ Refresh leave requests list
        await fetchLeaveRequests(classId);
        
        setIsLeaveModalVisible(false);
      } else {
        throw new Error(response.message || 'Gửi đơn thất bại');
      }

    } catch (err: any) {
      console.error('Failed to create leave request:', err);
      
      // ✅ Better error message
      let errorMessage = 'Không thể gửi đơn xin nghỉ học. Vui lòng thử lại!';
      
      if (err.message) {
        if (err.message.includes('Upload file')) {
          errorMessage = err.message;
        } else if (err.message.includes('network') || err.message.includes('timeout')) {
          errorMessage = '⚠️ Lỗi kết nối mạng. Vui lòng kiểm tra và thử lại!';
        } else if (err.message.includes('401') || err.message.includes('unauthorized')) {
          errorMessage = '🔒 Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!';
        } else {
          errorMessage = `❌ ${err.message}`;
        }
      }
      
      message.error({ 
        content: errorMessage,
        key: 'createLeave',
        duration: 5
      });
    } finally {
      setSubmittingLeaveRequest(false);
    }
  };

  // Handle copy class code
  const handleCopyClassCode = () => {
    if (classData?.class.classCode) {
      navigator.clipboard.writeText(classData.class.classCode);
      message.success('Đã sao chép mã lớp học!');
    }
  };

  // Attendance table columns
  const attendanceColumns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = getAttendanceStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Giờ check-in',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (time: string) => time || '-'
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (note: string) => note || '-'
    }
  ];

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
        padding: "32px 48px",
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Spin size="large" tip="Đang tải thông tin lớp học..." />
      </div>
    );
  }

  // Error state
  if (error || !classData) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
        padding: "32px 48px"
      }}>
        <Breadcrumb items={breadcrumbItems} />
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ borderRadius: 8, marginBottom: 16 }}
        >
          Quay lại
        </Button>
        <Alert
          message="Không thể tải thông tin lớp học"
          description={error || "Lớp học không tồn tại hoặc bạn chưa tham gia lớp này"}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate('/student/classes')}>
              Về danh sách lớp
            </Button>
          }
        />
      </div>
    );
  }

  // Extract class data
  const { class: classInfo, enrollment } = classData;
  const scheduleText = formatScheduleSimple(classInfo.schedule);
  const scheduleDetails = formatScheduleDetailed(classInfo.schedule);
  const statusConfig = getStatusConfig(classInfo.isActive);

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
      padding: "32px 48px" 
    }}>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ borderRadius: 8, marginBottom: 16 }}
        >
          Quay lại
        </Button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={1} style={{ 
              marginBottom: 8, 
              color: "#2563eb",
              fontSize: 32,
              fontWeight: 700
            }}>
              📚 {classInfo.className}
            </Title>
            <Space size={16} wrap>
              <Text style={{ fontSize: 16, color: "#64748b" }}>
                <UserOutlined /> {classInfo.teacherName}
              </Text>
              {classInfo.location && (
                <Text style={{ fontSize: 16, color: "#64748b" }}>
                  <EnvironmentOutlined /> Phòng {classInfo.location}
                </Text>
              )}
              <Text style={{ fontSize: 16, color: "#64748b" }}>
                <TeamOutlined /> {classInfo.totalStudents} học sinh
              </Text>
              <Text style={{ fontSize: 16, color: "#64748b" }}>
                <CalendarOutlined /> {scheduleText}
              </Text>
              <Tag color={statusConfig.color} style={{ fontSize: 14 }}>
                {statusConfig.text}
              </Tag>
            </Space>
          </div>
          
          <Button 
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsLeaveModalVisible(true)}
            size="large"
            style={{ borderRadius: 8 }}
            disabled={submittingLeaveRequest}
          >
            Xin nghỉ học
          </Button>
        </div>
      </div>

      {/* Class Info Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {/* Class Code Card */}
        <Col xs={24} md={12}>
          <Card style={{
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "none",
            background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
            height: '100%'
          }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Space direction="vertical" size={4}>
                  <Text strong style={{ fontSize: 14, color: "#1e40af" }}>
                    🔗 Mã lớp học
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: 600, color: "#1e3a8a", fontFamily: 'monospace' }}>
                    {classInfo.classCode}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Chia sẻ mã này với bạn bè
                  </Text>
                </Space>
              </Col>
              <Col>
                <Tooltip title="Sao chép mã lớp">
                  <Button 
                    icon={<CopyOutlined />}
                    onClick={handleCopyClassCode}
                    style={{ 
                      borderRadius: 8,
                      background: '#1e40af',
                      borderColor: '#1e40af'
                    }}
                    type="primary"
                  >
                    Sao chép
                  </Button>
                </Tooltip>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Enrollment Info Card */}
        <Col xs={24} md={12}>
          <Card style={{
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "none",
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            height: '100%'
          }}>
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: 14, color: "#92400e" }}>
                📅 Ngày tham gia
              </Text>
              <Text style={{ fontSize: 20, fontWeight: 600, color: "#78350f" }}>
                {dayjs(enrollment.joinedAt).format('DD/MM/YYYY HH:mm')}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Tổng số học sinh: {classInfo.totalStudents} người
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Weekly Schedule Section */}
      {scheduleDetails && scheduleDetails.length > 0 && (
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarOutlined style={{ color: '#2563eb' }} />
              <span>📅 Lịch học trong tuần</span>
            </div>
          }
          style={{
            borderRadius: 16,
            marginBottom: 32,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "none"
          }}
        >
          <Row gutter={[16, 16]}>
            {scheduleDetails.map((daySchedule, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card
                  size="small"
                  style={{
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb'
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 16, color: '#1f2937' }}>
                      📆 {daySchedule.day}
                    </Text>
                  </div>
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {daySchedule.periods.map((period, periodIndex) => (
                      <div 
                        key={periodIndex}
                        style={{
                          padding: '8px 12px',
                          background: 'white',
                          borderRadius: 8,
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{ marginBottom: 4 }}>
                          <Tag color="blue" style={{ margin: 0 }}>
                            {period.range}
                          </Tag>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {period.time}
                        </Text>
                      </div>
                    ))}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Description Section */}
      {classInfo.description && (
        <Card style={{
          borderRadius: 16,
          marginBottom: 32,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "none"
        }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: 16, color: "#1f2937" }}>
              <BookOutlined style={{ marginRight: 8, color: '#2563eb' }} />
              Mô tả lớp học
            </Text>
            <Paragraph style={{ margin: 0, color: '#6b7280', fontSize: 14, lineHeight: 1.8 }}>
              {classInfo.description}
            </Paragraph>
          </Space>
        </Card>
      )}

      {/* Statistics */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Tỷ lệ tham dự"
              value={attendanceRate}
              suffix="%"
              valueStyle={{ 
                color: attendanceRate >= 80 ? '#10b981' : attendanceRate >= 60 ? '#f59e42' : '#ef4444',
                fontSize: 24
              }}
            />
            <Progress 
              percent={attendanceRate} 
              size="small" 
              strokeColor={attendanceRate >= 80 ? '#10b981' : attendanceRate >= 60 ? '#f59e42' : '#ef4444'}
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Có mặt"
              value={presentCount}
              suffix={`/${totalSessions}`}
              valueStyle={{ color: '#10b981', fontSize: 24 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Đi muộn"
              value={lateCount}
              suffix={`/${totalSessions}`}
              valueStyle={{ color: '#f59e42', fontSize: 24 }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Vắng mặt"
              value={absentCount}
              suffix={`/${totalSessions}`}
              valueStyle={{ color: '#ef4444', fontSize: 24 }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={[24, 24]}>
        {/* Left Column - Attendance Records */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarOutlined style={{ color: '#2563eb' }} />
                <span>Lịch sử điểm danh</span>
              </div>
            }
            style={{ 
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              border: "none"
            }}
          >
            <Table
              dataSource={attendanceRecords}
              columns={attendanceColumns}
              rowKey="id"
              pagination={{ 
                pageSize: 8,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} của ${total} buổi học`
              }}
              size="middle"
              locale={{
                emptyText: <Empty description="Chưa có dữ liệu điểm danh" />
              }}
            />
          </Card>
        </Col>

        {/* Right Column - Leave Requests */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileTextOutlined style={{ color: '#2563eb' }} />
                <span>Đơn xin nghỉ học</span>
              </div>
            }
            style={{ 
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              border: "none"
            }}
            loading={leaveRequestsLoading}
          >
            {leaveRequests.length > 0 ? (
              <Timeline>
                {leaveRequests.map(request => (
                  <Timeline.Item
                    key={request.id}
                    color={getLeaveStatusConfig(request.status).color}
                  >
                    <div>
                      <Text strong>{dayjs(request.leaveDate).format('DD/MM/YYYY')}</Text>
                      <br />
                      <Tag 
                        color={getLeaveStatusConfig(request.status).color}
                        size="small"
                        style={{ marginTop: 4 }}
                      >
                        {getLeaveStatusConfig(request.status).text}
                      </Tag>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {request.reason}
                      </Text>
                      {request.reviewNotes && (
                        <>
                          <br />
                          <Text style={{ fontSize: 12, fontStyle: 'italic', color: '#10b981' }}>
                            💬 "{request.reviewNotes}"
                          </Text>
                        </>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty 
                description="Chưa có đơn xin nghỉ nào"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Leave Request Modal Component */}
      <LeaveRequestModal
        visible={isLeaveModalVisible}
        onCancel={() => setIsLeaveModalVisible(false)}
        onSubmit={handleSubmitLeaveRequest}
        loading={submittingLeaveRequest}
        subjects={[
          { 
            value: classInfo.id.toString(), 
            label: classInfo.className,
            teacher: classInfo.teacherName,
            schedule: classInfo.schedule
          }
        ]}
        preSelectedSubject={classInfo.id.toString()}
      />
    </div>
  );
};

export default StudentClassDetailPage;