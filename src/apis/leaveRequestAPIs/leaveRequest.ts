import api from "../axios";

// ==================== Types ====================

export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type CreateLeaveRequestPayload = {
  class_id: number;
  reason: string;
  leave_date: string; // ISO format: "2024-10-20T00:00:00Z"
  day_of_week: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  time_slot?: string; // e.g., "1-3"
  evidence_file_id?: number | null;
};

export type UpdateLeaveRequestPayload = {
  reason?: string;
  leave_date?: string;
  day_of_week?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  time_slot?: string;
  evidence_file_id?: number | null;
};

export type ReviewLeaveRequestPayload = {
  status: "approved" | "rejected";
  review_notes?: string;
};

export type LeaveRequestDetail = {
  id: number;
  studentId: number;
  studentName: string;
  studentCode?: string;
  classId: number;
  className: string;
  reason: string;
  leaveDate: string; // ISO format
  dayOfWeek: string;
  timeSlot?: string;
  evidenceFileId?: number;
  evidenceFileUrl?: string;
  status: LeaveRequestStatus;
  reviewedBy?: number;
  reviewerName?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type GetLeaveRequestsResponse = {
  success: boolean;
  data: {
    leaveRequests: LeaveRequestDetail[];
    total: number;
  };
};

export type LeaveRequestResponse = {
  success: boolean;
  data: LeaveRequestDetail;
  message?: string;
};

export type CancelLeaveRequestResponse = {
  success: boolean;
  message: string;
};

// ==================== Teacher-specific Types ====================

export type TeacherLeaveRequestSummary = {
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  cancelledCount: number;
};

export type TeacherClassLeaveRequestStats = {
  classId: number;
  className: string;
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
};

export type GetTeacherLeaveRequestsResponse = {
  success: boolean;
  data: {
    leaveRequests: LeaveRequestDetail[];
    total: number;
    summary: TeacherLeaveRequestSummary;
    classSummary: TeacherClassLeaveRequestStats[];
  };
};

export type BatchReviewPayload = {
  request_ids: number[];
  status: "approved" | "rejected";
  review_notes?: string;
};

export type BatchReviewResult = {
  id: number;
  status: string;
  success: boolean;
  error?: string;
};

export type BatchReviewResponse = {
  success: boolean;
  data: {
    successCount: number;
    failedCount: number;
    results: BatchReviewResult[];
  };
  message: string;
};

// ==================== Student API Functions ====================

/**
 * Create a new leave request (Student only)
 * @param payload Leave request details
 * @returns Created leave request
 */
export async function createLeaveRequest(
  payload: CreateLeaveRequestPayload
): Promise<LeaveRequestResponse> {
  const res = await api.post("/leave-requests", payload);
  return res.data;
}

/**
 * Get leave requests
 * - Student: Get own leave requests
 * - Teacher: Get leave requests for their classes
 * @param classId Optional: Filter by class ID
 * @param status Optional: Filter by status (pending|approved|rejected|cancelled)
 * @returns List of leave requests
 */
export async function getLeaveRequests(
  classId?: number,
  status?: LeaveRequestStatus
): Promise<GetLeaveRequestsResponse> {
  const params: Record<string, string | number> = {};
  if (classId !== undefined) params.class_id = classId;
  if (status) params.status = status;

  const res = await api.get("/leave-requests", { params });
  return res.data;
}

/**
 * Get leave request detail by ID
 * @param requestId Leave request ID
 * @returns Leave request detail
 */
export async function getLeaveRequestDetail(
  requestId: number
): Promise<LeaveRequestResponse> {
  const res = await api.get(`/leave-requests/${requestId}`);
  return res.data;
}

/**
 * Update leave request (Student only, only pending status)
 * @param requestId Leave request ID
 * @param payload Fields to update
 * @returns Updated leave request
 */
export async function updateLeaveRequest(
  requestId: number,
  payload: UpdateLeaveRequestPayload
): Promise<LeaveRequestResponse> {
  const res = await api.put(`/leave-requests/${requestId}`, payload);
  return res.data;
}

/**
 * Review (approve/reject) leave request (Teacher only)
 * @param requestId Leave request ID
 * @param payload Review decision and notes
 * @returns Reviewed leave request
 */
export async function reviewLeaveRequest(
  requestId: number,
  payload: ReviewLeaveRequestPayload
): Promise<LeaveRequestResponse> {
  const res = await api.post(`/leave-requests/${requestId}/review`, payload);
  return res.data;
}

/**
 * Cancel leave request (Student only, only pending status)
 * @param requestId Leave request ID
 * @returns Success message
 */
export async function cancelLeaveRequest(
  requestId: number
): Promise<CancelLeaveRequestResponse> {
  const res = await api.delete(`/leave-requests/${requestId}`);
  return res.data;
}

// ==================== Teacher API Functions ====================

/**
 * Get leave requests with statistics for teacher (Teacher only)
 * - Enhanced response with summary stats and per-class breakdown
 * @param classId Optional: Filter by class ID
 * @param status Optional: Filter by status (pending|approved|rejected|cancelled)
 * @returns Leave requests with comprehensive statistics
 */
export async function getTeacherLeaveRequestsWithStats(
  classId?: number,
  status?: LeaveRequestStatus | "all"
): Promise<GetTeacherLeaveRequestsResponse> {
  const params: Record<string, string | number> = {};
  if (classId !== undefined) params.class_id = classId;
  if (status) params.status = status;

  const res = await api.get("/leave-requests/teacher/statistics", { params });
  return res.data;
}

/**
 * Batch review multiple leave requests at once (Teacher only)
 * - Approve or reject multiple requests with single API call
 * @param payload Request IDs, status, and optional review notes
 * @returns Success/failure count and detailed results
 */
export async function batchReviewLeaveRequests(
  payload: BatchReviewPayload
): Promise<BatchReviewResponse> {
  const res = await api.post("/leave-requests/batch-review", payload);
  return res.data;
}

/**
 * Get pending leave requests count for teacher
 * - Quick access to pending count for notifications
 * @returns Number of pending leave requests
 */
export async function getTeacherPendingCount(): Promise<number> {
  try {
    const response = await getTeacherLeaveRequestsWithStats(undefined, 'pending');
    return response.data.summary.pendingCount;
  } catch (error) {
    console.error('Failed to get pending count:', error);
    return 0;
  }
}