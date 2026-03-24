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
import { useToast } from "../../context/ToastContext";
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
  const toast = useToast();
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
    { title: "Trang chủ", href: "/student" },
    { title: "Xin nghỉ" }
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
      
      setClasses(response.data.classes);
    } catch (err: unknown) {
      console.error('Failed to fetch classes:', err);
      const errorMsg = (err as Error).message || 'Không thể tải danh sách lớp';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoadingClasses(false);
    }
  };

  // ✅ UPDATED: Fetch leave requests - Store original API data
  const fetchLeaveRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await getLeaveRequests();
      
      
      // ✅ Store original API data directly
      setLeaveRequests(response.data.leaveRequests);
    } catch (err: unknown) {
      console.error('Failed to fetch leave requests:', err);
      toast.error((err as Error).message || 'Không thể tải yêu cầu xin nghỉ');
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
    
    
    setSubmitting(true);
    try {
      let evidenceFileId: number | null = null;

      // Step 1: Upload evidence file if exists
      if (values.evidenceFile && values.evidenceFile.length > 0) {
        const file = values.evidenceFile[0].originFileObj;
        
        if (file) {
          try {
            const uploadResponse = await uploadDocument(file, (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                // Upload progress: ${percentCompleted}%
              }
            });

            if (uploadResponse.success && uploadResponse.data.file_id) {
              evidenceFileId = uploadResponse.data.file_id;
              toast.success('Đả tải lên tài liệu minh chứng thành công!');
            } else {
              throw new Error(uploadResponse.message || 'Tại file thất bại');
            }
          } catch (uploadErr: unknown) {
            toast.error(`File upload error: ${(uploadErr as Error).message || 'Please try again'}`);
            throw new Error(`File upload failed: ${(uploadErr as Error).message}`);
          }
        }
      }

      // Step 2: Create leave request
      const payload: CreateLeaveRequestPayload = {
        class_id: parseInt(values.subject),
        reason: values.reason,
        leave_date: values.date.toISOString(),
        day_of_week: values.dayOfWeek,
        time_slot: values.timeSlot,
        evidence_file_id: evidenceFileId
      };

      

      const response = await createLeaveRequest(payload);

      if (response.success) {
        toast.success('Đã gửi yêu cầu xin nghỉ thành công! Giáo viên sẽ xem xét sớm nhất có thể.');
        
        // Refresh leave requests list
        await fetchLeaveRequests();
        
        setIsCreateModalVisible(false);
      } else {
        throw new Error(response.message || 'Gửi yêu cầu thất bại');
      }

    } catch (err: unknown) {
      console.error('Failed to create leave request:', err);
      
      // ✅ Better error message
      let errorMessage = 'Không thể gửi yêu cầu. Vui lòng thử lại!';
      
      const errorObj = err as Error;
      if (errorObj.message) {
        if (errorObj.message.includes('Upload file') || errorObj.message.includes('File upload')) {
          errorMessage = errorObj.message;
        } else if (errorObj.message.includes('network') || errorObj.message.includes('timeout')) {
          errorMessage = '⚠️ Network connection error. Please check and try again!';
        } else if (errorObj.message.includes('401') || errorObj.message.includes('unauthorized')) {
          errorMessage = '🔒 Session expired. Please log in again!';
        } else {
          errorMessage = `❌ ${errorObj.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ IMPROVED: Handle edit leave request with better error handling
  const handleEditRequest = async (values: any) => {
    
    
    if (!editingRequest) return;

    setSubmitting(true);
    try {
      let evidenceFileId: number | undefined = undefined;

      // Upload new evidence file if changed
      if (values.evidenceFile && values.evidenceFile.length > 0) {
        const file = values.evidenceFile[0].originFileObj;
        
        if (file) {
          try {
            const uploadResponse = await uploadDocument(file, (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                // Upload progress: ${percentCompleted}%
              }
            });

            if (uploadResponse.success && uploadResponse.data.file_id) {
              evidenceFileId = uploadResponse.data.file_id;
              toast.success('Đã tải lên tài liệu minh chứng thành công!');
            } else {
              throw new Error(uploadResponse.message || 'Tải file thất bại');
            }
          } catch (uploadErr: unknown) {
            toast.error(`File upload error: ${(uploadErr as Error).message || 'Please try again'}`);
            throw new Error(`File upload failed: ${(uploadErr as Error).message}`);
          }
        }
      }

      const payload: UpdateLeaveRequestPayload = {
        reason: values.reason,
        leave_date: values.date.toISOString(),
        day_of_week: values.dayOfWeek,
        time_slot: values.timeSlot,
        ...(evidenceFileId && { evidence_file_id: evidenceFileId })
      };

      const response = await updateLeaveRequest(editingRequest.id, payload);

      if (response.success) {
        toast.success('Đã cập nhật yêu cầu xin nghỉ thành công!');
        
        await fetchLeaveRequests();
        
        setIsEditModalVisible(false);
        setEditingRequest(null);
      } else {
        throw new Error(response.message || 'Cập nhật thất bại');
      }

    } catch (err: unknown) {
      console.error('Failed to update leave request:', err);
      
      let errorMessage = 'Không thể cập nhật yêu cầu. Vui lòng thử lại!';
      
      const errorObj = err as Error;
      if (errorObj.message) {
        if (errorObj.message.includes('Upload file') || errorObj.message.includes('File upload')) {
          errorMessage = errorObj.message;
        } else if (errorObj.message.includes('network') || errorObj.message.includes('timeout')) {
          errorMessage = '⚠️ Network connection error. Please check and try again!';
        } else if (errorObj.message.includes('401') || errorObj.message.includes('unauthorized')) {
          errorMessage = '🔒 Session expired. Please log in again!';
        } else {
          errorMessage = `❌ ${errorObj.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ IMPROVED: Handle delete leave request with better error handling
  const handleDeleteRequest = async (requestId: string) => {
    try {
      await cancelLeaveRequest(parseInt(requestId));
      
      toast.success('Đã hủy yêu cầu xin nghỉ thành công!');
      
      await fetchLeaveRequests();
    } catch (err: unknown) {
      console.error('Failed to delete leave request:', err);
      
      let errorMessage = 'Không thể hủy yêu cầu. Vui lòng thử lại!';
      
      const errorObj = err as Error;
      if (errorObj.message) {
        if (errorObj.message.includes('network') || errorObj.message.includes('timeout')) {
          errorMessage = '⚠️ Network connection error. Please check and try again!';
        } else if (errorObj.message.includes('401') || errorObj.message.includes('unauthorized')) {
          errorMessage = '🔒 Session expired. Please log in again!';
        } else {
          errorMessage = `❌ ${errorObj.message}`;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const getDayOfWeekLabel = (dayValue: string) => {
    const dayMap: { [key: string]: string } = {
      'Monday': 'Monday',
      'Tuesday': 'Tuesday',
      'Wednesday': 'Wednesday',
      'Thursday': 'Thursday',
      'Friday': 'Friday',
      'Saturday': 'Saturday',
      'Sunday': 'Sunday'
    };
    return dayMap[dayValue] || dayValue;
  };

  const getDayValue = (dayLabel: string) => {
    const dayMap: { [key: string]: string } = {
      'Monday': 'Monday',
      'Tuesday': 'Tuesday',
      'Wednesday': 'Wednesday',
      'Thursday': 'Thursday',
      'Friday': 'Friday',
      'Saturday': 'Saturday',
      'Sunday': 'Sunday'
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
        return { color: '#f59e42', text: 'Chờ duyệt' };
      case 'approved':
        return { color: '#10b981', text: 'Đã duyệt' };
      case 'rejected':
        return { color: '#ef4444', text: 'Từ chối' };
      case 'cancelled':
        return { color: '#64748b', text: 'Đã hủy' };
      default:
        return { color: '#64748b', text: 'Không rõ' };
    }
  };

  // ✅ UPDATED: Table columns to work with LeaveRequestDetail
  const columns = [
    {
      title: 'Môn học',
      key: 'subject',
      width: 140,
      fixed: 'left' as const,
      render: (record: LeaveRequestDetail) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{record.className}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.timeSlot}
          </Text>
        </div>
      )
    },
    {
      title: 'Ngày nghỉ',
      key: 'date',
      width: 120,
      render: (record: LeaveRequestDetail) => (
        <div>
          <Text style={{ fontSize: 13 }}>{dayjs(record.leaveDate).format('DD/MM/YYYY')}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {convertDayToVietnamese(record.dayOfWeek)}
          </Text>
        </div>
      )
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      width: 160,
      ellipsis: true,
      render: (reason: string) => (
        <Text style={{ fontSize: 13 }}>
          {reason}
        </Text>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: LeaveRequestStatus) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Ngày gửi',
      key: 'submittedDate',
      width: 100,
      render: (record: LeaveRequestDetail) => {
        const parsedDate = dayjs(record.createdAt);
        return (
          <Text style={{ fontSize: 12 }}>
            {parsedDate.isValid() ? parsedDate.format('DD/MM/YYYY') : 'N/A'}
          </Text>
        );
      }
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 130,
      fixed: 'right' as const,
      render: (record: LeaveRequestDetail) => (
        <Space size={4} wrap>
          {record.status === 'pending' ? (
            // Show full actions for pending requests
            <>
              <Button 
                type="link" 
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewRequest(record)}
                style={{ padding: '0 4px' }}
              />
              <Button 
                type="link" 
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditClick(record)}
                style={{ padding: '0 4px' }}
              />
              <Popconfirm
                title="Xác nhận xóa"
                description="Bạn có chắc chắn muốn xóa yêu cầu này?"
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
                  style={{ padding: '0 4px' }}
                />
              </Popconfirm>
            </>
          ) : (
            // Only show "View" for approved/rejected/cancelled requests
            <Button 
              type="primary" 
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewRequest(record)}
            >
              Chi tiết
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
      padding: "0 24px 24px" 
    }}>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* ✅ Error Alert */}
      {error && (
        <Alert
          message="Lỗi khi tải dữ liệu"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Header */}
      <Row gutter={[16, 12]} align="middle" style={{ marginBottom: 16, marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Title level={2} style={{ marginBottom: 0 }}>
            📝 Đơn Xin Nghỉ
          </Title>
        </Col>
        <Col xs={24} md={12}>
          <Row gutter={[8, 8]}>
            <Col xs={12} md={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchClasses();
                  fetchLeaveRequests();
                }}
                loading={loadingClasses || loadingRequests}
                style={{ width: '100%' }}
              >
                Làm mới
              </Button>
            </Col>
            <Col xs={12} md={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalVisible(true)}
                disabled={classes.length === 0}
                style={{ width: '100%' }}
              >
                Tạo đơn xin nghỉ
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic
              title="Tổng yêu cầu"
              value={totalRequests}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic
              title="Chờ duyệt"
              value={pendingCount}
              valueStyle={{ color: '#f59e42' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic
              title="Được duyệt"
              value={approvedCount}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic
              title="Từ chối"
              value={rejectedCount}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Leave Requests Table */}
      <Card style={{
        borderRadius: 12
      }}>
        <Divider style={{ margin: '0 0 16px 0' }} orientation="left">
          📋 Danh sách Xin nghỉ
        </Divider>
        <Table
          dataSource={leaveRequests}
          columns={columns}
          rowKey="id"
          loading={loadingRequests}
          pagination={{
            current: 1,
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} yêu cầu`,
            pageSizeOptions: ["10", "20", "50"],
            responsive: true
          }}
          scroll={{ x: 750 }}
          size="middle"
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
        title="Chỉnh sửa đơn xin nghỉ"
      />

      {/* ✅ ENHANCED: View Request Details Modal - Same as Teacher */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#2563eb', fontSize: 18 }} />
            <span>Chi tiết Đơn Xin Nghỉ</span>
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
        width={700}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {selectedRequest && (
          <div style={{ padding: '8px 0' }}>
            {/* Student Info */}
            <Card 
              size="small" 
              style={{ marginBottom: 12, background: '#f8fafc' }}
              title={
                <Space>
                  <UserOutlined style={{ color: '#2563eb' }} />
                  <Text strong style={{ fontSize: 13 }}>Thông tin Sinh viên</Text>
                </Space>
              }
            >
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Họ tên:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>{selectedRequest.studentName}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Mã SV:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>{selectedRequest.studentCode || 'N/A'}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Lớp:</Text>
                  <br />
                  <Space>
                    <BookOutlined style={{ color: '#3b82f6' }} />
                    <Text strong style={{ fontSize: 14 }}>{selectedRequest.className}</Text>
                  </Space>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Tiết học:</Text>
                  <br />
                  <Space>
                    <ClockCircleOutlined style={{ color: '#f59e42' }} />
                    <Text strong style={{ fontSize: 14 }}>Tiết {selectedRequest.timeSlot || 'N/A'}</Text>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Leave Details */}
            <Card 
              size="small" 
              style={{ marginBottom: 12, background: '#fef3c7' }}
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#f59e42' }} />
                  <Text strong style={{ fontSize: 13 }}>Thông tin Nghỉ</Text>
                </Space>
              }
            >
              <Row gutter={[12, 12]}>
                <Col xs={12} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Ngày nghỉ:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>
                    {dayjs(selectedRequest.leaveDate).format('DD/MM/YYYY')}
                  </Text>
                </Col>
                <Col xs={12} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Thứ:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>
                    {convertDayToVietnamese(selectedRequest.dayOfWeek)}
                  </Text>
                </Col>
                <Col xs={12} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Tiết:</Text>
                  <br />
                  <Space>
                    <ClockCircleOutlined style={{ color: '#f59e42' }} />
                    <Text strong style={{ fontSize: 14 }}>Tiết {selectedRequest.timeSlot || 'N/A'}</Text>
                  </Space>
                </Col>
                <Col xs={12} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Ngày gửi:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>
                    {dayjs(selectedRequest.createdAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </Col>
                {selectedRequest.reviewedAt && (
                  <Col xs={12} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Ngày duyệt:</Text>
                    <br />
                    <Text strong style={{ fontSize: 14 }}>
                      {dayjs(selectedRequest.reviewedAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </Col>
                )}
                <Col span={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Lý do nghỉ:</Text>
                  <br />
                  <Text style={{ 
                    fontSize: 13,
                    display: 'block',
                    padding: '10px',
                    background: '#fff',
                    borderRadius: 8,
                    marginTop: 6,
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
                style={{ marginBottom: 12 }}
                title={
                  <Space>
                    <FileImageOutlined style={{ color: '#10b981' }} />
                    <Text strong style={{ fontSize: 13 }}>Tài liệu minh chứng</Text>
                  </Space>
                }
              >
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  {selectedRequest.evidenceFileUrl.toLowerCase().includes('.pdf') ? (
                    <div>
                      {getFileIcon(selectedRequest.evidenceFileUrl)}
                      <div style={{ marginTop: 12 }}>
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
                        maxHeight: 250, 
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
                style={{ marginBottom: 12 }}
                title={
                  <Space>
                    <FileTextOutlined style={{ color: '#6366f1' }} />
                    <Text strong style={{ fontSize: 13 }}>Ghi chú của Giáo viên</Text>
                  </Space>
                }
              >
                <Text style={{ 
                  fontSize: 13,
                  display: 'block',
                  padding: '10px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb'
                }}>
                  {selectedRequest.reviewNotes}
                </Text>
                {selectedRequest.reviewerName && (
                  <div style={{ marginTop: 10 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Đã duyệt bởi: <Text strong>{selectedRequest.reviewerName}</Text>
                    </Text>
                  </div>
                )}
              </Card>
            )}

            <Divider style={{ margin: '12px 0' }} />

            {/* ✅ Status Display */}
            <div style={{ 
              textAlign: 'center', 
              padding: '16px',
              background: selectedRequest.status === 'approved' ? '#f0fdf4' : 
                         selectedRequest.status === 'rejected' ? '#fef2f2' : 
                         selectedRequest.status === 'pending' ? '#fef3c7' : '#f8fafc',
              borderRadius: 8,
              border: `2px solid ${getStatusConfig(selectedRequest.status).color}`
            }}>
              <Space direction="vertical" size={8}>
                <div style={{ fontSize: 36, color: getStatusConfig(selectedRequest.status).color }}>
                  {selectedRequest.status === 'pending' && <ClockCircleOutlined />}
                  {selectedRequest.status === 'approved' && <CheckCircleOutlined />}
                  {selectedRequest.status === 'rejected' && <CloseCircleOutlined />}
                  {selectedRequest.status === 'cancelled' && <CloseCircleOutlined />}
                </div>
                <Text strong style={{ fontSize: 16, color: getStatusConfig(selectedRequest.status).color }}>
                  {getStatusConfig(selectedRequest.status).text}
                </Text>
                
                {/* ✅ Status-specific messages */}
                {selectedRequest.status === 'pending' && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Yêu cầu đang chờ giáo viên xem xét và phê duyệt
                  </Text>
                )}
                {selectedRequest.reviewedAt && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Đã duyệt vào {dayjs(selectedRequest.reviewedAt).format('DD/MM/YYYY HH:mm')}
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
