import React, { useState, useEffect } from "react";
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
  Avatar,
  Divider,
  List,
  Empty,
  Modal,
  Form,
  Input,
  message,
  Tooltip,
  Select,
  DatePicker,
  Upload
} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  BookOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  DownloadOutlined,
  PlusOutlined,
  EyeOutlined,
  CopyOutlined,
  UploadOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import dayjs from "dayjs";
import Breadcrumb from "../../components/Breadcrumb";
import LeaveRequestModal from "../../components/LeaveRequestModal";

const { Title, Text } = Typography;

interface ClassData {
  id: string;
  subject: string;
  teacher: string;
  students: number;
  schedule: string;
  status: 'active' | 'completed' | 'upcoming';
  classCode?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  checkInTime?: string;
  note?: string;
}

interface LeaveRequest {
  id: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  approverNote?: string;
}

const StudentClassDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classId } = useParams();
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);

  // Get class data from navigation state or default
  const classData: ClassData = location.state?.classData || {
    id: classId || '1',
    subject: 'Advanced Java Programming',
    teacher: 'Dr. Nguyen Van A',
    students: 45,
    schedule: 'Mon, Wed, Fri - 9:00 AM',
    status: 'active',
    classCode: 'JAVA2024-001'
  };

  // Dữ liệu mẫu môn học của student hiện tại
  const subjects = [
    { 
      value: 'java', 
      label: 'Advanced Java Programming', 
      teacher: 'Dr. Nguyen Van A',
      schedule: {
        'monday': ['Buổi 1 (7:30 - 9:30)', 'Buổi 2 (9:45 - 11:45)'],
        'wednesday': ['Buổi 1 (7:30 - 9:30)', 'Buổi 2 (9:45 - 11:45)'],
        'friday': ['Buổi 1 (7:30 - 9:30)', 'Buổi 2 (9:45 - 11:45)']
      }
    },
    { 
      value: 'database', 
      label: 'Database Design', 
      teacher: 'Prof. Tran Thi B',
      schedule: {
        'tuesday': ['Buổi 3 (13:30 - 15:30)', 'Buổi 4 (15:45 - 17:45)'],
        'thursday': ['Buổi 3 (13:30 - 15:30)', 'Buổi 4 (15:45 - 17:45)']
      }
    },
    { 
      value: 'web', 
      label: 'Web Development', 
      teacher: 'Mr. Le Van C',
      schedule: {
        'saturday': ['Buổi 1 (7:30 - 9:30)', 'Buổi 5 (18:00 - 20:00)']
      }
    }
  ];

  // Mock data for attendance
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
    },
    {
      id: '5',
      date: '2024-09-27',
      status: 'present',
      checkInTime: '08:55'
    },
    {
      id: '6',
      date: '2024-09-25',
      status: 'present',
      checkInTime: '09:01'
    },
    {
      id: '7',
      date: '2024-09-23',
      status: 'late',
      checkInTime: '09:12',
      note: 'Xe hỏng'
    },
    {
      id: '8',
      date: '2024-09-20',
      status: 'present',
      checkInTime: '08:59'
    }
  ];

  // Mock data for leave requests
  const leaveRequests: LeaveRequest[] = [
    {
      id: '1',
      date: '2024-10-10',
      reason: 'Khám bệnh định kỳ',
      status: 'approved',
      submittedDate: '2024-10-08',
      approverNote: 'Đã duyệt. Nhớ bù bài học'
    },
    {
      id: '2',
      date: '2024-09-28',
      reason: 'Dự đám cưới anh trai',
      status: 'pending',
      submittedDate: '2024-09-25'
    }
  ];

  const breadcrumbItems = [
    { title: "Dashboard", href: "/student" },
    { title: "Classes", href: "/student/classes" },
    { title: classData.subject }
  ];

  // Calculate attendance statistics
  const totalSessions = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
  const attendanceRate = Math.round(((presentCount + lateCount) / totalSessions) * 100);

  // Get status configurations
  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'active': return { color: '#10b981', text: 'Đang học' };
      case 'completed': return { color: '#64748b', text: 'Đã hoàn thành' };
      case 'upcoming': return { color: '#f59e42', text: 'Sắp bắt đầu' };
      default: return { color: '#64748b', text: 'Không xác định' };
    }
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
      default: return { color: '#64748b', text: 'Không xác định' };
    }
  };

  // Handle leave request submission
  const handleSubmitLeaveRequest = (values: any) => {
    console.log("Create leave request:", values);
    message.success("Đã gửi đơn nghỉ học thành công! Giáo viên sẽ xem xét trong thời gian sớm nhất.");
    setIsLeaveModalVisible(false);
  };

  // Handle copy class code
  const handleCopyClassCode = () => {
    if (classData.classCode) {
      navigator.clipboard.writeText(classData.classCode);
      message.success('Đã sao chép mã lớp học!');
    }
  };

  // Get pre-selected subject value
  const getPreSelectedSubject = () => {
    const currentSubject = subjects.find(s => s.label === classData.subject);
    return currentSubject?.value || '';
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
              📚 {classData.subject}
            </Title>
            <Space size={16} wrap>
              <Text style={{ fontSize: 16, color: "#64748b" }}>
                👨‍🏫 {classData.teacher}
              </Text>
              <Text style={{ fontSize: 16, color: "#64748b" }}>
                👥 {classData.students} học sinh
              </Text>
              <Text style={{ fontSize: 16, color: "#64748b" }}>
                📅 {classData.schedule}
              </Text>
              <Tag color={getStatusConfig(classData.status).color} style={{ fontSize: 14 }}>
                {getStatusConfig(classData.status).text}
              </Tag>
            </Space>
          </div>
          
          <Button 
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsLeaveModalVisible(true)}
            style={{ borderRadius: 8 }}
          >
            Xin nghỉ học
          </Button>
        </div>
      </div>

      {/* Class Code Section */}
      <Card style={{
        borderRadius: 16,
        marginBottom: 32,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        border: "none",
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)"
      }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: 16, color: "#1e40af" }}>
                🔗 Mã lớp học
              </Text>
              <Text style={{ fontSize: 24, fontWeight: 600, color: "#1e3a8a", fontFamily: 'monospace' }}>
                {classData.classCode}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Chia sẻ mã này với bạn bè để họ có thể tham gia lớp
              </Text>
            </Space>
          </Col>
          <Col>
            <Tooltip title="Sao chép mã lớp">
              <Button 
                icon={<CopyOutlined />}
                onClick={handleCopyClassCode}
                size="large"
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
          >
            {leaveRequests.length > 0 ? (
              <Timeline>
                {leaveRequests.map(request => (
                  <Timeline.Item
                    key={request.id}
                    color={getLeaveStatusConfig(request.status).color}
                  >
                    <div>
                      <Text strong>{dayjs(request.date).format('DD/MM/YYYY')}</Text>
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
                      {request.approverNote && (
                        <>
                          <br />
                          <Text style={{ fontSize: 12, fontStyle: 'italic', color: '#10b981' }}>
                            💬 "{request.approverNote}"
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
        subjects={subjects}
        preSelectedSubject={getPreSelectedSubject()}
      />
    </div>
  );
};

export default StudentClassDetailPage;