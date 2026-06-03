import React, { useState, useEffect } from "react";
import { 
  App,
  Typography, 
  Card, 
  Row, 
  Col, 
  Button, 
  Tag, 
  Space,
  Modal,
  Form,
  Input,
  Spin,
  Empty,
  Alert,
  Divider
} from "antd";
import { 
  PlusOutlined, 
  CalendarOutlined,
  EyeOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined,
  BookOutlined,
  UserOutlined,
  FileTextOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";
import { 
  joinClass, 
  getStudentClasses,
  validateClassCode,
  type StudentClassItem,
  type ApiError 
} from "../../apis/classesAPIs/studentClass";
import { formatScheduleDisplay } from "../../apis/classesAPIs/teacherClass";

const { Title, Text, Paragraph } = Typography;

const headerIconStyle: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 16,
  background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.16)",
};

interface ClassData {
  id: number;
  name: string;
  teacher: string;
  students: number;
  schedule: any;
  status: 'active' | 'inactive';
  classCode: string;
  location: string | null;
  description: string | null;
  createdAt: string;
}

const StudentClassPage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  // ✅ State management
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const breadcrumbItems = [
    { title: "Trang chủ", href: "/student" },
    { title: "Lớp học" }
  ];

  // ✅ Fetch student classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // ✅ Fetch classes from API
  const fetchClasses = async (statusFilter?: 'active' | 'inactive') => {
    setLoading(true);
    setError(null);

    try {
      const response = await getStudentClasses(statusFilter);
      
      const mappedClasses = response.data.classes.map((cls: StudentClassItem) => ({
        id: cls.id,
        name: cls.className,
        teacher: cls.teacherName,
        students: 0,
        schedule: cls.schedule as any,
        status: cls.isActive ? 'active' : 'inactive' as 'active' | 'inactive',
        classCode: cls.classCode,
        location: cls.location,
        description: cls.description,
        createdAt: cls.createdAt
      }));

      setClasses(mappedClasses);
    } catch (err: any) {
      console.error('Failed to fetch classes:', err);
      const apiError = err as ApiError;
      const errorMsg = apiError.message || 'Không thể tải danh sách lớp';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle join class
  const handleJoinClass = async (values: { classCode: string }) => {
    const classCode = values.classCode.trim().toUpperCase();

    if (!validateClassCode(classCode)) {
      message.error('Mã lớp không hợp lệ! Mã phải gồm 9 ký tự (A-Z, 0-9)');
      return;
    }

    setJoinLoading(true);
    setJoinError(null);

    try {
      const response = await joinClass(classCode);
      
      message.success({
        content: response.message || 'Đã tham gia lớp thành công!',
        duration: 3
      });

      setIsModalVisible(false);
      form.resetFields();
      await fetchClasses();
    } catch (err: any) {
      console.error('Failed to join class:', err);
      const apiError = err as ApiError;
      
      let errorMsg = apiError.message || 'Could not join class';
      
      if (apiError.statusCode === 404) {
        errorMsg = 'Không tìm thấy lớp với mã này!';
      } else if (apiError.statusCode === 400) {
        errorMsg = apiError.message || 'Bạn đã tham gia lớp này rồi!';
      }

      setJoinError(errorMsg);
      message.error(errorMsg);
    } finally {
      setJoinLoading(false);
    }
  };

  // ✅ View class details
  const handleViewClassDetail = (classItem: ClassData) => {
    navigate(`/student/classes/${classItem.id}`);
  };

  // ✅ Get status display
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return '#10b981';
      case 'inactive': return '#64748b';
      default: return '#64748b';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'active': return 'Đang hoạt động';
      case 'inactive': return 'Không hoạt động';
      default: return 'Không rõ';
    }
  };

  // Format schedule is now imported from teacherClass.ts

  // ✅ Handle modal close
  const handleModalClose = () => {
    setIsModalVisible(false);
    setJoinError(null);
    form.resetFields();
  };

  return (
    <div className="responsive-container" style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)"
    }}>
      <style>
        {`
          @media (max-width: 768px) {
            .student-class-header {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 16px;
            }
            
            .student-class-subtitle {
              font-size: 14px !important;
            }
            
            .student-class-actions {
              width: 100%;
            }
            
            .student-class-actions .ant-space {
              width: 100%;
            }
            
            .student-class-actions .ant-btn {
              flex: 1;
            }
          }
        `}
      </style>
      
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
      <div className="student-class-header" style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 24 
      }}>
        <Space align="center" size={14}>
          <div style={headerIconStyle}>
            <BookOutlined style={{ fontSize: 26, color: "#2563eb" }} />
          </div>
          <div>
            <Title level={2} className="student-class-title" style={{ margin: 0, color: "#1d4ed8", fontWeight: 800 }}>
              Lớp học của tôi
            </Title>
            <Text className="student-class-subtitle" style={{ fontSize: 15, color: "#64748b", display: "block", marginTop: 4 }}>
              Quản lý và theo dõi các lớp bạn đã tham gia
            </Text>
          </div>
        </Space>
        <div className="student-class-actions">
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              icon={<ReloadOutlined />}
              size="large"
              onClick={() => fetchClasses()}
              loading={loading}
              style={{ borderRadius: 8, height: 48 }}
            >
              Làm mới
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setIsModalVisible(true)}
              style={{ 
                borderRadius: 8, 
                height: 48,
                fontSize: 16
              }}
            >
              Tham gia
            </Button>
          </Space>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Lỗi khi tải dữ liệu"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 400 
        }}>
          <Spin size="large" tip="Đang tải danh sách lớp..." />
        </div>
      ) : classes.length === 0 ? (
        /* Empty State */
        <Card style={{ 
          borderRadius: 16, 
          textAlign: 'center', 
          padding: '60px 20px',
          background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)'
        }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text style={{ fontSize: 16, color: '#64748b' }}>
                  Bạn chưa tham gia lớp nào
                </Text>
                <br />
                <Text type="secondary">
                  Nhấp nút "Tham gia lớp" để bắt đầu!
                </Text>
              </div>
            }
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setIsModalVisible(true)}
              style={{ marginTop: 16 }}
            >
              Tham gia lớp ngay
            </Button>
          </Empty>
        </Card>
      ) : (
        /* Classes Grid */
        <Row gutter={[16, 16]}>
          {classes.map((classItem) => {
            const scheduleText = formatScheduleDisplay(classItem.schedule) || "Chưa có lịch học";
            
            return (
              <Col xs={24} sm={24} md={12} lg={8} key={classItem.id}>
                <Card
                  style={{
                    borderRadius: 16,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    border: "1px solid #e5e7eb",
                    background: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
                    transition: "all 0.3s ease",
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  hoverable
                  bodyStyle={{ 
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                  }}
                >
                  {/* Header */}
                  <div style={{ marginBottom: 16 }}>
                    <Title level={4} style={{ 
                      margin: 0, 
                      marginBottom: 8,
                      color: "#1f2937",
                      fontSize: 20,
                      fontWeight: 600
                    }}>
                      <BookOutlined style={{ marginRight: 8, color: '#2563eb' }} />
                      {classItem.name}
                    </Title>
                    
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <Tag 
                        color={getStatusColor(classItem.status)}
                        style={{ 
                          borderRadius: 6,
                          fontWeight: 500,
                          padding: '4px 12px'
                        }}
                      >
                        {getStatusText(classItem.status)}
                      </Tag>
                      <Tag 
                        color="blue"
                        style={{ 
                          borderRadius: 6,
                          fontWeight: 500,
                          padding: '4px 12px'
                        }}
                      >
                        {classItem.classCode}
                      </Tag>
                    </div>
                  </div>

                  <Divider style={{ margin: '16px 0' }} />

                  {/* Info Section */}
                  <Space direction="vertical" size={12} style={{ width: "100%", marginBottom: 16, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <UserOutlined style={{ color: "#2563eb", fontSize: 16 }} />
                      <Text strong style={{ color: "#374151", fontSize: 14 }}>
                        {classItem.teacher}
                      </Text>
                    </div>
                    
                    {classItem.location && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <EnvironmentOutlined style={{ color: "#10b981", fontSize: 16 }} />
                        <Text style={{ color: "#64748b", fontSize: 14 }}>
                          Phòng {classItem.location}
                        </Text>
                      </div>
                    )}

                    {/* Simple Schedule */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <CalendarOutlined style={{ color: "#f59e0b", fontSize: 16, marginTop: 2 }} />
                      <Text style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
                        {scheduleText}
                      </Text>
                    </div>

                    {/* Description */}
                    {classItem.description && (
                      <div style={{ 
                        background: '#f9fafb',
                        padding: '12px',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        marginTop: 4
                      }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                          <FileTextOutlined style={{ color: "#64748b", fontSize: 14, marginTop: 2 }} />
                          <Text strong style={{ color: "#64748b", fontSize: 13 }}>
                            Mô tả:
                          </Text>
                        </div>
                        <Paragraph 
                          ellipsis={{ rows: 3, expandable: false }}
                          style={{ 
                            margin: 0, 
                            color: '#6b7280',
                            fontSize: 13,
                            lineHeight: 1.6,
                            paddingLeft: 22
                          }}
                        >
                          {classItem.description}
                        </Paragraph>
                      </div>
                    )}
                  </Space>

                  {/* Action Button */}
                  <Button 
                    type="primary" 
                    block 
                    icon={<EyeOutlined />}
                    onClick={() => handleViewClassDetail(classItem)}
                    size="large"
                    style={{ 
                      borderRadius: 8,
                      height: 44,
                      fontWeight: 500,
                      marginTop: 'auto'
                    }}
                  >
                    Xem chi tiết
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Join Class Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#1890ff' }} />
            <Text strong>Tham gia Lớp</Text>
          </Space>
        }
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={500}
        destroyOnClose
      >
        {joinError && (
          <Alert
            message="Không thể tham gia lớp"
            description={joinError}
            type="error"
            icon={<ExclamationCircleOutlined />}
            showIcon
            closable
            onClose={() => setJoinError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleJoinClass}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="Mã Lớp"
            name="classCode"
            rules={[
              { required: true, message: "Vui lòng nhập mã lớp!" },
              { len: 9, message: "Mã lớp phải gồm 9 ký tự!" },
              {
                pattern: /^[A-Z0-9]+$/,
                message: "Mã lớp chỉ chứa chữ in hoa và số!"
              }
            ]}
            tooltip="Mã lớp gồm 9 ký tự (A-Z, 0-9) do giáo viên cung cấp"
          >
            <Input 
              placeholder="Ví dụ: ABC123XYZ"
              size="large"
              maxLength={9}
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>

          <Alert
            message="Lưu ý"
            description="Nhập mã lớp chính xác do giáo viên cung cấp. Mã gồm 9 ký tự chữ và số."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                onClick={handleModalClose}
                size="large"
                disabled={joinLoading}
              >
                Hủy
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                size="large"
                loading={joinLoading}
                icon={!joinLoading && <PlusOutlined />}
              >
                {joinLoading ? 'Đang tham gia...' : 'Tham gia'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StudentClassPage;
