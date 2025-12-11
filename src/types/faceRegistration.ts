/**
 * TypeScript Types for Face Registration WebSocket
 * Định nghĩa các interfaces cho WebSocket messages và dữ liệu
 */

// ============= WebSocket Message Types =============

/**
 * Message từ Client gửi frame lên Server
 */
export interface WSFrameMessage {
  type: "frame";
  data: string; // Base64 encoded image: "data:image/jpeg;base64,..."
}

/**
 * Message từ Client yêu cầu restart
 */
export interface WSRestartMessage {
  type: "restart";
}

/**
 * Message từ Client yêu cầu cancel
 */
export interface WSCancelMessage {
  type: "cancel";
}

/**
 * Message từ Client xác nhận (accept/reject) ảnh đã thu thập
 */
export interface WSStudentConfirmMessage {
  type: "student_confirm";
  accept: boolean; // true = chấp nhận, false = từ chối và thu thập lại
}

// ============= WebSocket Response Types =============

/**
 * Góc độ khuôn mặt (Pose Angles)
 */
export interface PoseAngles {
  pitch: number; // Ngẩng/cúi (-90 đến 90 độ)
  yaw: number;   // Quay trái/phải (-90 đến 90 độ)
  roll: number;  // Nghiêng (-180 đến 180 độ)
}

/**
 * Face bounding box (normalized 0-1 coordinates)
 */
export interface BoundingBox {
  x: number;      // Top-left X (normalized)
  y: number;      // Top-left Y (normalized)
  width: number;  // Width (normalized)
  height: number; // Height (normalized)
}

/**
 * Single face landmark (normalized 0-1 coordinates)
 */
export interface FaceLandmark {
  x: number; // X coordinate (normalized)
  y: number; // Y coordinate (normalized)
  z: number; // Z coordinate / depth (normalized)
}

/**
 * Response với face metadata (NO processed image)
 * Client sẽ vẽ bounding box và overlay lên video stream gốc
 */
export interface WSProcessedFrameResponse {
  type: "processed_frame";
  instruction: string; // Hướng dẫn hiện tại cho user
  current_step: number; // Bước hiện tại (0-13, 0-indexed)
  total_steps: number; // Tổng số bước (14)
  progress: number; // Tiến độ phần trăm (0-100)
  status: "waiting_for_pose" | "correct_pose" | "capturing";
  condition_met: boolean; // true nếu user giữ đúng tư thế
  face_detected: boolean; // true nếu phát hiện khuôn mặt
  pose_angles: PoseAngles | null; // Góc độ khuôn mặt hiện tại
  bounding_box: BoundingBox | null; // Face bounding box (normalized)
  landmarks: FaceLandmark[] | null; // 468 face mesh landmarks (normalized)
}

/**
 * Response khi hoàn thành một bước
 */
export interface WSStepCompletedResponse {
  type: "step_completed";
  step_name: string; // VD: "face_front", "face_left_10"
  step_number: number; // 1-14 (1-indexed)
  image_url: string | null; // S3 URL (thường null vì private)
  next_instruction: string | null; // Hướng dẫn cho bước tiếp theo
  progress: number; // 7.14, 14.28, 21.42, ... 100
  pose_angles: PoseAngles;
}

/**
 * Thông tin crop ảnh
 */
export interface CropInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Dữ liệu của một bước verification
 */
export interface VerificationStepData {
  step: string;
  step_number: number;
  instruction: string;
  image_url: string;
  timestamp: string; // ISO datetime
  pose_angles: PoseAngles;
  face_width: number;
  crop_info: CropInfo;
}

/**
 * Response khi hoàn thành toàn bộ đăng ký
 */
export interface WSRegistrationCompletedResponse {
  type: "registration_completed";
  success: boolean;
  message: string;
  student_id: number;
  registration_id: number;
  total_images: number; // 14
  verification_data: VerificationStepData[];
}

/**
 * Response lỗi
 */
export interface WSErrorResponse {
  type: "error";
  error_code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Response trạng thái ban đầu
 */
export interface WSStatusResponse {
  type: "status";
  message: string;
  registration_id?: number;
  current_step: number;
  total_steps: number;
  progress: number;
}

/**
 * Response sau khi restart
 */
export interface WSRestartedResponse {
  type: "restarted";
  message: string;
}

/**
 * Dữ liệu ảnh preview cho student xem
 */
export interface PreviewImageData {
  step_name: string;
  step_number: number;
  instruction: string;
  image_base64: string; // Base64 image cho preview
  timestamp: string;
  pose_angles: PoseAngles;
}

/**
 * Response khi hoàn thành thu thập 14 ảnh, chờ student xác nhận
 */
export interface WSCollectionCompletedResponse {
  type: "collection_completed";
  message: string;
  total_images: number; // 14
  preview_images: PreviewImageData[];
  registration_id: number;
}

/**
 * Response sau khi student xác nhận
 */
export interface WSStudentConfirmedResponse {
  type: "student_confirmed";
  accepted: boolean;
  message: string;
  registration_id?: number;
  status?: string; // "pending_admin_review" or "rejected"
}

/**
 * Union type của tất cả WebSocket responses
 */
export type WSResponse =
  | WSProcessedFrameResponse
  | WSStepCompletedResponse
  | WSRegistrationCompletedResponse
  | WSCollectionCompletedResponse
  | WSStudentConfirmedResponse
  | WSErrorResponse
  | WSStatusResponse
  | WSRestartedResponse;

// ============= Error Codes =============

export const FaceRegistrationErrorCode = {
  STUDENT_NOT_FOUND: "STUDENT_NOT_FOUND",
  ALREADY_REGISTERED: "ALREADY_REGISTERED",
  ALREADY_PENDING: "ALREADY_PENDING",
  NO_FACE_DETECTED: "NO_FACE_DETECTED",
  MULTIPLE_FACES: "MULTIPLE_FACES",
  POOR_IMAGE_QUALITY: "POOR_IMAGE_QUALITY",
  S3_UPLOAD_FAILED: "S3_UPLOAD_FAILED",
  DATABASE_ERROR: "DATABASE_ERROR",
  INVALID_FRAME: "INVALID_FRAME",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  WEBSOCKET_ERROR: "WEBSOCKET_ERROR",
  NO_IMAGES_TO_CONFIRM: "NO_IMAGES_TO_CONFIRM",
} as const;

export type FaceRegistrationErrorCodeType = typeof FaceRegistrationErrorCode[keyof typeof FaceRegistrationErrorCode];

// ============= Hook State Types =============

/**
 * Processed frame data cho UI (metadata only, NO image)
 */
export interface ProcessedFrame {
  instruction: string;
  currentStep: number;
  totalSteps: number;
  progress: number;
  status: "waiting_for_pose" | "correct_pose" | "capturing";
  conditionMet: boolean;
  faceDetected: boolean;
  poseAngles: PoseAngles | null;
  boundingBox: BoundingBox | null;
  landmarks: FaceLandmark[] | null;
}

/**
 * Options cho useFaceRegistration hook
 */
export interface FaceRegistrationOptions {
  studentId: number;
  serverUrl?: string; // Default: ws://localhost:8000
  fps?: number; // Default: 10
}

/**
 * Completion data
 */
export interface RegistrationCompletionData {
  success: boolean;
  message: string;
  studentId: number;
  registrationId: number;
  totalImages: number;
  verificationData: VerificationStepData[];
}
