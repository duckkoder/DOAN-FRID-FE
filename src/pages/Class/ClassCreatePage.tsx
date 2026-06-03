import React, { useState, useEffect } from "react";
import {
  App,
  Card,
  Form,
  Input,
  Button,
  Row,
  Col,
  Select,
  Typography,
  Space,
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
  EnvironmentOutlined,
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
import { getCoursesList, type CourseListItem } from "../../apis/coursesAPIs/course";
import { getRoomsList, type Room } from "../../apis/roomsAPIs/room";
import { useAuth } from "../../hooks/useAuth";
import { WEEK_DAYS_OPTIONS, PERIOD_OPTIONS } from "../../constants/mappings";

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
  location?: string;
}

interface ClassFormData {
  subject: string;
  description: string;
  room: string;
  course_id: string;
  schedules: ClassSchedule[];
}

const ClassCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ClassFormData>({
    subject: '',
    description: '',
    room: '',
    course_id: '',
    schedules: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  
  // ✅ Temporary selected periods for each day (before splitting)
  const [dayPeriods, setDayPeriods] = useState<Record<number, number[]>>({});
  // ✅ Room per day
  const [dayRooms, setDayRooms] = useState<Record<number, string>>({});
  
  // ✅ Course List Data
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  
  // ✅ Room List Data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  
  const userStr = useAuth().user;

  const t = (key: string, params?: Record<string, string | number>) => {
    const dict: Record<string, string> = {
      "class.create_failed": "Có lỗi xảy ra khi tạo lớp học",
      "class.create_success": "Tạo lớp học thành công",
      "error.details": "Chi tiết lỗi",
      "error.unknown": "Đã xảy ra lỗi không xác định",
      "api.room_not_found": "Phòng '{location}' không tồn tại hoặc đang bị khóa",
      "api.schedule_requires_location": "Mỗi buổi học phải có địa điểm",
      "api.teacher_only_create": "Chỉ giảng viên mới có thể tạo lớp học",
      "api.teacher_id_mismatch": "Bạn chỉ có thể tạo lớp cho chính mình",
      "api.course_uuid_invalid": "course_id không đúng định dạng UUID",
    };

    let content = dict[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        content = content.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return content;
  };

  const dayToVietnamese = (day: string): string => {
    const map: Record<string, string> = {
      monday: "Thứ Hai",
      tuesday: "Thứ Ba",
      wednesday: "Thứ Tư",
      thursday: "Thứ Năm",
      friday: "Thứ Sáu",
      saturday: "Thứ Bảy",
      sunday: "Chủ Nhật",
    };
    return map[day.toLowerCase()] || day;
  };

  const translateBackendMessage = (rawMessage?: string): string => {
    if (!rawMessage) return t("error.unknown");

    const roomMissing = rawMessage.match(/^Room '(.+)' does not exist or is inactive$/i);
    if (roomMissing) {
      return t("api.room_not_found", { location: roomMissing[1] });
    }

    if (/^Each schedule entry must include a location$/i.test(rawMessage)) {
      return t("api.schedule_requires_location");
    }

    if (/^Only teachers can create classes$/i.test(rawMessage)) {
      return t("api.teacher_only_create");
    }

    if (/^You can only create classes for yourself$/i.test(rawMessage)) {
      return t("api.teacher_id_mismatch");
    }

    if (/^course_id must be a valid UUID$/i.test(rawMessage)) {
      return t("api.course_uuid_invalid");
    }

    const scheduleConflict = rawMessage.match(
      /^Schedule conflict on (\w+) with class '(.+)' \(Code: (.+)\)\. Overlapping periods: \[(.*)\]$/i
    );
    if (scheduleConflict) {
      const [, day, className, classCode, periods] = scheduleConflict;
      return `Trùng lịch vào ${dayToVietnamese(day)} với lớp '${className}' (Mã: ${classCode}). Các tiết bị trùng: [${periods}]`;
    }

    const roomConflict = rawMessage.match(
      /^Room '(.+)' is already occupied on (\w+) by class '(.+)' \(Code: (.+)\)\. Overlapping periods: \[(.*)\]$/i
    );
    if (roomConflict) {
      const [, room, day, className, classCode, periods] = roomConflict;
      return `Phòng '${room}' đã có lớp vào ${dayToVietnamese(day)}: '${className}' (Mã: ${classCode}). Các tiết bị trùng: [${periods}]`;
    }

    return rawMessage;
  };

  const translateErrorDetails = (details: any): any => {
    if (!details) return details;
    if (typeof details === "string") return translateBackendMessage(details);
    if (Array.isArray(details)) return details.map((item) => translateErrorDetails(item));
    if (typeof details === "object") {
      const translated: Record<string, any> = {};
      Object.entries(details).forEach(([k, v]) => {
        translated[k] = translateErrorDetails(v);
      });
      return translated;
    }
    return details;
  };
  
  // Watch course_id to get the selected course code
  const selectedCourseId = Form.useWatch('course_id', form);
  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const courseCodePrefix = selectedCourse ? selectedCourse.code : '';
  
  
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

  // ✅ Fetch Courses for Dropdown
  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await getCoursesList();
        if (res.success) {
          setCourses(res.data.courses);
        }
      } catch (err) {
        console.error("Failed to load courses", err);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // ✅ Fetch Active Rooms for Dropdown
  useEffect(() => {
    const fetchRooms = async () => {
      setLoadingRooms(true);
      try {
        const resRooms = await getRoomsList(true); // active_only = true
        setRooms(resRooms);
      } catch (err) {
        console.error("Failed to load rooms", err);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, []);

  const breadcrumbItems = [
    { title: "Trang chủ", href: "/teacher" },
    { title: "Quản lý Lớp học", href: "/teacher/classes" },
    { title: "Tạo Lớp Mới" }
  ];

  const weekDays = WEEK_DAYS_OPTIONS;

  const steps = [
    {
      title: 'Thông tin cơ bản',
      icon: <BookOutlined />,
      description: 'Tên lớp, mô tả'
    },
    {
      title: 'Phòng & Lịch học',
      icon: <CalendarOutlined />,
      description: 'Phòng, ngày và ca học'
    },
    {
      title: 'Xác nhận',
      icon: <CheckCircleOutlined />,
      description: 'Xem lại và tạo lớp'
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
    
    // Remove periods and rooms for unselected days
    const newDayPeriods = { ...dayPeriods };
    const newDayRooms = { ...dayRooms };
    Object.keys(newDayPeriods).forEach(dayStr => {
      const day = parseInt(dayStr);
      if (!days.includes(day)) {
        delete newDayPeriods[day];
        delete newDayRooms[day];
      }
    });
    
    setDayPeriods(newDayPeriods);
    setDayRooms(newDayRooms);
    
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
    const firstSlot = PERIOD_OPTIONS.find(t => t.period === sortedPeriods[0]);
    const lastSlot = PERIOD_OPTIONS.find(t => t.period === sortedPeriods[sortedPeriods.length - 1]);
    
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
        const values = await form.validateFields(['subject', 'description', 'course_id']);
        setFormData(prev => ({ ...prev, ...values }));
      } else if (currentStep === 1) {
        // Validate schedules
        if (formData.schedules.length === 0) {
          message.error('Vui lòng chọn ít nhất một ngày học!');
          return;
        }

        const missingRoom = selectedDays.find(day => !dayRooms[day]);
        if (missingRoom !== undefined) {
          const dayLabel = weekDays.find(d => d.value === missingRoom)?.label || `Ngày ${missingRoom}`;
          message.error(`Vui lòng chọn phòng học cho ${dayLabel}!`);
          return;
        }
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
      setErrorMessage('Không tìm thấy thông tin Giảng viên. Vui lòng đăng nhập lại!');
      message.error('Không tìm thấy thông tin Giảng viên!');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setErrorDetails(null);

    try {
      // Convert frontend schedule format to backend format with per-day rooms
      const schedulesWithLocation = formData.schedules.map(s => ({
        ...s,
        location: dayRooms[s.day] || ''
      }));
      const backendSchedule = convertFrontendScheduleToBackend(schedulesWithLocation);

      
      

      // Combine course code and subject
      const submitCourse = courses.find(c => c.id === formData.course_id);
      const submitPrefix = submitCourse ? submitCourse.code : '';
      const finalClassName = submitPrefix 
        ? `${submitPrefix} - ${formData.subject}`
        : formData.subject;

      // Prepare request data
      const requestData: CreateClassRequest = {
        class_name: finalClassName,
        teacher_id: teacherId,
        course_id: formData.course_id || null,
        description: formData.description || null,
        schedule: backendSchedule
      };

      // Call API
      const response = await createClass(requestData);

      message.success(t("class.create_success"));

      // Navigate to class details
      setTimeout(() => {
        navigate(`/teacher/class/${response.data.class.id}`);
      }, 1000);

    } catch (error: any) {
      console.error('Failed to create class:', error);
      
      // ✅ Handle ApiError from createClass
      const apiError = error as ApiError;
      
      let displayMessage = t("class.create_failed");
      let details = null;

      if (apiError.message) {
        displayMessage = translateBackendMessage(apiError.message);
      }

      if (apiError.errors) {
        details = translateErrorDetails(apiError.errors);
        console.error('Error details:', details);
      }

      // Set error state for display in UI
      setErrorMessage(displayMessage);
      setErrorDetails(details);

      message.error(displayMessage);

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
          <Text strong>{t("error.details")}:</Text>
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
                label="Học phần (Course)"
                name="course_id"
                rules={[{ required: true, message: 'Vui lòng chọn Học phần (Course)!' }]}
              >
                <Select 
                  size="large" 
                  placeholder="Chọn học phần để liên kết tài liệu RAG" 
                  loading={loadingCourses}
                  showSearch
                  optionFilterProp="children"
                >
                  {courses.map(course => (
                    <Option key={course.id} value={course.id}>
                      <Text strong>{course.code}</Text> - {course.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Tên Lớp Học Phần"
                name="subject"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên lớp học!' },
                  { min: 3, message: 'Tên lớp phải có ít nhất 3 ký tự!' }
                ]}
              >
                <Input 
                  size="large" 
                  placeholder={courseCodePrefix ? "VD: Nhóm 1, Lớp 2..." : "Vui lòng chọn Học phần trước"}
                  prefix={<BookOutlined />}
                  addonBefore={courseCodePrefix ? `${courseCodePrefix} -` : undefined}
                  disabled={!selectedCourseId}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Mô tả lớp học"
                name="description"
                rules={[
                  { required: true, message: 'Vui lòng nhập mô tả lớp học!' },
                  { min: 10, message: 'Mô tả phải có ít nhất 10 ký tự!' }
                ]}
              >
                <TextArea 
                  rows={6} 
                  placeholder="Mô tả chi tiết về lớp học, mục tiêu và nội dung chính..."
                />
              </Form.Item>
            </Col>
          </Row>
        );

      case 1:
        return (
          <div>
                    <Divider orientation="left">Chọn Lịch học</Divider>

            {/* Day Selection */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Chọn ngày trong tuần:
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
                  {/* Room per day */}
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Phòng học:</Text>
                    <Select
                      size="large"
                      placeholder="Chọn phòng học cho ngày này"
                      style={{ width: '100%' }}
                      value={dayRooms[day] || undefined}
                      onChange={(val) => setDayRooms(prev => ({ ...prev, [day]: val }))}
                      showSearch
                      optionFilterProp="children"
                      loading={loadingRooms}
                    >
                      {rooms.map(r => (
                        <Option key={r.name} value={r.name}>
                          {r.name}{r.capacity ? ` (Sức chứa: ${r.capacity})` : ''}
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {/* ✅ Period Selector */}
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Chọn tiết học:
                    </Text>
                    <Select
                      mode="multiple"
                      size="large"
                      placeholder="Chọn các tiết học (tự động chia ca nếu không liên tiếp)"
                      style={{ width: '100%' }}
                      value={selectedPeriods}
                      onChange={(periods) => handlePeriodChange(day, periods)}
                    >
                      {PERIOD_OPTIONS.map(slot => (
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
                          description={`Hệ thống đã tự động chia làm ${daySchedule.sessions.length} buổi học vì các tiết học bạn chọn không liên tiếp nhau.`}
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
                  Vui lòng chọn ngày học trong tuần để thiết lập lịch học
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
                📚 Thông tin cơ bản
              </Title>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Text strong>Học phần (Course):</Text>
                  <br />
                  <Text style={{ fontSize: 16 }}>
                    {courses.find(c => c.id === formData.course_id)?.title || formData.course_id}
                  </Text>
                </Col>
                <Col span={24}>
                  <Text strong>Tên lớp học:</Text>
                  <br />
                  <Text style={{ fontSize: 16 }}>
                    {courseCodePrefix ? `${courseCodePrefix} - ` : ""}{formData.subject}
                  </Text>
                </Col>
                <Col span={24}>
                  <Text strong>Mô tả:</Text>
                  <br />
                  <Text>{formData.description}</Text>
                </Col>
              </Row>
            </Card>

            <Card style={{ marginBottom: 24 }}>
              <Title level={4} style={{ marginBottom: 16, color: '#f59e0b' }}>
                📅 Lịch học
              </Title>
              {formData.schedules.map(schedule => {
                const dayLabel = weekDays.find(d => d.value === schedule.day)?.label;
                const roomForDay = dayRooms[schedule.day];
                return (
                  <div key={schedule.day} style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                      {dayLabel}
                    </Text>
                    {roomForDay && (
                      <div style={{ marginLeft: 24, marginTop: 4 }}>
                        <Space>
                          <EnvironmentOutlined style={{ color: '#10b981' }} />
                          <Text type="secondary">Phòng: {roomForDay}</Text>
                        </Space>
                      </div>
                    )}
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
                Sau khi tạo lớp học thành công, bạn sẽ được chuyển đến trang chi tiết để có thể thêm danh sách sinh viên.
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

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginTop: 18,
        marginBottom: 28 
      }}>
        <Space align="center" size={16}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 14px 30px rgba(37, 99, 235, 0.18)",
            }}
          >
            <BookOutlined style={{ fontSize: 28, color: "#2563eb" }} />
          </div>
          <div>
            <Title
              level={1}
              style={{
                margin: 0,
                color: "#2563eb",
                fontSize: "clamp(30px, 4vw, 40px)",
                fontWeight: 800,
                lineHeight: 1.12,
              }}
            >
              Tạo Lớp Học
            </Title>
            <Text style={{ color: "#64748b", fontSize: 16 }}>
              Thiết lập học phần, phòng học và lịch giảng dạy cho từng buổi
            </Text>
          </div>
        </Space>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ borderRadius: 8 }}
        >
          Quay lại
        </Button>
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
                  {loading ? 'Đang tạo...' : 'Tạo Lớp Học'}
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
