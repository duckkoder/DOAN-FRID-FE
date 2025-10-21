import api from "../axios";

// ==================== Types ====================

export interface TeacherResponse {
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

export interface TeacherListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  data: TeacherResponse[];
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

export interface TeacherDetailResponse {
  teacher: TeacherResponse;
  classes: any[];
}

export interface GetTeachersParams {
  search?: string;
  department?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateTeacherRequest {
  // User info
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  avatar_url?: string;
  // Teacher info
  teacher_code: string;
  department_id?: number;
  specialization_id?: number;
}

export interface UpdateTeacherRequest {
  department_id?: number;
  specialization_id?: number;
  phone?: string;
  is_active?: boolean;
  avatar_url?: string;
}

export interface DeleteTeacherResponse {
  message: string;
}

// ==================== API Functions ====================

/**
 * Get list of teachers with pagination and filters
 * Requires: Admin role
 */
export const getTeachersList = async (
  params?: GetTeachersParams
): Promise<TeacherListResponse> => {
  const response = await api.get("/admin/teachers", { params });
  return response.data;
};

/**
 * Get teacher details by ID
 * Requires: Admin role
 */
export const getTeacherDetails = async (
  teacherId: number
): Promise<TeacherDetailResponse> => {
  const response = await api.get(`/admin/teachers/${teacherId}`);
  return response.data;
};

/**
 * Create a new teacher account
 * Note: This uses the register endpoint with role='teacher'
 * Requires: Admin role or public registration
 */
export const createTeacher = async (
  teacherData: CreateTeacherRequest
): Promise<any> => {
  const response = await api.post("/auth/register", {
    ...teacherData,
    role: "teacher",
  });
  return response.data;
};

/**
 * Update teacher information
 * Requires: Admin role
 */
export const updateTeacher = async (
  teacherId: number,
  updateData: UpdateTeacherRequest
): Promise<{ message: string; teacher: TeacherResponse }> => {
  const response = await api.put(`/admin/teachers/${teacherId}`, updateData);
  return response.data;
};

/**
 * Delete (deactivate) teacher
 * Requires: Admin role
 */
export const deleteTeacher = async (
  teacherId: number
): Promise<DeleteTeacherResponse> => {
  const response = await api.delete(`/admin/teachers/${teacherId}`);
  return response.data;
};

// ==================== Helper Functions ====================

/**
 * Get status color for badge display
 */
export const getStatusColor = (isActive: boolean): string => {
  return isActive ? "success" : "default";
};

/**
 * Get status text for display
 */
export const getStatusText = (isActive: boolean): string => {
  return isActive ? "Hoạt động" : "Không hoạt động";
};
