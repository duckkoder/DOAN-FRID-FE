import React, { useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Row,
  Col,
  Select,
  Typography,
  Space,
  message,
  Steps,
  Divider,
  Tag,
  Tooltip
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  DeleteOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Định nghĩa các tiết học (10 tiết/ngày)
const TIME_SLOTS = [
  { period: 1, start: "07:00", end: "07:50" },
  { period: 2, start: "08:00", end: "08:50" },
  { period: 3, start: "09:00", end: "09:50" },
  { period: 4, start: "10:00", end: "10:50" },
  { period: 5, start: "11:00", end: "11:50" }, // Kết thúc buổi sáng 12:00
  { period: 6, start: "13:00", end: "13:50" },
  { period: 7, start: "14:00", end: "14:50" },
  { period: 8, start: "15:00", end: "15:50" },
  { period: 9, start: "16:00", end: "16:50" },
  { period: 10, start: "17:00", end: "17:50" }, // Kết thúc buổi chiều 18:00
];

interface TimeSession {
  id: string;
  periods: number[];
}

interface ClassSchedule {
  day: number;
  sessions: TimeSession[];
}

interface ClassFormData {
  subject: string;
  description: string;
  room: string;
  schedules: ClassSchedule[];
}

const ClassCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ClassFormData>({
    subject: '',
    description: '',
    room: '',
    schedules: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const breadcrumbItems = [
    { title: "Dashboard", href: "/teacher" },
    { title: "Class Management", href: "/teacher/classes" },
    { title: "Create New Class" }
  ];

  const weekDays = [
    { value: 1, label: "Thứ 2" },
    { value: 2, label: "Thứ 3" },
    { value: 3, label: "Thứ 4" },
    { value: 4, label: "Thứ 5" },
    { value: 5, label: "Thứ 6" },
    { value: 6, label: "Thứ 7" },
    { value: 0, label: "Chủ nhật" }
  ];

  const steps = [
    {
      title: 'Thông tin cơ bản',
      icon: <BookOutlined />,
      description: 'Tên môn học, mô tả'
    },
    {
      title: 'Phòng học & Lịch',
      icon: <CalendarOutlined />,
      description: 'Phòng, thứ và khung giờ'
    },
    {
      title: 'Xác nhận',
      icon: <CheckCircleOutlined />,
      description: 'Kiểm tra và tạo lớp'
    }
  ];

  // Add new session for a day
  const addSession = (day: number) => {
    const newSchedules = [...formData.schedules];
    const daySchedule = newSchedules.find(s => s.day === day);
    
    if (daySchedule) {
      daySchedule.sessions.push({
        id: `${day}-${Date.now()}`,
        periods: []
      });
    } else {
      newSchedules.push({
        day,
        sessions: [{
          id: `${day}-${Date.now()}`,
          periods: []
        }]
      });
    }
    
    setFormData(prev => ({ ...prev, schedules: newSchedules }));
  };

  // Remove session
  const removeSession = (day: number, sessionId: string) => {
    const newSchedules = formData.schedules.map(schedule => {
      if (schedule.day === day) {
        return {
          ...schedule,
          sessions: schedule.sessions.filter(s => s.id !== sessionId)
        };
      }
      return schedule;
    }).filter(schedule => schedule.sessions.length > 0);
    
    setFormData(prev => ({ ...prev, schedules: newSchedules }));
  };

  // Update session periods
  const updateSessionPeriods = (day: number, sessionId: string, periods: number[]) => {
    const newSchedules = formData.schedules.map(schedule => {
      if (schedule.day === day) {
        return {
          ...schedule,
          sessions: schedule.sessions.map(session => 
            session.id === sessionId ? { ...session, periods } : session
          )
        };
      }
      return schedule;
    });
    
    setFormData(prev => ({ ...prev, schedules: newSchedules }));
  };

  // Handle day selection
  const handleDayChange = (days: number[]) => {
    setSelectedDays(days);
    
    // Remove schedules for unselected days
    const newSchedules = formData.schedules.filter(s => days.includes(s.day));
    
    // Add empty schedules for newly selected days
    days.forEach(day => {
      if (!newSchedules.find(s => s.day === day)) {
        newSchedules.push({
          day,
          sessions: [{
            id: `${day}-${Date.now()}`,
            periods: []
          }]
        });
      }
    });
    
    setFormData(prev => ({ ...prev, schedules: newSchedules }));
  };

  // Format time display
  const formatTimeRange = (periods: number[]) => {
    if (periods.length === 0) return "Chưa chọn";
    
    const sortedPeriods = [...periods].sort((a, b) => a - b);
    const firstSlot = TIME_SLOTS.find(t => t.period === sortedPeriods[0]);
    const lastSlot = TIME_SLOTS.find(t => t.period === sortedPeriods[sortedPeriods.length - 1]);
    
    return `${firstSlot?.start} - ${lastSlot?.end} (Tiết ${sortedPeriods.join(', ')})`;
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        const values = await form.validateFields(['subject', 'description']);
        setFormData(prev => ({ ...prev, ...values }));
      } else if (currentStep === 1) {
        const values = await form.validateFields(['room']);
        
        // Validate schedules
        if (formData.schedules.length === 0) {
          message.error('Vui lòng chọn ít nhất một ngày học!');
          return;
        }
        
        const hasEmptyPeriods = formData.schedules.some(schedule => 
          schedule.sessions.some(session => session.periods.length === 0)
        );
        
        if (hasEmptyPeriods) {
          message.error('Vui lòng chọn khung giờ cho tất cả các buổi học!');
          return;
        }
        
        setFormData(prev => ({ ...prev, ...values }));
      }
      setCurrentStep(prev => prev + 1);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      console.log('Submitting class data:', formData);
      
      // TODO: Call API to create class
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success('Tạo lớp học thành công!');
      navigate('/teacher/classes');
    } catch (error) {
      message.error('Có lỗi xảy ra khi tạo lớp học');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                label="Tên môn học"
                name="subject"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên môn học!' },
                  { min: 3, message: 'Tên môn học phải có ít nhất 3 ký tự!' }
                ]}
              >
                <Input 
                  size="large" 
                  placeholder="Ví dụ: Lập trình Java nâng cao"
                  prefix={<BookOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Mô tả môn học"
                name="description"
                rules={[
                  { required: true, message: 'Vui lòng nhập mô tả môn học!' },
                  { min: 10, message: 'Mô tả phải có ít nhất 10 ký tự!' }
                ]}
              >
                <TextArea 
                  rows={6} 
                  placeholder="Mô tả chi tiết về môn học, mục tiêu và nội dung chính..."
                />
              </Form.Item>
            </Col>
          </Row>
        );

      case 1:
        return (
          <div>
            {/* Room Selection */}
            <Row gutter={24} style={{ marginBottom: 24 }}>
              <Col span={24}>
                <Form.Item
                  label="Phòng học"
                  name="room"
                  rules={[{ required: true, message: 'Vui lòng nhập phòng học!' }]}
                >
                  <Input
                    size="large"
                    placeholder="Nhập tên phòng học (VD: A101, B205, LAB1...)"
                    prefix={<CalendarOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Chọn lịch học</Divider>

            {/* Day Selection */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Chọn các thứ trong tuần:
              </Text>
              <Select
                mode="multiple"
                size="large"
                placeholder="Chọn các ngày học trong tuần"
                style={{ width: '100%' }}
                value={selectedDays}
                onChange={handleDayChange}
              >
                {weekDays.map(day => (
                  <Option key={day.value} value={day.value}>
                    {day.label}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Schedule for each selected day */}
            {selectedDays.sort().map(day => {
              const dayLabel = weekDays.find(d => d.value === day)?.label;
              const daySchedule = formData.schedules.find(s => s.day === day);
              
              return (
                <Card
                  key={day}
                  style={{ 
                    marginBottom: 16,
                    borderLeft: '4px solid #1890ff'
                  }}
                  title={
                    <Space>
                      <CalendarOutlined style={{ color: '#1890ff' }} />
                      <Text strong>{dayLabel}</Text>
                    </Space>
                  }
                  extra={
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => addSession(day)}
                      size="small"
                    >
                      Thêm buổi học
                    </Button>
                  }
                >
                  {daySchedule?.sessions.map((session, index) => (
                    <div key={session.id} style={{ marginBottom: 16 }}>
                      <Row gutter={16} align="middle">
                        <Col span={4}>
                          <Text strong>Buổi {index + 1}:</Text>
                        </Col>
                        <Col span={18}>
                          <Select
                            mode="multiple"
                            size="large"
                            placeholder="Chọn các tiết học"
                            style={{ width: '100%' }}
                            value={session.periods}
                            onChange={(periods) => updateSessionPeriods(day, session.id, periods)}
                          >
                            {TIME_SLOTS.map(slot => (
                              <Option key={slot.period} value={slot.period}>
                                Tiết {slot.period} ({slot.start} - {slot.end})
                              </Option>
                            ))}
                          </Select>
                          {session.periods.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <Tag color="blue" icon={<ClockCircleOutlined />}>
                                {formatTimeRange(session.periods)}
                              </Tag>
                            </div>
                          )}
                        </Col>
                        <Col span={2}>
                          {daySchedule.sessions.length > 1 && (
                            <Tooltip title="Xóa buổi học">
                              <Button
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => removeSession(day, session.id)}
                              />
                            </Tooltip>
                          )}
                        </Col>
                      </Row>
                      {index < daySchedule.sessions.length - 1 && (
                        <Divider style={{ margin: '16px 0' }} />
                      )}
                    </div>
                  ))}
                </Card>
              );
            })}

            {selectedDays.length === 0 && (
              <Card style={{ textAlign: 'center', background: '#f8fafc' }}>
                <Text type="secondary">
                  Vui lòng chọn các ngày học trong tuần để thiết lập lịch học
                </Text>
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div>
            <Card style={{ marginBottom: 24 }}>
              <Title level={4} style={{ marginBottom: 16, color: '#2563eb' }}>
                📚 Thông tin môn học
              </Title>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Text strong>Tên môn học:</Text>
                  <br />
                  <Text style={{ fontSize: 16 }}>{formData.subject}</Text>
                </Col>
                <Col span={24}>
                  <Text strong>Mô tả:</Text>
                  <br />
                  <Text>{formData.description}</Text>
                </Col>
              </Row>
            </Card>

            <Card style={{ marginBottom: 24 }}>
              <Title level={4} style={{ marginBottom: 16, color: '#10b981' }}>
                📍 Phòng học
              </Title>
              <Text style={{ fontSize: 16 }}>Phòng {formData.room}</Text>
            </Card>

            <Card style={{ marginBottom: 24 }}>
              <Title level={4} style={{ marginBottom: 16, color: '#f59e0b' }}>
                📅 Lịch học
              </Title>
              {formData.schedules.map(schedule => {
                const dayLabel = weekDays.find(d => d.value === schedule.day)?.label;
                return (
                  <div key={schedule.day} style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                      {dayLabel}
                    </Text>
                    {schedule.sessions.map((session, index) => (
                      <div key={session.id} style={{ marginLeft: 24, marginTop: 8 }}>
                        <Space>
                          <ClockCircleOutlined style={{ color: '#10b981' }} />
                          <Text>
                            <Text strong>Buổi {index + 1}:</Text> {formatTimeRange(session.periods)}
                          </Text>
                        </Space>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Card>

            <Card style={{ textAlign: 'center', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' }}>
              <Title level={5} style={{ color: '#1e40af', marginBottom: 8 }}>
                ℹ️ Lưu ý
              </Title>
              <Text>
                Sau khi tạo lớp học, bạn có thể thêm sinh viên thông qua mã lớp hoặc mời trực tiếp.
              </Text>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

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
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ borderRadius: 8, marginBottom: 16 }}
          >
            Quay lại
          </Button>
          <Title level={1} style={{ 
            marginBottom: 4, 
            color: "#2563eb",
            fontSize: 32,
            fontWeight: 700
          }}>
            ➕ Tạo lớp học mới
          </Title>
          <Text style={{ color: "#64748b", fontSize: 16 }}>
            Tạo lớp học với thông tin chi tiết và lịch học linh hoạt
          </Text>
        </div>
      </div>

      {/* Main Content */}
      <Card style={{
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none"
      }}>
        {/* Steps */}
        <Steps 
          current={currentStep} 
          style={{ marginBottom: 32 }}
          items={steps}
        />

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          initialValues={formData}
        >
          <div style={{ minHeight: 400 }}>
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {currentStep > 0 && (
                <Button size="large" onClick={handlePrev}>
                  Quay lại
                </Button>
              )}
            </div>
            <div>
              {currentStep < steps.length - 1 ? (
                <Button 
                  type="primary" 
                  size="large" 
                  onClick={handleNext}
                  style={{ borderRadius: 8 }}
                >
                  Tiếp theo
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<SaveOutlined />}
                  loading={loading}
                  onClick={handleSubmit}
                  style={{ borderRadius: 8 }}
                >
                  Tạo lớp học
                </Button>
              )}
            </div>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ClassCreatePage;