/**
 * Student Attendance APIs - For student view of attendance sessions
 */
import api from "../axios";

// Import the newly defined types
import {
  type StudentClassAttendanceSummary,
  type StudentAttendanceRecordDetailSchema,
  type StudentAttendanceReportResponse,
} from "../../types/studentAttendance";

const API_BASE = "/student-attendance"; // Corrected API_BASE for student attendance

// ==================== Interfaces ====================

export interface StudentAttendanceInfo {
  student_id: number;
  student_code: string;
  full_name: string;
  is_present: boolean;
  status: string | null;
  recorded_at: string | null;
  confidence_score: number | null;
}

export interface SessionAttendanceResponse {
  has_active_session: boolean;
  session: {
    id: number;
    session_name: string;
    start_time: string;
    status: string;
  } | null;
  students: StudentAttendanceInfo[];
  my_student_id: number;
  stats: {
    total_students: number;
    present_count: number;
    absent_count: number;
  };
}

export interface WSStudentAttendanceUpdate {
  type: 'student_attendance_update';
  session_id: number;
  student_id: number;
  status: string;
  recorded_at: string;
  confidence_score: number;
  message: string;
}

export interface WSAttendanceUpdate {
  type: 'attendance_update';
  session_id: number;
  student: {
    student_id: number;
    student_code: string;
    full_name: string;
    status: string;
    confidence_score: number;
    recorded_at: string;
  };
}

// ==================== API Functions ====================

/**
 * Get student's attendance for a specific class
 * GET /student-attendance/class/{class_id}/sessions
 */
export const getStudentClassAttendanceSessions = async (
  classId: number,
  sessionStatusFilter?: string
): Promise<StudentClassAttendanceSummary> => {
  try {
    const params: Record<string, any> = {};
    if (sessionStatusFilter) {
      params.session_status_filter = sessionStatusFilter;
    }
    const response = await api.get<StudentClassAttendanceSummary>(
      `${API_BASE}/class/${classId}/sessions`,
      { params }
    );
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching attendance for class ${classId}:`, error);
    const apiError = {
      message: error.response?.data?.message || "Failed to fetch class attendance",
      errors: error.response?.data?.errors,
      statusCode: error.response?.status,
    };
    throw apiError;
  }
};

/**
 * Get detailed attendance record
 * GET /student-attendance/record/{record_id}/detail
 */
export const getStudentAttendanceRecordDetails = async (
  recordId: number
): Promise<StudentAttendanceRecordDetailSchema> => {
  try {
    const response = await api.get<StudentAttendanceRecordDetailSchema>(
      `${API_BASE}/record/${recordId}/detail`
    );
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching attendance record ${recordId} details:`, error);
    const apiError = {
      message: error.response?.data?.message || "Failed to fetch attendance record details",
      errors: error.response?.data?.errors,
      statusCode: error.response?.status,
    };
    throw apiError;
  }
};

/**
 * Get overall student attendance report
 * GET /student-attendance/report/overall
 */
export const getStudentOverallAttendanceReport = async (): Promise<StudentAttendanceReportResponse> => {
  try {
    const response = await api.get<StudentAttendanceReportResponse>(
      `${API_BASE}/report/overall`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching overall student attendance report:", error);
    const apiError = {
      message: error.response?.data?.message || "Failed to fetch overall attendance report",
      errors: error.response?.data?.errors,
      statusCode: error.response?.status,
    };
    throw apiError;
  }
};

/**
 * Lấy danh sách điểm danh realtime của cả lớp (NEW - Recommended)
 * @param classId - ID của lớp học
 * @returns Danh sách tất cả sinh viên với trạng thái điểm danh realtime
 */
export const getCurrentSessionAttendance = async (
  classId: number
): Promise<SessionAttendanceResponse> => {
  const response = await api.get<SessionAttendanceResponse>(
    `${API_BASE}/classes/${classId}/current-session-attendance`
  );
  return response.data;
};

/**
 * Tạo WebSocket connection để nhận real-time updates
 * @param sessionId - ID của phiên điểm danh
 * @returns WebSocket instance
 */
export const connectAttendanceWebSocket = (sessionId: number): WebSocket => {
  // Get base URL from api instance
  const baseURL = api.defaults.baseURL || 'http://localhost:8000';
  const wsURL = baseURL.replace('http', 'ws');
  
  const ws = new WebSocket(`${wsURL}${API_BASE}/ws/${sessionId}`);
  
  return ws;
};

/**
 * Helper function to get status color for UI
 */
export const getAttendanceStatusColor = (status: string): string => {
  switch (status) {
    case 'present':
      return 'success';
    case 'absent':
      return 'error';
    case 'excused':
      return 'warning';
    default:
      return 'default';
  }
};

/**
 * Helper function to get status text in Vietnamese
 */
export const getAttendanceStatusText = (status: string): string => {
  switch (status) {
    case 'present':
      return 'Có mặt';
    case 'absent':
      return 'Vắng';
    case 'excused':
      return 'Có phép';
    default:
      return 'Chưa rõ';
  }
};
