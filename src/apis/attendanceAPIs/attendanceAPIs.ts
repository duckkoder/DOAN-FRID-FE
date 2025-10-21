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
}

export interface AttendanceSession {
  id: number;
  class_id: number;
  session_name: string | null;
  start_time: string;
  end_time: string | null;
  status: 'ongoing' | 'finished' | 'scheduled';
  late_threshold_minutes: number;
  location: string | null;
  created_at: string;
}

export interface RecognizedStudent {
  student_id: number;
  student_code: string;
  full_name: string;
  status: 'present' | 'late';
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

export interface RecognizeFrameResponse {
  success: boolean;
  message: string;
  total_faces_detected: number;
  students_recognized: RecognizedStudent[];
  processing_time_ms: number;
  detections?: Detection[]; // Thêm thông tin detections với bbox
}

export interface EndSessionRequest {
  mark_absent: boolean;
}

export interface EndSessionResponse {
  session: AttendanceSession;
  total_students: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  attendance_rate: number;
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id: number;
  student_code: string;
  student_name: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  confidence_score: number | null;
  recorded_at: string | null;
  notes: string | null;
}

export interface SessionAttendanceResponse {
  session: AttendanceSession;
  records: AttendanceRecord[];
  statistics: {
    total_students: number;
    present_count: number;
    late_count: number;
    absent_count: number;
    attendance_rate: number;
  };
}

export interface SessionWithStats extends AttendanceSession {
  statistics?: {
    total_students: number;
    present_count: number;
    late_count: number;
    absent_count: number;
    attendance_rate: number;
  };
}

export interface ClassSessionsResponse {
  sessions: SessionWithStats[];
  total: number;
}

// ============= API Functions =============

/**
 * Bắt đầu phiên điểm danh
 */
export const startAttendanceSession = async (
  data: StartSessionRequest
): Promise<AttendanceSession> => {
  const response = await api.post(`${API_BASE}/sessions/start`, data);
  return response.data;
};

/**
 * Nhận diện khuôn mặt từ frame camera
 */
export const recognizeFrame = async (
  sessionId: number,
  imageBase64: string
): Promise<RecognizeFrameResponse> => {
  const response = await api.post(`${API_BASE}/recognize-frame`, {
    session_id: sessionId,
    image_base64: imageBase64,
  });
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

/**
 * Kết nối WebSocket để nhận real-time updates
 */
export const connectAttendanceWebSocket = (
  sessionId: number,
  onMessage: (data: any) => void,
  onError?: (error: Event) => void
): WebSocket => {
  // Lấy base URL từ api hoặc environment
  const wsUrl = `ws://localhost:8000/api/v1${API_BASE}/ws/${sessionId}`;
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log(`[WebSocket] Connected to session ${sessionId}`);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('[WebSocket] Error:', error);
    if (onError) onError(error);
  };
  
  ws.onclose = () => {
    console.log('[WebSocket] Connection closed');
  };
  
  // Keep alive ping
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('ping');
    }
  }, 30000); // 30 seconds
  
  // Cleanup function
  const originalClose = ws.close.bind(ws);
  ws.close = () => {
    clearInterval(pingInterval);
    originalClose();
  };
  
  return ws;
};

/**
 * Convert image/video frame to base64
 */
export const frameToBase64 = (
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement
): string => {
  const canvasElement = canvas || document.createElement('canvas');
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;
  
  const ctx = canvasElement.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');
  
  // Clear canvas
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
  // Draw image directly without flipping
  // (Video element already handles mirroring in CSS if needed)
  ctx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
  
  // Get base64 without "data:image/jpeg;base64," prefix
  return canvasElement.toDataURL('image/jpeg', 0.8).split(',')[1];
};

