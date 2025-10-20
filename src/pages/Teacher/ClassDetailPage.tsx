import React, { useState, useEffect, useMemo } from "react";
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Table, 
  Tag, 
  Button,
  Tabs,
  Progress,
  Space,
  Avatar,
  Statistic,
  Modal,
  Form,
  Input,
  Tooltip,
  Badge,
  Select,
  message,
  Divider,
  Alert
} from "antd";
import { 
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  BookOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  FileTextOutlined,
  EyeOutlined,
  FilterOutlined,
  PlusOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";
import dayjs from 'dayjs';
import { 
  getClassDetails, 
  updateClass,
  convertFrontendScheduleToBackend,
  type GetClassDetailsResponse,
  type UpdateClassRequest,
  type ApiError
} from "../../apis/classesAPIs/teacherClass";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

// ✅ Time slots mapping
const TIME_SLOTS: Record<number, { start: string; end: string }> = {
  1: { start: "07:00", end: "07:50" },
  2: { start: "08:00", end: "08:50" },
  3: { start: "09:00", end: "09:50" },
  4: { start: "10:00", end: "10:50" },
  5: { start: "11:00", end: "11:50" },
  6: { start: "13:00", end: "13:50" },
  7: { start: "14:00", end: "14:50" },
  8: { start: "15:00", end: "15:50" },
  9: { start: "16:00", end: "16:50" },
  10: { start: "17:00", end: "17:50" },
};

const TIME_SLOT_OPTIONS = Object.entries(TIME_SLOTS).map(([period, time]) => ({
  period: Number(period),
  label: `Tiết ${period} (${time.start} - ${time.end})`,
  ...time
}));

interface ClassData {
  id: number;
  subject: string;
  classCode: string;
  description: string;
  room: string;
  status: 'active' | 'inactive';
  teacher: string;
  teacherId: number;
  maxStudents: number;
  studentCount: number;
  schedule: Record<string, string[]>; // { monday: ["1-3", "6-7"], tuesday: ["1-1"] }
  attendanceStats?: {
    totalSessions: number;
    averageAttendance: number;
    totalStudents: number;
  };
}

interface Student {
  id: string;
  name: string;
  studentId: string;
  email: string;
  avatar?: string;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
}

interface AttendanceSession {
  id: string;
  date: string;
  sessionNumber: number;
  status: 'completed' | 'ongoing' | 'upcoming';
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

interface LeaveRequest {
  id: string;
  studentName: string;
  studentId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  approverNote?: string;
}

// ✅ Schedule Session Interface
interface ScheduleSession {
  day: string;
  dayLabel: string;
  sessions: {
    periods: string;
    timeRange: string;
  }[];
}

// ✅ Edit form schedule interface
interface EditClassSchedule {
  day: number;
  sessions: {
    id: string;
    periods: number[];
  }[];
}

// ✅ Add interface for upcoming sessions
interface UpcomingSession {
  day: number;
  dayLabel: string;
  sessionIndex: number;
  periods: string;
  timeRange: string;
  date: string; // Next occurrence date
}

const ClassDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ classId: string }>();
  
  // ✅ Ưu tiên lấy từ URL params, sau đó mới đến location.state
  const classId = useMemo(() => {
    // Lấy từ URL param trước
    if (params.classId) {
      const parsed = parseInt(params.classId, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }, [params.classId]);

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isStudentDetailVisible, setIsStudentDetailVisible] = useState(false);
  const [isRequestDetailVisible, setIsRequestDetailVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [requestFilter, setRequestFilter] = useState<'all' | 'active' | 'expired'>('all');

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loadingClass, setLoadingClass] = useState<boolean>(false);
  const [classError, setClassError] = useState<string | null>(null);

  // ✅ Edit form states
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editErrorDetails, setEditErrorDetails] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayPeriods, setDayPeriods] = useState<Record<number, number[]>>({});
  const [editSchedules, setEditSchedules] = useState<EditClassSchedule[]>([]);

  // ✅ Add state for attendance modal
  const [isAttendanceModalVisible, setIsAttendanceModalVisible] = useState(false);
  const [selectedAttendanceSession, setSelectedAttendanceSession] = useState<UpcomingSession | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);

  const weekDays = [
    { value: 1, label: "Thứ 2" },
    { value: 2, label: "Thứ 3" },
    { value: 3, label: "Thứ 4" },
    { value: 4, label: "Thứ 5" },
    { value: 5, label: "Thứ 6" },
    { value: 6, label: "Thứ 7" },
    { value: 0, label: "Chủ nhật" }
  ];

  // ✅ Split periods into consecutive groups
  const splitPeriodsIntoSessions = (periods: number[]): number[][] => {
    if (periods.length === 0) return [];
    
    const sorted = [...periods].sort((a, b) => a - b);
    const sessions: number[][] = [];
    let currentSession: number[] = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        currentSession.push(sorted[i]);
      } else {
        sessions.push(currentSession);
        currentSession = [sorted[i]];
      }
    }
    
    sessions.push(currentSession);
    return sessions;
  };

  // ✅ Parse backend schedule to frontend format
  const parseBackendScheduleToFrontend = (schedule: Record<string, string[]>): {
    selectedDays: number[];
    dayPeriods: Record<number, number[]>;
  } => {
    const dayMapping: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };

    const days: number[] = [];
    const periods: Record<number, number[]> = {};

    Object.entries(schedule).forEach(([dayName, periodRanges]) => {
      const dayNum = dayMapping[dayName.toLowerCase()];
      if (dayNum === undefined || !periodRanges || periodRanges.length === 0) return;

      days.push(dayNum);
      
      // Merge all period ranges into single array
      const allPeriods: number[] = [];
      periodRanges.forEach(range => {
        const [start, end] = range.split('-').map(Number);
        for (let i = start; i <= end; i++) {
          if (!allPeriods.includes(i)) {
            allPeriods.push(i);
          }
        }
      });
      
      periods[dayNum] = allPeriods.sort((a, b) => a - b);
    });

    return { selectedDays: days, dayPeriods: periods };
  };

  // ✅ Parse schedule to readable format
  const parseSchedule = (schedule: Record<string, string[]>): ScheduleSession[] => {
    const dayMapping: Record<string, string> = {
      monday: 'Thứ 2',
      tuesday: 'Thứ 3',
      wednesday: 'Thứ 4',
      thursday: 'Thứ 5',
      friday: 'Thứ 6',
      saturday: 'Thứ 7',
      sunday: 'Chủ nhật'
    };

    const result: ScheduleSession[] = [];

    Object.entries(schedule).forEach(([day, periodRanges]) => {
      if (!periodRanges || periodRanges.length === 0) return;

      const sessions = periodRanges.map(range => {
        const [start, end] = range.split('-').map(Number);
        const startTime = TIME_SLOTS[start]?.start || '??:??';
        const endTime = TIME_SLOTS[end]?.end || '??:??';
        
        return {
          periods: start === end ? `Tiết ${start}` : `Tiết ${start}-${end}`,
          timeRange: `${startTime} - ${endTime}`
        };
      });

      result.push({
        day,
        dayLabel: dayMapping[day] || day,
        sessions
      });
    });

    return result;
  };

  // ✅ Handle day selection in edit form
  const handleEditDayChange = (days: number[]) => {
    setSelectedDays(days);
    
    const newDayPeriods = { ...dayPeriods };
    Object.keys(newDayPeriods).forEach(dayStr => {
      const day = parseInt(dayStr);
      if (!days.includes(day)) {
        delete newDayPeriods[day];
      }
    });
    
    setDayPeriods(newDayPeriods);
    updateEditSchedulesFromPeriods(newDayPeriods);
  };

  // ✅ Handle period selection for a day in edit form
  const handleEditPeriodChange = (day: number, periods: number[]) => {
    const newDayPeriods = {
      ...dayPeriods,
      [day]: periods
    };
    
    setDayPeriods(newDayPeriods);
    updateEditSchedulesFromPeriods(newDayPeriods);
  };

  // ✅ Update schedules based on selected periods
  const updateEditSchedulesFromPeriods = (periods: Record<number, number[]>) => {
    const newSchedules: EditClassSchedule[] = [];
    
    Object.entries(periods).forEach(([dayStr, selectedPeriods]) => {
      const day = parseInt(dayStr);
      
      if (selectedPeriods.length === 0) return;
      
      const sessionGroups = splitPeriodsIntoSessions(selectedPeriods);
      
      const sessions = sessionGroups.map((group, index) => ({
        id: `${day}-${index}-${Date.now()}`,
        periods: group
      }));
      
      newSchedules.push({
        day,
        sessions
      });
    });
    
    setEditSchedules(newSchedules);
  };

  // Format time display
  const formatTimeRange = (periods: number[]) => {
    if (periods.length === 0) return "Chưa chọn";
    
    const sortedPeriods = [...periods].sort((a, b) => a - b);
    const firstSlot = TIME_SLOTS[sortedPeriods[0]];
    const lastSlot = TIME_SLOTS[sortedPeriods[sortedPeriods.length - 1]];
    
    if (sortedPeriods.length === 1) {
      return `${firstSlot?.start} - ${firstSlot?.end} (Tiết ${sortedPeriods[0]})`;
    }
    
    return `${firstSlot?.start} - ${lastSlot?.end} (Tiết ${sortedPeriods.join(', ')})`;
  };

  // ✅ Open edit modal
  const handleOpenEditModal = () => {
    if (!classData) return;

    // Parse current schedule to frontend format
    const { selectedDays: days, dayPeriods: periods } = parseBackendScheduleToFrontend(classData.schedule);
    
    setSelectedDays(days);
    setDayPeriods(periods);
    updateEditSchedulesFromPeriods(periods);

    // Set form values
    editForm.setFieldsValue({
      subject: classData.subject,
      description: classData.description,
      room: classData.room,
      maxStudents: classData.maxStudents
    });

    setEditError(null);
    setEditErrorDetails(null);
    setIsEditModalVisible(true);
  };

  // ✅ Handle update class
  const handleUpdateClass = async () => {
    try {
      setEditError(null);
      setEditErrorDetails(null);

      // Validate form
      const values = await editForm.validateFields();

      // Validate schedules
      if (editSchedules.length === 0) {
        message.error('Vui lòng chọn ít nhất một ngày học!');
        return;
      }

      const hasEmptyPeriods = editSchedules.some(schedule => 
        schedule.sessions.some(session => session.periods.length === 0)
      );

      if (hasEmptyPeriods) {
        message.error('Vui lòng chọn khung giờ cho tất cả các buổi học!');
        return;
      }

      setEditLoading(true);

      // Convert schedule to backend format
      const backendSchedule = convertFrontendScheduleToBackend(editSchedules, values.room);

      // Prepare update request
      const updateData: UpdateClassRequest = {
        class_name: values.subject,
        location: values.room || null,
        description: values.description || null,
        schedule: backendSchedule
      };

      console.log('Updating class with data:', updateData);

      // Call API
      const response = await updateClass(Number(classId), updateData);

      console.log('Class updated successfully:', response);

      message.success('Cập nhật lớp học thành công!');

      // Refresh class data
      const refreshedData = await getClassDetails(Number(classId));
      const cls = refreshedData?.data?.class;
      
      if (cls) {
        const mapped: ClassData = {
          id: cls.id,
          subject: cls.subject || "Không tên",
          classCode: cls.classCode || "",
          description: cls.description || "",
          room: cls.room || "N/A",
          status: cls.status === "inactive" ? "inactive" : "active",
          teacher: cls.teacher || "N/A",
          teacherId: cls.teacherId || 0,
          maxStudents: cls.maxStudents || 30,
          studentCount: cls.students || 0,
          schedule: cls.schedule || {},
          attendanceStats: refreshedData.data.attendanceStats
        };
        setClassData(mapped);
      }

      setIsEditModalVisible(false);
    } catch (error: any) {
      console.error('Failed to update class:', error);

      const apiError = error as ApiError;
      let displayMessage = 'Có lỗi xảy ra khi cập nhật lớp học';
      let details = null;

      if (apiError.message) {
        displayMessage = apiError.message;
      }

      if (apiError.errors) {
        details = apiError.errors;
      }

      setEditError(displayMessage);
      setEditErrorDetails(details);

      message.error({
        content: displayMessage,
        duration: 5,
      });
    } finally {
      setEditLoading(false);
    }
  };

  // ✅ Render error details
  const renderEditErrorDetails = () => {
    if (!editErrorDetails) return null;

    if (typeof editErrorDetails === 'object' && !Array.isArray(editErrorDetails)) {
      return (
        <div style={{ marginTop: 12 }}>
          <Text strong>Chi tiết lỗi:</Text>
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            {Object.entries(editErrorDetails).map(([field, messages]) => (
              <li key={field}>
                {Array.isArray(messages) ? messages.join(', ') : String(messages)}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div style={{ marginTop: 12 }}>
        <Text strong>Chi tiết: </Text>
        <Text>{String(editErrorDetails)}</Text>
      </div>
    );
  };

    // ✅ Calculate upcoming sessions in current week (only future sessions)
  const calculateUpcomingSessions = (): UpcomingSession[] => {
    if (!classData || !classData.schedule) return [];

    const now = dayjs();
    const currentDayOfWeek = now.day(); // 0 = Sunday, 1 = Monday, ...
    const currentTime = now.format('HH:mm');

    const dayMapping: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };

    const dayLabelMapping: Record<number, string> = {
      0: 'Chủ nhật',
      1: 'Thứ 2',
      2: 'Thứ 3',
      3: 'Thứ 4',
      4: 'Thứ 5',
      5: 'Thứ 6',
      6: 'Thứ 7'
    };

    const sessions: UpcomingSession[] = [];

    Object.entries(classData.schedule).forEach(([dayName, periodRanges]) => {
      const dayNum = dayMapping[dayName.toLowerCase()];
      if (dayNum === undefined || !periodRanges || periodRanges.length === 0) return;

      periodRanges.forEach((range, index) => {
        const [start, end] = range.split('-').map(Number);
        const startTime = TIME_SLOTS[start]?.start || '00:00';
        const endTime = TIME_SLOTS[end]?.end || '00:00';

        // Calculate days until session
        let daysUntilSession = dayNum - currentDayOfWeek;
        
        // If day is in the past this week, skip it
        if (daysUntilSession < 0) {
          return; // Don't show past days
        }
        
        // If today, check if session time has passed
        if (daysUntilSession === 0 && currentTime >= endTime) {
          return; // Session already ended today
        }

        const sessionDate = now.add(daysUntilSession, 'day');

        // Only include sessions from today onwards (within current week)
        if (daysUntilSession >= 0 && daysUntilSession <= 6) {
          sessions.push({
            day: dayNum,
            dayLabel: dayLabelMapping[dayNum] || dayName,
            sessionIndex: index,
            periods: start === end ? `Tiết ${start}` : `Tiết ${start}-${end}`,
            timeRange: `${startTime} - ${endTime}`,
            date: sessionDate.format('DD/MM/YYYY')
          });
        }
      });
    });

    // Sort by date and time
    return sessions.sort((a, b) => {
      const dateCompare = dayjs(a.date, 'DD/MM/YYYY').diff(dayjs(b.date, 'DD/MM/YYYY'));
      if (dateCompare !== 0) return dateCompare;
      return a.day - b.day;
    });
  };

  // ✅ Open attendance modal and calculate upcoming sessions
  const handleOpenAttendanceModal = () => {
    const sessions = calculateUpcomingSessions();
    setUpcomingSessions(sessions);
    setSelectedAttendanceSession(null);
    setIsAttendanceModalVisible(true);
  };

  // ✅ Handle start attendance
  const handleStartAttendance = () => {
    if (!selectedAttendanceSession) {
      message.warning('Vui lòng chọn buổi học để bắt đầu điểm danh!');
      return;
    }

    // TODO: Navigate to attendance page or start attendance session
    message.info(`Bắt đầu điểm danh cho ${selectedAttendanceSession.dayLabel}, ${selectedAttendanceSession.periods}`);
    console.log('Selected session:', selectedAttendanceSession);
    
    // Close modal
    setIsAttendanceModalVisible(false);
  };

  // Fetch class details when page loads / classId changes
  useEffect(() => {
    const fetchClass = async () => {
      if (!classId) {
        setClassError("Không tìm thấy ID lớp học. Vui lòng thử lại.");
        return;
      }

      setLoadingClass(true);
      setClassError(null);

      try {
        const res: GetClassDetailsResponse = await getClassDetails(classId);

        console.log("Fetched class details:", res);
        
        const cls = res?.data?.class;
        if (!cls) {
          throw new Error("Không có dữ liệu lớp học trả về từ server.");
        }

        // ✅ Map backend response to ClassData
        const mapped: ClassData = {
          id: cls.id,
          subject: cls.subject || "Không tên",
          classCode: cls.classCode || "",
          description: cls.description || "",
          room: cls.room || "N/A",
          status: cls.status === "inactive" ? "inactive" : "active",
          teacher: cls.teacher || "N/A",
          teacherId: cls.teacherId || 0,
          maxStudents: cls.maxStudents || 30,
          studentCount: cls.students || 0,
          schedule: cls.schedule || {},
          attendanceStats: res.data.attendanceStats
        };

        setClassData(mapped);
      } catch (err: any) {
        console.error("Failed to load class details:", err);
        const msg = err?.response?.data?.message || err?.message || "Không thể tải chi tiết lớp học";
        setClassError(String(msg));
        message.error(String(msg));
      } finally {
        setLoadingClass(false);
      }
    };

    fetchClass();
  }, [classId]); // ✅ Chỉ phụ thuộc vào classId

  // If loading, show simple loading state
  if (loadingClass) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card>
          <Text>Đang tải chi tiết lớp học...</Text>
        </Card>
      </div>
    );
  }

  // If error and no classData, show alert and allow navigate back
  if (classError && !classData) {
    return (
      <div style={{ padding: 32 }}>
        <Card>
          <Title level={4}>Không thể tải lớp học</Title>
          <Text type="danger">{classError}</Text>
          <div style={{ marginTop: 16 }}>
            <Button onClick={() => navigate(-1)}>Quay lại</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!classData) {
    return (
      <div style={{ padding: 32 }}>
        <Card>
          <Title level={4}>Không tìm thấy dữ liệu lớp học</Title>
          <Button onClick={() => navigate(-1)}>Quay lại</Button>
        </Card>
      </div>
    );
  }

  // ✅ Parse schedule for display
  const scheduleSessions = parseSchedule(classData.schedule);

  // Mock data for students (keep existing mock data)
  const students: Student[] = [
    {
      id: "1",
      name: "Nguyễn Văn An",
      studentId: "SV001",
      email: "an.nv@student.hust.edu.vn",
      totalSessions: 15,
      presentCount: 14,
      absentCount: 1,
      lateCount: 2,
      attendanceRate: 93.3
    },
  ];

  const attendanceSessions: AttendanceSession[] = [];
  const leaveRequests: LeaveRequest[] = [];

  // Mock data for students
  const studentsMock: Student[] = [
    {
      id: "1",
      name: "Nguyễn Văn An",
      studentId: "SV001",
      email: "an.nv@student.hust.edu.vn",
      totalSessions: 15,
      presentCount: 14,
      absentCount: 1,
      lateCount: 2,
      attendanceRate: 93.3
    },
    {
      id: "2",
      name: "Trần Thị Bình",
      studentId: "SV002",
      email: "binh.tt@student.hust.edu.vn",
      totalSessions: 15,
      presentCount: 13,
      absentCount: 2,
      lateCount: 1,
      attendanceRate: 86.7
    },
    {
      id: "3",
      name: "Lê Văn Cường",
      studentId: "SV003",
      email: "cuong.lv@student.hust.edu.vn",
      totalSessions: 15,
      presentCount: 15,
      absentCount: 0,
      lateCount: 0,
      attendanceRate: 100
    },
  ];

  // Mock data for attendance sessions
  const attendanceSessionsMock: AttendanceSession[] = [
    {
      id: "1",
      date: "2024-10-01",
      sessionNumber: 1,
      status: 'completed',
      presentCount: 33,
      absentCount: 2,
      lateCount: 0
    },
    {
      id: "2", 
      date: "2024-10-03",
      sessionNumber: 2,
      status: 'completed',
      presentCount: 32,
      absentCount: 2,
      lateCount: 1
    },
  ];

  // Mock data for leave requests
  const leaveRequestsMock: LeaveRequest[] = [
    {
      id: "1",
      studentName: "Nguyễn Văn An",
      studentId: "SV001",
      startDate: "2024-10-15",
      endDate: "2024-10-15",
      reason: "Bị sốt cao, cần nghỉ ngơi",
      status: 'pending',
      submittedDate: "2024-10-10"
    },
  ];

  const breadcrumbItems = [
    { title: "Dashboard", href: "/teacher" },
    { title: "Class Management", href: "/teacher/classes" },
    { title: classData.subject }
  ];

  const getFilteredRequests = () => {
    const currentDate = dayjs();
    
    switch(requestFilter) {
      case 'active':
        return leaveRequestsMock.filter(req => {
          const startDate = dayjs(req.startDate);
          const endDate = dayjs(req.endDate);
          return startDate.diff(currentDate) > 0 || 
                 (startDate.diff(currentDate) <= 0 && endDate.diff(currentDate) >= 0);
        });
      case 'expired':
        return leaveRequestsMock.filter(req => dayjs(req.endDate).diff(currentDate) < 0);
      default:
        return leaveRequestsMock;
    }
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'active':
        return { color: '#10b981', text: 'Đang hoạt động' };
      case 'inactive':
        return { color: '#ef4444', text: 'Không hoạt động' };
      case 'pending':
        return { color: '#f59e0b', text: 'Đang chờ' };
      case 'approved':
        return { color: '#10b981', text: 'Đã duyệt' };
      case 'rejected':
        return { color: '#ef4444', text: 'Từ chối' };
      case 'completed':
        return { color: '#64748b', text: 'Đã hoàn thành' };
      case 'ongoing':
        return { color: '#10b981', text: 'Đang diễn ra' };
      case 'upcoming':
        return { color: '#3b82f6', text: 'Sắp diễn ra' };
      default:
        return { color: '#64748b', text: 'Không xác định' };
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return '#10b981';
    if (rate >= 85) return '#3b82f6';
    if (rate >= 75) return '#f59e0b';
    return '#ef4444';
  };

  const handleViewStudentDetail = (student: Student) => {
    setSelectedStudent(student);
    setIsStudentDetailVisible(true);
  };

  const totalSessions = classData.attendanceStats?.totalSessions || 0;
  const avgAttendance = classData.attendanceStats?.averageAttendance || 0;
  const pendingRequests = 0;

  const studentColumns = [
    {
      title: 'Học sinh',
      key: 'student',
      render: (record: Student) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar size={40} icon={<UserOutlined />} src={record.avatar} />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.studentId}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.email}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Tổng buổi',
      dataIndex: 'totalSessions',
      key: 'totalSessions',
      align: 'center' as const
    },
    {
      title: 'Có mặt',
      dataIndex: 'presentCount',
      key: 'presentCount',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="#10b981" icon={<CheckCircleOutlined />}>{count}</Tag>
      )
    },
    {
      title: 'Vắng',
      dataIndex: 'absentCount',
      key: 'absentCount',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="#ef4444" icon={<CloseCircleOutlined />}>{count}</Tag>
      )
    },
    {
      title: 'Muộn',
      dataIndex: 'lateCount',
      key: 'lateCount',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="#f59e0b" icon={<ClockCircleOutlined />}>{count}</Tag>
      )
    },
    {
      title: 'Tỷ lệ điểm danh',
      dataIndex: 'attendanceRate',
      key: 'attendanceRate',
      align: 'center' as const,
      render: (rate: number) => (
        <div style={{ textAlign: 'center' }}>
          <Progress 
            percent={rate} 
            size="small"
            strokeColor={getAttendanceColor(rate)}
            style={{ width: 80, marginBottom: 4 }}
            showInfo={false}
          />
          <div>
            <Text style={{ 
              color: getAttendanceColor(rate), 
              fontWeight: 600, 
              fontSize: 12 
            }}>
              {rate.toFixed(1)}%
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      render: (record: Student) => (
        <Button 
          size="small" 
          icon={<EyeOutlined />}
          onClick={() => handleViewStudentDetail(record)}
        >
          Chi tiết
        </Button>
      )
    }
  ];

  const sessionColumns = [
    {
      title: 'Buổi học',
      key: 'session',
      render: (record: AttendanceSession) => (
        <div>
          <Text strong>Buổi {record.sessionNumber}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(record.date).format('DD/MM/YYYY')}
          </Text>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Có mặt',
      dataIndex: 'presentCount',
      key: 'presentCount',
      align: 'center' as const,
      render: (count: number, record: AttendanceSession) => (
        record.status === 'completed' ? 
          <Tag color="#10b981">{count}</Tag> : 
          <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Vắng',
      dataIndex: 'absentCount', 
      key: 'absentCount',
      align: 'center' as const,
      render: (count: number, record: AttendanceSession) => (
        record.status === 'completed' ? 
          <Tag color="#ef4444">{count}</Tag> : 
          <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Muộn',
      dataIndex: 'lateCount',
      key: 'lateCount', 
      align: 'center' as const,
      render: (count: number, record: AttendanceSession) => (
        record.status === 'completed' ? 
          <Tag color="#f59e0b">{count}</Tag> : 
          <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (record: AttendanceSession) => (
        <Space>
          {record.status === 'ongoing' && (
            <Button type="primary" size="small">
              Điểm danh
            </Button>
          )}
          {record.status === 'completed' && (
            <Button size="small" icon={<EditOutlined />}>
              Sửa
            </Button>
          )}
        </Space>
      )
    }
  ];

  const requestColumns = [
    {
      title: 'Học sinh',
      key: 'student',
      render: (record: LeaveRequest) => (
        <div>
          <Text strong>{record.studentName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.studentId}
          </Text>
        </div>
      )
    },
    {
      title: 'Thời gian nghỉ',
      key: 'duration',
      render: (record: LeaveRequest) => {
        const isExpired = dayjs(record.endDate).diff(dayjs()) < 0;
        return (
          <div>
            <Text>{dayjs(record.startDate).format('DD/MM/YYYY')}</Text>
            {record.startDate !== record.endDate && (
              <>
                <Text> - </Text>
                <Text>{dayjs(record.endDate).format('DD/MM/YYYY')}</Text>
              </>
            )}
            {isExpired && (
              <div>
                <Tag color="#64748b" size="small" style={{ marginTop: 4 }}>
                  Đã qua hạn
                </Tag>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => (
        <Tooltip title={reason}>
          <Text style={{ 
            display: 'block',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {reason}
          </Text>
        </Tooltip>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'submittedDate',
      key: 'submittedDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (record: LeaveRequest) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewRequestDetail(record)}
          >
            Chi tiết
          </Button>
          {record.status === 'pending' && (
            <>
              <Button 
                size="small" 
                type="primary"
                onClick={() => handleApproveRequest(record.id)}
              >
                Duyệt
              </Button>
              <Button 
                size="small" 
                danger
                onClick={() => handleRejectRequest(record.id)}
              >
                Từ chối
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  const filteredRequests = getFilteredRequests();

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
        alignItems: "flex-start", 
        marginBottom: 32 
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ borderRadius: 8 }}
            >
              Quay lại
            </Button>
            <div>
              <Title level={1} style={{ 
                marginBottom: 4, 
                color: "#2563eb",
                fontSize: 32,
                fontWeight: 700
              }}>
                📚 {classData.subject}
              </Title>
              <Space size={16} wrap>
                <Tag color={getStatusConfig(classData.status).color} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {getStatusConfig(classData.status).text}
                </Tag>
                <Text style={{ color: "#64748b", fontSize: 16 }}>
                  <BookOutlined /> Mã lớp: {classData.classCode}
                </Text>
                <Text style={{ color: "#64748b", fontSize: 16 }}>
                  <EnvironmentOutlined /> Phòng {classData.room}
                </Text>
              </Space>
            </div>
          </div>

          {/* Schedule Display */}
          <Card 
            style={{ 
              marginTop: 16, 
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '2px solid #bae6fd'
            }}
          >
            <Title level={5} style={{ marginBottom: 16, color: '#0369a1' }}>
              📅 Lịch dạy trong tuần
            </Title>
            {scheduleSessions.length > 0 ? (
              <Row gutter={[16, 16]}>
                {scheduleSessions.map((schedule) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={schedule.day}>
                    <Card 
                      size="small"
                      style={{ 
                        background: '#ffffff',
                        border: '1px solid #e0f2fe'
                      }}
                    >
                      <Text strong style={{ color: '#0369a1', fontSize: 14 }}>
                        <CalendarOutlined /> {schedule.dayLabel}
                      </Text>
                      <Divider style={{ margin: '8px 0' }} />
                      {schedule.sessions.map((session, idx) => (
                        <div key={idx} style={{ marginBottom: 8 }}>
                          <Tag color="blue" style={{ marginBottom: 4 }}>
                            {session.periods}
                          </Tag>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <ClockCircleOutlined /> {session.timeRange}
                          </Text>
                        </div>
                      ))}
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Text type="secondary">Chưa có lịch học</Text>
            )}
          </Card>
        </div>

        {/* ✅ Action Buttons */}
        <Space direction="vertical" size={12} style={{ marginLeft: 16 }}>
          <Button 
            type="primary"
            icon={<PlayCircleOutlined />}
            size="large"
            onClick={handleOpenAttendanceModal}
            style={{ 
              borderRadius: 8,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              width: 200
            }}
          >
            Tạo phiên điểm danh
          </Button>
          <Button 
            type="primary"
            icon={<EditOutlined />}
            size="large"
            onClick={handleOpenEditModal}
            style={{ borderRadius: 8, width: 200 }}
          >
            Chỉnh sửa lớp học
          </Button>
        </Space>
      </div>

      {/* Statistics */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Tổng sinh viên"
              value={classData.studentCount}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#2563eb', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Buổi học đã có"
              value={totalSessions}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#10b981', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Điểm danh TB"
              value={avgAttendance}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#f59e0b', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Badge count={pendingRequests} offset={[10, 0]}>
              <Statistic
                title="Đơn xin nghỉ"
                value={leaveRequests.length}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#8b5cf6', fontSize: 20 }}
              />
            </Badge>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card style={{
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none"
      }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
        >
          <TabPane tab="📊 Tổng quan" key="overview">
            <Row gutter={[24, 24]}>
              <Col span={24}>
                <Card 
                  title={
                    <Space>
                      <Text strong>📝 Mô tả lớp học</Text>
                    </Space>
                  }
                  style={{ borderRadius: 12, marginBottom: 24 }}
                >
                  <Text>{classData.description || "Chưa có mô tả"}</Text>
                </Card>
              </Col>

              <Col span={24}>
                <Card title="📋 Danh sách học sinh" style={{ borderRadius: 12 }}>
                  <Table
                    dataSource={students}
                    columns={studentColumns}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showTotal: (total, range) => 
                        `${range[0]}-${range[1]} của ${total} học sinh`
                    }}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="📅 Điểm danh" key="attendance">
            <Card title="📊 Lịch sử điểm danh" style={{ borderRadius: 12 }}>
              <Table
                dataSource={attendanceSessions}
                columns={sessionColumns}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} của ${total} buổi học`
                }}
              />
            </Card>
          </TabPane>

          <TabPane 
            tab={
              <Badge count={pendingRequests} size="small">
                📝 Đơn xin nghỉ
              </Badge>
            } 
            key="requests"
          >
            <Card 
              title="📋 Đơn xin nghỉ học" 
              style={{ borderRadius: 12 }}
              extra={
                <Space>
                  <FilterOutlined />
                  <Select
                    value={requestFilter}
                    onChange={setRequestFilter}
                    style={{ width: 150 }}
                  >
                    <Select.Option value="all">Tất cả đơn</Select.Option>
                    <Select.Option value="active">Chưa quá hạn</Select.Option>
                    <Select.Option value="expired">Đã quá hạn</Select.Option>
                  </Select>
                </Space>
              }
            >
              <Table
                dataSource={filteredRequests}
                columns={requestColumns}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} của ${total} đơn`
                }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      {/* Student Detail Modal */}
      <Modal
        title="Chi tiết học sinh"
        open={isStudentDetailVisible}
        onCancel={() => setIsStudentDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsStudentDetailVisible(false)}>
            Đóng
          </Button>
        ]}
        width={600}
      >
        {selectedStudent && (
          <div style={{ padding: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={24} style={{ textAlign: 'center', marginBottom: 16 }}>
                <Avatar size={80} icon={<UserOutlined />} src={selectedStudent.avatar} />
                <Title level={4} style={{ marginTop: 8, marginBottom: 4 }}>
                  {selectedStudent.name}
                </Title>
                <Text type="secondary">{selectedStudent.studentId}</Text>
                <br />
                <Text type="secondary">{selectedStudent.email}</Text>
              </Col>
              
              <Col span={12}>
                <Statistic
                  title="Tổng buổi học"
                  value={selectedStudent.totalSessions}
                  prefix={<BookOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Tỷ lệ điểm danh"
                  value={selectedStudent.attendanceRate.toFixed(1)}
                  suffix="%"
                  valueStyle={{ color: getAttendanceColor(selectedStudent.attendanceRate) }}
                />
              </Col>
              
              <Col span={8}>
                <Statistic
                  title="Có mặt"
                  value={selectedStudent.presentCount}
                  valueStyle={{ color: '#10b981' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Vắng mặt"
                  value={selectedStudent.absentCount}
                  valueStyle={{ color: '#ef4444' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Đi muộn"
                  value={selectedStudent.lateCount}
                  valueStyle={{ color: '#f59e0b' }}
                />
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Request Detail Modal */}
      <Modal
        title="Chi tiết đơn xin nghỉ"
        open={isRequestDetailVisible}
        onCancel={() => setIsRequestDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsRequestDetailVisible(false)}>
            Đóng
          </Button>
        ]}
        width={600}
      >
        {selectedRequest && (
          <div style={{ padding: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>Học sinh:</Text>
                <br />
                <Text>{selectedRequest.studentName}</Text>
                <br />
                <Text type="secondary">{selectedRequest.studentId}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Trạng thái:</Text>
                <br />
                <Tag color={getStatusConfig(selectedRequest.status).color}>
                  {getStatusConfig(selectedRequest.status).text}
                </Tag>
              </Col>
              
              <Col span={12}>
                <Text strong>Ngày bắt đầu:</Text>
                <br />
                <Text>{dayjs(selectedRequest.startDate).format('DD/MM/YYYY')}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Ngày kết thúc:</Text>
                <br />
                <Text>{dayjs(selectedRequest.endDate).format('DD/MM/YYYY')}</Text>
              </Col>
              
              <Col span={12}>
                <Text strong>Ngày gửi:</Text>
                <br />
                <Text>{dayjs(selectedRequest.submittedDate).format('DD/MM/YYYY')}</Text>
              </Col>
             <Col span={12}>
                <Text strong>Tình trạng:</Text>
                <br />
                {dayjs(selectedRequest.endDate).diff(dayjs()) < 0 ? (
                  <Tag color="#64748b">Đã qua hạn</Tag>
                ) : (
                  <Tag color="#10b981">Còn hiệu lực</Tag>
                )}
              </Col>
              
              <Col span={24}>
                <Text strong>Lý do nghỉ học:</Text>
                <br />
                <Text>{selectedRequest.reason}</Text>
              </Col>
              
              {selectedRequest.approverNote && (
                <Col span={24}>
                  <Text strong>Ghi chú từ giảng viên:</Text>
                  <br />
                  <Text style={{ 
                    background: '#f8fafc', 
                    padding: 8, 
                    borderRadius: 4,
                    display: 'block'
                  }}>
                    {selectedRequest.approverNote}
                  </Text>
                </Col>
              )}
              
              {selectedRequest.status === 'pending' && (
                <Col span={24} style={{ marginTop: 16 }}>
                  <Space style={{ width: '100%', justifyContent: 'center' }}>
                    <Button 
                      type="primary" 
                      onClick={() => handleApproveRequest(selectedRequest.id)}
                    >
                      Duyệt đơn
                    </Button>
                    <Button 
                      danger
                      onClick={() => handleRejectRequest(selectedRequest.id)}
                    >
                      Từ chối
                    </Button>
                  </Space>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>

      {/* ✅ Edit Class Modal */}
      <Modal
        title="Chỉnh sửa thông tin lớp học"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {editError && (
          <Alert
            message="Lỗi khi cập nhật lớp học"
            description={
              <div>
                <Text>{editError}</Text>
                {renderEditErrorDetails()}
              </div>
            }
            type="error"
            icon={<ExclamationCircleOutlined />}
            showIcon
            closable
            onClose={() => {
              setEditError(null);
              setEditErrorDetails(null);
            }}
            style={{ marginBottom: 24 }}
          />
        )}

        <Form 
          form={editForm}
          layout="vertical" 
          style={{ marginTop: 16 }}
        >
          <Form.Item 
            label="Tên môn học"
            name="subject"
            rules={[
              { required: true, message: 'Vui lòng nhập tên môn học!' },
              { min: 3, message: 'Tên môn học phải có ít nhất 3 ký tự!' }
            ]}
          >
            <Input size="large" placeholder="Nhập tên môn học" />
          </Form.Item>

          <Form.Item 
            label="Mô tả"
            name="description"
            rules={[
              { required: true, message: 'Vui lòng nhập mô tả!' },
              { min: 10, message: 'Mô tả phải có ít nhất 10 ký tự!' }
            ]}
          >
            <TextArea rows={4} placeholder="Mô tả chi tiết về lớp học" />
          </Form.Item>

              <Form.Item 
                label="Phòng học"
                name="room"
                rules={[{ required: true, message: 'Vui lòng nhập phòng học!' }]}
              >
                <Input size="large" placeholder="VD: A101, LAB1" />
              </Form.Item>

          <Divider orientation="left">Lịch học</Divider>

          {/* Day Selection */}
          <Form.Item label="Chọn các thứ trong tuần">
            <Select
              mode="multiple"
              size="large"
              placeholder="Chọn các ngày học trong tuần"
              style={{ width: '100%' }}
              value={selectedDays}
              onChange={handleEditDayChange}
            >
              {weekDays.map(day => (
                <Option key={day.value} value={day.value}>
                  {day.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Period Selection for each day */}
          {selectedDays.sort().map(day => {
            const dayLabel = weekDays.find(d => d.value === day)?.label;
            const daySchedule = editSchedules.find(s => s.day === day);
            const selectedPeriods = dayPeriods[day] || [];
            
            return (
              <Card
                key={day}
                size="small"
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
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Chọn các tiết học:
                  </Text>
                  <Select
                    mode="multiple"
                    size="large"
                    placeholder="Chọn các tiết học"
                    style={{ width: '100%' }}
                    value={selectedPeriods}
                    onChange={(periods) => handleEditPeriodChange(day, periods)}
                  >
                    {TIME_SLOT_OPTIONS.map(slot => (
                      <Option key={slot.period} value={slot.period}>
                        {slot.label}
                      </Option>
                    ))}
                  </Select>
                </div>

                {/* Auto-split sessions display */}
                {daySchedule && daySchedule.sessions.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Các buổi học (tự động chia):
                    </Text>
                    <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                      {daySchedule.sessions.map((session, index) => (
                        <div key={session.id} style={{ 
                          background: '#f0f9ff',
                          padding: '8px 12px',
                          borderRadius: 4,
                          border: '1px solid #bae6fd'
                        }}>
                          <Text strong style={{ color: '#0369a1', fontSize: 12 }}>
                            Buổi {index + 1}:
                          </Text>{' '}
                          <Tag color="blue" size="small">
                            {formatTimeRange(session.periods)}
                          </Tag>
                        </div>
                      ))}
                    </Space>

                    {daySchedule.sessions.length > 1 && (
                      <Alert
                        message={`Đã tự động chia thành ${daySchedule.sessions.length} buổi học`}
                        type="info"
                        showIcon
                        style={{ marginTop: 12 }}
                        size="small"
                      />
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button 
                type="primary" 
                size="large"
                loading={editLoading}
                onClick={handleUpdateClass}
                disabled={!!editError}
              >
                {editLoading ? 'Đang cập nhật...' : 'Lưu thay đổi'}
              </Button>
              <Button 
                size="large" 
                onClick={() => setIsEditModalVisible(false)}
                disabled={editLoading}
              >
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ✅ Create Attendance Session Modal */}
      <Modal
        title={
          <Space>
            <PlayCircleOutlined style={{ color: '#10b981' }} />
            <Text strong>Tạo phiên điểm danh</Text>
          </Space>
        }
        open={isAttendanceModalVisible}
        onCancel={() => setIsAttendanceModalVisible(false)}
        width={700}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setIsAttendanceModalVisible(false)}
          >
            Hủy
          </Button>,
          <Button
            key="start"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStartAttendance}
            disabled={!selectedAttendanceSession}
            style={{
              background: selectedAttendanceSession 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                : undefined,
              border: 'none'
            }}
          >
            Bắt đầu điểm danh
          </Button>
        ]}
      >
        <div style={{ marginTop: 16 }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            Chọn buổi học để điểm danh
          </Title>

          {upcomingSessions.length > 0 ? (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {upcomingSessions.map((session, index) => {
                  const isSelected = selectedAttendanceSession?.day === session.day && 
                                   selectedAttendanceSession?.sessionIndex === session.sessionIndex;
                  const isToday = dayjs().day() === session.day;

                  return (
                    <Card
                      key={`${session.day}-${session.sessionIndex}`}
                      size="small"
                      hoverable
                      onClick={() => setSelectedAttendanceSession(session)}
                      style={{
                        cursor: 'pointer',
                        borderLeft: isSelected ? '4px solid #10b981' : '4px solid #e5e7eb',
                        background: isSelected 
                          ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
                          : isToday 
                          ? '#fffbeb' 
                          : '#ffffff',
                        border: isSelected ? '2px solid #10b981' : '1px solid #e5e7eb',
                        transition: 'all 0.3s'
                      }}
                    >
                      <Row align="middle" gutter={16}>
                        <Col span={2}>
                          {isSelected ? (
                            <CheckCircleOutlined 
                              style={{ fontSize: 24, color: '#10b981' }} 
                            />
                          ) : (
                            <div style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: '2px solid #d1d5db',
                              background: '#ffffff'
                            }} />
                          )}
                        </Col>
                        <Col span={6}>
                          <Space direction="vertical" size={0}>
                            <Text strong style={{ color: isToday ? '#f59e0b' : '#1f2937' }}>
                              {session.dayLabel}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {session.date}
                            </Text>
                            {isToday && (
                              <Tag color="warning" style={{ marginTop: 4 }}>
                                Hôm nay
                              </Tag>
                            )}
                          </Space>
                        </Col>
                        <Col span={8}>
                          <Space direction="vertical" size={0}>
                            <Tag color="blue">{session.periods}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <ClockCircleOutlined /> {session.timeRange}
                            </Text>
                          </Space>
                        </Col>
                        <Col span={8}>
                          <Space direction="vertical" size={0}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Phòng: {classData.room}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Buổi {session.sessionIndex + 1}
                            </Text>
                          </Space>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}
              </Space>
            </div>
          ) : (
            <Card style={{ textAlign: 'center', background: '#f8fafc' }}>
              <Space direction="vertical" size={12}>
                <CalendarOutlined style={{ fontSize: 48, color: '#94a3b8' }} />
                <Text type="secondary">
                  Không có buổi học nào sắp diễn ra trong tuần này
                </Text>
              </Space>
            </Card>
          )}

          {selectedAttendanceSession && (
            <Alert
              message="Buổi học đã chọn"
              description={
                <div>
                  <Text strong>{selectedAttendanceSession.dayLabel}</Text>
                  {' - '}
                  <Text>{selectedAttendanceSession.periods}</Text>
                  {' ('}
                  <Text type="secondary">{selectedAttendanceSession.timeRange}</Text>
                  {')'}
                  <br />
                  <Text type="secondary">Ngày: {selectedAttendanceSession.date}</Text>
                </div>
              }
              type="success"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ClassDetailPage;