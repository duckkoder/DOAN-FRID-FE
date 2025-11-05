import axiosInstance from '../axios';

export interface FaceRegistrationStatus {
  status: string | null;
  registration_id: number | null;
  message: string;
  can_register: boolean;
  details: {
    created_at?: string;
    student_reviewed_at?: string;
    admin_reviewed_at?: string;
    total_images_captured?: number;
    registration_progress?: number;
    rejection_reason?: string;
  } | null;
}

/**
 * Get current user's face registration status
 */
export const getMyRegistrationStatus = async (): Promise<FaceRegistrationStatus> => {
  const response = await axiosInstance.get('/face-registration/my-status');
  return response.data;
};

/**
 * Get face registration status for a specific student (admin only)
 */
export const getRegistrationStatus = async (studentId: number): Promise<FaceRegistrationStatus> => {
  const response = await axiosInstance.get(`/face-registration/status/${studentId}`);
  return response.data;
};

/**
 * Load pending review images (for student with pending_student_review status)
 */
export const loadPendingReviewImages = async (): Promise<{
  registration_id: number;
  status: string;
  total_images: number;
  preview_images: Array<{
    step_name: string;
    step_number: number;
    instruction: string;
    image_base64: string;
    timestamp: string;
  }>;
  message: string;
}> => {
  const response = await axiosInstance.get('/face-registration/load-pending-review');
  return response.data;
};

/**
 * Confirm or reject pending review images
 */
export const confirmPendingReview = async (accept: boolean): Promise<{
  success: boolean;
  status: string | null;
  message: string;
  total_images?: number;
}> => {
  const response = await axiosInstance.post('/face-registration/confirm-pending-review', null, {
    params: { accept }
  });
  return response.data;
};
