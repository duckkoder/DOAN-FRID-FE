import React, { useState, useEffect } from "react";
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
  Tooltip,
  Alert
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";
import { 
  createClass, 
  convertFrontendScheduleToBackend,
  type CreateClassRequest,
  type ApiError
} from "../../apis/classesAPIs/teacherClass";
import { useAuth } from "../../hooks/useAuth";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Định nghĩa các tiết học (10 tiết/ngày)
const TIME_SLOTS = [
  { period: 1, start: "07:00", end: "07:50" },
  { period: 2, start: "08:00", end: "08:50" },
  { period: 3, start: "09:00", end: "09:50" },
  { period: 4, start: "10:00", end: "10:50" },
  { period: 5, start: "11:00", end: "11:50" },
  { period: 6, start: "13:00", end: "13:50" },
  { period: 7, start: "14:00", end: "14:50" },
  { period: 8, start: "15:00", end: "15:50" },
  { period: 9, start: "16:00", end: "16:50" },
  { period: 10, start: "17:00", end: "17:50" },
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
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  
  // ✅ Temporary selected periods for each day (before splitting)
  const [dayPeriods, setDayPeriods] = useState<Record<number, number[]>>({});
  
  const userStr = useAuth().user;
  console.log('Authenticated user:', userStr);
  
  useEffect(() => {
    const getUserInfo = () => {
      try {
        if (userStr) {
          setTeacherId(userStr.teacher_id || null);
        }
      } catch (error) {
        console.error('Failed to get user info:', error);
      }
    };
    getUserInfo();
  }, [userStr]);

  const breadcrumbItems = [
    { title: "Trang chủ", href: "/teacher" },
    { title: "Quản lý lớp học", href: "/teacher/classes" },
    { title: "Tạo lớp học mới" }
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

  // Clear error when step changes
  useEffect(() => {
    setErrorMessage(null);
    setErrorDetails(null);
  }, [currentStep]);

  // ✅ Split periods into consecutive groups
  const splitPeriodsIntoSessions = (periods: number[]): number[][] => {
    if (periods.length === 0) return [];
    
    // Sort periods
    const sorted = [...periods].sort((a, b) => a - b);
    
    const sessions: number[][] = [];
    let currentSession: number[] = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      // Check if current period is consecutive to the previous one
      if (sorted[i] === sorted[i - 1] + 1) {
        currentSession.push(sorted[i]);
      } else {
        // Not consecutive, start a new session
        sessions.push(currentSession);
        currentSession = [sorted[i]];
      }
    }
    
    // Push the last session
    sessions.push(currentSession);
    
    return sessions;
  };

  // ✅ Handle day selection
  const handleDayChange = (days: number[]) => {
    setSelectedDays(days);
    
    // Remove periods for unselected days
    const newDayPeriods = { ...dayPeriods };
    Object.keys(newDayPeriods).forEach(dayStr => {
      const day = parseInt(dayStr);
      if (!days.includes(day)) {
        delete newDayPeriods[day];
      }
    });
    
    setDayPeriods(newDayPeriods);
    
    // Update schedules
    updateSchedulesFromPeriods(newDayPeriods);
  };

  // ✅ Handle period selection for a day
  const handlePeriodChange = (day: number, periods: number[]) => {
    const newDayPeriods = {
      ...dayPeriods,
      [day]: periods
    };
    
    setDayPeriods(newDayPeriods);
    updateSchedulesFromPeriods(newDayPeriods);
  };

  // ✅ Update schedules based on selected periods
  const updateSchedulesFromPeriods = (periods: Record<number, number[]>) => {
    const newSchedules: ClassSchedule[] = [];
    
    Object.entries(periods).forEach(([dayStr, selectedPeriods]) => {
      const day = parseInt(dayStr);
      
      if (selectedPeriods.length === 0) return;
      
      // Split periods into consecutive sessions
      const sessionGroups = splitPeriodsIntoSessions(selectedPeriods);
      
      const sessions: TimeSession[] = sessionGroups.map((group, index) => ({
        id: `${day}-${index}-${Date.now()}`,
        periods: group
      }));
      
      newSchedules.push({
        day,
        sessions
      });
    });
    
    setFormData(prev => ({ ...prev, schedules: newSchedules }));
  };

  // Format time display
  const formatTimeRange = (periods: number[]) => {
    if (periods.length === 0) return "Chưa chọn";
    
    const sortedPeriods = [...periods].sort((a, b) => a - b);
    const firstSlot = TIME_SLOTS.find(t => t.period === sortedPeriods[0]);
    const lastSlot = TIME_SLOTS.find(t => t.period === sortedPeriods[sortedPeriods.length - 1]);
    
    if (sortedPeriods.length === 1) {
      return `${firstSlot?.start} - ${firstSlot?.end} (Tiết ${sortedPeriods[0]})`;
    }
    
    return `${firstSlot?.start} - ${lastSlot?.end} (Tiết ${sortedPeriods.join(', ')})`;
  };

  const handleNext = async () => {
    try {
      // Clear previous errors
      setErrorMessage(null);
      setErrorDetails(null);

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
    setErrorMessage(null);
    setErrorDetails(null);
  };

  const handleSubmit = async () => {
    if (!teacherId) {
      setErrorMessage('Không tìm thấy thông tin giáo viên. Vui lòng đăng nhập lại!');
      message.error('Không tìm thấy thông tin giáo viên!');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setErrorDetails(null);

    try {
      // Convert frontend schedule format to backend format
      const backendSchedule = convertFrontendScheduleToBackend(
        formData.schedules,
        formData.room
      );

      console.log('Frontend schedules:', formData.schedules);
      console.log('Backend schedule:', backendSchedule);

      // Prepare request data
      const requestData: CreateClassRequest = {
        class_name: formData.subject,
        teacher_id: teacherId,
        location: formData.room || null,
        description: formData.description || null,
        schedule: backendSchedule
      };

      console.log('Creating class with data:', requestData);

      // Call API
      const response = await createClass(requestData);

      console.log('Class created successfully:', response);

      message.success({
        content: 'Tạo lớp học thành công!',
        duration: 2,
      });

      // Navigate to class details
      setTimeout(() => {
        navigate(`/teacher/class/${response.data.class.id}`);
      }, 1000);

    } catch (error: any) {
      console.error('Failed to create class:', error);
      
      // ✅ Handle ApiError from createClass
      const apiError = error as ApiError;
      
      let displayMessage = 'Có lỗi xảy ra khi tạo lớp học';
      let details = null;

      if (apiError.message) {
        displayMessage = apiError.message;
      }

      if (apiError.errors) {
        details = apiError.errors;
        console.error('Error details:', details);
      }

      // Set error state for display in UI
      setErrorMessage(displayMessage);
      setErrorDetails(details);

      // Show error toast
      message.error({
        content: displayMessage,
        duration: 5,
      });

      // Scroll to top to show error alert
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Render error details helper
  const renderErrorDetails = () => {
    if (!errorDetails) return null;

    // If errors is an object with field-specific errors
    if (typeof errorDetails === 'object' && !Array.isArray(errorDetails)) {
      return (
        <div style={{ marginTop: 12 }}>
          <Text strong>Chi tiết lỗi:</Text>
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            {Object.entries(errorDetails).map(([field, messages]) => (
              <li key={field}>
                {Array.isArray(messages) ? messages.join(', ') : String(messages)}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // If errors is a string or other
    return (
      <div style={{ marginTop: 12 }}>
        <Text strong>Chi tiết: </Text>
        <Text>{String(errorDetails)}</Text>
      </div>
    );
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

            {/* ✅ Period Selection for each selected day */}
            {selectedDays.sort().map(day => {
              const dayLabel = weekDays.find(d => d.value === day)?.label;
              const daySchedule = formData.schedules.find(s => s.day === day);
              const selectedPeriods = dayPeriods[day] || [];
              
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
                >
                  {/* ✅ Period Selector */}
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Chọn các tiết học:
                    </Text>
                    <Select
                      mode="multiple"
                      size="large"
                      placeholder="Chọn các tiết học (tự động chia buổi nếu không liên tiếp)"
                      style={{ width: '100%' }}
                      value={selectedPeriods}
                      onChange={(periods) => handlePeriodChange(day, periods)}
                    >
                      {TIME_SLOTS.map(slot => (
                        <Option key={slot.period} value={slot.period}>
                          Tiết {slot.period} ({slot.start} - {slot.end})
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {/* ✅ Auto-split sessions display */}
                  {daySchedule && daySchedule.sessions.length > 0 && (
                    <div>
                      <Divider orientation="left" style={{ margin: '12px 0' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Các buổi học (tự động chia)
                        </Text>
                      </Divider>
                      
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {daySchedule.sessions.map((session, index) => (
                          <Card 
                            key={session.id}
                            size="small"
                            style={{ 
                              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                              border: '1px solid #bae6fd'
                            }}
                          >
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <Text strong style={{ color: '#0369a1' }}>
                                Buổi {index + 1}
                              </Text>
                              <Tag color="blue" icon={<ClockCircleOutlined />}>
                                {formatTimeRange(session.periods)}
                              </Tag>
                            </Space>
                          </Card>
                        ))}
                      </Space>

                      {daySchedule.sessions.length > 1 && (
                        <Alert
                          message="Lưu ý"
                          description={`Hệ thống đã tự động chia thành ${daySchedule.sessions.length} buổi học vì các tiết không liên tiếp nhau.`}
                          type="info"
                          showIcon
                          style={{ marginTop: 12 }}
                        />
                      )}
                    </div>
                  )}
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
            {/* ✅ Error Alert at top of review step */}
            {errorMessage && (
              <Alert
                message="Lỗi khi tạo lớp học"
                description={
                  <div>
                    {renderErrorDetails()}
                  </div>
                }
                type="error"
                icon={<ExclamationCircleOutlined />}
                showIcon
                closable
                onClose={() => {
                  setErrorMessage(null);
                  setErrorDetails(null);
                }}
                style={{ marginBottom: 24 }}
              />
            )}

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
                Sau khi tạo lớp học, bạn sẽ được chuyển đến trang chi tiết lớp học để thêm sinh viên.
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
                  disabled={!!errorMessage}
                  style={{ 
                    borderRadius: 8,
                    background: errorMessage ? '#d1d5db' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none'
                  }}
                >
                  {loading ? 'Đang tạo lớp học...' : 'Tạo lớp học'}
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