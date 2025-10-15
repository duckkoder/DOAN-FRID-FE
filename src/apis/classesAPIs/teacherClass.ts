import api from "../axios";

// ==================== Types ====================

/**
 * Weekly schedule with period ranges (format: '1-3' means periods 1 to 3)
 */
export interface ScheduleModel {
  monday?: string[];
  tuesday?: string[];
  wednesday?: string[];
  thursday?: string[];
  friday?: string[];
  saturday?: string[];
  sunday?: string[];
}

/**
 * Request to create a new class
 */
export interface CreateClassRequest {
  class_name: string;
  teacher_id: number;
  location?: string | null;
  description?: string | null;
  schedule: ScheduleModel;
}

/**
 * Request to update a class
 */
export interface UpdateClassRequest {
  class_name?: string;
  location?: string;
  description?: string;
  is_active?: boolean;
  schedule?: ScheduleModel;
}

/**
 * Basic class response
 */
export interface ClassResponse {
  id: number;
  className: string;
  classCode: string;
  teacherId: number;
  location: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * Response for POST /teacher/classes
 */
export interface CreateClassResponse {
  success: boolean;
  data: {
    class: ClassResponse;
    schedule: {
      id: number;
      classId: number;
      scheduleData: ScheduleModel;
    };
  };
  message: string;
}

/**
 * Class item in list with schedule and student count
 */
export interface ClassListItem {
  id: number;
  subject: string; // Same as class_name
  name: string; // Same as class_name
  location: string | null;
  status: "active" | "inactive";
  classCode: string;
  studentCount: number;
  schedule: ScheduleModel | null;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * Response for GET /teacher/classes
 */
export interface GetClassesListResponse {
  success: boolean;
  data: {
    classes: ClassListItem[];
    total: number;
  };
}

/**
 * Student info in class
 */
export interface StudentInClassResponse {
  id: number;
  studentId: string; // student_code
  fullName: string;
  email: string;
  attendanceRate: number;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  joinedAt: string;
}

/**
 * Attendance statistics for a class
 */
export interface AttendanceStatsResponse {
  totalSessions: number;
  averageAttendance: number;
  totalStudents: number;
}

/**
 * Detailed class information
 */
export interface ClassDetailResponse {
  id: number;
  subject: string;
  teacher: string;
  teacherId: number;
  students: number;
  schedule: ScheduleModel; // Human-readable
  room: string | null;
  status: "active" | "inactive";
  classCode: string;
  description: string | null;
}

/**
 * Response for GET /teacher/classes/{classId}
 */
export interface GetClassDetailsResponse {
  success: boolean;
  data: {
    class: ClassDetailResponse;
    students: StudentInClassResponse[];
    attendance: AttendanceStatsResponse;
  };
}

/**
 * Response for DELETE /teacher/classes/{classId}
 */
export interface DeleteClassResponse {
  success: boolean;
  message: string;
}

/**
 * Error response structure
 */
export interface ApiError {
  status?: number;
  message: string;
  errors?: any;
}

// ==================== API Functions ====================

/**
 * Tạo lớp học mới
 * POST /api/v1/teacher/classes
 * 
 * @example
 * ```typescript
 * const newClass = await createClass({
 *   class_name: "Java Programming Advanced",
 *   teacher_id: 1,
 *   location: "LAB-101",
 *   description: "Advanced Java Programming Course",
 *   schedule: {
 *     monday: ["1-3", "6-9"],
 *     wednesday: ["1-3"],
 *     friday: ["4-6"]
 *   }
 * });
 * ```
 */
export const createClass = async (
  classData: CreateClassRequest
): Promise<CreateClassResponse> => {
  try {
    const response = await api.post("/teacher/classes", classData);
    return response.data;
  } catch (err: any) {
    // Normalize and rethrow so FE can show a friendly message
    if (err?.response) {
      const payload = err.response.data || {};
      const message = payload.message || payload.error || 'Server error';
      const errors = payload.errors || payload;
      throw { status: err.response.status, message, errors } as ApiError;
    }

    // Network / unknown error
    throw { message: err?.message || 'Network error', errors: err } as ApiError;
  }
};

/**
 * Lấy danh sách lớp học của teacher
 * GET /api/v1/teacher/classes
 * 
 * @param status - Filter: "active" | "inactive" | null
 * 
 * @example
 * ```typescript
 * // Get all classes
 * const allClasses = await getClassesList();
 * 
 * // Get only active classes
 * const activeClasses = await getClassesList("active");
 * ```
 */
export const getClassesList = async (
  status?: "active" | "inactive" | null
): Promise<GetClassesListResponse> => {
  const params: Record<string, string> = {};
  if (status) {
    params.status = status;
  }
  
  const response = await api.get("/teacher/classes", { params });
  return response.data;
};

/**
 * Lấy chi tiết lớp học với danh sách sinh viên và thống kê điểm danh
 * GET /api/v1/teacher/classes/{class_id}
 * 
 * @example
 * ```typescript
 * const classDetails = await getClassDetails(1);
 * console.log(classDetails.data.class.name);
 * console.log(classDetails.data.students); // Array of students
 * console.log(classDetails.data.attendance); // Stats
 * ```
 */
export const getClassDetails = async (
  classId: number
): Promise<GetClassDetailsResponse> => {
  const response = await api.get(`/teacher/classes/${classId}`);
  return response.data;
};

/**
 * Cập nhật thông tin lớp học
 * PUT /api/v1/teacher/classes/{class_id}
 * 
 * @example
 * ```typescript
 * const updated = await updateClass(1, {
 *   class_name: "Java Programming Advanced - Updated",
 *   location: "LAB-102",
 *   schedule: {
 *     monday: ["1-3"],
 *     wednesday: ["1-3"]
 *   }
 * });
 * ```
 */
export const updateClass = async (
  classId: number,
  classData: UpdateClassRequest
): Promise<CreateClassResponse> => {
  const response = await api.put(`/teacher/classes/${classId}`, classData);
  return response.data;
};

/**
 * Xóa lớp học (soft delete - set is_active = false)
 * DELETE /api/v1/teacher/classes/{class_id}
 * 
 * @example
 * ```typescript
 * const result = await deleteClass(1);
 * console.log(result.message); // "Class deactivated successfully"
 * ```
 */
export const deleteClass = async (
  classId: number
): Promise<DeleteClassResponse> => {
  const response = await api.delete(`/teacher/classes/${classId}`);
  return response.data;
};

// ==================== Helper Functions ====================

/**
 * Chuyển đổi frontend schedule format sang backend format
 * 
 * @example
 * ```typescript
 * // Frontend: { day: 1, sessions: [{ periods: [1,2,3] }, { periods: [6,7,8,9] }] }
 * // Backend: { monday: ["1-3", "6-9"] }
 * ```
 */
export const convertFrontendScheduleToBackend = (
  schedules: Array<{
    day: number;
    sessions: Array<{ periods: number[] }>;
  }>,
  room?: string
): ScheduleModel => {
  const dayMapping = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;

  const result: ScheduleModel = {};

  schedules.forEach(({ day, sessions }) => {
    const dayName = dayMapping[day];
    
    result[dayName] = sessions.map(session => {
      const sortedPeriods = [...session.periods].sort((a, b) => a - b);
      
      // Group consecutive periods
      const groups: number[][] = [];
      let currentGroup = [sortedPeriods[0]];
      
      for (let i = 1; i < sortedPeriods.length; i++) {
        if (sortedPeriods[i] === currentGroup[currentGroup.length - 1] + 1) {
          currentGroup.push(sortedPeriods[i]);
        } else {
          groups.push(currentGroup);
          currentGroup = [sortedPeriods[i]];
        }
      }
      groups.push(currentGroup);
      
      // Convert each group to "start-end" format
      return groups.map(group => `${group[0]}-${group[group.length - 1]}`);
    }).flat();
  });

  return result;
};

/**
 * Format schedule thành human-readable string
 * 
 * @example
 * ```typescript
 * const schedule = { monday: ["1-3", "6-9"], wednesday: ["1-3"] };
 * console.log(formatScheduleDisplay(schedule));
 * // Output: "Thứ 2: 07:00-09:50, 13:00-16:50; Thứ 4: 07:00-09:50"
 * ```
 */
export const formatScheduleDisplay = (schedule: ScheduleModel): string => {
  const dayNames: Record<string, string> = {
    monday: "Thứ 2",
    tuesday: "Thứ 3",
    wednesday: "Thứ 4",
    thursday: "Thứ 5",
    friday: "Thứ 6",
    saturday: "Thứ 7",
    sunday: "Chủ nhật",
  };

  const timeSlots: Record<number, string> = {
    1: "07:00",
    2: "08:00",
    3: "09:00",
    4: "10:00",
    5: "11:00",
    6: "13:00",
    7: "14:00",
    8: "15:00",
    9: "16:00",
    10: "17:00",
  };

  const getEndTime = (period: number): string => {
    return timeSlots[period + 1] || "20:00";
  };

  const result: string[] = [];

  Object.entries(schedule).forEach(([day, periods]) => {
    if (periods && periods.length > 0) {
      const dayLabel = dayNames[day] || day;
      const timeRanges = periods.map(range => {
        const [start, end] = range.split("-").map(Number);
        return `${timeSlots[start]}-${getEndTime(end)}`;
      });
      result.push(`${dayLabel}: ${timeRanges.join(", ")}`);
    }
  });

  return result.join("; ");
};

/**
 * Validate period range format
 */
export const validatePeriodRange = (period: string): boolean => {
  if (!period.includes("-")) return false;
  
  const [start, end] = period.split("-").map(Number);
  
  if (isNaN(start) || isNaN(end)) return false;
  if (start < 1 || end > 12) return false;
  if (start > end) return false;
  
  return true;
};

/**
 * Validate schedule has at least one day
 */
export const validateScheduleNotEmpty = (schedule: ScheduleModel): boolean => {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  return days.some(day => {
    const periods = schedule[day as keyof ScheduleModel];
    return periods && periods.length > 0;
  });
};

/**
 * Get class status badge color
 */
export const getStatusColor = (status: string): string => {
  return status === "active" ? "success" : "default";
};
