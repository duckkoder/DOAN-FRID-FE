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
    { title: "Trang chủ", href: "/student" },
    { title: "Điểm danh" }
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
    console.log("Getting status config for status:", status);
    switch(status) {
      case 'present':
        return { color: '#10b981', text: 'Có mặt', icon: <CheckCircleOutlined /> };
      case 'absent':
        return { color: '#ef4444', text: 'Vắng', icon: <CloseCircleOutlined /> };
      case 'excused':
        return { color: '#6366f1', text: 'Vắng có phép', icon: <CheckCircleOutlined /> };
      default:
        return { color: '#ef4444', text: 'Vắng', icon: <CloseCircleOutlined /> };
    }
  };

  const getAppealStatusConfig = (status: string | undefined) => {
    switch(status) {
      case 'pending':
        return { color: '#f59e42', text: 'Đang xử lý' };
      case 'approved':
        return { color: '#10b981', text: 'Đã duyệt' };
      case 'rejected':
        return { color: '#ef4444', text: 'Từ chối' };
      default:
        return { color: '#64748b', text: '' };
    }
  };

  const handleAppeal = (record: LocalAttendanceRecord) => {
    setSelectedRecord(record);
    setIsAppealModalVisible(true);
  };

  const handleSubmitAppeal = (values: any) => {
    console.log("Appeal submitted:", values);
    // Here you would integrate with an API to submit the appeal
    message.success("Đã gửi khiếu nại thành công! Giáo viên sẽ xem xét trong thời gian sớm nhất.");
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
      title: 'Ngày học',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (start_time: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined style={{ color: '#64748b' }} />
          <Text>{new Date(start_time).toLocaleDateString('vi-VN')}</Text>
        </div>
      )
    },
    {
      title: 'Buổi học & Môn học',
      key: 'class_session_info',
      render: (record: LocalAttendanceRecord) => (
        <div>
          <Text strong>{record.class_name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.day_of_week && `Thứ ${record.day_of_week}, `} {/* Added day_of_week */}
            {record.period_range && `${record.period_range} `} {/* Added period_range */}
          </Text>
        </div>
      )
    },
    {
      title: 'Trạng thái',
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
        <Spin size="large" tip="Đang tải dữ liệu điểm danh..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "32px 48px" }}>
        <Alert
          message="Lỗi"
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
          📊 Lịch sử điểm danh
        </Title>
        <Text style={{
          fontSize: 18,
          color: "#64748b"
        }}>
          Theo dõi tình hình điểm danh và gửi khiếu nại nếu cần thiết
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
              placeholder="Tìm kiếm theo môn học hoặc buổi học..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="large"
              allowClear
            />
          </Col>
          <Col xs={12} sm={6}>
            <Select
              placeholder="Lọc theo lớp"
              value={classFilter}
              onChange={setClassFilter}
              style={{ width: '100%' }}
              size="large"
            >
              <Select.Option value="all">Tất cả lớp</Select.Option>
              {uniqueClasses.map(classItem => (
                <Select.Option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6}>
            <Select
              placeholder="Lọc theo trạng thái"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              size="large"
            >
              <Select.Option value="all">Tất cả trạng thái</Select.Option>
              <Select.Option value="present">Có mặt</Select.Option>
              <Select.Option value="absent">Vắng</Select.Option>
              <Select.Option value="late">Muộn</Select.Option>
              <Select.Option value="excused">Vắng có phép</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Button
              onClick={handleClearFilters}
              style={{ width: '100%' }}
              size="large"
            >
              Xóa bộ lọc
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Tổng buổi học"
              value={totalSessions}
              valueStyle={{ color: '#2563eb', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Có mặt"
              value={presentCount}
              valueStyle={{ color: '#10b981', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Vắng/Muộn"
              value={absentCount + lateCount}
              valueStyle={{ color: '#ef4444', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Tỷ lệ tham gia"
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
          📋 Chi tiết điểm danh {allAttendanceSessions.length > 0 && `(${filteredData.length}/${allAttendanceSessions.length} kết quả)`}
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
              `${range[0]}-${range[1]} của ${total} buổi học`
          }}
          style={{ background: '#fff' }}
          locale={{
            emptyText: filteredData.length === 0 && allAttendanceSessions.length > 0
              ? "Không tìm thấy kết quả phù hợp"
              : "Chưa có dữ liệu điểm danh"
          }}
        />
      </Card>

      {/* Appeal Modal */}
      <Modal
        title="Gửi khiếu nại điểm danh"
        open={isAppealModalVisible}
        onCancel={() => setIsAppealModalVisible(false)}
        footer={null}
        width={600}
        style={{ borderRadius: 16 }}
      >
        <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
          <Text strong>Thông tin buổi học:</Text>
          <br />
          <Text>📅 Ngày: {selectedRecord && new Date(selectedRecord.start_time).toLocaleDateString('vi-VN')}</Text>
          <br />
          <Text>📚 Môn: {selectedRecord?.class_name}</Text>
          <br />
          {/* If teacher name is not available in session summary, you might need to fetch it or pass it */}
          {/* <Text>👨‍🏫 Giáo viên: {selectedRecord?.teacher}</Text> */}
          <Text>🕐 Buổi: {selectedRecord?.session_name}</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitAppeal}
        >
          <Form.Item
            label="Lý do khiếu nại"
            name="reason"
            rules={[{ required: true, message: "Vui lòng chọn lý do!" }]}
          >
            <Select placeholder="Chọn lý do khiếu nại" size="large">
              <Select.Option value="technical">Lỗi kỹ thuật hệ thống</Select.Option>
              <Select.Option value="present">Tôi đã có mặt nhưng không được ghi nhận</Select.Option>
              <Select.Option value="late_valid">Đến muộn có lý do chính đáng</Select.Option>
              <Select.Option value="excused">Vắng có phép</Select.Option>
              <Select.Option value="other">Lý do khác</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Mô tả chi tiết"
            name="description"
            rules={[{ required: true, message: "Vui lòng mô tả chi tiết!" }]}
          >
            <TextArea
              rows={4}
              placeholder="Vui lòng mô tả chi tiết tình huống và cung cấp bằng chứng nếu có..."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
              >
                Gửi khiếu nại
              </Button>
              <Button
                onClick={() => setIsAppealModalVisible(false)}
                size="large"
              >
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StudentAttendancePage;