import axiosInstance from "../axios";
import { uploadAvatar as uploadAvatarFile } from "../fileAPIs/file"; // ✅ Import từ file.ts
import type { AxiosProgressEvent } from "axios";

// ============================================================
// PROFILE INTERFACES
// ============================================================

export interface StudentProfileData {
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  department_id?: number;
  academic_year?: string;
}

export interface TeacherProfileData {
  full_name?: string;
  phone?: string;
  department_id?: number;
  specialization_id?: number;
}

export interface AdminProfileData {
  phone?: string;
  avatar_url?: string;
}

export interface PasswordChangeData {
  old_password: string;
  new_password: string;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

export interface AvatarUpdateData {
  avatar_url: string;
}

// ============================================================
// RESPONSE INTERFACES (match backend schemas)
// ============================================================

export interface StudentProfileResponse {
  id: number;
  user_id: number;
  student_code: string;
  date_of_birth: string | null;
  department_id: number | null;
  department: string | null;
  academic_year: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  // User info
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface TeacherProfileResponse {
  id: number;
  user_id: number;
  teacher_code: string;
  department_id: number | null;
  specialization_id: number | null;
  department: string | null;
  specialization: string | null;
  created_at: string;
  updated_at: string;
  // User info
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

// ============================================================
// STUDENT PROFILE APIs
// ============================================================

/**
 * Get student profile
 * GET /api/v1/student/profile
 */
export const getStudentProfile = async (): Promise<StudentProfileResponse> => {
  const response = await axiosInstance.get("/student/profile");
  return response.data;
};

/**
 * Update student profile
 * PUT /api/v1/student/profile
 */
export const updateStudentProfile = async (
  data: StudentProfileData
): Promise<StudentProfileResponse> => {
  const response = await axiosInstance.put("/student/profile", data);
  return response.data;
};

/**
 * Update student avatar
 * PUT /api/v1/student/avatar
 */
export const updateStudentAvatar = async (
  avatar_url: string
): Promise<StudentProfileResponse> => {
  const response = await axiosInstance.put("/student/avatar", {
    avatar_url,
  });
  return response.data;
};

// ============================================================
// TEACHER PROFILE APIs
// ============================================================

/**
 * Get teacher profile
 * GET /api/v1/teacher/profile
 */
export const getTeacherProfile = async (): Promise<TeacherProfileResponse> => {
  const response = await axiosInstance.get("/teacher/profile");
  return response.data;
};

/**
 * Update teacher profile
 * PUT /api/v1/teacher/profile
 */
export const updateTeacherProfile = async (
  data: TeacherProfileData
): Promise<TeacherProfileResponse> => {
  const response = await axiosInstance.put("/teacher/profile", data);
  return response.data;
};

/**
 * Update teacher avatar
 * PUT /api/v1/teacher/avatar
 */
export const updateTeacherAvatar = async (
  avatar_url: string
): Promise<TeacherProfileResponse> => {
  const response = await axiosInstance.put("/teacher/avatar", {
    avatar_url,
  });
  return response.data;
};

// ============================================================
// COMMON APIs
// ============================================================

/**
 * Change student password
 * PUT /api/v1/student/change-password
 */
export const changeStudentPassword = async (
  data: PasswordChangeData
): Promise<PasswordChangeResponse> => {
  const response = await axiosInstance.put("/student/change-password", data);
  return response.data;
};

/**
 * Change teacher password
 * PUT /api/v1/teacher/change-password
 */
export const changeTeacherPassword = async (
  data: PasswordChangeData
): Promise<PasswordChangeResponse> => {
  const response = await axiosInstance.put("/teacher/change-password", data);
  return response.data;
};

// ============================================================
// ✅ HELPER: Upload avatar và update profile (2 bước)
// ============================================================

/**
 * Upload avatar file và update student profile
 *
 * Flow:
 * 1. Upload file qua /files/upload/avatar → nhận url
 * 2. Update student avatar qua /student/avatar với url
 *
 * @param file - File ảnh avatar
 * @param onProgress - Callback theo dõi tiến trình upload (optional)
 * @returns StudentProfileResponse với avatar_url mới
 */
export const uploadAndUpdateStudentAvatar = async (
  file: File,
  onProgress?: (e: AxiosProgressEvent) => void
): Promise<StudentProfileResponse> => {
  // Step 1: Upload file to S3
  const uploadResult = await uploadAvatarFile(file, onProgress);

  if (!uploadResult.success || !uploadResult.data.url) {
    throw new Error("Upload avatar failed");
  }

  const avatarUrl = uploadResult.data.url;

  // Step 2: Update student profile with new avatar URL
  return await updateStudentAvatar(avatarUrl);
};

/**
 * Upload avatar file và update teacher profile
 *
 * Flow:
 * 1. Upload file qua /files/upload/avatar → nhận url
 * 2. Update teacher avatar qua /teacher/avatar với url
 *
 * @param file - File ảnh avatar
 * @param onProgress - Callback theo dõi tiến trình upload (optional)
 * @returns TeacherProfileResponse với avatar_url mới
 */
export const uploadAndUpdateTeacherAvatar = async (
  file: File,
  onProgress?: (e: AxiosProgressEvent) => void
): Promise<TeacherProfileResponse> => {
  // Step 1: Upload file to S3
  const uploadResult = await uploadAvatarFile(file, onProgress);

  if (!uploadResult.success || !uploadResult.data.url) {
    throw new Error("Upload avatar failed");
  }

  const avatarUrl = uploadResult.data.url;

  // Step 2: Update teacher profile with new avatar URL
  return await updateTeacherAvatar(avatarUrl);
};
