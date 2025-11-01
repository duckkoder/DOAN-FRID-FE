import React, { useState, useEffect } from "react";
import { 
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
  message,
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

const { Title, Text, Paragraph } = Typography;

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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  // ✅ State management
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const breadcrumbItems = [
    { title: "Dashboard", href: "/student" },
    { title: "Classes" }
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
      const errorMsg = apiError.message || 'Không thể tải danh sách lớp học';
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
      message.error('Mã lớp học không hợp lệ! Mã phải có 9 ký tự (A-Z, 0-9)');
      return;
    }

    setJoinLoading(true);
    setJoinError(null);

    try {
      const response = await joinClass(classCode);
      
      message.success({
        content: response.message || 'Đã tham gia lớp học thành công!',
        duration: 3
      });

      setIsModalVisible(false);
      form.resetFields();
      await fetchClasses();
    } catch (err: any) {
      console.error('Failed to join class:', err);
      const apiError = err as ApiError;
      
      let errorMsg = apiError.message || 'Không thể tham gia lớp học';
      
      if (apiError.statusCode === 404) {
        errorMsg = 'Không tìm thấy lớp học với mã này!';
      } else if (apiError.statusCode === 400) {
        errorMsg = apiError.message || 'Bạn đã tham gia lớp học này rồi!';
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
      default: return 'Không xác định';
    }
  };

  // ✅ Format schedule to simple string
  const formatScheduleSimple = (schedule: Record<string, string[]>) => {
    const dayMapping: Record<string, string> = {
      monday: 'T2',
      tuesday: 'T3',
      wednesday: 'T4',
      thursday: 'T5',
      friday: 'T6',
      saturday: 'T7',
      sunday: 'CN'
    };

    const scheduleParts: string[] = [];

    Object.entries(schedule).forEach(([day, periodRanges]) => {
      if (!periodRanges || periodRanges.length === 0) return;

      const dayLabel = dayMapping[day] || day;
      const periods = periodRanges.map(range => {
        const [start, end] = range.split('-').map(Number);
        return start === end ? `${start}` : `${start}-${end}`;
      }).join(', ');
      
      scheduleParts.push(`${dayLabel}: ${periods}`);
    });

    return scheduleParts.length > 0 ? scheduleParts.join(' • ') : 'Chưa có lịch học';
  };

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
            
            .student-class-title {
              font-size: 24px !important;
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
        <div>
          <Title level={1} className="student-class-title" style={{ 
            marginBottom: 8, 
            color: "#2563eb",
            fontSize: 36,
            fontWeight: 700
          }}>
            📚 Lớp học của tôi
          </Title>
          <Text className="student-class-subtitle" style={{ 
            fontSize: 18, 
            color: "#64748b",
            display: "block"
          }}>
            Quản lý và theo dõi các lớp học bạn đã tham gia
          </Text>
        </div>
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
          message="Lỗi tải dữ liệu"
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
          <Spin size="large" tip="Đang tải danh sách lớp học..." />
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
                  Bạn chưa tham gia lớp học nào
                </Text>
                <br />
                <Text type="secondary">
                  Nhấn nút "Tham gia lớp học" để bắt đầu!
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
              Tham gia lớp học ngay
            </Button>
          </Empty>
        </Card>
      ) : (
        /* Classes Grid */
        <Row gutter={[16, 16]}>
          {classes.map((classItem) => {
            const scheduleText = formatScheduleSimple(classItem.schedule);
            
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
            <Text strong>Tham gia lớp học</Text>
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
            message="Không thể tham gia lớp học"
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
            label="Mã lớp học"
            name="classCode"
            rules={[
              { required: true, message: "Vui lòng nhập mã lớp học!" },
              { len: 9, message: "Mã lớp học phải có 9 ký tự!" },
              { 
                pattern: /^[A-Z0-9]+$/, 
                message: "Mã lớp học chỉ chứa chữ in hoa và số!" 
              }
            ]}
            tooltip="Mã lớp học gồm 9 ký tự (A-Z, 0-9) do giáo viên cung cấp"
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
            description="Nhập chính xác mã lớp học mà giáo viên đã cung cấp. Mã gồm 9 ký tự chữ và số."
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