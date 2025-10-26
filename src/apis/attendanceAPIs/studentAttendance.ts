/**
 * Student Attendance APIs - For student view of attendance sessions
 */
import api from "../axios";

const API_BASE = '/attendance';

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
    case 'late':
      return 'warning';
    case 'absent':
      return 'error';
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
    case 'late':
      return 'Trễ';
    case 'absent':
      return 'Vắng';
    case 'excused':
      return 'Có phép';
    default:
      return 'Chưa rõ';
  }
};
