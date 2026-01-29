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
    { title: "Home", href: "/teacher" },
    { title: "Class Management", href: "/teacher/classes" },
    { title: "Create New Class" }
  ];

  const weekDays = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 0, label: "Sunday" }
  ];

  const steps = [
    {
      title: 'Basic Information',
      icon: <BookOutlined />,
      description: 'Subject name, description'
    },
    {
      title: 'Room & Schedule',
      icon: <CalendarOutlined />,
      description: 'Room, day and time slots'
    },
    {
      title: 'Confirmation',
      icon: <CheckCircleOutlined />,
      description: 'Review and create class'
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
    if (periods.length === 0) return "Not selected";
    
    const sortedPeriods = [...periods].sort((a, b) => a - b);
    const firstSlot = TIME_SLOTS.find(t => t.period === sortedPeriods[0]);
    const lastSlot = TIME_SLOTS.find(t => t.period === sortedPeriods[sortedPeriods.length - 1]);
    
    if (sortedPeriods.length === 1) {
      return `${firstSlot?.start} - ${firstSlot?.end} (Period ${sortedPeriods[0]})`;
    }
    
    return `${firstSlot?.start} - ${lastSlot?.end} (Period ${sortedPeriods.join(', ')})`;
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
          message.error('Please select at least one class day!');
          return;
        }
        
        const hasEmptyPeriods = formData.schedules.some(schedule => 
          schedule.sessions.some(session => session.periods.length === 0)
        );
        
        if (hasEmptyPeriods) {
          message.error('Please select time slots for all class sessions!');
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
      setErrorMessage('Teacher information not found. Please log in again!');
      message.error('Teacher information not found!');
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

      
      

      // Prepare request data
      const requestData: CreateClassRequest = {
        class_name: formData.subject,
        teacher_id: teacherId,
        location: formData.room || null,
        description: formData.description || null,
        schedule: backendSchedule
      };

      

      // Call API
      const response = await createClass(requestData);

      

      message.success({
        content: 'Class created successfully!',
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
      
      let displayMessage = 'An error occurred while creating the class';
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
          <Text strong>Error details:</Text>
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
        <Text strong>Details: </Text>
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
                label="Subject Name"
                name="subject"
                rules={[
                  { required: true, message: 'Please enter subject name!' },
                  { min: 3, message: 'Subject name must have at least 3 characters!' }
                ]}
              >
                <Input 
                  size="large" 
                  placeholder="Example: Advanced Java Programming"
                  prefix={<BookOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Subject Description"
                name="description"
                rules={[
                  { required: true, message: 'Please enter subject description!' },
                  { min: 10, message: 'Description must have at least 10 characters!' }
                ]}
              >
                <TextArea 
                  rows={6} 
                  placeholder="Detailed description of the subject, objectives and main content..."
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
                  label="Classroom"
                  name="room"
                  rules={[{ required: true, message: 'Please enter classroom!' }]}
                >
                  <Input
                    size="large"
                    placeholder="Enter classroom name (e.g., A101, B205, LAB1...)"
                    prefix={<CalendarOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Select Schedule</Divider>

            {/* Day Selection */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Select days of the week:
              </Text>
              <Select
                mode="multiple"
                size="large"
                placeholder="Select class days in the week"
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
                      Select periods:
                    </Text>
                    <Select
                      mode="multiple"
                      size="large"
                      placeholder="Select periods (auto-split if not consecutive)"
                      style={{ width: '100%' }}
                      value={selectedPeriods}
                      onChange={(periods) => handlePeriodChange(day, periods)}
                    >
                      {TIME_SLOTS.map(slot => (
                        <Option key={slot.period} value={slot.period}>
                          Period {slot.period} ({slot.start} - {slot.end})
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {/* ✅ Auto-split sessions display */}
                  {daySchedule && daySchedule.sessions.length > 0 && (
                    <div>
                      <Divider orientation="left" style={{ margin: '12px 0' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Class sessions (auto-split)
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
                                Session {index + 1}
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
                          message="Note"
                          description={`The system has automatically split into ${daySchedule.sessions.length} sessions because the periods are not consecutive.`}
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
                  Please select class days in the week to set up the schedule
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
                message="Error creating class"
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
                📚 Subject Information
              </Title>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Text strong>Subject Name:</Text>
                  <br />
                  <Text style={{ fontSize: 16 }}>{formData.subject}</Text>
                </Col>
                <Col span={24}>
                  <Text strong>Description:</Text>
                  <br />
                  <Text>{formData.description}</Text>
                </Col>
              </Row>
            </Card>

            <Card style={{ marginBottom: 24 }}>
              <Title level={4} style={{ marginBottom: 16, color: '#10b981' }}>
                📍 Classroom
              </Title>
              <Text style={{ fontSize: 16 }}>Room {formData.room}</Text>
            </Card>

            <Card style={{ marginBottom: 24 }}>
              <Title level={4} style={{ marginBottom: 16, color: '#f59e0b' }}>
                📅 Schedule
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
                            <Text strong>Session {index + 1}:</Text> {formatTimeRange(session.periods)}
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
                ℹ️ Note
              </Title>
              <Text>
                After creating the class, you will be redirected to the class details page to add students.
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
            Go Back
          </Button>
          <Title level={1} style={{ 
            marginBottom: 4, 
            color: "#2563eb",
            fontSize: 32,
            fontWeight: 700
          }}>
            ➕ Create New Class
          </Title>
          <Text style={{ color: "#64748b", fontSize: 16 }}>
            Create a class with detailed information and flexible schedule
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
                  Back
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
                  Next
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
                  {loading ? 'Creating class...' : 'Create Class'}
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