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

import { getStudentClassAttendanceSessions, type StudentClassAttendanceSummary, type StudentAttendanceSessionSummarySchema } from "../../apis/attendanceAPIs/studentAttendance";

const { Title, Text, Paragraph } = Typography;
// ✅ Time slots mapping
const TIME_SLOTS: Record<number, { start: string; end: string }> = {
  1: { start: "07:00", end: "07:50" },
  2: { start: "08:00", end: "08:50" },
  3: { start: "09:00", end: "09:50" },
  4: { start: "10:00", end: "10:50" },
  5: { start: "11:00", end: "11:50" },
  6: { start: "13:00", end: "13:50" },
  7: { start: "14:00", end: "14:50" },
  8: { start: "15:00", end: "15:50" },
  9: { start: "16:00", end: "16:50" },
  10: { start: "17:00", end: "17:50" },
};
// Updated interface to match StudentAttendanceSessionSummarySchema
interface LocalAttendanceSessionRecord extends StudentAttendanceSessionSummarySchema {
  // Add any local fields if necessary, e.g., 'canAppeal', 'appealStatus'
}

const StudentClassDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ classId: string }>();
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);

  // State management for class details
  const [classData, setClassData] = useState<StudentClassDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State management for class attendance history
  const [classAttendanceSummary, setClassAttendanceSummary] = useState<StudentClassAttendanceSummary | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Leave requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDetail[]>([]
  );
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

  // Fetch data on mount
  useEffect(() => {
    if (classId) {
      fetchClassDetails(classId);
      fetchClassAttendance(classId); // Fetch attendance data
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

  // Fetch class attendance history from API
  const fetchClassAttendance = async (id: number) => {
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const response = await getStudentClassAttendanceSessions(id);
      
      setClassAttendanceSummary(response);
    } catch (err: any) {
      console.error('Failed to fetch class attendance:', err);
      const errorMsg = err.message || 'Không thể tải lịch sử điểm danh của lớp';
      setAttendanceError(errorMsg);
      message.error(errorMsg);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Fetch leave requests for this class
  const fetchLeaveRequests = async (id: number) => {
    setLeaveRequestsLoading(true);
    try {
      const response = await getLeaveRequests(id);
      
      setLeaveRequests(response.data.leaveRequests);
    } catch (err: any) {
      console.error('Failed to fetch leave requests:', err);
      message.error('Không thể tải danh sách đơn xin nghỉ');
    } finally {
      setLeaveRequestsLoading(false);
    }
  };

  const breadcrumbItems = [
    { title: "Dashboard", href: "/student" },
    { title: "Classes", href: "/student/classes" },
    { title: classData?.class.className || "Chi tiết lớp học" }
  ];

  // Calculate attendance statistics from fetched data
  const totalSessions = classAttendanceSummary?.total_sessions || 0;
  const presentCount = classAttendanceSummary?.attended_sessions || 0;
  const lateCount = classAttendanceSummary?.late_sessions || 0;
  const absentCount = classAttendanceSummary?.absent_sessions || 0;
  const attendanceRate = classAttendanceSummary?.attendance_rate !== undefined ? Math.round(classAttendanceSummary.attendance_rate) : 0;

  // Get status configurations
  const getStatusConfig = (isActive: boolean) => {
    return isActive
      ? { color: '#10b981', text: 'Đang hoạt động' }
      : { color: '#64748b', text: 'Không hoạt động' };
  };

  const getAttendanceStatusConfig = (status: string | null | undefined) => {
    switch(status) {
      case 'present': return { color: '#10b981', text: 'Có mặt' };
      case 'late': return { color: '#f59e42', text: 'Muộn' };
      case 'absent': return { color: '#ef4444', text: 'Vắng' };
      case null:
      case undefined:
        return { color: '#ef4444', text: 'Vắng' }; // Sinh viên vào lớp sau nên session trước không có
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

  // Helper to get Vietnamese day of week
  const getDayOfWeekText = (dayNum: number | null | undefined): string => {
    if (dayNum === null || dayNum === undefined) return '';
    // Assuming 0=Sunday, 1=Monday, ..., 6=Saturday from backend schema
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[dayNum];
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
      const slot = TIME_SLOTS[period];
      return slot ? `${slot.start} - ${slot.end}` : `${period}`;
    };

    const scheduleByDay: Array<{ day: string; periods: Array<{ range: string; time: string }> }> = [];

    Object.entries(schedule).forEach(([day, periodRanges]) => {
      if (!periodRanges || periodRanges.length === 0) return;

      const dayLabel = dayMapping[day.toLowerCase()] || day;
      const periods = periodRanges.map(range => {
        const [start, end] = range.split('-').map(Number);
        
        const timeDisplay = start === end 
          ? periodToTime(start)
          : `${periodToTime(start).split(' - ')[0]} - ${periodToTime(end).split(' - ')[1]}`;

        return {
          range: start === end ? `Tiết ${start}` : `Tiết ${start}-${end}`,
          time: timeDisplay
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

  const handleSubmitLeaveRequest = async (values: any) => {
    if (!classId) {
      message.error('Không tìm thấy thông tin lớp học');
      return;
    }

    setSubmittingLeaveRequest(true);
    
    try {
      let evidenceFileId: number | null = null;

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

      message.loading({ content: 'Đang gửi đơn xin nghỉ học...', key: 'createLeave', duration: 0 });

      const leaveRequestPayload = {
        class_id: classId,
        reason: values.reason,
        leave_date: values.date.toISOString(),
        day_of_week: values.dayOfWeek,
        time_slot: values.timeSlot,
        evidence_file_id: evidenceFileId
      };

      

      const response = await createLeaveRequest(leaveRequestPayload);

      if (response.success) {
        message.success({ 
          content: '🎉 Đã gửi đơn xin nghỉ học thành công! Giáo viên sẽ xem xét trong thời gian sớm nhất.', 
          key: 'createLeave',
          duration: 4
        });
        
        await fetchLeaveRequests(classId);
        
        setIsLeaveModalVisible(false);
      } else {
        throw new Error(response.message || 'Gửi đơn thất bại');
      }

    } catch (err: any) {
      console.error('Failed to create leave request:', err);
      
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

  // Attendance table columns - UPDATED
  const attendanceColumns = [
    {
      title: 'Ngày',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (start_time: string) => dayjs(start_time).format('DD/MM/YYYY')
    },
    {
      title: 'Thông tin buổi học',
      key: 'session_info',
      render: (record: LocalAttendanceSessionRecord) => (
        <div>
            <Text strong>{record.session_name || "Không có tên buổi học"}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.day_of_week !== null && record.day_of_week !== undefined && `${getDayOfWeekText(record.day_of_week)}, `}
              {record.period_range && `${record.period_range}`}
            </Text>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'student_attendance_status',
      key: 'student_attendance_status',
      render: (status: string) => {
        const config = getAttendanceStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Giờ điểm danh',
      dataIndex: 'student_recorded_at',
      key: 'student_recorded_at',
      render: (time: string) => time ? dayjs(time).format('HH:mm') : '-'
    }
  ];

  // Loading state for class details
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

  // Error state for class details
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
            loading={attendanceLoading} // Added loading for attendance table
          >
            {attendanceError ? (
              <Alert
                message="Lỗi tải lịch sử điểm danh"
                description={attendanceError}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            ) : (
              <Table
                dataSource={classAttendanceSummary?.sessions || []} // Use fetched sessions
                columns={attendanceColumns}
                rowKey="session_id" // Use session_id as row key
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
            )}
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
        subjects={classInfo ? [
          {
            value: classInfo.id.toString(),
            label: classInfo.className,
            teacher: classInfo.teacherName,
            schedule: classInfo.schedule
          }
        ] : []}
        preSelectedSubject={classInfo?.id.toString()}
      />
    </div>
  );
};

export default StudentClassDetailPage;