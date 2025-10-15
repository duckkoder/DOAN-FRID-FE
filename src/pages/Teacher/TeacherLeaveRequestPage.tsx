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
  Statistic,
  Tooltip
} from "antd";
import { 
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  CalendarOutlined,
  FileTextOutlined,
  DownloadOutlined,
  SearchOutlined
} from "@ant-design/icons";
import Breadcrumb from "../../components/Breadcrumb";
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Search } = Input;

interface LeaveRequest {
  id: string;
  studentName: string;
  studentId: string;
  subject: string;
  startDate: string;
  endDate: string;
  timeSlot: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  approverNote?: string;
  attachments?: string[];
}

const TeacherLeaveRequestPage: React.FC = () => {
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [form] = Form.useForm();

  // Dữ liệu mẫu các đơn xin nghỉ của học sinh
  const leaveRequests: LeaveRequest[] = [
    {
      id: "1",
      studentName: "Nguyễn Văn An",
      studentId: "SV001",
      subject: "Advanced Java Programming",
      startDate: "2024-10-15",
      endDate: "2024-10-16",
      timeSlot: "Buổi 1 (7:30 - 9:30)",
      reason: "Bị sốt cao, cần nghỉ ngơi và đi khám bác sĩ",
      status: 'pending',
      submittedDate: "2024-10-10",
      attachments: ["medical_certificate.pdf"]
    },
    {
      id: "2", 
      studentName: "Trần Thị Bình",
      studentId: "SV002",
      subject: "Database Design",
      startDate: "2024-10-08",
      endDate: "2024-10-08",
      timeSlot: "Buổi 3 (13:30 - 15:30)",
      reason: "Có việc gia đình khẩn cấp cần xử lý",
      status: 'pending',
      submittedDate: "2024-10-07"
    },
    {
      id: "3",
      studentName: "Lê Văn Cường",
      studentId: "SV003",
      subject: "Advanced Java Programming",
      startDate: "2024-09-25",
      endDate: "2024-09-25", 
      timeSlot: "Buổi 1 (7:30 - 9:30)",
      reason: "Tham gia cuộc thi lập trình cấp quốc gia",
      status: 'approved',
      submittedDate: "2024-09-20",
      approverNote: "Chúc mừng em tham gia cuộc thi"
    },
    {
      id: "4",
      studentName: "Phạm Thị Dung",
      studentId: "SV004",
      subject: "Web Development",
      startDate: "2024-09-10",
      endDate: "2024-09-12",
      timeSlot: "Buổi 2 (9:45 - 11:45)",
      reason: "Lý do cá nhân không rõ ràng",
      status: 'rejected',
      submittedDate: "2024-09-08",
      approverNote: "Cần bổ sung lý do cụ thể hơn"
    },
    {
      id: "5",
      studentName: "Hoàng Văn Em",
      studentId: "SV005",
      subject: "Database Design",
      startDate: "2024-10-12",
      endDate: "2024-10-12",
      timeSlot: "Buổi 4 (15:45 - 17:45)",
      reason: "Bệnh viêm họng cấp tính",
      status: 'approved',
      submittedDate: "2024-10-09",
      approverNote: "Đã xem giấy khám bệnh, chúc em sớm khỏe",
      attachments: ["doctor_note.pdf"]
    }
  ];

  const breadcrumbItems = [
    { title: "Dashboard", href: "/teacher" },
    { title: "Leave Requests" }
  ];

  // Get unique subjects for filter
  const uniqueSubjects = Array.from(new Set(leaveRequests.map(request => request.subject)));

  // Filter data
  const filteredData = leaveRequests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSubject = subjectFilter === 'all' || request.subject === subjectFilter;
    const matchesSearch = searchText === '' || 
      request.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
      request.studentId.toLowerCase().includes(searchText.toLowerCase());
    
    return matchesStatus && matchesSubject && matchesSearch;
  });

  // Thống kê
  const totalRequests = filteredData.length;
  const pendingCount = filteredData.filter(r => r.status === 'pending').length;
  const approvedCount = filteredData.filter(r => r.status === 'approved').length;
  const rejectedCount = filteredData.filter(r => r.status === 'rejected').length;

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'pending':
        return { color: '#f59e42', text: 'Đang xử lý' };
      case 'approved':
        return { color: '#10b981', text: 'Đã duyệt' };
      case 'rejected':
        return { color: '#ef4444', text: 'Từ chối' };
      default:
        return { color: '#64748b', text: 'Không xác định' };
    }
  };

  const handleViewRequest = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsViewModalVisible(true);
  };

  const handleApprovalAction = (request: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setIsApprovalModalVisible(true);
  };

  const handleSubmitApproval = (values: any) => {
    const actionText = approvalAction === 'approve' ? 'duyệt' : 'từ chối';
    console.log(`${approvalAction} request:`, selectedRequest?.id, values);
    message.success(`Đã ${actionText} đơn xin nghỉ thành công!`);
    setIsApprovalModalVisible(false);
    form.resetFields();
  };

  const handleDownloadAttachment = (fileName: string) => {
    message.info(`Đang tải xuống file: ${fileName}`);
    // Implement download logic here
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSubjectFilter('all');
    setSearchText('');
  };

  const columns = [
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
      title: 'Môn học',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject: string, record: LeaveRequest) => (
        <div>
          <Text strong>{subject}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.timeSlot}
          </Text>
        </div>
      )
    },
    {
      title: 'Thời gian nghỉ',
      key: 'duration',
      render: (record: LeaveRequest) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined style={{ color: '#64748b' }} />
          <div>
            <Text>{dayjs(record.startDate).format('DD/MM/YYYY')}</Text>
            {record.startDate !== record.endDate && (
              <>
                <Text> - </Text>
                <Text>{dayjs(record.endDate).format('DD/MM/YYYY')}</Text>
              </>
            )}
          </div>
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
          <Tooltip title="Xem chi tiết">
            <Button 
              type="primary" 
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewRequest(record)}
            />
          </Tooltip>
          {record.status === 'pending' && (
            <>
              <Tooltip title="Duyệt đơn">
                <Button 
                  type="primary" 
                  size="small"
                  icon={<CheckOutlined />}
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                  onClick={() => handleApprovalAction(record, 'approve')}
                />
              </Tooltip>
              <Tooltip title="Từ chối">
                <Button 
                  danger
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => handleApprovalAction(record, 'reject')}
                />
              </Tooltip>
            </>
          )}
        </Space>
      )
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
          📋 Student Leave Requests
        </Title>
        <Text style={{ 
          fontSize: 18, 
          color: "#64748b"
        }}>
          Quản lý và phê duyệt các đơn xin nghỉ học của học sinh
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
          <Col xs={24} md={8}>
            <Search
              placeholder="Tìm kiếm theo tên hoặc mã học sinh..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={setSearchText}
              enterButton={<SearchOutlined />}
              size="large"
              allowClear
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              placeholder="Lọc theo trạng thái"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              size="large"
            >
              <Select.Option value="all">Tất cả trạng thái</Select.Option>
              <Select.Option value="pending">Đang xử lý</Select.Option>
              <Select.Option value="approved">Đã duyệt</Select.Option>
              <Select.Option value="rejected">Từ chối</Select.Option>
            </Select>
          </Col>
          <Col xs={12} md={6}>
            <Select
              placeholder="Lọc theo môn học"
              value={subjectFilter}
              onChange={setSubjectFilter}
              style={{ width: '100%' }}
              size="large"
            >
              <Select.Option value="all">Tất cả môn học</Select.Option>
              {uniqueSubjects.map(subject => (
                <Select.Option key={subject} value={subject}>
                  {subject}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={5}>
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
              title="Tổng đơn"
              value={totalRequests}
              valueStyle={{ color: '#2563eb', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Đang chờ"
              value={pendingCount}
              valueStyle={{ color: '#f59e42', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Đã duyệt"
              value={approvedCount}
              valueStyle={{ color: '#10b981', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Từ chối"
              value={rejectedCount}
              valueStyle={{ color: '#ef4444', fontSize: 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Leave Requests Table */}
      <Card style={{
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none"
      }}>
        <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
          📊 Danh sách đơn xin nghỉ {filteredData.length !== leaveRequests.length && `(${filteredData.length}/${leaveRequests.length} kết quả)`}
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
              `${range[0]}-${range[1]} của ${total} đơn`
          }}
          locale={{
            emptyText: filteredData.length === 0 && leaveRequests.length > 0 
              ? "Không tìm thấy kết quả phù hợp" 
              : "Chưa có đơn xin nghỉ nào"
          }}
        />
      </Card>

      {/* View Request Details Modal */}
      <Modal
        title="Chi tiết đơn xin nghỉ học"
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={700}
      >
        {selectedRequest && (
          <div style={{ padding: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>Học sinh:</Text>
                <br />
                <Text>{selectedRequest.studentName} ({selectedRequest.studentId})</Text>
              </Col>
              <Col span={12}>
                <Text strong>Môn học:</Text>
                <br />
                <Text>{selectedRequest.subject}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Buổi học:</Text>
                <br />
                <Text>{selectedRequest.timeSlot}</Text>
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
              <Col span={24}>
                <Text strong>Lý do:</Text>
                <br />
                <Text>{selectedRequest.reason}</Text>
              </Col>
              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <Col span={24}>
                  <Text strong>Tài liệu đính kèm:</Text>
                  <br />
                  <Space direction="vertical">
                    {selectedRequest.attachments.map((file, index) => (
                      <Button 
                        key={index}
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadAttachment(file)}
                        type="link"
                      >
                        {file}
                      </Button>
                    ))}
                  </Space>
                </Col>
              )}
              {selectedRequest.approverNote && (
                <Col span={24}>
                  <Text strong>Ghi chú phê duyệt:</Text>
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
            </Row>
          </div>
        )}
      </Modal>

      {/* Approval Modal */}
      <Modal
        title={approvalAction === 'approve' ? "Duyệt đơn xin nghỉ" : "Từ chối đơn xin nghỉ"}
        open={isApprovalModalVisible}
        onCancel={() => setIsApprovalModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedRequest && (
          <>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <Text strong>Thông tin đơn:</Text>
              <br />
              <Text>👤 Học sinh: {selectedRequest.studentName} ({selectedRequest.studentId})</Text>
              <br />
              <Text>📚 Môn: {selectedRequest.subject}</Text>
              <br />
              <Text>📅 Ngày: {dayjs(selectedRequest.startDate).format('DD/MM/YYYY')} 
                {selectedRequest.startDate !== selectedRequest.endDate && 
                  ` - ${dayjs(selectedRequest.endDate).format('DD/MM/YYYY')}`}
              </Text>
              <br />
              <Text>🕐 Buổi: {selectedRequest.timeSlot}</Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmitApproval}
            >
              <Form.Item
                label={approvalAction === 'approve' ? "Ghi chú duyệt đơn" : "Lý do từ chối"}
                name="note"
                rules={[{ 
                  required: approvalAction === 'reject', 
                  message: "Vui lòng nhập lý do từ chối!" 
                }]}
              >
                <TextArea
                  rows={4}
                  placeholder={
                    approvalAction === 'approve' 
                      ? "Nhập ghi chú cho học sinh (không bắt buộc)..."
                      : "Nhập lý do từ chối đơn này..."
                  }
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Space>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    style={{
                      background: approvalAction === 'approve' ? '#10b981' : '#ef4444',
                      borderColor: approvalAction === 'approve' ? '#10b981' : '#ef4444'
                    }}
                  >
                    {approvalAction === 'approve' ? 'Duyệt đơn' : 'Từ chối'}
                  </Button>
                  <Button onClick={() => setIsApprovalModalVisible(false)}>
                    Hủy
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default TeacherLeaveRequestPage;