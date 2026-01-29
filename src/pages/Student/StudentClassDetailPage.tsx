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
      setError("Invalid class ID");
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
      const errorMsg = err.message || 'Could not load class information';
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
      const errorMsg = err.message || 'Could not load class attendance history';
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
      message.error('Could not load leave requests');
    } finally {
      setLeaveRequestsLoading(false);
    }
  };

  const breadcrumbItems = [
    { title: "Dashboard", href: "/student" },
    { title: "Classes", href: "/student/classes" },
    { title: classData?.class.className || "Class Details" }
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
      ? { color: '#10b981', text: 'Active' }
      : { color: '#64748b', text: 'Inactive' };
  };

  const getAttendanceStatusConfig = (status: string | null | undefined) => {
    switch(status) {
      case 'present': return { color: '#10b981', text: 'Present' };
      case 'late': return { color: '#f59e42', text: 'Late' };
      case 'absent': return { color: '#ef4444', text: 'Absent' };
      case null:
      case undefined:
        return { color: '#ef4444', text: 'Absent' }; // Student joined after session started
      default: return { color: '#64748b', text: 'Unknown' };
    }
  };

  const getLeaveStatusConfig = (status: string) => {
    switch(status) {
      case 'pending': return { color: '#f59e42', text: 'Pending' };
      case 'approved': return { color: '#10b981', text: 'Approved' };
      case 'rejected': return { color: '#ef4444', text: 'Rejected' };
      case 'cancelled': return { color: '#64748b', text: 'Cancelled' };
      default: return { color: '#64748b', text: 'Unknown' };
    }
  };

  // Helper to get Vietnamese day of week
  const getDayOfWeekText = (dayNum: number | null | undefined): string => {
    if (dayNum === null || dayNum === undefined) return '';
    // Assuming 0=Sunday, 1=Monday, ..., 6=Saturday from backend schema
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };

  // Format schedule with time ranges
  const formatScheduleDetailed = (schedule?: Record<string, string[]>) => {
    if (!schedule || Object.keys(schedule).length === 0) {
      return null;
    }

    const dayMapping: Record<string, string> = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
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
          range: start === end ? `Period ${start}` : `Period ${start}-${end}`,
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
      return 'No schedule available';
    }

    const dayMapping: Record<string, string> = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun'
    };

    const scheduleParts: string[] = [];
    
    Object.entries(schedule).forEach(([day, periodRanges]) => {
      if (!periodRanges || periodRanges.length === 0) return;

      const dayLabel = dayMapping[day.toLowerCase()] || day;
      scheduleParts.push(dayLabel);
    });

    return scheduleParts.length > 0 ? scheduleParts.join(', ') : 'No schedule available';
  };

  const handleSubmitLeaveRequest = async (values: any) => {
    if (!classId) {
      message.error('Class information not found');
      return;
    }

    setSubmittingLeaveRequest(true);
    
    try {
      let evidenceFileId: number | null = null;

      if (values.evidenceFile && values.evidenceFile.length > 0) {
        const file = values.evidenceFile[0].originFileObj;
        
        if (file) {
          try {
            message.loading({ content: 'Uploading evidence file...', key: 'uploadFile', duration: 0 });
            
            const uploadResponse = await uploadDocument(file, (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                message.loading({ 
                  content: `Uploading file: ${percentCompleted}%`, 
                  key: 'uploadFile',
                  duration: 0
                });
              }
            });

            if (uploadResponse.success && uploadResponse.data.file_id) {
              evidenceFileId = uploadResponse.data.file_id;
              message.success({ 
                content: '✅ Evidence file uploaded successfully!', 
                key: 'uploadFile',
                duration: 2
              });
            } else {
              throw new Error(uploadResponse.message || 'File upload failed');
            }
          } catch (uploadErr: any) {
            message.error({ 
              content: `❌ File upload error: ${uploadErr.message || 'Please try again'}`,
              key: 'uploadFile',
              duration: 4
            });
            throw new Error(`File upload failed: ${uploadErr.message}`);
          }
        }
      }

      message.loading({ content: 'Submitting leave request...', key: 'createLeave', duration: 0 });

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
          content: '🎉 Leave request submitted successfully! The teacher will review it as soon as possible.', 
          key: 'createLeave',
          duration: 4
        });
        
        await fetchLeaveRequests(classId);
        
        setIsLeaveModalVisible(false);
      } else {
        throw new Error(response.message || 'Submit request failed');
      }

    } catch (err: any) {
      console.error('Failed to create leave request:', err);
      
      let errorMessage = 'Could not submit leave request. Please try again!';
      
      if (err.message) {
        if (err.message.includes('Upload file') || err.message.includes('File upload')) {
          errorMessage = err.message;
        } else if (err.message.includes('network') || err.message.includes('timeout')) {
          errorMessage = '⚠️ Network connection error. Please check and try again!';
        } else if (err.message.includes('401') || err.message.includes('unauthorized')) {
          errorMessage = '🔒 Session expired. Please log in again!';
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
      message.success('Class code copied!');
    }
  };

  // Attendance table columns - UPDATED
  const attendanceColumns = [
    {
      title: 'Date',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (start_time: string) => dayjs(start_time).format('DD/MM/YYYY')
    },
    {
      title: 'Session Info',
      key: 'session_info',
      render: (record: LocalAttendanceSessionRecord) => (
        <div>
            <Text strong>{record.session_name || "No session name"}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.day_of_week !== null && record.day_of_week !== undefined && `${getDayOfWeekText(record.day_of_week)}, `}
              {record.period_range && `${record.period_range}`}
            </Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'student_attendance_status',
      key: 'student_attendance_status',
      render: (status: string) => {
        const config = getAttendanceStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Check-in Time',
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
        <Spin size="large" tip="Loading class information..." />
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
          Go Back
        </Button>
        <Alert
          message="Could not load class information"
          description={error || "Class does not exist or you have not joined this class"}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate('/student/classes')}>
              Back to Class List
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
          Go Back
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
                  <EnvironmentOutlined /> Room {classInfo.location}
                </Text>
              )}
              <Text style={{ fontSize: 16, color: "#64748b" }}>
                <TeamOutlined /> {classInfo.totalStudents} students
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
            Request Leave
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
                    🔗 Class Code
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: 600, color: "#1e3a8a", fontFamily: 'monospace' }}>
                    {classInfo.classCode}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Share this code with friends
                  </Text>
                </Space>
              </Col>
              <Col>
                <Tooltip title="Copy class code">
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
                    Copy
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
                📅 Joined Date
              </Text>
              <Text style={{ fontSize: 20, fontWeight: 600, color: "#78350f" }}>
                {dayjs(enrollment.joinedAt).format('DD/MM/YYYY HH:mm')}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Total students: {classInfo.totalStudents}
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
              <span>📅 Weekly Schedule</span>
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
              Class Description
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
              title="Attendance Rate"
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
              title="Present"
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
              title="Late"
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
              title="Absent"
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
                <span>Attendance History</span>
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
                message="Error loading attendance history"
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
                    `${range[0]}-${range[1]} of ${total} sessions`
                }}
                size="middle"
                locale={{
                  emptyText: <Empty description="No attendance data available" />
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
                <span>Leave Requests</span>
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
                description="No leave requests yet"
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