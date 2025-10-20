import api from "../axios";

// ==================== INTERFACES ====================

export interface ScheduleModel {
  monday?: string[];
  tuesday?: string[];
  wednesday?: string[];
  thursday?: string[];
  friday?: string[];
  saturday?: string[];
  sunday?: string[];
}

export interface JoinClassRequest {
  class_code: string;
}

export interface StudentClassItem {
  id: number;
  className: string;
  classCode: string;
  teacherName: string;
  location: string | null;
  description: string | null;
  schedule: ScheduleModel;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface StudentClassDetailsData {
  class: {
    id: number;
    className: string;
    classCode: string;
    teacherId: number;
    teacherName: string;
    location: string | null;
    description: string | null;
    schedule: ScheduleModel;
    isActive: boolean;
    totalStudents: number;
    joinAt: string;
    createdAt: string;
    updatedAt: string | null;
  };
  enrollment: {
    joinedAt: string;
  };
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JoinClassResponse {
  success: boolean;
  data: {
    class: StudentClassItem;
    enrollment: {
      joinedAt: string;
    };
  };
  message: string;
}

export interface LeaveClassResponse {
  success: boolean;
  data: {
    message: string;
  };
  message: string;
}

export interface GetStudentClassesListResponse {
  success: boolean;
  data: {
    classes: StudentClassItem[];
    pagination?: PaginationData;
  };
}

export interface GetStudentClassDetailsResponse {
  success: boolean;
  data: StudentClassDetailsData;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]> | string;
  statusCode?: number;
}

// ==================== API FUNCTIONS ====================

/**
 * Join a class using class code
 * POST /student/classes/join
 */
export const joinClass = async (
  classCode: string
): Promise<JoinClassResponse> => {
  try {
    const payload: JoinClassRequest = {
      class_code: classCode
    };

    const response = await api.post("/student/classes/join", payload);
    return response.data;
  } catch (error: any) {
    console.error("Error joining class:", error);
    
    const apiError: ApiError = {
      message: error.response?.data?.message || "Failed to join class",
      errors: error.response?.data?.errors,
      statusCode: error.response?.status
    };
    
    throw apiError;
  }
};

/**
 * Leave a class (remove enrollment)
 * DELETE /student/classes/{class_id}/leave
 */
export const leaveClass = async (
  classId: number
): Promise<LeaveClassResponse> => {
  try {
    const response = await api.delete(`/student/classes/${classId}/leave`);
    return response.data;
  } catch (error: any) {
    console.error("Error leaving class:", error);
    
    const apiError: ApiError = {
      message: error.response?.data?.message || "Failed to leave class",
      errors: error.response?.data?.errors,
      statusCode: error.response?.status
    };
    
    throw apiError;
  }
};

/**
 * Get list of classes that student is enrolled in
 * GET /student/classes
 */
export const getStudentClasses = async (
  statusFilter?: 'active' | 'inactive'
): Promise<GetStudentClassesListResponse> => {
  try {
    const params: Record<string, string> = {};
    
    if (statusFilter) {
      params.status = statusFilter;
    }

    const response = await api.get("/student/classes", { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching student classes:", error);
    
    const apiError: ApiError = {
      message: error.response?.data?.message || "Failed to fetch classes",
      errors: error.response?.data?.errors,
      statusCode: error.response?.status
    };
    
    throw apiError;
  }
};

/**
 * Get detailed information of a class that student is enrolled in
 * GET /student/classes/{class_id}
 */
export const getStudentClassDetails = async (
  classId: number
): Promise<GetStudentClassDetailsResponse> => {
  try {
    const response = await api.get(`/student/classes/${classId}`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching student class details:", error);
    
    const apiError: ApiError = {
      message: error.response?.data?.message || "Failed to fetch class details",
      errors: error.response?.data?.errors,
      statusCode: error.response?.status
    };
    
    throw apiError;
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Convert schedule data to readable format
 */
export const parseScheduleToReadable = (schedule: ScheduleModel): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  
  const dayMapping: Record<string, string> = {
    monday: 'Thứ 2',
    tuesday: 'Thứ 3',
    wednesday: 'Thứ 4',
    thursday: 'Thứ 5',
    friday: 'Thứ 6',
    saturday: 'Thứ 7',
    sunday: 'Chủ nhật'
  };

  Object.entries(schedule).forEach(([day, periods]) => {
    if (periods && periods.length > 0) {
      const dayLabel = dayMapping[day] || day;
      result[dayLabel] = periods;
    }
  });

  return result;
};

/**
 * Validate class code format (9 characters)
 */
export const validateClassCode = (code: string): boolean => {
  return /^[A-Z0-9]{9}$/.test(code);
};

/**
 * Format class schedule for display
 */
export const formatScheduleDisplay = (schedule: ScheduleModel): string => {
  const dayMapping: Record<string, string> = {
    monday: 'T2',
    tuesday: 'T3',
    wednesday: 'T4',
    thursday: 'T5',
    friday: 'T6',
    saturday: 'T7',
    sunday: 'CN'
  };

  const scheduleParts: string[] = [];

  Object.entries(schedule).forEach(([day, periods]) => {
    if (periods && periods.length > 0) {
      const dayLabel = dayMapping[day] || day;
      scheduleParts.push(`${dayLabel}: ${periods.join(', ')}`);
    }
  });

  return scheduleParts.join(' | ');
};