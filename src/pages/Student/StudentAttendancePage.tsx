import React, { useState, useEffect } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Statistic,
  Spin, // Added for loading state
  Alert // Added for error state
} from "antd";
import {
  ExclamationCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined
} from "@ant-design/icons";
import Breadcrumb from "../../components/Breadcrumb";

// Import API and Types
import { getStudentOverallAttendanceReport } from "../../apis/attendanceAPIs/studentAttendance";
import {
  type StudentAttendanceReportResponse,
  type StudentAttendanceSessionSummarySchema,
} from "../../types/studentAttendance";

const { Title, Text } = Typography;
const { TextArea } = Input;

// Update this interface to match StudentAttendanceSessionSummarySchema for direct use
interface LocalAttendanceRecord extends StudentAttendanceSessionSummarySchema {
  canAppeal: boolean; // This will need to be determined by business logic
  appealStatus?: 'pending' | 'approved' | 'rejected'; // If appeal status is not in API, it's local state
}

const StudentAttendancePage: React.FC = () => {
  const [isAppealModalVisible, setIsAppealModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LocalAttendanceRecord | null>(null);
  const [form] = Form.useForm();

  // API Data States
  const [overallReport, setOverallReport] = useState<StudentAttendanceReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<number | 'all'>('all'); // Change to number for class_id

  // Fetch overall attendance report on component mount
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const report = await getStudentOverallAttendanceReport();
        setOverallReport(report);
      } catch (err: any) {
        console.error("Error fetching overall attendance report:", err);
        setError(err.message || "Failed to load attendance report.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const breadcrumbItems = [
    { title: "Home", href: "/student" },
    { title: "Attendance" }
  ];

  // Derive all individual attendance sessions from the overall report for display
  const allAttendanceSessions: LocalAttendanceRecord[] = overallReport
    ? overallReport.classes_summary.flatMap(classSummary =>
        classSummary.sessions.map(session => ({
          ...session,
          // Placeholder for canAppeal and appealStatus.
          // In a real app, you'd fetch/determine this from backend or other logic.
          canAppeal: session.student_attendance_status === 'absent' || session.student_attendance_status === 'late',
          appealStatus: undefined, // Or load from a separate appeal API if available
        }))
      )
    : [];

  // Get unique classes for filter
  const uniqueClasses: { id: number; name: string }[] = overallReport
    ? overallReport.classes_summary.map(cs => ({ id: cs.class_id, name: cs.class_name }))
    : [];

  // Filter data based on search and filters
  const filteredData = allAttendanceSessions.filter(record => {
    const matchesSearch = searchText === '' ||
      record.class_name.toLowerCase().includes(searchText.toLowerCase()) ||
      (record.session_name && record.session_name.toLowerCase().includes(searchText.toLowerCase())); // Assuming session_name is analogous to teacher/session

    const matchesStatus = statusFilter === 'all' || record.student_attendance_status === statusFilter;
    const matchesClass = classFilter === 'all' || record.class_id === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  // Statistics based on filtered data (or overall if no filters applied)
  const totalSessions = filteredData.length;
  const presentCount = filteredData.filter(r => r.student_attendance_status === 'present').length;
  const absentCount = filteredData.filter(r => r.student_attendance_status === 'absent').length;
  const lateCount = filteredData.filter(r => r.student_attendance_status === 'late').length;
  const excusedCount = filteredData.filter(r => r.student_attendance_status === 'excused').length;
  const attendanceRate = totalSessions > 0 ? (((presentCount + lateCount) / totalSessions) * 100).toFixed(1) : '0';


  const getStatusConfig = (status: string | null | undefined) => {
    
    switch(status) {
      case 'present':
        return { color: '#10b981', text: 'Present', icon: <CheckCircleOutlined /> };
      case 'absent':
        return { color: '#ef4444', text: 'Absent', icon: <CloseCircleOutlined /> };
      case 'excused':
        return { color: '#6366f1', text: 'Excused', icon: <CheckCircleOutlined /> };
      default:
        return { color: '#ef4444', text: 'Absent', icon: <CloseCircleOutlined /> };
    }
  };

  const getAppealStatusConfig = (status: string | undefined) => {
    switch(status) {
      case 'pending':
        return { color: '#f59e42', text: 'Pending' };
      case 'approved':
        return { color: '#10b981', text: 'Approved' };
      case 'rejected':
        return { color: '#ef4444', text: 'Rejected' };
      default:
        return { color: '#64748b', text: '' };
    }
  };

  const handleAppeal = (record: LocalAttendanceRecord) => {
    setSelectedRecord(record);
    setIsAppealModalVisible(true);
  };

  const handleSubmitAppeal = (values: any) => {
    
    // Here you would integrate with an API to submit the appeal
    message.success("Appeal submitted successfully! The teacher will review it as soon as possible.");
    setIsAppealModalVisible(false);
    form.resetFields();
    // Potentially re-fetch data or update local state to reflect pending appeal
  };

  const handleClearFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setClassFilter('all');
  };

  const columns = [
    {
      title: 'Class Date',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (start_time: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined style={{ color: '#64748b' }} />
          <Text>{new Date(start_time).toLocaleDateString('en-US')}</Text>
        </div>
      )
    },
    {
      title: 'Session & Subject',
      key: 'class_session_info',
      render: (record: LocalAttendanceRecord) => (
        <div>
          <Text strong>{record.class_name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.day_of_week && `${record.day_of_week}, `} {/* Added day_of_week */}
            {record.period_range && `${record.period_range} `} {/* Added period_range */}
          </Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'student_attendance_status',
      key: 'student_attendance_status',
      render: (status: string) => {
        const config = getStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" tip="Loading attendance data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "32px 48px" }}>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }


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
        <Title level={1} style={{
          marginBottom: 8,
          color: "#2563eb",
          fontSize: 36,
          fontWeight: 700
        }}>
          📊 Attendance History
        </Title>
        <Text style={{
          fontSize: 18,
          color: "#64748b"
        }}>
          Track your attendance status and submit appeals if needed
        </Text>
      </div>

      {/* Search and Filters */}
      <Card style={{
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none",
        marginBottom: 24
      }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Input
              placeholder="Search by subject or session..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="large"
              allowClear
            />
          </Col>
          <Col xs={12} sm={6}>
            <Select
              placeholder="Filter by class"
              value={classFilter}
              onChange={setClassFilter}
              style={{ width: '100%' }}
              size="large"
            >
              <Select.Option value="all">All Classes</Select.Option>
              {uniqueClasses.map(classItem => (
                <Select.Option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6}>
            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              size="large"
            >
              <Select.Option value="all">All Statuses</Select.Option>
              <Select.Option value="present">Present</Select.Option>
              <Select.Option value="absent">Absent</Select.Option>
              <Select.Option value="late">Late</Select.Option>
              <Select.Option value="excused">Excused</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Button
              onClick={handleClearFilters}
              style={{ width: '100%' }}
              size="large"
            >
              Clear Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Total Sessions"
              value={totalSessions}
              valueStyle={{ color: '#2563eb', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Present"
              value={presentCount}
              valueStyle={{ color: '#10b981', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Absent/Late"
              value={absentCount + lateCount}
              valueStyle={{ color: '#ef4444', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Attendance Rate"
              value={attendanceRate}
              suffix="%"
              valueStyle={{ color: '#f59e42', fontSize: 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Attendance Table */}
      <Card style={{
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none"
      }}>
        <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
          📋 Attendance Details {allAttendanceSessions.length > 0 && `(${filteredData.length}/${allAttendanceSessions.length} results)`}
        </Title>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="session_id" // Use session_id as row key
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} sessions`
          }}
          style={{ background: '#fff' }}
          locale={{
            emptyText: filteredData.length === 0 && allAttendanceSessions.length > 0
              ? "No matching results found"
              : "No attendance data available"
          }}
        />
      </Card>

      {/* Appeal Modal */}
      <Modal
        title="Submit Attendance Appeal"
        open={isAppealModalVisible}
        onCancel={() => setIsAppealModalVisible(false)}
        footer={null}
        width={600}
        style={{ borderRadius: 16 }}
      >
        <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
          <Text strong>Session Information:</Text>
          <br />
          <Text>📅 Date: {selectedRecord && new Date(selectedRecord.start_time).toLocaleDateString('en-US')}</Text>
          <br />
          <Text>📚 Subject: {selectedRecord?.class_name}</Text>
          <br />
          {/* If teacher name is not available in session summary, you might need to fetch it or pass it */}
          {/* <Text>👨‍🏫 Giáo viên: {selectedRecord?.teacher}</Text> */}
          <Text>🕐 Session: {selectedRecord?.session_name}</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitAppeal}
        >
          <Form.Item
            label="Appeal Reason"
            name="reason"
            rules={[{ required: true, message: "Please select a reason!" }]}
          >
            <Select placeholder="Select appeal reason" size="large">
              <Select.Option value="technical">System technical error</Select.Option>
              <Select.Option value="present">I was present but not recorded</Select.Option>
              <Select.Option value="late_valid">Late with valid reason</Select.Option>
              <Select.Option value="excused">Excused absence</Select.Option>
              <Select.Option value="other">Other reason</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Detailed Description"
            name="description"
            rules={[{ required: true, message: "Please provide a detailed description!" }]}
          >
            <TextArea
              rows={4}
              placeholder="Please describe the situation in detail and provide evidence if available..."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
              >
                Submit Appeal
              </Button>
              <Button
                onClick={() => setIsAppealModalVisible(false)}
                size="large"
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StudentAttendancePage;