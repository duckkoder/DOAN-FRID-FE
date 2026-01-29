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
  Divider,
  Collapse
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
  BookOutlined,
  DownOutlined
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
    { title: "Home", href: "/teacher" },
    { title: "Leave Requests" }
  ];

  // ✅ Convert English day to Vietnamese
  const convertDayToVietnamese = (englishDay: string): string => {
    const dayMap: { [key: string]: string } = {
      'Monday': 'Monday',
      'Tuesday': 'Tuesday', 
      'Wednesday': 'Wednesday',
      'Thursday': 'Thursday',
      'Friday': 'Friday',
      'Saturday': 'Saturday',
      'Sunday': 'Sunday'
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
      const errorMsg = (err as Error).message || 'Could not load leave requests';
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
        return { color: '#f59e42', text: 'Pending', icon: <ClockCircleOutlined /> };
      case 'approved':
        return { color: '#10b981', text: 'Approved', icon: <CheckCircleOutlined /> };
      case 'rejected':
        return { color: '#ef4444', text: 'Rejected', icon: <CloseCircleOutlined /> };
      default:
        return { color: '#64748b', text: 'Unknown', icon: <ClockCircleOutlined /> };
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
        message.error('Please enter a rejection reason!');
        return;
      }

      setSubmitting(true);
      
      message.loading({ 
        content: action === 'approve' ? 'Approving request...' : 'Rejecting request...', 
        key: 'reviewRequest',
        duration: 0
      });

      await reviewLeaveRequest(selectedRequest.id, {
        status: action === 'approve' ? 'approved' : 'rejected',
        review_notes: values.review_notes
      });

      message.success({ 
        content: action === 'approve' 
          ? '✅ Leave request approved successfully!' 
          : '✅ Leave request rejected!',
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
      
      let errorMessage = 'Could not process request. Please try again!';
      
      const errorObj = err as Error;
      if (errorObj.message) {
        if (errorObj.message.includes('network') || errorObj.message.includes('timeout')) {
          errorMessage = '⚠️ Network error. Please check and try again!';
        } else if (errorObj.message.includes('401') || errorObj.message.includes('unauthorized')) {
          errorMessage = '🔒 Session expired. Please login again!';
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
      message.warning('Please select at least one request to process!');
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
        content: `Processing ${selectedRowKeys.length} requests...`, 
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
          content: `Processed ${successCount} requests successfully, ${failedCount} failed!`,
          key: 'batchReview',
          duration: 5
        });
      } else {
        message.success({ 
          content: `✅ Processed ${successCount} requests successfully!`,
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
        content: (err as Error).message || 'Could not batch process. Please try again!',
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
      title: 'Student',
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
      title: 'Subject',
      key: 'class',
      width: 140,
      ellipsis: true,
      render: (record: LeaveRequestDetail) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{record.className}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Period: {record.timeSlot || 'N/A'}
          </Text>
        </div>
      )
    },
    {
      title: 'Leave Date',
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
      title: 'Reason',
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
      title: 'Status',
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
      title: 'Submitted',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => {
        const parsedDate = dayjs(date);
        const isValidDate = parsedDate.isValid();
        return (
          <Text style={{ fontSize: 12 }}>
            {isValidDate ? parsedDate.format('DD/MM/YYYY') : 'N/A'}
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {isValidDate ? parsedDate.format('HH:mm') : ''}
            </Text>
          </Text>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      fixed: 'right' as const,
      render: (record: LeaveRequestDetail) => (
        <Tooltip title="View details">
          <Button 
            type="primary" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewRequest(record)}
          >
            Details
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
          message="Error loading data"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Header */}
      <Title level={2} style={{ marginTop: 16, marginBottom: 24 }}>
        📋 Leave Request Management
      </Title>

      {/* Search and Filters */}
      <Card style={{
        borderRadius: 12,
        marginBottom: 16
      }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={8} lg={6}>
            <Search
              placeholder="Search by name, student code..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={setSearchText}
              enterButton={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Select
              placeholder="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">All Statuses</Select.Option>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="approved">Approved</Select.Option>
              <Select.Option value="rejected">Rejected</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Select
              placeholder="Class"
              value={subjectFilter}
              onChange={setSubjectFilter}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">All Classes</Select.Option>
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
                Reset
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchLeaveRequests}
                loading={loading}
                type="primary"
              >
                Refresh
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
              title="Total Requests"
              value={summary.totalRequests}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }} loading={loading}>
            <Statistic
              title="Pending"
              value={summary.pendingCount}
              valueStyle={{ color: '#f59e42' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }} loading={loading}>
            <Statistic
              title="Approved"
              value={summary.approvedCount}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }} loading={loading}>
            <Statistic
              title="Rejected"
              value={summary.rejectedCount}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Per-Class Summary - Collapsible */}
      {classSummary.length > 0 && (
        <Collapse
          style={{ marginBottom: 16, borderRadius: 12 }}
          items={[
            {
              key: '1',
              label: (
                <Space>
                  <span>📊 Statistics by Class</span>
                  <Tag color="blue">{classSummary.filter(c => c.totalRequests > 0).length} classes with requests</Tag>
                </Space>
              ),
              children: (
                <Row gutter={[12, 12]}>
                  {classSummary
                    .filter(cls => cls.totalRequests > 0) // Chỉ hiển thị lớp có đơn
                    .sort((a, b) => b.pendingCount - a.pendingCount) // Ưu tiên lớp có đơn chờ duyệt
                    .slice(0, 12) // Giới hạn 12 lớp đầu tiên
                    .map(cls => (
                      <Col xs={24} sm={12} md={8} lg={6} key={cls.classId}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                          <Text strong style={{ fontSize: 13 }}>{cls.className}</Text>
                          <div style={{ marginTop: 8 }}>
                            <Space size={4} wrap>
                              <Tag color="blue" style={{ margin: 2 }}>Total: {cls.totalRequests}</Tag>
                              <Tag color="orange" style={{ margin: 2 }}>Pending: {cls.pendingCount}</Tag>
                              <Tag color="green" style={{ margin: 2 }}>Approved: {cls.approvedCount}</Tag>
                              <Tag color="red" style={{ margin: 2 }}>Rejected: {cls.rejectedCount}</Tag>
                            </Space>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  {classSummary.filter(cls => cls.totalRequests > 0).length > 12 && (
                    <Col span={24}>
                      <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                        ... and {classSummary.filter(cls => cls.totalRequests > 0).length - 12} more classes. Use the "Class" filter to view details.
                      </Text>
                    </Col>
                  )}
                  {classSummary.filter(cls => cls.totalRequests > 0).length === 0 && (
                    <Col span={24}>
                      <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                        No leave requests from any class yet.
                      </Text>
                    </Col>
                  )}
                </Row>
              )
            }
          ]}
          expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 180 : 0} />}
        />
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
            <Text strong>{selectedRowKeys.length} requests selected</Text>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              style={{ background: '#10b981', borderColor: '#10b981' }}
              onClick={() => handleOpenBatchModal('approve')}
              loading={submitting}
              size="small"
            >
              Approve
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleOpenBatchModal('reject')}
              loading={submitting}
              size="small"
            >
              Reject
            </Button>
            <Button onClick={() => setSelectedRowKeys([])} size="small">
              Deselect
            </Button>
          </Space>
        </Card>
      )}

      {/* Leave Requests Table */}
      <Card style={{
        borderRadius: 12
      }}>
        <Divider style={{ margin: '0 0 16px 0' }} orientation="left">
          📊 Leave Request List
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
            showTotal: (total) => `Total ${total} requests`,
            pageSizeOptions: ["10", "20", "50", "100"],
            responsive: true
          }}
          scroll={{ x: 900 }}
          size="middle"
          locale={{
            emptyText: loading ? <Spin /> : "No leave requests found"
          }}
        />
      </Card>

      {/* View Request Details Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#2563eb', fontSize: 18 }} />
            <span>Leave Request Details</span>
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
                  <Text strong style={{ fontSize: 13 }}>Student Information</Text>
                </Space>
              }
            >
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Full Name:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>{selectedRequest.studentName}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Student ID:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>{selectedRequest.studentCode || 'N/A'}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Subject:</Text>
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
                  <Text strong style={{ fontSize: 13 }}>Leave Information</Text>
                </Space>
              }
            >
              <Row gutter={[12, 12]}>
                <Col xs={12} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Leave Date:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>
                    {dayjs(selectedRequest.leaveDate).format('DD/MM/YYYY')}
                  </Text>
                </Col>
                <Col xs={12} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Day:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>
                    {convertDayToVietnamese(selectedRequest.dayOfWeek)}
                  </Text>
                </Col>
                <Col xs={12} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Period:</Text>
                  <br />
                  <Space>
                    <ClockCircleOutlined style={{ color: '#f59e42' }} />
                    <Text strong style={{ fontSize: 14 }}>Period {selectedRequest.timeSlot || 'N/A'}</Text>
                  </Space>
                </Col>
                <Col xs={12} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Submitted Date:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>
                    {dayjs(selectedRequest.createdAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </Col>
                {selectedRequest.reviewedAt && (
                  <Col xs={12} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Reviewed Date:</Text>
                    <br />
                    <Text strong style={{ fontSize: 14 }}>
                      {dayjs(selectedRequest.reviewedAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </Col>
                )}
                <Col span={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Reason for Leave:</Text>
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
                    <Text strong>Evidence File</Text>
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
                          View PDF File
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
                    <Text strong>Review Notes</Text>
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
                      Reviewer: <Text strong>{selectedRequest.reviewerName}</Text>
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
                      Review Notes
                    </Text>
                  }
                  name="review_notes"
                >
                  <TextArea
                    rows={3}
                    placeholder="Enter notes for the student (optional)..."
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
                        Approve
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
                        Reject
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
                      Reviewed on {dayjs(selectedRequest.reviewedAt).format('DD/MM/YYYY HH:mm')}
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
                ? `Approve ${selectedRowKeys.length} Requests` 
                : `Reject ${selectedRowKeys.length} Requests`}
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
          <Text strong style={{ fontSize: 13 }}>You are processing {selectedRowKeys.length} leave requests</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Notes will be applied to all selected requests
          </Text>
        </div>

        <Form
          form={batchForm}
          layout="vertical"
          onFinish={handleSubmitBatchReview}
        >
          <Form.Item
            label={approvalAction === 'approve' ? "Approval Notes" : "Rejection Reason"}
            name="note"
            rules={[{ 
              required: approvalAction === 'reject', 
              message: "Please enter a rejection reason!" 
            }]}
          >
            <TextArea
              rows={4}
              placeholder={
                approvalAction === 'approve' 
                  ? "Enter general notes for the requests (optional)..."
                  : "Enter a general rejection reason..."
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
                  ? `Approve ${selectedRowKeys.length} Requests` 
                  : `Reject ${selectedRowKeys.length} Requests`}
              </Button>
              <Button onClick={() => setIsBatchModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherLeaveRequestPage;