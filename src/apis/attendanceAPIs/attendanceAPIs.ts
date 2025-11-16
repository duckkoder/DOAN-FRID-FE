/**
 * Attendance APIs
 */
import api from "../axios";

const API_BASE = '/attendance';

// ============= Types =============

export interface StartSessionRequest {
  class_id: number;
  session_name?: string;
  late_threshold_minutes?: number;
  location?: string;
  day_of_week?: number;
  period_range?: string;
  session_index?: number;
}

export interface AttendanceSession {
  id: number;
  class_id: number;
  session_name: string | null;
  start_time: string;
  end_time: string | null;
  status: 'ongoing' | 'finished' | 'scheduled' | 'pending' | 'active';
  late_threshold_minutes: number;
  location: string | null;
  day_of_week?: number | null;
  period_range?: string | null;
  session_index?: number | null;
  ai_session_id?: string | null;
  created_at: string;
}

// AI-Service Integration Types
export interface AISessionResponse {
  session_id: number; // Backend session ID
  ai_session_id: string; // AI-Service session ID
  ai_ws_url: string; // WebSocket URL
  ai_ws_token: string; // JWT token
  expires_at: string;
  status: string;
}

export interface RecognizedStudent {
  student_id: number;
  student_code: string;
  full_name: string;
  status: 'present' | 'absent';  // Chỉ có present hoặc absent
  confidence_score: number;
  recorded_at: string;
}

export interface Detection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number;
  track_id?: number;
  student_id?: string;
  recognition_confidence?: number;
  student_name?: string;
  student_code?: string;
}

export interface EndSessionRequest {
  mark_absent: boolean;
}

export interface EndSessionResponse {
  session: AttendanceSession;
  total_students: number;
  present_count: number;
  absent_count: number;
  excused_count: number;  // Thêm excused_count
  attendance_rate: number;
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id: number;
  student_code: string;
  student_name: string;
  status: 'pending' | 'present' | 'absent' | 'excused';  // ✅ Thêm pending status
  confidence_score: number | null;
  recorded_at: string | null;
  notes: string | null;
  image_path: string | null;  // ✅ URL ảnh khuôn mặt (evidence)
}

export interface SessionAttendanceResponse {
  session: AttendanceSession;
  records: AttendanceRecord[];
  statistics: {
    total_students: number;
    present_count: number;
    absent_count: number;
    excused_count: number;
    pending_count: number;  // ✅ NEW
    attendance_rate: number;
  };
}

export interface SessionWithStats extends AttendanceSession {
  statistics?: {
    total_students: number;
    present_count: number;
    absent_count: number;
    excused_count: number;
    attendance_rate: number;
  };
}

export interface ClassSessionsResponse {
  sessions: SessionWithStats[];
  total: number;
}

// ============= API Functions =============

/**
 * Bắt đầu phiên điểm danh với AI-Service
 * Returns WebSocket URL và JWT token
 */
export const startAttendanceSessionWithAI = async (
  data: StartSessionRequest
): Promise<AISessionResponse> => {
  const response = await api.post(`${API_BASE}/sessions/start`, data);
  return response.data;
};

/**
 * Bắt đầu phiên điểm danh (legacy - compatibility)
 */
export const startAttendanceSession = async (
  data: StartSessionRequest
): Promise<AttendanceSession> => {
  const response = await api.post(`${API_BASE}/sessions/start`, data);
  return response.data;
};

/**
 * Kết thúc phiên điểm danh
 */
export const endAttendanceSession = async (
  sessionId: number,
  data: EndSessionRequest
): Promise<EndSessionResponse> => {
  const response = await api.post(
    `${API_BASE}/sessions/${sessionId}/end`,
    data
  );
  return response.data;
};

/**
 * Lấy danh sách điểm danh của phiên
 */
export const getSessionAttendance = async (
  sessionId: number
): Promise<SessionAttendanceResponse> => {
  const response = await api.get(`${API_BASE}/sessions/${sessionId}`);
  return response.data;
};

/**
 * Lấy danh sách các phiên điểm danh của lớp
 */
export const getClassSessions = async (
  classId: number,
  status?: 'ongoing' | 'finished' | 'scheduled',
  skip: number = 0,
  limit: number = 100
): Promise<ClassSessionsResponse> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('skip', skip.toString());
  params.append('limit', limit.toString());
  
  const response = await api.get(
    `${API_BASE}/classes/${classId}/sessions?${params.toString()}`
  );
  return response.data;
};


// ============= Pending Confirmation APIs (Hybrid Approach) =============

export interface PendingStudent {
  record_id: number;
  student_id: number;
  student_code: string;
  full_name: string;
  confidence_score: number | null;
  recorded_at: string;
}

export interface PendingStudentsResponse {
  pending_count: number;
  students: PendingStudent[];
}

export interface ConfirmAttendanceRequest {
  status?: 'present';
  notes?: string;
}

export interface RejectAttendanceRequest {
  reason?: string;
}

export interface ConfirmAttendanceResponse {
  success: boolean;
  record: AttendanceRecord;
}

export interface ConfirmAllPendingResponse {
  success: boolean;
  confirmed_count: number;
  records: AttendanceRecord[];
}

/**
 * Lấy danh sách sinh viên chờ xác nhận
 */
export const getPendingStudents = async (
  sessionId: number
): Promise<PendingStudentsResponse> => {
  const response = await api.get(`${API_BASE}/sessions/${sessionId}/pending-students`);
  return response.data;
};

/**
 * Xác nhận điểm danh cho một sinh viên
 */
export const confirmAttendance = async (
  recordId: number,
  data?: ConfirmAttendanceRequest
): Promise<ConfirmAttendanceResponse> => {
  const response = await api.post(`${API_BASE}/records/${recordId}/confirm`, data || {});
  return response.data;
};

/**
 * Từ chối điểm danh cho một sinh viên
 */
export const rejectAttendance = async (
  recordId: number,
  data?: RejectAttendanceRequest
): Promise<ConfirmAttendanceResponse> => {
  const response = await api.post(`${API_BASE}/records/${recordId}/reject`, data || {});
  return response.data;
};

/**
 * Xác nhận tất cả sinh viên chờ xác nhận
 */
export const confirmAllPending = async (
  sessionId: number
): Promise<ConfirmAllPendingResponse> => {
  const response = await api.post(`${API_BASE}/sessions/${sessionId}/confirm-all-pending`);
  return response.data;
};


