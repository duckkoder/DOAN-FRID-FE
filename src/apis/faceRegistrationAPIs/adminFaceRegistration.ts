import axiosInstance from '../axios';

// ==================== Types ====================
export interface FaceRegistrationListItem {
  id: number;
  student_id: number;
  student_code: string;
  student_name: string;
  student_is_verified: boolean;
  status: string;
  total_images_captured: number;
  registration_progress: number;
  student_reviewed_at: string | null;
  student_accepted: boolean | null;
  admin_reviewed_at: string | null;
  reviewed_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface FaceRegistrationDetail {
  id: number;
  student_id: number;
  student_code: string;
  student_name: string;
  student_email: string;
  student_is_verified: boolean;
  status: string;
  total_images_captured: number;
  registration_progress: number;
  verification_data: any | null;
  temp_images_data: any[] | null;
  student_reviewed_at: string | null;
  student_accepted: boolean | null;
  admin_reviewed_at: string | null;
  reviewed_by: number | null;
  reviewer_name: string | null;
  rejection_reason: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaceRegistrationListResponse {
  items: FaceRegistrationListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface GetFaceRegistrationsParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApproveRegistrationRequest {
  note?: string;
}

export interface RejectRegistrationRequest {
  rejection_reason: string;
  note?: string;
}

// ==================== API Functions ====================

/**
 * Get list of face registration requests (admin only)
 */
export const getFaceRegistrations = async (
  params: GetFaceRegistrationsParams = {}
): Promise<FaceRegistrationListResponse> => {
  const response = await axiosInstance.get('/admin/face-registrations', {
    params: {
      status: params.status,
      search: params.search,
      page: params.page || 1,
      limit: params.limit || 10,
    },
  });
  return response.data;
};

/**
 * Get face registration detail (admin only)
 */
export const getFaceRegistrationDetail = async (
  registrationId: number
): Promise<FaceRegistrationDetail> => {
  const response = await axiosInstance.get(
    `/admin/face-registrations/${registrationId}`
  );
  return response.data;
};

/**
 * Response from approve endpoint (includes embedding info)
 */
export interface ApproveRegistrationResponse {
  success: boolean;
  message: string;
  registration_id: number;
  status: string;
  reviewed_at: string;
  embeddings_created?: number;  // New field
  processing_time_seconds?: number;  // New field
}

/**
 * Approve face registration (admin only)
 * 
 * This will:
 * 1. Download cropped face images from S3
 * 2. Send to AI-service for embedding extraction
 * 3. Save embeddings to database
 * 4. Update status to 'approved'
 * 
 * Processing time: ~8-30 seconds depending on GPU/CPU
 */
export const approveFaceRegistration = async (
  registrationId: number,
  data: ApproveRegistrationRequest
): Promise<ApproveRegistrationResponse> => {
  const response = await axiosInstance.post(
    `/admin/face-registrations/${registrationId}/approve`,
    data,
    {
      timeout: 120000,  // 2 minutes timeout for embedding processing
    }
  );
  return response.data;
};

/**
 * Reject face registration (admin only)
 */
export const rejectFaceRegistration = async (
  registrationId: number,
  data: RejectRegistrationRequest
): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.post(
    `/admin/face-registrations/${registrationId}/reject`,
    data
  );
  return response.data;
};

// ==================== Helper Functions ====================

/**
 * Get status color for Tag component
 */
export const getRegistrationStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    collecting: 'blue',
    pending_student_review: 'orange',
    pending_admin_review: 'gold',
    approved: 'green',
    rejected: 'red',
    cancelled: 'default',
  };
  return statusColors[status] || 'default';
};

/**
 * Get status text in English
 */
export const getRegistrationStatusText = (status: string): string => {
  const statusTexts: Record<string, string> = {
    collecting: 'Collecting',
    pending_student_review: 'Pending Student Review',
    pending_admin_review: 'Pending Admin Review',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  };
  return statusTexts[status] || status;
};
