import api from "../axios";

// ==================== Types ====================

export interface StudentResponse {
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

export interface StudentListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  data: StudentResponse[];
  stats: {
    total: number;
    active: number;
    inactive: number;
    verified: number;
    unverified: number;
  };
}

export interface StudentDetailResponse {
  student: StudentResponse;
  classes: any[];
  attendance_stats: any;
}

export interface GetStudentsParams {
  search?: string;
  department?: string;
  academic_year?: string;
  is_active?: boolean;
  is_verified?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateStudentRequest {
  // User info
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  avatar_url?: string;
  // Student info
  student_code: string;
  department_id?: number;
  academic_year?: string;
  date_of_birth?: string;
}

export interface UpdateStudentRequest {
  department_id?: number;
  academic_year?: string;
  date_of_birth?: string;
  phone?: string;
  avatar_url?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface DeleteStudentResponse {
  message: string;
}

export interface ResetPasswordRequest {
  new_password: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  user_id: number;
  email: string;
}

// ==================== API Functions ====================

/**
 * Get list of students with pagination and filters
 * Requires: Admin role
 */
export const getStudentsList = async (
  params?: GetStudentsParams
): Promise<StudentListResponse> => {
  const response = await api.get("/admin/students", { params });
  return response.data;
};

/**
 * Get student details by ID
 * Requires: Admin role
 */
export const getStudentDetails = async (
  studentId: number
): Promise<StudentDetailResponse> => {
  const response = await api.get(`/admin/students/${studentId}`);
  return response.data;
};

/**
 * Create a new student account
 * Note: This uses the register endpoint with role='student'
 * Requires: Admin role or public registration
 */
export const createStudent = async (
  studentData: CreateStudentRequest
): Promise<any> => {
  const response = await api.post("/auth/register", {
    ...studentData,
    role: "student",
  });
  return response.data;
};

/**
 * Update student information
 * Requires: Admin role
 */
export const updateStudent = async (
  studentId: number,
  updateData: UpdateStudentRequest
): Promise<{ message: string; student: StudentResponse }> => {
  const response = await api.put(`/admin/students/${studentId}`, updateData);
  return response.data;
};

/**
 * Delete (deactivate) student
 * Requires: Admin role
 */
export const deleteStudent = async (
  studentId: number
): Promise<DeleteStudentResponse> => {
  const response = await api.delete(`/admin/students/${studentId}`);
  return response.data;
};

/**
 * Reset student password
 * Requires: Admin role
 */
export const resetStudentPassword = async (
  studentId: number,
  newPassword: string
): Promise<ResetPasswordResponse> => {
  const response = await api.post(`/admin/students/${studentId}/reset-password`, {
    new_password: newPassword,
  });
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

/**
 * Get verification status color
 */
export const getVerificationColor = (isVerified: boolean): string => {
  return isVerified ? "success" : "default";
};

/**
 * Get verification status text
 */
export const getVerificationText = (isVerified: boolean): string => {
  return isVerified ? "Đã xác thực" : "Chưa xác thực";
};

/**
 * Generate next student code based on existing codes
 * Format: SV001, SV002, ..., SV999
 */
export const generateStudentCode = async (): Promise<string> => {
  try {
    // Fetch all students to check existing codes
    const response = await getStudentsList({ limit: 1000 });
    const existingCodes = response.data
      .map((s) => s.student_code)
      .filter((code) => code && code.startsWith("SV"));

    // Extract numbers from codes like SV001, SV002
    const numbers = existingCodes
      .map((code) => {
        const match = code.match(/^SV(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num) => num > 0);

    // Find next available number
    let nextNumber = 1;
    if (numbers.length > 0) {
      const maxNumber = Math.max(...numbers);
      nextNumber = maxNumber + 1;
    }

    // Format with leading zeros (SV001, SV002, etc.)
    return `SV${String(nextNumber).padStart(3, "0")}`;
  } catch (error) {
    console.error("Error generating student code:", error);
    // Fallback to timestamp-based code if API fails
    const timestamp = Date.now().toString().slice(-6);
    return `SV${timestamp}`;
  }
};
