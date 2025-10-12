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
  message,
  Space,
  Statistic,
  Dropdown,
  Popconfirm
} from "antd";
import { 
  PlusOutlined,
  CalendarOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined
} from "@ant-design/icons";
import Breadcrumb from "../../components/Breadcrumb";
import LeaveRequestModal from "../../components/LeaveRequestModal";
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface LeaveRequest {
  id: string;
  subject: string;
  date: string;
  dayOfWeek: string;
  timeSlot: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  approverNote?: string;
  attachments?: string[];
}

const StudentReportPage: React.FC = () => {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);

  // Dữ liệu mẫu môn học
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
    },
    { 
      value: 'ai', 
      label: 'Artificial Intelligence', 
      teacher: 'Dr. Pham Van D',
      schedule: {
        'sunday': ['Buổi 2 (9:45 - 11:45)', 'Buổi 3 (13:30 - 15:30)']
      }
    }
  ];

  // Dữ liệu mẫu các đơn nghỉ học
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: "1",
      subject: "Advanced Java Programming",
      date: "2024-10-15",
      dayOfWeek: "Thứ 3",
      timeSlot: "Buổi 1 (7:30 - 9:30)",
      reason: "Bị sốt cao, cần nghỉ ngơi và đi khám bác sĩ",
      status: 'approved',
      submittedDate: "2024-10-10",
      approverNote: "Đơn hợp lệ, chúc em sớm khỏe",
      attachments: ["medical_certificate.pdf"]
    },
    {
      id: "2", 
      subject: "Database Design",
      date: "2024-10-08",
      dayOfWeek: "Thứ 3",
      timeSlot: "Buổi 3 (13:30 - 15:30)",
      reason: "Có việc gia đình khẩn cấp cần xử lý",
      status: 'pending',
      submittedDate: "2024-10-07"
    },
    {
      id: "3",
      subject: "Web Development",
      date: "2024-09-25",
      dayOfWeek: "Thứ 7",
      timeSlot: "Buổi 1 (7:30 - 9:30)",
      reason: "Tham gia cuộc thi lập trình cấp quốc gia",
      status: 'approved',
      submittedDate: "2024-09-20",
      approverNote: "Chúc mừng em tham gia cuộc thi"
    },
    {
      id: "4",
      subject: "Artificial Intelligence",
      date: "2024-09-10",
      dayOfWeek: "Chủ nhật",
      timeSlot: "Buổi 2 (9:45 - 11:45)",
      reason: "Lý do cá nhân không rõ ràng",
      status: 'rejected',
      submittedDate: "2024-09-08",
      approverNote: "Cần bổ sung lý do cụ thể hơn"
    },
    {
      id: "5",
      subject: "Database Design",
      date: "2024-10-20",
      dayOfWeek: "Chủ nhật",
      timeSlot: "Buổi 4 (15:45 - 17:45)",
      reason: "Đi khám răng định kỳ",
      status: 'pending',
      submittedDate: "2024-10-15"
    }
  ]);

  const breadcrumbItems = [
    { title: "Dashboard", href: "/student" },
    { title: "Leave Requests" }
  ];

  // Thống kê
  const totalRequests = leaveRequests.length;
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;
  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length;

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

  const handleCreateRequest = (values: any) => {
    console.log("Create leave request:", values);
    
    // Tạo đơn mới
    const newRequest: LeaveRequest = {
      id: Date.now().toString(),
      subject: subjects.find(s => s.value === values.subject)?.label || '',
      date: values.date.format('YYYY-MM-DD'),
      dayOfWeek: getDayOfWeekLabel(values.dayOfWeek),
      timeSlot: values.timeSlot,
      reason: values.reason,
      status: 'pending',
      submittedDate: dayjs().format('YYYY-MM-DD')
    };

    setLeaveRequests(prev => [newRequest, ...prev]);
    message.success("Đã gửi đơn nghỉ học thành công! Giáo viên sẽ xem xét trong thời gian sớm nhất.");
    setIsCreateModalVisible(false);
  };

  const handleEditRequest = (values: any) => {
    console.log("Edit leave request:", values);
    
    if (!editingRequest) return;

    const updatedRequest: LeaveRequest = {
      ...editingRequest,
      subject: subjects.find(s => s.value === values.subject)?.label || '',
      date: values.date.format('YYYY-MM-DD'),
      dayOfWeek: getDayOfWeekLabel(values.dayOfWeek),
      timeSlot: values.timeSlot,
      reason: values.reason,
      submittedDate: dayjs().format('YYYY-MM-DD')
    };

    setLeaveRequests(prev => 
      prev.map(req => req.id === editingRequest.id ? updatedRequest : req)
    );
    
    message.success("Đã cập nhật đơn nghỉ học thành công!");
    setIsEditModalVisible(false);
    setEditingRequest(null);
  };

  const handleDeleteRequest = (requestId: string) => {
    setLeaveRequests(prev => prev.filter(req => req.id !== requestId));
    message.success("Đã xóa đơn nghỉ học thành công!");
  };

  const handleViewRequest = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsViewModalVisible(true);
  };

  const handleEditClick = (request: LeaveRequest) => {
    setEditingRequest(request);
    setIsEditModalVisible(true);
  };

  const getDayOfWeekLabel = (dayValue: string) => {
    const dayMap: { [key: string]: string } = {
      'monday': 'Thứ 2',
      'tuesday': 'Thứ 3',
      'wednesday': 'Thứ 4',
      'thursday': 'Thứ 5',
      'friday': 'Thứ 6',
      'saturday': 'Thứ 7',
      'sunday': 'Chủ nhật'
    };
    return dayMap[dayValue] || dayValue;
  };

  const getSubjectValue = (subjectLabel: string) => {
    return subjects.find(s => s.label === subjectLabel)?.value || '';
  };

  const getDayValue = (dayLabel: string) => {
    const dayMap: { [key: string]: string } = {
      'Thứ 2': 'monday',
      'Thứ 3': 'tuesday',
      'Thứ 4': 'wednesday',
      'Thứ 5': 'thursday',
      'Thứ 6': 'friday',
      'Thứ 7': 'saturday',
      'Chủ nhật': 'sunday'
    };
    return dayMap[dayLabel] || '';
  };

  // Prepare edit initial values
  const getEditInitialValues = (request: LeaveRequest) => {
    return {
      subject: getSubjectValue(request.subject),
      dayOfWeek: getDayValue(request.dayOfWeek),
      timeSlot: request.timeSlot,
      date: dayjs(request.date),
      reason: request.reason
    };
  };

  const getActionMenu = (record: LeaveRequest) => {
    const items = [
      {
        key: 'view',
        label: 'Xem chi tiết',
        icon: <EyeOutlined />,
        onClick: () => handleViewRequest(record)
      }
    ];

    // Chỉ cho phép edit/delete với đơn đang xử lý
    if (record.status === 'pending') {
      items.push(
        {
          key: 'edit',
          label: 'Chỉnh sửa',
          icon: <EditOutlined />,
          onClick: () => handleEditClick(record)
        },
        {
          key: 'delete',
          label: 'Xóa',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDeleteRequest(record.id)
        }
      );
    }

    return { items };
  };

  const columns = [
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
      title: 'Ngày nghỉ',
      key: 'date',
      render: (record: LeaveRequest) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined style={{ color: '#64748b' }} />
          <div>
            <Text>{dayjs(record.date).format('DD/MM/YYYY')}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.dayOfWeek}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => (
        <Text style={{ 
          display: 'block',
          maxWidth: 300,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {reason}
        </Text>
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
        <Space size="small">
          {record.status === 'pending' ? (
            // Hiển thị full actions cho đơn đang xử lý
            <>
              <Button 
                type="link" 
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewRequest(record)}
              >
                Xem
              </Button>
              <Button 
                type="link" 
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditClick(record)}
              >
                Sửa
              </Button>
              <Popconfirm
                title="Xác nhận xóa"
                description="Bạn có chắc chắn muốn xóa đơn này không?"
                onConfirm={() => handleDeleteRequest(record.id)}
                okText="Xóa"
                cancelText="Hủy"
                okType="danger"
              >
                <Button 
                  type="link" 
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  Xóa
                </Button>
              </Popconfirm>
            </>
          ) : (
            // Chỉ hiển thị "Xem" cho đơn đã duyệt/từ chối
            <Button 
              type="primary" 
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewRequest(record)}
            >
              Xem chi tiết
            </Button>
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
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 32 
      }}>
        <div>
          <Title level={1} style={{ 
            marginBottom: 8, 
            color: "#2563eb",
            fontSize: 36,
            fontWeight: 700
          }}>
            📝 Leave Requests
          </Title>
          <Text style={{ 
            fontSize: 18, 
            color: "#64748b"
          }}>
            Tạo đơn xin nghỉ học và theo dõi trạng thái xử lý
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsCreateModalVisible(true)}
          style={{ 
            borderRadius: 8, 
            height: 48,
            fontSize: 16
          }}
        >
          Tạo đơn nghỉ học
        </Button>
      </div>

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
              title="Đã duyệt"
              value={approvedCount}
              valueStyle={{ color: '#10b981', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Đang xử lý"
              value={pendingCount}
              valueStyle={{ color: '#f59e42', fontSize: 24 }}
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
          📋 Danh sách đơn nghỉ học
        </Title>
        <Table
          dataSource={leaveRequests}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} của ${total} đơn`
          }}
        />
      </Card>

      {/* Create Leave Request Modal */}
      <LeaveRequestModal
        visible={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        onSubmit={handleCreateRequest}
        subjects={subjects}
        preSelectedSubject=""
      />

      {/* Edit Leave Request Modal */}
      <LeaveRequestModal
        visible={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingRequest(null);
        }}
        onSubmit={handleEditRequest}
        subjects={subjects}
        preSelectedSubject={editingRequest ? getSubjectValue(editingRequest.subject) : ''}
        initialValues={editingRequest ? getEditInitialValues(editingRequest) : undefined}
        title="Chỉnh sửa đơn nghỉ học"
      />

      {/* View Request Details Modal */}
      <Modal
        title="Chi tiết đơn nghỉ học"
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={600}
      >
        {selectedRequest && (
          <div style={{ padding: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>Môn học:</Text>
                <br />
                <Text>{selectedRequest.subject}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Khung giờ:</Text>
                <br />
                <Text>{selectedRequest.timeSlot}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Ngày nghỉ:</Text>
                <br />
                <Text>{dayjs(selectedRequest.date).format('DD/MM/YYYY')}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Thứ:</Text>
                <br />
                <Text>{selectedRequest.dayOfWeek}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Trạng thái:</Text>
                <br />
                <Tag color={getStatusConfig(selectedRequest.status).color}>
                  {getStatusConfig(selectedRequest.status).text}
                </Tag>
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
              {selectedRequest.approverNote && (
                <Col span={24}>
                  <Text strong>Ghi chú từ giáo viên:</Text>
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
    </div>
  );
};

export default StudentReportPage;
