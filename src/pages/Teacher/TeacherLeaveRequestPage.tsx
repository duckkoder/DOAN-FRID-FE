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
  Tooltip,
  Alert,
  Spin,
  Image,
  Divider
} from "antd";
import { 
  EyeOutlined,
  CalendarOutlined,
  FileTextOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  BookOutlined
} from "@ant-design/icons";
import Breadcrumb from "../../components/Breadcrumb";
import dayjs from 'dayjs';
import { 
  getTeacherLeaveRequestsWithStats,
  reviewLeaveRequest,
  batchReviewLeaveRequests,
  type LeaveRequestDetail,
  type TeacherLeaveRequestSummary,
  type TeacherClassLeaveRequestStats,
  type LeaveRequestStatus
} from "../../apis/leaveRequestAPIs/leaveRequest";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Search } = Input;

const TeacherLeaveRequestPage: React.FC = () => {
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isBatchModalVisible, setIsBatchModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestDetail | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | 'all'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [reviewForm] = Form.useForm();
  const [batchForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDetail[]>([]);
  const [summary, setSummary] = useState<TeacherLeaveRequestSummary>({
    totalRequests: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    cancelledCount: 0
  });
  const [classSummary, setClassSummary] = useState<TeacherClassLeaveRequestStats[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbItems = [
    { title: "Trang chủ", href: "/teacher" },
    { title: "Đơn xin nghỉ học" }
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

  // ✅ Fetch data when filters change
  useEffect(() => {
    fetchLeaveRequests();
  }, [statusFilter, subjectFilter]);

  // ✅ Fetch teacher leave requests with statistics
  const fetchLeaveRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const classId = subjectFilter !== 'all' ? parseInt(subjectFilter) : undefined;

      const response = await getTeacherLeaveRequestsWithStats(classId, statusFilter);
      
      
      
      
      
      setLeaveRequests(response.data.leaveRequests);
      setSummary(response.data.summary);
      
      // Chỉ update classSummary khi cần fetch tất cả classes (cả 2 filter đều 'all')
      if (statusFilter === 'all' && subjectFilter === 'all') {
        setClassSummary(response.data.classSummary);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch leave requests:', err);
      const errorMsg = (err as Error).message || 'Không thể tải danh sách đơn xin nghỉ';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Filter data by search text (client-side)
  const filteredData = leaveRequests.filter(request => {
    const matchesSearch = searchText === '' || 
      request.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
      (request.studentCode && request.studentCode.toLowerCase().includes(searchText.toLowerCase()));
    
    return matchesSearch;
  });

  // Get unique classes for filter
  const uniqueClasses = Array.from(
    new Map(
      leaveRequests.map(req => [req.classId, { id: req.classId, name: req.className }])
    ).values()
  );

  const getStatusConfig = (status: LeaveRequestStatus) => {
    switch(status) {
      case 'pending':
        return { color: '#f59e42', text: 'Đang xử lý', icon: <ClockCircleOutlined /> };
      case 'approved':
        return { color: '#10b981', text: 'Đã duyệt', icon: <CheckCircleOutlined /> };
      case 'rejected':
        return { color: '#ef4444', text: 'Từ chối', icon: <CloseCircleOutlined /> };
      default:
        return { color: '#64748b', text: 'Không xác định', icon: <ClockCircleOutlined /> };
    }
  };

  // ✅ Handle view request detail
  const handleViewRequest = (request: LeaveRequestDetail) => {
    setSelectedRequest(request);
    setIsViewModalVisible(true);
    reviewForm.resetFields();
  };

  // ✅ Handle approval from detail modal
  const handleApprovalFromModal = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;

    try {
      const values = await reviewForm.validateFields();
      
      // Validate: từ chối phải có lý do
      if (action === 'reject' && !values.review_notes?.trim()) {
        message.error('Vui lòng nhập lý do từ chối!');
        return;
      }

      setSubmitting(true);
      
      message.loading({ 
        content: action === 'approve' ? 'Đang duyệt đơn...' : 'Đang từ chối đơn...', 
        key: 'reviewRequest',
        duration: 0
      });

      await reviewLeaveRequest(selectedRequest.id, {
        status: action === 'approve' ? 'approved' : 'rejected',
        review_notes: values.review_notes
      });

      message.success({ 
        content: action === 'approve' 
          ? '✅ Đã duyệt đơn xin nghỉ thành công!' 
          : '✅ Đã từ chối đơn xin nghỉ!',
        key: 'reviewRequest',
        duration: 3
      });

      // Refresh data
      await fetchLeaveRequests();
      
      setIsViewModalVisible(false);
      reviewForm.resetFields();
      setSelectedRequest(null);
    } catch (err: unknown) {
      if ('errorFields' in (err as object)) {
        return;
      }

      console.error('Failed to review leave request:', err);
      
      let errorMessage = 'Không thể xử lý đơn. Vui lòng thử lại!';
      
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
        key: 'reviewRequest',
        duration: 5
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Handle batch review
  const handleOpenBatchModal = (action: 'approve' | 'reject') => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất một đơn để xử lý!');
      return;
    }

    setApprovalAction(action);
    setIsBatchModalVisible(true);
    batchForm.resetFields();
  };

  // ✅ Submit batch review
  const handleSubmitBatchReview = async (values: { note?: string }) => {
    setSubmitting(true);
    
    try {
      message.loading({ 
        content: `Đang xử lý ${selectedRowKeys.length} đơn...`, 
        key: 'batchReview',
        duration: 0
      });

      const response = await batchReviewLeaveRequests({
        request_ids: selectedRowKeys as number[],
        status: approvalAction === 'approve' ? 'approved' : 'rejected',
        review_notes: values.note
      });

      const { successCount, failedCount } = response.data;

      if (failedCount > 0) {
        message.warning({ 
          content: `Đã xử lý ${successCount} đơn thành công, ${failedCount} đơn thất bại!`,
          key: 'batchReview',
          duration: 5
        });
      } else {
        message.success({ 
          content: `✅ Đã xử lý ${successCount} đơn thành công!`,
          key: 'batchReview',
          duration: 3
        });
      }

      // Refresh data
      await fetchLeaveRequests();
      
      setIsBatchModalVisible(false);
      batchForm.resetFields();
      setSelectedRowKeys([]);
    } catch (err: unknown) {
      console.error('Failed to batch review:', err);
      message.error({ 
        content: (err as Error).message || 'Không thể xử lý hàng loạt. Vui lòng thử lại!',
        key: 'batchReview',
        duration: 5
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSubjectFilter('all');
    setSearchText('');
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

  // ✅ Table columns
  const columns = [
    {
      title: 'Học sinh',
      key: 'student',
      width: 150,
      fixed: 'left' as const,
      render: (record: LeaveRequestDetail) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{record.studentName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.studentCode || 'N/A'}
          </Text>
        </div>
      )
    },
    {
      title: 'Môn học',
      key: 'class',
      width: 140,
      ellipsis: true,
      render: (record: LeaveRequestDetail) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{record.className}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Tiết: {record.timeSlot || 'N/A'}
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
        <Tooltip title={reason}>
          <Text style={{ fontSize: 13 }}>
            {reason}
          </Text>
        </Tooltip>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: LeaveRequestStatus) => {
        const config = getStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => (
        <Text style={{ fontSize: 12 }}>
          {dayjs(date).format('DD/MM/YYYY')}
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {dayjs(date).format('HH:mm')}
          </Text>
        </Text>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      fixed: 'right' as const,
      render: (record: LeaveRequestDetail) => (
        <Tooltip title="Xem chi tiết">
          <Button 
            type="primary" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewRequest(record)}
          >
            Chi tiết
          </Button>
        </Tooltip>
      )
    }
  ];

  // ✅ Row selection config
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: LeaveRequestDetail) => ({
      disabled: record.status !== 'pending',
      name: record.id.toString(),
    }),
  };

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
          message="Lỗi tải dữ liệu"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Header */}
      <Title level={2} style={{ marginTop: 16, marginBottom: 24 }}>
        📋 Quản lý đơn xin nghỉ
      </Title>

      {/* Search and Filters */}
      <Card style={{
        borderRadius: 12,
        marginBottom: 16
      }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={8} lg={6}>
            <Search
              placeholder="Tìm theo tên, mã học sinh..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={setSearchText}
              enterButton={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Select
              placeholder="Trạng thái"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">Tất cả trạng thái</Select.Option>
              <Select.Option value="pending">Đang xử lý</Select.Option>
              <Select.Option value="approved">Đã duyệt</Select.Option>
              <Select.Option value="rejected">Từ chối</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Select
              placeholder="Lớp học"
              value={subjectFilter}
              onChange={setSubjectFilter}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">Tất cả lớp học</Select.Option>
              {uniqueClasses.map(cls => (
                <Select.Option key={cls.id} value={cls.id.toString()}>
                  {cls.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={8} lg={10} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleClearFilters}
              >
                Đặt lại
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchLeaveRequests}
                loading={loading}
                type="primary"
              >
                Làm mới
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }} loading={loading}>
            <Statistic
              title="Tổng đơn"
              value={summary.totalRequests}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }} loading={loading}>
            <Statistic
              title="Đang chờ"
              value={summary.pendingCount}
              valueStyle={{ color: '#f59e42' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }} loading={loading}>
            <Statistic
              title="Đã duyệt"
              value={summary.approvedCount}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }} loading={loading}>
            <Statistic
              title="Từ chối"
              value={summary.rejectedCount}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Per-Class Summary */}
      {classSummary.length > 0 && (
        <Card 
          title="📊 Thống kê theo lớp"
          style={{
            borderRadius: 12,
            marginBottom: 16
          }}
          loading={loading}
          size="small"
        >
          <Row gutter={[12, 12]}>
            {classSummary.map(cls => (
              <Col xs={24} sm={12} md={8} lg={6} key={cls.classId}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Text strong style={{ fontSize: 13 }}>{cls.className}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space size={4} wrap>
                      <Tag color="blue" style={{ margin: 2 }}>Tổng: {cls.totalRequests}</Tag>
                      <Tag color="orange" style={{ margin: 2 }}>Chờ: {cls.pendingCount}</Tag>
                      <Tag color="green" style={{ margin: 2 }}>Duyệt: {cls.approvedCount}</Tag>
                      <Tag color="red" style={{ margin: 2 }}>Từ chối: {cls.rejectedCount}</Tag>
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Batch Actions */}
      {selectedRowKeys.length > 0 && (
        <Card 
          style={{
            borderRadius: 12,
            marginBottom: 16,
            background: '#fef3c7',
            borderColor: '#fde68a'
          }}
          size="small"
        >
          <Space wrap>
            <Text strong>Đã chọn {selectedRowKeys.length} đơn</Text>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              style={{ background: '#10b981', borderColor: '#10b981' }}
              onClick={() => handleOpenBatchModal('approve')}
              loading={submitting}
              size="small"
            >
              Duyệt
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleOpenBatchModal('reject')}
              loading={submitting}
              size="small"
            >
              Từ chối
            </Button>
            <Button onClick={() => setSelectedRowKeys([])} size="small">
              Bỏ chọn
            </Button>
          </Space>
        </Card>
      )}

      {/* Leave Requests Table */}
      <Card style={{
        borderRadius: 12
      }}>
        <Divider style={{ margin: '0 0 16px 0' }} orientation="left">
          📊 Danh sách đơn xin nghỉ
        </Divider>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          pagination={{
            current: 1,
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} đơn`,
            pageSizeOptions: ["10", "20", "50", "100"],
            responsive: true
          }}
          scroll={{ x: 900 }}
          size="middle"
          locale={{
            emptyText: loading ? <Spin /> : "Không có đơn xin nghỉ nào"
          }}
        />
      </Card>

      {/* View Request Details Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#2563eb', fontSize: 18 }} />
            <span>Chi tiết đơn xin nghỉ</span>
          </Space>
        }
        open={isViewModalVisible}
        onCancel={() => {
          setIsViewModalVisible(false);
          reviewForm.resetFields();
          setSelectedRequest(null);
        }}
        footer={null}
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
                  <Text strong style={{ fontSize: 13 }}>Thông tin học sinh</Text>
                </Space>
              }
            >
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Họ và tên:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>{selectedRequest.studentName}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Mã sinh viên:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>{selectedRequest.studentCode || 'N/A'}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Môn học:</Text>
                  <br />
                  <Space>
                    <BookOutlined style={{ color: '#3b82f6' }} />
                    <Text strong style={{ fontSize: 14 }}>{selectedRequest.className}</Text>
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
                  <Text strong style={{ fontSize: 13 }}>Thông tin nghỉ học</Text>
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
                  <Text type="secondary" style={{ fontSize: 12 }}>Tiết học:</Text>
                  <br />
                  <Space>
                    <ClockCircleOutlined style={{ color: '#f59e42' }} />
                    <Text strong style={{ fontSize: 14 }}>Tiết {selectedRequest.timeSlot || 'N/A'}</Text>
                  </Space>
                </Col>
                <Col xs={12} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Ngày gửi đơn:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>
                    {dayjs(selectedRequest.createdAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </Col>
                {selectedRequest.reviewedAt && (
                  <Col xs={12} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Ngày xử lý:</Text>
                    <br />
                    <Text strong style={{ fontSize: 14 }}>
                      {dayjs(selectedRequest.reviewedAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </Col>
                )}
                <Col span={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Lý do nghỉ học:</Text>
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

            {/* Evidence File */}
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
                      fallback="../assets/fallback.png"
                    />
                  )}
                </div>
              </Card>
            )}

            {/* Review Notes (if already reviewed) */}
            {selectedRequest.reviewNotes && (
              <Card 
                size="small" 
                style={{ marginBottom: 16 }}
                title={
                  <Space>
                    <FileTextOutlined style={{ color: '#6366f1' }} />
                    <Text strong>Ghi chú phê duyệt</Text>
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
                      Người xử lý: <Text strong>{selectedRequest.reviewerName}</Text>
                    </Text>
                  </div>
                )}
              </Card>
            )}

            <Divider style={{ margin: '12px 0' }} />

            {/* ✅ Review Form (only for pending status) */}
            {selectedRequest.status === 'pending' && (
              <Form
                form={reviewForm}
                layout="vertical"
              >
                <Form.Item
                  label={
                    <Text strong style={{ fontSize: 13 }}>
                      Ghi chú phê duyệt
                    </Text>
                  }
                  name="review_notes"
                >
                  <TextArea
                    rows={3}
                    placeholder="Nhập ghi chú cho học sinh (không bắt buộc)..."
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Row gutter={12}>
                    <Col xs={12} sm={12}>
                      <Button 
                        type="primary"
                        block
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleApprovalFromModal('approve')}
                        loading={submitting}
                        style={{
                          background: '#10b981',
                          borderColor: '#10b981',
                          fontWeight: 600
                        }}
                      >
                        Duyệt đơn
                      </Button>
                    </Col>
                    <Col xs={12} sm={12}>
                      <Button 
                        danger
                        block
                        icon={<CloseCircleOutlined />}
                        onClick={() => handleApprovalFromModal('reject')}
                        loading={submitting}
                        style={{
                          fontWeight: 600
                        }}
                      >
                        Từ chối
                      </Button>
                    </Col>
                  </Row>
                </Form.Item>
              </Form>
            )}

            {/* Show status if already reviewed */}
            {selectedRequest.status !== 'pending' && (
              <div style={{ 
                textAlign: 'center', 
                padding: '16px',
                background: selectedRequest.status === 'approved' ? '#f0fdf4' : '#fef2f2',
                borderRadius: 8,
                border: `2px solid ${selectedRequest.status === 'approved' ? '#10b981' : '#ef4444'}`
              }}>
                <Space direction="vertical" size={8}>
                  {getStatusConfig(selectedRequest.status).icon && (
                    <div style={{ fontSize: 36 }}>
                      {React.cloneElement(getStatusConfig(selectedRequest.status).icon, {
                        style: { 
                          fontSize: 36, 
                          color: getStatusConfig(selectedRequest.status).color 
                        }
                      })}
                    </div>
                  )}
                  <Text strong style={{ fontSize: 16, color: getStatusConfig(selectedRequest.status).color }}>
                    {getStatusConfig(selectedRequest.status).text}
                  </Text>
                  {selectedRequest.reviewedAt && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Đã xử lý vào {dayjs(selectedRequest.reviewedAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  )}
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Batch Review Modal */}
      <Modal
        title={
          <Space>
            {approvalAction === 'approve' ? (
              <CheckCircleOutlined style={{ color: '#10b981', fontSize: 18 }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 18 }} />
            )}
            <span>
              {approvalAction === 'approve' 
                ? `Duyệt ${selectedRowKeys.length} đơn` 
                : `Từ chối ${selectedRowKeys.length} đơn`}
            </span>
          </Space>
        }
        open={isBatchModalVisible}
        onCancel={() => {
          setIsBatchModalVisible(false);
          batchForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
          <Text strong style={{ fontSize: 13 }}>Bạn đang xử lý {selectedRowKeys.length} đơn xin nghỉ</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Ghi chú sẽ được áp dụng cho tất cả các đơn đã chọn
          </Text>
        </div>

        <Form
          form={batchForm}
          layout="vertical"
          onFinish={handleSubmitBatchReview}
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
                  ? "Nhập ghi chú chung cho các đơn (không bắt buộc)..."
                  : "Nhập lý do từ chối chung..."
              }
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={submitting}
                style={{
                  background: approvalAction === 'approve' ? '#10b981' : '#ef4444',
                  borderColor: approvalAction === 'approve' ? '#10b981' : '#ef4444'
                }}
              >
                {approvalAction === 'approve' 
                  ? `Duyệt ${selectedRowKeys.length} đơn` 
                  : `Từ chối ${selectedRowKeys.length} đơn`}
              </Button>
              <Button onClick={() => setIsBatchModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherLeaveRequestPage;