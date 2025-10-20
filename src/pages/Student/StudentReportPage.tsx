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
  message,
  Space,
  Statistic,
  Popconfirm,
  Spin,
  Alert,
  Image,
  Divider
} from "antd";
import { 
  PlusOutlined,
  CalendarOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FileTextOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  UserOutlined,
  ClockCircleOutlined,
  BookOutlined,
  CheckCircleOutlined,  // ✅ Added
  CloseCircleOutlined   // ✅ Added
} from "@ant-design/icons";
import Breadcrumb from "../../components/Breadcrumb";
import LeaveRequestModal from "../../components/LeaveRequestModal";
import dayjs from 'dayjs';
// ✅ Import APIs
import { getStudentClasses, type StudentClassItem } from "../../apis/classesAPIs/studentClass";
import { 
  getLeaveRequests, 
  createLeaveRequest, 
  updateLeaveRequest, 
  cancelLeaveRequest,
  type LeaveRequestDetail,
  type CreateLeaveRequestPayload,
  type UpdateLeaveRequestPayload,
  type LeaveRequestStatus
} from "../../apis/leaveRequestAPIs/leaveRequest";
import { uploadDocument } from "../../apis/fileAPIs/file";

const { Title, Text } = Typography;

// ✅ UPDATED: Use LeaveRequestDetail directly instead of custom interface
const StudentReportPage: React.FC = () => {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestDetail | null>(null); // ✅ Updated type
  const [editingRequest, setEditingRequest] = useState<LeaveRequestDetail | null>(null); // ✅ Updated type
  const [reviewForm] = Form.useForm(); // ✅ Added for view modal

  // ✅ API State Management
  const [classes, setClasses] = useState<StudentClassItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDetail[]>([]); // ✅ Updated type
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Transform classes data for modal
  const subjects = classes.map(cls => ({
    value: cls.id.toString(),
    label: cls.className,
    teacher: cls.teacherName,
    schedule: cls.schedule
  }));

  const breadcrumbItems = [
    { title: "Dashboard", href: "/student" },
    { title: "Leave Requests" }
  ];

  // ✅ Convert English day to Vietnamese
  const convertDayToVietnamese = (englishDay: string): string => {
    const dayMap: { [key: string]: string } = {
      'Monday': 'Thứ Hai',
      'Tuesday': 'Thứ Ba', 
      'Wednesday': 'Thứ Tư',
      'Thursday': 'Thứ Năm',
      'Friday': 'Thứ Sáu',
      'Saturday': 'Thứ Bảy',
      'Sunday': 'Chủ Nhật'
    };
    return dayMap[englishDay] || englishDay;
  };

  // ✅ Fetch classes on mount
  useEffect(() => {
    fetchClasses();
    fetchLeaveRequests();
  }, []);

  // ✅ Fetch student classes
  const fetchClasses = async () => {
    setLoadingClasses(true);
    setError(null);
    try {
      const response = await getStudentClasses('active');
      console.log('Fetched classes:', response.data.classes);
      setClasses(response.data.classes);
    } catch (err: unknown) {
      console.error('Failed to fetch classes:', err);
      const errorMsg = (err as Error).message || 'Không thể tải danh sách lớp học';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoadingClasses(false);
    }
  };

  // ✅ UPDATED: Fetch leave requests - Store original API data
  const fetchLeaveRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await getLeaveRequests();
      console.log('Fetched leave requests:', response.data.leaveRequests);
      
      // ✅ Store original API data directly
      setLeaveRequests(response.data.leaveRequests);
    } catch (err: unknown) {
      console.error('Failed to fetch leave requests:', err);
      message.error((err as Error).message || 'Không thể tải danh sách đơn nghỉ học');
    } finally {
      setLoadingRequests(false);
    }
  };

  // ✅ SIMPLIFIED: Handle view request directly
  const handleViewRequest = (request: LeaveRequestDetail) => {
    setSelectedRequest(request);
    setIsViewModalVisible(true);
    reviewForm.resetFields();
  };

  // ✅ SIMPLIFIED: Handle edit click directly  
  const handleEditClick = (request: LeaveRequestDetail) => {
    setEditingRequest(request);
    setIsEditModalVisible(true);
  };

  // ✅ IMPROVED: Handle create leave request with better error handling
  const handleCreateRequest = async (values: any) => {
    console.log("Create leave request:", values);
    
    setSubmitting(true);
    try {
      let evidenceFileId: number | null = null;

      // Step 1: Upload evidence file if exists
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
          } catch (uploadErr: unknown) {
            message.error({ 
              content: `❌ Lỗi upload file: ${(uploadErr as Error).message || 'Vui lòng thử lại'}`,
              key: 'uploadFile',
              duration: 4
            });
            throw new Error(`Upload file thất bại: ${(uploadErr as Error).message}`);
          }
        }
      }

      // Step 2: Create leave request
      message.loading({ content: 'Đang gửi đơn xin nghỉ học...', key: 'createLeave', duration: 0 });

      const payload: CreateLeaveRequestPayload = {
        class_id: parseInt(values.subject),
        reason: values.reason,
        leave_date: values.date.toISOString(),
        day_of_week: values.dayOfWeek,
        time_slot: values.timeSlot,
        evidence_file_id: evidenceFileId
      };

      console.log('Creating leave request:', payload);

      const response = await createLeaveRequest(payload);

      if (response.success) {
        message.success({ 
          content: '🎉 Đã gửi đơn xin nghỉ học thành công! Giáo viên sẽ xem xét trong thời gian sớm nhất.', 
          key: 'createLeave',
          duration: 4
        });
        
        // Refresh leave requests list
        await fetchLeaveRequests();
        
        setIsCreateModalVisible(false);
      } else {
        throw new Error(response.message || 'Gửi đơn thất bại');
      }

    } catch (err: unknown) {
      console.error('Failed to create leave request:', err);
      
      // ✅ Better error message
      let errorMessage = 'Không thể gửi đơn xin nghỉ học. Vui lòng thử lại!';
      
      const errorObj = err as Error;
      if (errorObj.message) {
        if (errorObj.message.includes('Upload file')) {
          errorMessage = errorObj.message;
        } else if (errorObj.message.includes('network') || errorObj.message.includes('timeout')) {
          errorMessage = '⚠️ Lỗi kết nối mạng. Vui lòng kiểm tra và thử lại!';
        } else if (errorObj.message.includes('401') || errorObj.message.includes('unauthorized')) {
          errorMessage = '🔒 Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!';
        } else {
          errorMessage = `❌ ${errorObj.message}`;
        }
      }
      
      message.error({ 
        content: errorMessage,
        key: 'createLeave',
        duration: 5
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ IMPROVED: Handle edit leave request with better error handling
  const handleEditRequest = async (values: any) => {
    console.log("Edit leave request:", values);
    
    if (!editingRequest) return;

    setSubmitting(true);
    try {
      let evidenceFileId: number | undefined = undefined;

      // Upload new evidence file if changed
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
          } catch (uploadErr: unknown) {
            message.error({ 
              content: `❌ Lỗi upload file: ${(uploadErr as Error).message || 'Vui lòng thử lại'}`,
              key: 'uploadFile',
              duration: 4
            });
            throw new Error(`Upload file thất bại: ${(uploadErr as Error).message}`);
          }
        }
      }

      message.loading({ content: 'Đang cập nhật đơn...', key: 'updateLeave', duration: 0 });

      const payload: UpdateLeaveRequestPayload = {
        reason: values.reason,
        leave_date: values.date.toISOString(),
        day_of_week: values.dayOfWeek,
        time_slot: values.timeSlot,
        ...(evidenceFileId && { evidence_file_id: evidenceFileId })
      };

      const response = await updateLeaveRequest(editingRequest.id, payload);

      if (response.success) {
        message.success({ 
          content: '✅ Đã cập nhật đơn nghỉ học thành công!',
          key: 'updateLeave',
          duration: 3
        });
        
        await fetchLeaveRequests();
        
        setIsEditModalVisible(false);
        setEditingRequest(null);
      } else {
        throw new Error(response.message || 'Cập nhật thất bại');
      }

    } catch (err: unknown) {
      console.error('Failed to update leave request:', err);
      
      let errorMessage = 'Không thể cập nhật đơn. Vui lòng thử lại!';
      
      const errorObj = err as Error;
      if (errorObj.message) {
        if (errorObj.message.includes('Upload file')) {
          errorMessage = errorObj.message;
        } else if (errorObj.message.includes('network') || errorObj.message.includes('timeout')) {
          errorMessage = '⚠️ Lỗi kết nối mạng. Vui lòng kiểm tra và thử lại!';
        } else if (errorObj.message.includes('401') || errorObj.message.includes('unauthorized')) {
          errorMessage = '🔒 Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!';
        } else {
          errorMessage = `❌ ${errorObj.message}`;
        }
      }
      
      message.error({ 
        content: errorMessage,
        key: 'updateLeave',
        duration: 5
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ IMPROVED: Handle delete leave request with better error handling
  const handleDeleteRequest = async (requestId: string) => {
    try {
      message.loading({ content: 'Đang xóa đơn...', key: 'deleteLeave', duration: 0 });
      
      await cancelLeaveRequest(parseInt(requestId));
      
      message.success({ 
        content: '✅ Đã xóa đơn nghỉ học thành công!',
        key: 'deleteLeave',
        duration: 3
      });
      
      await fetchLeaveRequests();
    } catch (err: unknown) {
      console.error('Failed to delete leave request:', err);
      
      let errorMessage = 'Không thể xóa đơn. Vui lòng thử lại!';
      
      const errorObj = err as Error;
      if (errorObj.message) {
        if (errorObj.message.includes('network') || errorObj.message.includes('timeout')) {
          errorMessage = '⚠️ Lỗi kết nối mạng. Vui lòng kiểm tra và thử lại!';
        } else if (errorObj.message.includes('401') || errorObj.message.includes('unauthorized')) {
          errorMessage = '🔒 Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!';
        } else {
          errorMessage = `❌ ${errorObj.message}`;
        }
      }
      
      message.error({ 
        content: errorMessage,
        key: 'deleteLeave',
        duration: 5
      });
    }
  };

  const getDayOfWeekLabel = (dayValue: string) => {
    const dayMap: { [key: string]: string } = {
      'Monday': 'Thứ 2',
      'Tuesday': 'Thứ 3',
      'Wednesday': 'Thứ 4',
      'Thursday': 'Thứ 5',
      'Friday': 'Thứ 6',
      'Saturday': 'Thứ 7',
      'Sunday': 'Chủ nhật'
    };
    return dayMap[dayValue] || dayValue;
  };

  const getDayValue = (dayLabel: string) => {
    const dayMap: { [key: string]: string } = {
      'Thứ 2': 'Monday',
      'Thứ 3': 'Tuesday',
      'Thứ 4': 'Wednesday',
      'Thứ 5': 'Thursday',
      'Thứ 6': 'Friday',
      'Thứ 7': 'Saturday',
      'Chủ nhật': 'Sunday'
    };
    return dayMap[dayLabel] || '';
  };

  // ✅ UPDATED: getEditInitialValues now works directly with LeaveRequestDetail
  const getEditInitialValues = (request: LeaveRequestDetail) => {
    return {
      subject: request.classId.toString(),
      dayOfWeek: request.dayOfWeek, // Original English value from API
      timeSlot: request.timeSlot,
      date: dayjs(request.leaveDate),
      reason: request.reason
    };
  };

  // ✅ Get file type icon
  const getFileIcon = (fileUrl?: string) => {
    if (!fileUrl) return null;
    
    const isPdf = fileUrl.toLowerCase().includes('.pdf');
    return isPdf ? (
      <FilePdfOutlined style={{ fontSize: 48, color: '#ef4444' }} />
    ) : (
      <FileImageOutlined style={{ fontSize: 48, color: '#3b82f6' }} />
    );
  };

  // ✅ UPDATED: Status config với cancelled
  const getStatusConfig = (status: LeaveRequestStatus) => {
    switch(status) {
      case 'pending':
        return { color: '#f59e42', text: 'Đang xử lý' };
      case 'approved':
        return { color: '#10b981', text: 'Đã duyệt' };
      case 'rejected':
        return { color: '#ef4444', text: 'Từ chối' };
      case 'cancelled':
        return { color: '#64748b', text: 'Đã hủy' };
      default:
        return { color: '#64748b', text: 'Không xác định' };
    }
  };

  // ✅ UPDATED: Table columns to work with LeaveRequestDetail
  const columns = [
    {
      title: 'Môn học',
      key: 'subject',
      render: (record: LeaveRequestDetail) => (
        <div>
          <Text strong>{record.className}</Text>
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
      render: (record: LeaveRequestDetail) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined style={{ color: '#64748b' }} />
          <div>
            <Text>{dayjs(record.leaveDate).format('DD/MM/YYYY')}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {convertDayToVietnamese(record.dayOfWeek)}
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
      render: (status: LeaveRequestStatus) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Ngày gửi',
      key: 'submittedDate',
      render: (record: LeaveRequestDetail) => dayjs(record.createdAt).format('DD/MM/YYYY')
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (record: LeaveRequestDetail) => (
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
                onConfirm={() => handleDeleteRequest(record.id.toString())}
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
            // Chỉ hiển thị "Xem" cho đơn đã duyệt/từ chối/đã hủy
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

  // ✅ UPDATED: Statistics calculation
  const totalRequests = leaveRequests.length;
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;
  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length;

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
      padding: "32px 48px" 
    }}>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* ✅ Error Alert */}
      {error && (
        <Alert
          message="Lỗi tải dữ liệu"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

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
        <Space>
          <Button 
            icon={<ReloadOutlined />}
            size="large"
            onClick={() => {
              fetchClasses();
              fetchLeaveRequests();
            }}
            loading={loadingClasses || loadingRequests}
            style={{ borderRadius: 8, height: 48 }}
          >
            Làm mới
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setIsCreateModalVisible(true)}
            disabled={classes.length === 0}
            style={{ 
              borderRadius: 8, 
              height: 48,
              fontSize: 16
            }}
          >
            Tạo đơn nghỉ học
          </Button>
        </Space>
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
              title="Đang xử lý"
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
          📋 Danh sách đơn nghỉ học
        </Title>
        <Table
          dataSource={leaveRequests}
          columns={columns}
          rowKey="id"
          loading={loadingRequests}
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
        loading={submitting}
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
        loading={submitting}
        subjects={subjects}
        preSelectedSubject={editingRequest ? editingRequest.classId.toString() : ''}
        initialValues={editingRequest ? getEditInitialValues(editingRequest) : undefined}
        title="Chỉnh sửa đơn nghỉ học"
      />

      {/* ✅ ENHANCED: View Request Details Modal - Same as Teacher */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span>Chi tiết đơn xin nghỉ học</span>
          </Space>
        }
        open={isViewModalVisible}
        onCancel={() => {
          setIsViewModalVisible(false);
          setSelectedRequest(null);
        }}
        footer={[
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={800}
        style={{ top: 20 }}
      >
        {selectedRequest && (
          <div style={{ padding: '8px 0' }}>
            {/* Student Info */}
            <Card 
              size="small" 
              style={{ marginBottom: 16, background: '#f8fafc' }}
              title={
                <Space>
                  <UserOutlined style={{ color: '#2563eb' }} />
                  <Text strong>Thông tin học sinh</Text>
                </Space>
              }
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary">Họ và tên:</Text>
                  <br />
                  <Text strong style={{ fontSize: 15 }}>{selectedRequest.studentName}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Mã sinh viên:</Text>
                  <br />
                  <Text strong style={{ fontSize: 15 }}>{selectedRequest.studentCode || 'N/A'}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Môn học:</Text>
                  <br />
                  <Space>
                    <BookOutlined style={{ color: '#3b82f6' }} />
                    <Text strong style={{ fontSize: 15 }}>{selectedRequest.className}</Text>
                  </Space>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Tiết học:</Text>
                  <br />
                  <Space>
                    <ClockCircleOutlined style={{ color: '#f59e42' }} />
                    <Text strong style={{ fontSize: 15 }}>Tiết {selectedRequest.timeSlot || 'N/A'}</Text>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Leave Details */}
            <Card 
              size="small" 
              style={{ marginBottom: 16, background: '#fef3c7' }}
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#f59e42' }} />
                  <Text strong>Thông tin nghỉ học</Text>
                </Space>
              }
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary">Ngày nghỉ:</Text>
                  <br />
                  <Text strong style={{ fontSize: 15 }}>
                    {dayjs(selectedRequest.leaveDate).format('DD/MM/YYYY')}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Thứ:</Text>
                  <br />
                  <Text strong style={{ fontSize: 15 }}>
                    {convertDayToVietnamese(selectedRequest.dayOfWeek)}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Tiết học:</Text>
                  <br />
                  <Space>
                    <ClockCircleOutlined style={{ color: '#f59e42' }} />
                    <Text strong style={{ fontSize: 15 }}>Tiết {selectedRequest.timeSlot || 'N/A'}</Text>
                  </Space>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Ngày gửi đơn:</Text>
                  <br />
                  <Text strong style={{ fontSize: 15 }}>
                    {dayjs(selectedRequest.createdAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </Col>
                {selectedRequest.reviewedAt && (
                  <Col span={12}>
                    <Text type="secondary">Ngày xử lý:</Text>
                    <br />
                    <Text strong style={{ fontSize: 15 }}>
                      {dayjs(selectedRequest.reviewedAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </Col>
                )}
                <Col span={24}>
                  <Text type="secondary">Lý do nghỉ học:</Text>
                  <br />
                  <Text style={{ 
                    fontSize: 14,
                    display: 'block',
                    padding: '12px',
                    background: '#fff',
                    borderRadius: 8,
                    marginTop: 8,
                    border: '1px solid #e5e7eb'
                  }}>
                    {selectedRequest.reason}
                  </Text>
                </Col>
              </Row>
            </Card>

            {/* ✅ Evidence File */}
            {selectedRequest.evidenceFileUrl && (
              <Card 
                size="small" 
                style={{ marginBottom: 16 }}
                title={
                  <Space>
                    <FileImageOutlined style={{ color: '#10b981' }} />
                    <Text strong>File minh chứng</Text>
                  </Space>
                }
              >
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  {selectedRequest.evidenceFileUrl.toLowerCase().includes('.pdf') ? (
                    <div>
                      {getFileIcon(selectedRequest.evidenceFileUrl)}
                      <div style={{ marginTop: 16 }}>
                        <Button 
                          type="primary"
                          icon={<EyeOutlined />}
                          onClick={() => window.open(selectedRequest.evidenceFileUrl, '_blank')}
                        >
                          Xem file PDF
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={selectedRequest.evidenceFileUrl}
                      alt="Evidence file"
                      style={{ 
                        maxHeight: 300, 
                        borderRadius: 8,
                        border: '2px solid #e5e7eb'
                      }}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                    />
                  )}
                </div>
              </Card>
            )}

            {/* ✅ Review Notes (if already reviewed) */}
            {selectedRequest.reviewNotes && (
              <Card 
                size="small" 
                style={{ marginBottom: 16 }}
                title={
                  <Space>
                    <FileTextOutlined style={{ color: '#6366f1' }} />
                    <Text strong>Ghi chú từ giáo viên</Text>
                  </Space>
                }
              >
                <Text style={{ 
                  fontSize: 14,
                  display: 'block',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb'
                }}>
                  {selectedRequest.reviewNotes}
                </Text>
                {selectedRequest.reviewerName && (
                  <div style={{ marginTop: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Người duyệt: <Text strong>{selectedRequest.reviewerName}</Text>
                    </Text>
                  </div>
                )}
              </Card>
            )}

            <Divider />

            {/* ✅ Status Display */}
            <div style={{ 
              textAlign: 'center', 
              padding: '24px',
              background: selectedRequest.status === 'approved' ? '#f0fdf4' : 
                         selectedRequest.status === 'rejected' ? '#fef2f2' : 
                         selectedRequest.status === 'pending' ? '#fef3c7' : '#f8fafc',
              borderRadius: 8,
              border: `2px solid ${getStatusConfig(selectedRequest.status).color}`
            }}>
              <Space direction="vertical" size={12}>
                <div style={{ fontSize: 48, color: getStatusConfig(selectedRequest.status).color }}>
                  {selectedRequest.status === 'pending' && <ClockCircleOutlined />}
                  {selectedRequest.status === 'approved' && <CheckCircleOutlined />}
                  {selectedRequest.status === 'rejected' && <CloseCircleOutlined />}
                  {selectedRequest.status === 'cancelled' && <CloseCircleOutlined />}
                </div>
                <Text strong style={{ fontSize: 18, color: getStatusConfig(selectedRequest.status).color }}>
                  {getStatusConfig(selectedRequest.status).text}
                </Text>
                
                {/* ✅ Status-specific messages */}
                {selectedRequest.status === 'pending' && (
                  <Text type="secondary">
                    Đơn của bạn đang chờ giáo viên xem xét và phê duyệt
                  </Text>
                )}
                {selectedRequest.reviewedAt && (
                  <Text type="secondary">
                    Đơn này đã được xử lý vào {dayjs(selectedRequest.reviewedAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                )}
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentReportPage;
