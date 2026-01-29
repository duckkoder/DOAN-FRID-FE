import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Input,
  Modal,
  Form,
  message,
  Row,
  Col,
  Image,
  Typography,
  Divider,
  Alert,
  Spin,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  CameraOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  getFaceRegistrations,
  getFaceRegistrationDetail,
  approveFaceRegistration,
  rejectFaceRegistration,
  getRegistrationStatusColor,
  getRegistrationStatusText,
  type FaceRegistrationListItem,
  type FaceRegistrationDetail,
} from '../apis/faceRegistrationAPIs/adminFaceRegistration';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AdminFaceRegistrationTable: React.FC = () => {
  // ==================== State ====================
  const [registrations, setRegistrations] = useState<FaceRegistrationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>('pending_admin_review');
  const [searchText, setSearchText] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 576);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Detail Modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingRegistration, setViewingRegistration] = useState<FaceRegistrationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Approve/Reject Modal
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [processingEmbeddings, setProcessingEmbeddings] = useState(false);  // NEW: For embedding processing
  const [form] = Form.useForm();

  // ==================== Responsive Detection ====================
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 576);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ==================== Load Data ====================
  useEffect(() => {
    fetchRegistrations();
  }, [pagination.current, pagination.pageSize, selectedStatus, searchText]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await getFaceRegistrations({
        status: selectedStatus,
        search: searchText,
        page: pagination.current,
        limit: pagination.pageSize,
      });

      setRegistrations(response.items);
      setPagination((prev) => ({
        ...prev,
        total: response.total,
      }));
    } catch (error: any) {
      console.error('Error fetching face registrations:', error);
      message.error(
        error?.response?.data?.detail || 'Could not load face registration list'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationDetail = async (registrationId: number) => {
    try {
      setLoadingDetail(true);
      const detail = await getFaceRegistrationDetail(registrationId);
      setViewingRegistration(detail);
    } catch (error: any) {
      console.error('Error fetching registration detail:', error);
      message.error(
        error?.response?.data?.detail || 'Could not load registration details'
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  // ==================== Handlers ====================
  const handleStatusFilterChange = (value: string | undefined) => {
    setSelectedStatus(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    setSearchText('');
    setSelectedStatus('pending_admin_review');
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    setPagination({
      current: newPagination.current || 1,
      pageSize: newPagination.pageSize || 10,
      total: pagination.total,
    });
  };

  const handleViewDetail = async (registration: FaceRegistrationListItem) => {
    setIsDetailModalOpen(true);
    await fetchRegistrationDetail(registration.id);
  };

  const handleApprove = () => {
    setActionType('approve');
    form.resetFields();
    setIsActionModalOpen(true);
  };

  const handleReject = () => {
    setActionType('reject');
    form.resetFields();
    setIsActionModalOpen(true);
  };

  const handleActionSubmit = async () => {
    if (!viewingRegistration) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      if (actionType === 'approve') {
        // Show embedding processing state
        setProcessingEmbeddings(true);
        
        const startTime = Date.now();
        const response = await approveFaceRegistration(viewingRegistration.id, {
          note: values.note,
        });
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        // Show success with embedding info
        const embeddingInfo = response.embeddings_created 
          ? ` (${response.embeddings_created} embeddings created in ${response.processing_time_seconds || elapsed}s)`
          : '';
        
        message.success({
          content: `Face registration approved${embeddingInfo}. Student has been verified!`,
          duration: 5,
        });
        
        setProcessingEmbeddings(false);
      } else {
        await rejectFaceRegistration(viewingRegistration.id, {
          rejection_reason: values.reason,
          note: values.note,
        });
        message.success('Face registration rejected');
      }

      setIsActionModalOpen(false);
      setIsDetailModalOpen(false);
      form.resetFields();
      fetchRegistrations();
    } catch (error: any) {
      console.error('Error processing registration:', error);
      setProcessingEmbeddings(false);
      
      // Better error messages
      let errorMessage = 'Could not process registration';
      
      if (error?.code === 'ECONNABORTED') {
        errorMessage = 'Timeout: Processing took too long. Please try again.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Server error: ' + (error?.response?.data?.detail || 'Could not connect to AI-service');
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      message.error({
        content: errorMessage,
        duration: 8,
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== Table Columns ====================
  const columns: ColumnsType<FaceRegistrationListItem> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Student ID',
      dataIndex: 'student_code',
      key: 'student_code',
      width: 110,
    },
    {
      title: 'Student Name',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Verified',
      dataIndex: 'student_is_verified',
      key: 'student_is_verified',
      width: 120,
      render: (isVerified: boolean) => (
        <Tag
          color={isVerified ? 'success' : 'default'}
          icon={isVerified ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {isVerified ? 'Verified' : 'Not Verified'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => (
        <Tag color={getRegistrationStatusColor(status)} icon={<ClockCircleOutlined />}>
          {getRegistrationStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Images',
      dataIndex: 'total_images_captured',
      key: 'total_images_captured',
      width: 90,
      render: (count: number) => (
        <Tag color="blue" icon={<CameraOutlined />}>
          {count}/12
        </Tag>
      ),
    },
    {
      title: 'Student Confirmed',
      dataIndex: 'student_reviewed_at',
      key: 'student_reviewed_at',
      width: 150,
      render: (date: string | null, record) => {
        if (!date) return <Tag>Not Confirmed</Tag>;
        const accepted = record.student_accepted;
        return (
          <div>
            <div>{new Date(date).toLocaleDateString('en-US')}</div>
            {accepted !== null && (
              <Tag
                color={accepted ? 'green' : 'red'}
                icon={accepted ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                style={{ marginTop: 4 }}
              >
                {accepted ? 'Accepted' : 'Rejected'}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Created Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string) => new Date(date).toLocaleDateString('en-US'),
    },
    {
      title: 'Actions',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          View
        </Button>
      ),
    },
  ];

  // ==================== Render ====================
  return (
    <>
      <Card
        title={
          <Row align="middle" gutter={[8, 8]} style={{ flexWrap: 'wrap' }}>
            <Col>
              <Space>
                <CameraOutlined style={{ fontSize: 20 }} />
                <span style={{ fontSize: 16 }}>Biometric Registration Management</span>
              </Space>
            </Col>
            <Col>
              <Tag color="gold" icon={<ClockCircleOutlined />} style={{ fontSize: 12, padding: '2px 8px' }}>
                {registrations.filter((r) => r.status === 'pending_admin_review').length} pending
              </Tag>
            </Col>
          </Row>
        }
      >
        {/* Filters */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search by student ID, name"
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Select
              placeholder="Filter by status"
              style={{ width: '100%' }}
              allowClear
              value={selectedStatus}
              onChange={handleStatusFilterChange}
            >
              <Option value="pending_admin_review">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
              <Option value="pending_student_review">Pending Student</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Col>
          <Col xs={12} sm={4} md={3}>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              {!isMobile && "Reset"}
            </Button>
          </Col>
        </Row>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={registrations}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: !isMobile,
            showTotal: (total, range) => (
              <span style={{ fontSize: 12 }}>
                {range[0]}-{range[1]} / {total}
              </span>
            ),
            pageSizeOptions: ['10', '20', '50'],
            size: 'small',
            simple: isMobile,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <CameraOutlined />
            <span>Biometric Registration Details</span>
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={null}
        width={1000}
      >
        {loadingDetail ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin size="large" />
          </div>
        ) : viewingRegistration ? (
          <div>
            {/* Student Info */}
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>Student ID:</Text> <Tag color="blue">{viewingRegistration.student_code}</Tag>
              </Col>
              <Col span={12}>
                <Text strong>Full Name:</Text> {viewingRegistration.student_name}
              </Col>
              <Col span={12}>
                <Text strong>Email:</Text> {viewingRegistration.student_email}
              </Col>
              <Col span={12}>
                <Text strong>Verified:</Text>{' '}
                <Tag
                  color={viewingRegistration.student_is_verified ? 'success' : 'default'}
                  icon={viewingRegistration.student_is_verified ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                >
                  {viewingRegistration.student_is_verified ? 'Verified' : 'Not Verified'}
                </Tag>
              </Col>
              <Col span={12}>
                <Text strong>Status:</Text>{' '}
                <Tag color={getRegistrationStatusColor(viewingRegistration.status)}>
                  {getRegistrationStatusText(viewingRegistration.status)}
                </Tag>
              </Col>
            </Row>

            <Divider />

            {/* Registration Info */}
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Text strong>Images Collected:</Text> {viewingRegistration.total_images_captured}/12
              </Col>
              <Col span={8}>
                <Text strong>Progress:</Text> {viewingRegistration.registration_progress}%
              </Col>
              <Col span={8}>
                <Text strong>Created Date:</Text>{' '}
                {new Date(viewingRegistration.created_at).toLocaleString('en-US')}
              </Col>
            </Row>

            <Divider />

            {/* Images Preview */}
            {viewingRegistration.verification_data?.steps && (
              <>
                <Title level={5}>
                  <CameraOutlined /> Collected Images ({viewingRegistration.verification_data.steps.length} images)
                </Title>
                <Row gutter={[8, 8]} style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
                  {viewingRegistration.verification_data.steps.map((step: any, index: number) => (
                    <Col span={6} key={index}>
                      <div style={{ position: 'relative' }}>
                        <Image
                          src={step.url}
                          alt={step.step_name}
                          style={{
                            width: '100%',
                            borderRadius: 8,
                            border: '2px solid #d1d5db',
                          }}
                          preview={{
                            mask: <div style={{ fontSize: 12 }}>{step.step_name}</div>,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                          }}
                        >
                          {step.step_number}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </>
            )}

            <Divider />

            {/* Review Info */}
            {viewingRegistration.student_reviewed_at && (
              <>
                <Alert
                  message="Student Confirmed"
                  description={
                    <div>
                      <Text strong>
                        Decision:{' '}
                        {viewingRegistration.student_accepted ? (
                          <Tag color="green" icon={<CheckCircleOutlined />}>
                            Accepted
                          </Tag>
                        ) : (
                          <Tag color="red" icon={<CloseCircleOutlined />}>
                            Rejected
                          </Tag>
                        )}
                      </Text>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              </>
            )}

            {viewingRegistration.admin_reviewed_at && (
              <>
                <Alert
                  message="Admin Processed"
                  description={
                    <div>
                      <Text>
                        Time: {new Date(viewingRegistration.admin_reviewed_at).toLocaleString('en-US')}
                      </Text>
                      <br />
                      {viewingRegistration.reviewer_name && (
                        <>
                          <Text>Reviewer: {viewingRegistration.reviewer_name}</Text>
                          <br />
                        </>
                      )}
                      {viewingRegistration.rejection_reason && (
                        <>
                          <Text strong>Rejection Reason: </Text>
                          <Text type="danger">{viewingRegistration.rejection_reason}</Text>
                          <br />
                        </>
                      )}
                      {viewingRegistration.note && (
                        <>
                          <Text strong>Note: </Text>
                          <Text>{viewingRegistration.note}</Text>
                        </>
                      )}
                    </div>
                  }
                  type={viewingRegistration.status === 'approved' ? 'success' : 'error'}
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              </>
            )}

            {/* Action Buttons */}
            {viewingRegistration.status === 'pending_admin_review' && (
              <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 16 }}>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleApprove}
                >
                  Approve
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={handleReject}
                >
                  Reject
                </Button>
              </Space>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal
        title={actionType === 'approve' ? 'Approve Registration' : 'Reject Registration'}
        open={isActionModalOpen}
        onOk={handleActionSubmit}
        onCancel={() => {
          setIsActionModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={loading}
        okText={actionType === 'approve' ? 'Approve' : 'Reject'}
        cancelText="Cancel"
        okButtonProps={{ disabled: processingEmbeddings }}
        cancelButtonProps={{ disabled: processingEmbeddings }}
      >
        {/* Embedding Processing Indicator */}
        {processingEmbeddings && (
          <Alert
            message="Processing embeddings..."
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <Spin />
                <Text type="secondary">
                  Extracting facial features from 14 images. 
                  This process may take 10-30 seconds. Please wait...
                </Text>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          {actionType === 'reject' && (
            <Form.Item
              label="Rejection Reason"
              name="reason"
              rules={[{ required: true, message: 'Please enter rejection reason!' }]}
            >
              <TextArea
                rows={4}
                placeholder="Enter reason for rejecting face registration..."
                maxLength={500}
                showCount
                disabled={processingEmbeddings}
              />
            </Form.Item>
          )}
          <Form.Item label="Note (optional)" name="note">
            <TextArea
              rows={3}
              placeholder="Enter note if needed..."
              maxLength={300}
              showCount
              disabled={processingEmbeddings}
            />
          </Form.Item>
          
          {actionType === 'approve' && (
            <Alert
              message="Note"
              description="After approval, the system will automatically extract embeddings from 14 face images. This process takes about 10-30 seconds."
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Form>
      </Modal>
    </>
  );
};

export default AdminFaceRegistrationTable;
