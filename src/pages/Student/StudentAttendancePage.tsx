import React, { useState } from "react";
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
  Statistic
} from "antd";
import { 
  ExclamationCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined
} from "@ant-design/icons";
import Breadcrumb from "../../components/Breadcrumb";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AttendanceRecord {
  id: string;
  date: string;
  subject: string;
  teacher: string;
  session: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  canAppeal: boolean;
  appealStatus?: 'pending' | 'approved' | 'rejected';
}

const StudentAttendancePage: React.FC = () => {
  const [isAppealModalVisible, setIsAppealModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [form] = Form.useForm();
  
  // Filter states
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Dữ liệu mẫu
  const attendanceData: AttendanceRecord[] = [
    {
      id: "1",
      date: "2024-10-07",
      subject: "Advanced Java Programming",
      teacher: "Dr. Nguyen Van A",
      session: "Buổi 1 (9:00 - 11:00)",
      status: 'present',
      canAppeal: false
    },
    {
      id: "2",
      date: "2024-10-05",
      subject: "Advanced Java Programming", 
      teacher: "Dr. Nguyen Van A",
      session: "Buổi 1 (9:00 - 11:00)",
      status: 'absent',
      canAppeal: true
    },
    {
      id: "3",
      date: "2024-10-03",
      subject: "Database Design",
      teacher: "Prof. Tran Thi B",
      session: "Buổi 2 (14:00 - 16:00)",
      status: 'late',
      canAppeal: true
    },
    {
      id: "4",
      date: "2024-10-01",
      subject: "Web Development",
      teacher: "Mr. Le Van C",
      session: "Buổi 3 (15:30 - 17:30)",
      status: 'absent',
      canAppeal: true,
      appealStatus: 'pending'
    },
    {
      id: "5",
      date: "2024-09-28",
      subject: "Advanced Java Programming",
      teacher: "Dr. Nguyen Van A", 
      session: "Buổi 1 (9:00 - 11:00)",
      status: 'excused',
      canAppeal: false
    }
  ];

  const breadcrumbItems = [
    { title: "Dashboard", href: "/student" },
    { title: "Attendance" }
  ];

  // Get unique classes for filter
  const uniqueClasses = Array.from(new Set(attendanceData.map(record => record.subject)));

  // Filter data based on search and filters
  const filteredData = attendanceData.filter(record => {
    const matchesSearch = searchText === '' || 
      record.subject.toLowerCase().includes(searchText.toLowerCase()) ||
      record.teacher.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesClass = classFilter === 'all' || record.subject === classFilter;
    
    return matchesSearch && matchesStatus && matchesClass;
  });

  // Thống kê based on filtered data
  const totalSessions = filteredData.length;
  const presentCount = filteredData.filter(r => r.status === 'present').length;
  const absentCount = filteredData.filter(r => r.status === 'absent').length;
  const lateCount = filteredData.filter(r => r.status === 'late').length;
  const attendanceRate = totalSessions > 0 ? ((presentCount / totalSessions) * 100).toFixed(1) : '0';

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'present':
        return { color: '#10b981', text: 'Có mặt', icon: <CheckCircleOutlined /> };
      case 'absent':
        return { color: '#ef4444', text: 'Vắng', icon: <CloseCircleOutlined /> };
      case 'late':
        return { color: '#f59e42', text: 'Muộn', icon: <ExclamationCircleOutlined /> };
      case 'excused':
        return { color: '#6366f1', text: 'Vắng có phép', icon: <CheckCircleOutlined /> };
      default:
        return { color: '#64748b', text: 'Không xác định', icon: null };
    }
  };

  const getAppealStatusConfig = (status: string) => {
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

  const handleAppeal = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsAppealModalVisible(true);
  };

  const handleSubmitAppeal = (values: any) => {
    console.log("Appeal submitted:", values);
    message.success("Đã gửi khiếu nại thành công! Giáo viên sẽ xem xét trong thời gian sớm nhất.");
    setIsAppealModalVisible(false);
    form.resetFields();
  };

  const handleClearFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setClassFilter('all');
  };

  const columns = [
    {
      title: 'Ngày học',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined style={{ color: '#64748b' }} />
          <Text>{new Date(date).toLocaleDateString('vi-VN')}</Text>
        </div>
      )
    },
    {
      title: 'Môn học',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject: string, record: AttendanceRecord) => (
        <div>
          <Text strong>{subject}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.teacher} • {record.session}
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
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: 'Khiếu nại',
      key: 'appeal',
      render: (record: AttendanceRecord) => {
        if (record.appealStatus) {
          const config = getAppealStatusConfig(record.appealStatus);
          return (
            <Tag color={config.color}>
              {config.text}
            </Tag>
          );
        }
        
        if (record.canAppeal && (record.status === 'absent' || record.status === 'late')) {
          return (
            <Button 
              type="primary" 
              size="small"
              onClick={() => handleAppeal(record)}
              style={{ borderRadius: 4 }}
            >
              Khiếu nại
            </Button>
          );
        }
        
        return <Text type="secondary">-</Text>;
      }
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
              placeholder="Tìm kiếm theo môn học hoặc giáo viên..."
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
              {uniqueClasses.map(className => (
                <Select.Option key={className} value={className}>
                  {className}
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
          📋 Chi tiết điểm danh {filteredData.length !== attendanceData.length && `(${filteredData.length}/${attendanceData.length} kết quả)`}
        </Title>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} của ${total} buổi học`
          }}
          style={{ background: '#fff' }}
          locale={{
            emptyText: filteredData.length === 0 && attendanceData.length > 0 
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
          <Text>📅 Ngày: {selectedRecord && new Date(selectedRecord.date).toLocaleDateString('vi-VN')}</Text>
          <br />
          <Text>📚 Môn: {selectedRecord?.subject}</Text>
          <br />
          <Text>👨‍🏫 Giáo viên: {selectedRecord?.teacher}</Text>
          <br />
          <Text>🕐 Buổi: {selectedRecord?.session}</Text>
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
