import React, { useState } from "react";
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
  Tooltip
} from "antd";
import { 
  PlusOutlined, 
  StarOutlined, 
  StarFilled, 
  UserOutlined,
  CalendarOutlined,
  EyeOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";

const { Title, Text } = Typography;

interface ClassData {
  id: string;
  name: string;
  teacher: string;
  students: number;
  schedule: string;
  isPinned: boolean;
  status: 'active' | 'completed' | 'upcoming';
}

const StudentClassPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [classes, setClasses] = useState<ClassData[]>([
    {
      id: "1",
      name: "Advanced Java Programming",
      teacher: "Dr. Nguyen Van A",
      students: 45,
      schedule: "Mon, Wed, Fri - 9:00 AM",
      isPinned: true,
      status: 'active'
    },
    {
      id: "2", 
      name: "Database Design",
      teacher: "Prof. Tran Thi B",
      students: 38,
      schedule: "Tue, Thu - 2:00 PM",
      isPinned: false,
      status: 'active'
    },
    {
      id: "3",
      name: "Web Development",
      teacher: "Mr. Le Van C",
      students: 52,
      schedule: "Mon, Wed - 3:30 PM",
      isPinned: false,
      status: 'upcoming'
    }
  ]);

  const breadcrumbItems = [
    { title: "Dashboard", href: "/student" },
    { title: "Classes" }
  ];

  const handleJoinClass = (values: any) => {
    console.log("Join class with code:", values.classCode);
    message.success("Đã gửi yêu cầu tham gia lớp học!");
    setIsModalVisible(false);
    form.resetFields();
  };

  const togglePin = (classId: string) => {
    setClasses(prev => 
      prev.map(cls => 
        cls.id === classId 
          ? { ...cls, isPinned: !cls.isPinned }
          : cls
      )
    );
    message.success("Đã cập nhật trạng thái ghim lớp học!");
  };

  const handleViewClassDetail = (classItem: ClassData) => {
    // Navigate to class detail page with class data
    navigate(`/student/class/${classItem.id}`, { 
      state: { 
        classData: {
          id: classItem.id,
          subject: classItem.name,
          teacher: classItem.teacher,
          students: classItem.students,
          schedule: classItem.schedule,
          status: classItem.status
        }
      } 
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return '#10b981';
      case 'completed': return '#64748b';
      case 'upcoming': return '#f59e42';
      default: return '#64748b';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'active': return 'Đang học';
      case 'completed': return 'Đã hoàn thành';
      case 'upcoming': return 'Sắp bắt đầu';
      default: return 'Không xác định';
    }
  };

  // Sắp xếp: lớp ghim lên đầu
  const sortedClasses = [...classes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

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
            📚 My Classes
          </Title>
          <Text style={{ 
            fontSize: 18, 
            color: "#64748b"
          }}>
            Quản lý và theo dõi các lớp học bạn đã tham gia
          </Text>
        </div>
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
          Tham gia lớp học
        </Button>
      </div>

      {/* Classes Grid */}
      <Row gutter={[24, 24]}>
        {sortedClasses.map((classItem) => (
          <Col xs={24} md={12} lg={8} key={classItem.id}>
            <Card
              style={{
                borderRadius: 16,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                border: classItem.isPinned ? "2px solid #f59e42" : "none",
                background: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                position: "relative"
              }}
              hoverable
            >
              {/* Pin Badge */}
              {classItem.isPinned && (
                <div style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "#f59e42",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  📌 Ghim
                </div>
              )}

              <div style={{ marginTop: classItem.isPinned ? 20 : 0 }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "flex-start",
                  marginBottom: 12
                }}>
                  <Title level={4} style={{ 
                    margin: 0, 
                    color: "#374151",
                    fontSize: 18
                  }}>
                    {classItem.name}
                  </Title>
                  <Tooltip title={classItem.isPinned ? "Bỏ ghim" : "Ghim lớp học"}>
                    <Button 
                      type="text" 
                      icon={classItem.isPinned ? <StarFilled /> : <StarOutlined />}
                      onClick={() => togglePin(classItem.id)}
                      style={{ 
                        color: classItem.isPinned ? "#f59e42" : "#64748b",
                        padding: 4
                      }}
                    />
                  </Tooltip>
                </div>

                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Text style={{ color: "#64748b" }}>
                    👨‍🏫 {classItem.teacher}
                  </Text>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <UserOutlined style={{ color: "#64748b" }} />
                    <Text style={{ color: "#64748b" }}>
                      {classItem.students} học sinh
                    </Text>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CalendarOutlined style={{ color: "#64748b" }} />
                    <Text style={{ color: "#64748b" }}>
                      {classItem.schedule}
                    </Text>
                  </div>

                  <Tag 
                    color={getStatusColor(classItem.status)}
                    style={{ 
                      marginTop: 8,
                      borderRadius: 4,
                      fontWeight: 500
                    }}
                  >
                    {getStatusText(classItem.status)}
                  </Tag>
                </Space>

                <Button 
                  type="primary" 
                  block 
                  icon={<EyeOutlined />}
                  onClick={() => handleViewClassDetail(classItem)}
                  style={{ 
                    marginTop: 16,
                    borderRadius: 8,
                    height: 40
                  }}
                >
                  Xem chi tiết
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Join Class Modal */}
      <Modal
        title="Tham gia lớp học"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        style={{ borderRadius: 16 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleJoinClass}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="Mã lớp học"
            name="classCode"
            rules={[{ required: true, message: "Vui lòng nhập mã lớp học!" }]}
          >
            <Input 
              placeholder="Nhập mã lớp học từ giáo viên"
              size="large"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                size="large"
              >
                Tham gia
              </Button>
              <Button 
                onClick={() => setIsModalVisible(false)}
                size="large"
              >
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StudentClassPage;
