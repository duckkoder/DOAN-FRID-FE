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
        error?.response?.data?.detail || 'Không thể tải danh sách đăng ký khuôn mặt'
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
        error?.response?.data?.detail || 'Không thể tải chi tiết đăng ký'
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
          ? ` (${response.embeddings_created} embeddings đã tạo trong ${response.processing_time_seconds || elapsed}s)`
          : '';
        
        message.success({
          content: `Đã phê duyệt đăng ký khuôn mặt${embeddingInfo}. Sinh viên đã được xác thực!`,
          duration: 5,
        });
        
        setProcessingEmbeddings(false);
      } else {
        await rejectFaceRegistration(viewingRegistration.id, {
          rejection_reason: values.reason,
          note: values.note,
        });
        message.success('Đã từ chối đăng ký khuôn mặt');
      }

      setIsActionModalOpen(false);
      setIsDetailModalOpen(false);
      form.resetFields();
      fetchRegistrations();
    } catch (error: any) {
      console.error('Error processing registration:', error);
      setProcessingEmbeddings(false);
      
      // Better error messages
      let errorMessage = 'Không thể xử lý đăng ký';
      
      if (error?.code === 'ECONNABORTED') {
        errorMessage = 'Timeout: Quá trình xử lý mất quá lâu. Vui lòng thử lại.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Lỗi server: ' + (error?.response?.data?.detail || 'Không thể kết nối AI-service');
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
      title: 'Mã SV',
      dataIndex: 'student_code',
      key: 'student_code',
      width: 110,
    },
    {
      title: 'Tên sinh viên',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Xác thực',
      dataIndex: 'student_is_verified',
      key: 'student_is_verified',
      width: 120,
      render: (isVerified: boolean) => (
        <Tag
          color={isVerified ? 'success' : 'default'}
          icon={isVerified ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
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
      title: 'Số ảnh',
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
      title: 'SV xác nhận',
      dataIndex: 'student_reviewed_at',
      key: 'student_reviewed_at',
      width: 150,
      render: (date: string | null, record) => {
        if (!date) return <Tag>Chưa xác nhận</Tag>;
        const accepted = record.student_accepted;
        return (
          <div>
            <div>{new Date(date).toLocaleDateString('vi-VN')}</div>
            {accepted !== null && (
              <Tag
                color={accepted ? 'green' : 'red'}
                icon={accepted ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                style={{ marginTop: 4 }}
              >
                {accepted ? 'Chấp nhận' : 'Từ chối'}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          Xem
        </Button>
      ),
    },
  ];

  // ==================== Render ====================
  return (
    <>
      <Card
        title={
          <Space>
            <CameraOutlined style={{ fontSize: 20 }} />
            <span>Quản lý đăng ký sinh trắc học</span>
          </Space>
        }
        extra={
          <Tag color="gold" icon={<ClockCircleOutlined />} style={{ fontSize: 14, padding: '4px 12px' }}>
            {registrations.filter((r) => r.status === 'pending_admin_review').length} đang chờ duyệt
          </Tag>
        }
      >
        {/* Filters */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Tìm theo mã SV, tên"
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Select
              placeholder="Lọc theo trạng thái"
              style={{ width: '100%' }}
              allowClear
              value={selectedStatus}
              onChange={handleStatusFilterChange}
            >
              <Option value="pending_admin_review">Chờ duyệt</Option>
              <Option value="approved">Đã duyệt</Option>
              <Option value="rejected">Đã từ chối</Option>
              <Option value="pending_student_review">Chờ SV xác nhận</Option>
              <Option value="cancelled">Đã hủy</Option>
            </Select>
          </Col>
          <Col xs={12} sm={4} md={3}>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Đặt lại
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
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} yêu cầu`,
            pageSizeOptions: ['10', '20', '50'],
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
            <span>Chi tiết đăng ký sinh trắc học</span>
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
                <Text strong>Mã sinh viên:</Text> <Tag color="blue">{viewingRegistration.student_code}</Tag>
              </Col>
              <Col span={12}>
                <Text strong>Họ tên:</Text> {viewingRegistration.student_name}
              </Col>
              <Col span={12}>
                <Text strong>Email:</Text> {viewingRegistration.student_email}
              </Col>
              <Col span={12}>
                <Text strong>Xác thực:</Text>{' '}
                <Tag
                  color={viewingRegistration.student_is_verified ? 'success' : 'default'}
                  icon={viewingRegistration.student_is_verified ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                >
                  {viewingRegistration.student_is_verified ? 'Đã xác thực' : 'Chưa xác thực'}
                </Tag>
              </Col>
              <Col span={12}>
                <Text strong>Trạng thái:</Text>{' '}
                <Tag color={getRegistrationStatusColor(viewingRegistration.status)}>
                  {getRegistrationStatusText(viewingRegistration.status)}
                </Tag>
              </Col>
            </Row>

            <Divider />

            {/* Registration Info */}
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Text strong>Số ảnh đã thu thập:</Text> {viewingRegistration.total_images_captured}/12
              </Col>
              <Col span={8}>
                <Text strong>Tiến độ:</Text> {viewingRegistration.registration_progress}%
              </Col>
              <Col span={8}>
                <Text strong>Ngày tạo:</Text>{' '}
                {new Date(viewingRegistration.created_at).toLocaleString('vi-VN')}
              </Col>
            </Row>

            <Divider />

            {/* Images Preview */}
            {viewingRegistration.verification_data?.steps && (
              <>
                <Title level={5}>
                  <CameraOutlined /> Ảnh đã thu thập ({viewingRegistration.verification_data.steps.length} ảnh)
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
                  message="Sinh viên đã xác nhận"
                  description={
                    <div>
                      <Text>
                        Thời gian: {new Date(viewingRegistration.student_reviewed_at).toLocaleString('vi-VN')}
                      </Text>
                      <br />
                      <Text strong>
                        Quyết định:{' '}
                        {viewingRegistration.student_accepted ? (
                          <Tag color="green" icon={<CheckCircleOutlined />}>
                            Chấp nhận
                          </Tag>
                        ) : (
                          <Tag color="red" icon={<CloseCircleOutlined />}>
                            Từ chối
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
                  message="Admin đã xử lý"
                  description={
                    <div>
                      <Text>
                        Thời gian: {new Date(viewingRegistration.admin_reviewed_at).toLocaleString('vi-VN')}
                      </Text>
                      <br />
                      {viewingRegistration.reviewer_name && (
                        <>
                          <Text>Người duyệt: {viewingRegistration.reviewer_name}</Text>
                          <br />
                        </>
                      )}
                      {viewingRegistration.rejection_reason && (
                        <>
                          <Text strong>Lý do từ chối: </Text>
                          <Text type="danger">{viewingRegistration.rejection_reason}</Text>
                          <br />
                        </>
                      )}
                      {viewingRegistration.note && (
                        <>
                          <Text strong>Ghi chú: </Text>
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
                  Phê duyệt
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={handleReject}
                >
                  Từ chối
                </Button>
              </Space>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal
        title={actionType === 'approve' ? 'Phê duyệt đăng ký' : 'Từ chối đăng ký'}
        open={isActionModalOpen}
        onOk={handleActionSubmit}
        onCancel={() => {
          setIsActionModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={loading}
        okText={actionType === 'approve' ? 'Phê duyệt' : 'Từ chối'}
        cancelText="Hủy"
        okButtonProps={{ disabled: processingEmbeddings }}
        cancelButtonProps={{ disabled: processingEmbeddings }}
      >
        {/* Embedding Processing Indicator */}
        {processingEmbeddings && (
          <Alert
            message="Đang xử lý embeddings..."
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <Spin />
                <Text type="secondary">
                  Đang trích xuất đặc trưng khuôn mặt từ 14 ảnh. 
                  Quá trình này có thể mất 10-30 giây. Vui lòng đợi...
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
              label="Lý do từ chối"
              name="reason"
              rules={[{ required: true, message: 'Vui lòng nhập lý do từ chối!' }]}
            >
              <TextArea
                rows={4}
                placeholder="Nhập lý do từ chối đăng ký khuôn mặt..."
                maxLength={500}
                showCount
                disabled={processingEmbeddings}
              />
            </Form.Item>
          )}
          <Form.Item label="Ghi chú (tùy chọn)" name="note">
            <TextArea
              rows={3}
              placeholder="Nhập ghi chú nếu cần..."
              maxLength={300}
              showCount
              disabled={processingEmbeddings}
            />
          </Form.Item>
          
          {actionType === 'approve' && (
            <Alert
              message="Lưu ý"
              description="Sau khi phê duyệt, hệ thống sẽ tự động trích xuất embeddings từ 14 ảnh khuôn mặt. Quá trình này mất khoảng 10-30 giây."
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
