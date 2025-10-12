import React, { useState } from "react";
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Table, 
  Tag, 
  Button,
  Tabs,
  Progress,
  Space,
  Avatar,
  Statistic,
  Modal,
  Form,
  Input,
  Tooltip,
  Badge,
  Select,
  message,
  TextArea
} from "antd";
import { 
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  BookOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  FileTextOutlined,
  EyeOutlined,
  FilterOutlined
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface ClassSession {
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

interface Student {
  id: string;
  name: string;
  studentId: string;
  email: string;
  avatar?: string;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
}

interface AttendanceSession {
  id: string;
  date: string;
  sessionNumber: number;
  status: 'completed' | 'ongoing' | 'upcoming';
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

interface LeaveRequest {
  id: string;
  studentName: string;
  studentId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  approverNote?: string;
}

const ClassDetailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isStudentDetailVisible, setIsStudentDetailVisible] = useState(false);
  const [isRequestDetailVisible, setIsRequestDetailVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [requestFilter, setRequestFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Get class data from navigation state or fetch by ID
  const classData: ClassSession = location.state?.classData || {
    id: id || "1",
    subject: "Advanced Java Programming",
    time: "07:30",
    duration: "120",
    room: "A101",
    studentCount: 35,
    maxStudents: 40,
    status: 'upcoming',
    day: 1
  };

  // Mock data for students
  const students: Student[] = [
    {
      id: "1",
      name: "Nguyễn Văn An",
      studentId: "SV001",
      email: "an.nv@student.hust.edu.vn",
      totalSessions: 15,
      presentCount: 14,
      absentCount: 1,
      lateCount: 2,
      attendanceRate: 93.3
    },
    {
      id: "2",
      name: "Trần Thị Bình",
      studentId: "SV002",
      email: "binh.tt@student.hust.edu.vn",
      totalSessions: 15,
      presentCount: 13,
      absentCount: 2,
      lateCount: 1,
      attendanceRate: 86.7
    },
    {
      id: "3",
      name: "Lê Văn Cường",
      studentId: "SV003",
      email: "cuong.lv@student.hust.edu.vn",
      totalSessions: 15,
      presentCount: 15,
      absentCount: 0,
      lateCount: 0,
      attendanceRate: 100
    },
    {
      id: "4",
      name: "Phạm Thị Dung",
      studentId: "SV004",
      email: "dung.pt@student.hust.edu.vn",
      totalSessions: 15,
      presentCount: 12,
      absentCount: 3,
      lateCount: 1,
      attendanceRate: 80
    },
    {
      id: "5",
      name: "Hoàng Văn Em",
      studentId: "SV005",
      email: "em.hv@student.hust.edu.vn",
      totalSessions: 15,
      presentCount: 14,
      absentCount: 1,
      lateCount: 3,
      attendanceRate: 93.3
    }
  ];

  // Mock data for attendance sessions
  const attendanceSessions: AttendanceSession[] = [
    {
      id: "1",
      date: "2024-10-01",
      sessionNumber: 1,
      status: 'completed',
      presentCount: 33,
      absentCount: 2,
      lateCount: 0
    },
    {
      id: "2", 
      date: "2024-10-03",
      sessionNumber: 2,
      status: 'completed',
      presentCount: 32,
      absentCount: 2,
      lateCount: 1
    },
    {
      id: "3",
      date: "2024-10-08",
      sessionNumber: 3,
      status: 'completed',
      presentCount: 34,
      absentCount: 1,
      lateCount: 0
    },
    {
      id: "4",
      date: "2024-10-10",
      sessionNumber: 4,
      status: 'ongoing',
      presentCount: 0,
      absentCount: 0,
      lateCount: 0
    },
    {
      id: "5",
      date: "2024-10-15",
      sessionNumber: 5,
      status: 'upcoming',
      presentCount: 0,
      absentCount: 0,
      lateCount: 0
    }
  ];

  // Mock data for leave requests
  const leaveRequests: LeaveRequest[] = [
    {
      id: "1",
      studentName: "Nguyễn Văn An",
      studentId: "SV001",
      startDate: "2024-10-15",
      endDate: "2024-10-15",
      reason: "Bị sốt cao, cần nghỉ ngơi",
      status: 'pending',
      submittedDate: "2024-10-10"
    },
    {
      id: "2",
      studentName: "Phạm Thị Dung", 
      studentId: "SV004",
      startDate: "2024-10-08",
      endDate: "2024-10-08",
      reason: "Có việc gia đình khẩn cấp",
      status: 'approved',
      submittedDate: "2024-10-05"
    },
    {
      id: "3",
      studentName: "Trần Thị Bình",
      studentId: "SV002", 
      startDate: "2024-09-25",
      endDate: "2024-09-25",
      reason: "Tham gia cuộc thi lập trình",
      status: 'rejected',
      submittedDate: "2024-09-20"
    },
    {
      id: "4",
      studentName: "Hoàng Văn Em",
      studentId: "SV005",
      startDate: "2024-11-20",
      endDate: "2024-11-20",
      reason: "Khám sức khỏe định kỳ",
      status: 'pending',
      submittedDate: "2024-10-12"
    }
  ];

  const breadcrumbItems = [
    { title: "Dashboard", href: "/teacher" },
    { title: "Class Management", href: "/teacher/classes" },
    { title: classData.subject }
  ];

  // Filter leave requests based on selected filter
  const getFilteredRequests = () => {
    const currentDate = dayjs();
    
    switch(requestFilter) {
      case 'active':
        return leaveRequests.filter(req => {
          const startDate = dayjs(req.startDate);
          const endDate = dayjs(req.endDate);
          // Check if request is still active (not expired)
          return startDate.diff(currentDate) > 0 || 
                 (startDate.diff(currentDate) <= 0 && endDate.diff(currentDate) >= 0);
        });
      case 'expired':
        return leaveRequests.filter(req => dayjs(req.endDate).diff(currentDate) < 0);
      default:
        return leaveRequests;
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
      case 'pending':
        return { color: '#f59e42', text: 'Đang chờ' };
      case 'approved':
        return { color: '#10b981', text: 'Đã duyệt' };
      case 'rejected':
        return { color: '#ef4444', text: 'Từ chối' };
      default:
        return { color: '#64748b', text: 'Không xác định' };
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return '#10b981';
    if (rate >= 85) return '#3b82f6';
    if (rate >= 75) return '#f59e42';
    return '#ef4444';
  };

  const getEndTime = (startTime: string, duration: string) => {
    const start = dayjs(`2024-01-01 ${startTime}`);
    const end = start.add(parseInt(duration), 'minute');
    return end.format('HH:mm');
  };

  const weekDays = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  // Handle student detail
  const handleViewStudentDetail = (student: Student) => {
    setSelectedStudent(student);
    setIsStudentDetailVisible(true);
  };

  // Handle request detail
  const handleViewRequestDetail = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsRequestDetailVisible(true);
  };

  // Handle approve/reject request
  const handleApproveRequest = (requestId: string) => {
    message.success('Đã duyệt đơn xin nghỉ');
    // Update request status logic here
  };

  const handleRejectRequest = (requestId: string) => {
    message.success('Đã từ chối đơn xin nghỉ');
    // Update request status logic here
  };

  // Statistics
  const totalSessions = attendanceSessions.filter(s => s.status === 'completed').length;
  const avgAttendance = totalSessions > 0 ? 
    (attendanceSessions.filter(s => s.status === 'completed')
      .reduce((sum, session) => sum + session.presentCount, 0) / (totalSessions * classData.studentCount) * 100).toFixed(1) 
    : '0';
  const pendingRequests = leaveRequests.filter(r => r.status === 'pending').length;

  // Table columns
  const studentColumns = [
    {
      title: 'Học sinh',
      key: 'student',
      render: (record: Student) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar size={40} icon={<UserOutlined />} src={record.avatar} />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.studentId}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.email}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Tổng buổi',
      dataIndex: 'totalSessions',
      key: 'totalSessions',
      align: 'center' as const
    },
    {
      title: 'Có mặt',
      dataIndex: 'presentCount',
      key: 'presentCount',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="#10b981" icon={<CheckCircleOutlined />}>{count}</Tag>
      )
    },
    {
      title: 'Vắng',
      dataIndex: 'absentCount',
      key: 'absentCount',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="#ef4444" icon={<CloseCircleOutlined />}>{count}</Tag>
      )
    },
    {
      title: 'Muộn',
      dataIndex: 'lateCount',
      key: 'lateCount',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="#f59e42" icon={<ClockCircleOutlined />}>{count}</Tag>
      )
    },
    {
      title: 'Tỷ lệ điểm danh',
      dataIndex: 'attendanceRate',
      key: 'attendanceRate',
      align: 'center' as const,
      render: (rate: number) => (
        <div style={{ textAlign: 'center' }}>
          <Progress 
            percent={rate} 
            size="small"
            strokeColor={getAttendanceColor(rate)}
            style={{ width: 80, marginBottom: 4 }}
            showInfo={false}
          />
          <div>
            <Text style={{ 
              color: getAttendanceColor(rate), 
              fontWeight: 600, 
              fontSize: 12 
            }}>
              {rate.toFixed(1)}%
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      render: (record: Student) => (
        <Button 
          size="small" 
          icon={<EyeOutlined />}
          onClick={() => handleViewStudentDetail(record)}
        >
          Chi tiết
        </Button>
      )
    }
  ];

  const sessionColumns = [
    {
      title: 'Buổi học',
      key: 'session',
      render: (record: AttendanceSession) => (
        <div>
          <Text strong>Buổi {record.sessionNumber}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(record.date).format('DD/MM/YYYY')}
          </Text>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Có mặt',
      dataIndex: 'presentCount',
      key: 'presentCount',
      align: 'center' as const,
      render: (count: number, record: AttendanceSession) => (
        record.status === 'completed' ? 
          <Tag color="#10b981">{count}</Tag> : 
          <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Vắng',
      dataIndex: 'absentCount', 
      key: 'absentCount',
      align: 'center' as const,
      render: (count: number, record: AttendanceSession) => (
        record.status === 'completed' ? 
          <Tag color="#ef4444">{count}</Tag> : 
          <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Muộn',
      dataIndex: 'lateCount',
      key: 'lateCount', 
      align: 'center' as const,
      render: (count: number, record: AttendanceSession) => (
        record.status === 'completed' ? 
          <Tag color="#f59e42">{count}</Tag> : 
          <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (record: AttendanceSession) => (
        <Space>
          {record.status === 'ongoing' && (
            <Button type="primary" size="small">
              Điểm danh
            </Button>
          )}
          {record.status === 'completed' && (
            <Button size="small" icon={<EditOutlined />}>
              Sửa
            </Button>
          )}
        </Space>
      )
    }
  ];

  const requestColumns = [
    {
      title: 'Học sinh',
      key: 'student',
      render: (record: LeaveRequest) => (
        <div>
          <Text strong>{record.studentName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.studentId}
          </Text>
        </div>
      )
    },
    {
      title: 'Thời gian nghỉ',
      key: 'duration',
      render: (record: LeaveRequest) => {
        const isExpired = dayjs(record.endDate).diff(dayjs()) < 0;
        return (
          <div>
            <Text>{dayjs(record.startDate).format('DD/MM/YYYY')}</Text>
            {record.startDate !== record.endDate && (
              <>
                <Text> - </Text>
                <Text>{dayjs(record.endDate).format('DD/MM/YYYY')}</Text>
              </>
            )}
            {isExpired && (
              <div>
                <Tag color="#64748b" size="small" style={{ marginTop: 4 }}>
                  Đã qua hạn
                </Tag>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => (
        <Tooltip title={reason}>
          <Text style={{ 
            display: 'block',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {reason}
          </Text>
        </Tooltip>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'submittedDate',
      key: 'submittedDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (record: LeaveRequest) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewRequestDetail(record)}
          >
            Chi tiết
          </Button>
          {record.status === 'pending' && (
            <>
              <Button 
                size="small" 
                type="primary"
                onClick={() => handleApproveRequest(record.id)}
              >
                Duyệt
              </Button>
              <Button 
                size="small" 
                danger
                onClick={() => handleRejectRequest(record.id)}
              >
                Từ chối
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  const filteredRequests = getFilteredRequests();

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ borderRadius: 8 }}
            >
              Quay lại
            </Button>
            <div>
              <Title level={1} style={{ 
                marginBottom: 4, 
                color: "#2563eb",
                fontSize: 32,
                fontWeight: 700
              }}>
                📚 {classData.subject}
              </Title>
              <Space size={16}>
                <Tag color={getStatusConfig(classData.status).color} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {getStatusConfig(classData.status).text}
                </Tag>
                <Text style={{ color: "#64748b", fontSize: 16 }}>
                  <CalendarOutlined /> {weekDays[classData.day]} • {classData.time} - {getEndTime(classData.time, classData.duration)}
                </Text>
                <Text style={{ color: "#64748b", fontSize: 16 }}>
                  <EnvironmentOutlined /> Phòng {classData.room}
                </Text>
              </Space>
            </div>
          </div>
        </div>

        <Button 
          type="primary"
          icon={<EditOutlined />}
          size="large"
          onClick={() => setIsEditModalVisible(true)}
          style={{ borderRadius: 8 }}
        >
          Chỉnh sửa lớp học
        </Button>
      </div>

      {/* Statistics */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Tổng sinh viên"
              value={classData.studentCount}
              suffix={`/ ${classData.maxStudents}`}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#2563eb', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Buổi học đã có"
              value={totalSessions}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#10b981', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Điểm danh TB"
              value={avgAttendance}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#f59e42', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Badge count={pendingRequests} offset={[10, 0]}>
              <Statistic
                title="Đơn xin nghỉ"
                value={leaveRequests.length}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#8b5cf6', fontSize: 20 }}
              />
            </Badge>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card style={{
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none"
      }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
        >
          <TabPane tab="📊 Tổng quan" key="overview">
            <Row gutter={[24, 24]}>
              <Col span={24}>
                <Card title="📋 Danh sách học sinh" style={{ borderRadius: 12 }}>
                  <Table
                    dataSource={students}
                    columns={studentColumns}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showTotal: (total, range) => 
                        `${range[0]}-${range[1]} của ${total} học sinh`
                    }}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="📅 Điểm danh" key="attendance">
            <Card title="📊 Lịch sử điểm danh" style={{ borderRadius: 12 }}>
              <Table
                dataSource={attendanceSessions}
                columns={sessionColumns}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} của ${total} buổi học`
                }}
              />
            </Card>
          </TabPane>

          <TabPane 
            tab={
              <Badge count={pendingRequests} size="small">
                📝 Đơn xin nghỉ
              </Badge>
            } 
            key="requests"
          >
            <Card 
              title="📋 Đơn xin nghỉ học" 
              style={{ borderRadius: 12 }}
              extra={
                <Space>
                  <FilterOutlined />
                  <Select
                    value={requestFilter}
                    onChange={setRequestFilter}
                    style={{ width: 150 }}
                  >
                    <Select.Option value="all">Tất cả đơn</Select.Option>
                    <Select.Option value="active">Chưa quá hạn</Select.Option>
                    <Select.Option value="expired">Đã quá hạn</Select.Option>
                  </Select>
                </Space>
              }
            >
              <Table
                dataSource={filteredRequests}
                columns={requestColumns}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} của ${total} đơn`
                }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      {/* Student Detail Modal */}
      <Modal
        title="Chi tiết học sinh"
        open={isStudentDetailVisible}
        onCancel={() => setIsStudentDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsStudentDetailVisible(false)}>
            Đóng
          </Button>
        ]}
        width={600}
      >
        {selectedStudent && (
          <div style={{ padding: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={24} style={{ textAlign: 'center', marginBottom: 16 }}>
                <Avatar size={80} icon={<UserOutlined />} src={selectedStudent.avatar} />
                <Title level={4} style={{ marginTop: 8, marginBottom: 4 }}>
                  {selectedStudent.name}
                </Title>
                <Text type="secondary">{selectedStudent.studentId}</Text>
                <br />
                <Text type="secondary">{selectedStudent.email}</Text>
              </Col>
              
              <Col span={12}>
                <Statistic
                  title="Tổng buổi học"
                  value={selectedStudent.totalSessions}
                  prefix={<BookOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Tỷ lệ điểm danh"
                  value={selectedStudent.attendanceRate.toFixed(1)}
                  suffix="%"
                  valueStyle={{ color: getAttendanceColor(selectedStudent.attendanceRate) }}
                />
              </Col>
              
              <Col span={8}>
                <Statistic
                  title="Có mặt"
                  value={selectedStudent.presentCount}
                  valueStyle={{ color: '#10b981' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Vắng mặt"
                  value={selectedStudent.absentCount}
                  valueStyle={{ color: '#ef4444' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Đi muộn"
                  value={selectedStudent.lateCount}
                  valueStyle={{ color: '#f59e42' }}
                />
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Request Detail Modal */}
      <Modal
        title="Chi tiết đơn xin nghỉ"
        open={isRequestDetailVisible}
        onCancel={() => setIsRequestDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsRequestDetailVisible(false)}>
            Đóng
          </Button>
        ]}
        width={600}
      >
        {selectedRequest && (
          <div style={{ padding: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>Học sinh:</Text>
                <br />
                <Text>{selectedRequest.studentName}</Text>
                <br />
                <Text type="secondary">{selectedRequest.studentId}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Trạng thái:</Text>
                <br />
                <Tag color={getStatusConfig(selectedRequest.status).color}>
                  {getStatusConfig(selectedRequest.status).text}
                </Tag>
              </Col>
              
              <Col span={12}>
                <Text strong>Ngày bắt đầu:</Text>
                <br />
                <Text>{dayjs(selectedRequest.startDate).format('DD/MM/YYYY')}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Ngày kết thúc:</Text>
                <br />
                <Text>{dayjs(selectedRequest.endDate).format('DD/MM/YYYY')}</Text>
              </Col>
              
              <Col span={12}>
                <Text strong>Ngày gửi:</Text>
                <br />
                <Text>{dayjs(selectedRequest.submittedDate).format('DD/MM/YYYY')}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Tình trạng:</Text>
                <br />
                {dayjs(selectedRequest.endDate).diff(dayjs()) < 0 ? (
                  <Tag color="#64748b">Đã qua hạn</Tag>
                ) : (
                  <Tag color="#10b981">Còn hiệu lực</Tag>
                )}
              </Col>
              
              <Col span={24}>
                <Text strong>Lý do nghỉ học:</Text>
                <br />
                <Text>{selectedRequest.reason}</Text>
              </Col>
              
              {selectedRequest.approverNote && (
                <Col span={24}>
                  <Text strong>Ghi chú từ giảng viên:</Text>
                  <br />
                  <Text style={{ 
                    background: '#f8fafc', 
                    padding: 8, 
                    borderRadius: 4,
                    display: 'block'
                  }}>
                    {selectedRequest.approverNote}
                  </Text>
                </Col>
              )}
              
              {selectedRequest.status === 'pending' && (
                <Col span={24} style={{ marginTop: 16 }}>
                  <Space style={{ width: '100%', justifyContent: 'center' }}>
                    <Button 
                      type="primary" 
                      onClick={() => handleApproveRequest(selectedRequest.id)}
                    >
                      Duyệt đơn
                    </Button>
                    <Button 
                      danger
                      onClick={() => handleRejectRequest(selectedRequest.id)}
                    >
                      Từ chối
                    </Button>
                  </Space>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>

      {/* Edit Class Modal */}
      <Modal
        title="Chỉnh sửa thông tin lớp học"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Tên môn học" initialValue={classData.subject}>
            <Input size="large" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Thời gian bắt đầu" initialValue={classData.time}>
                <Input size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Thời lượng (phút)" initialValue={classData.duration}>
                <Input size="large" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Phòng học" initialValue={classData.room}>
                <Input size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Số lượng tối đa" initialValue={classData.maxStudents}>
                <Input size="large" type="number" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space>
              <Button type="primary" size="large">
                Lưu thay đổi
              </Button>
              <Button size="large" onClick={() => setIsEditModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassDetailPage;