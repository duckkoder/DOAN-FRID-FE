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
