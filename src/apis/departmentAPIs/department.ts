import api from "../axios";

// ==================== Types ====================

export interface DepartmentResponse {
  id: number;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpecializationResponse {
  id: number;
  name: string;
  code: string;
  description: string | null;
  department_id: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentWithSpecializations extends DepartmentResponse {
  specializations: SpecializationResponse[];
}

// ==================== API Functions ====================

/**
 * Get all departments
 * Requires: Authenticated user
 */
export const getDepartments = async (
  skip: number = 0,
  limit: number = 100
): Promise<DepartmentResponse[]> => {
  const response = await api.get("/departments", {
    params: { skip, limit },
  });
  return response.data;
};

/**
 * Get department with specializations
 * Requires: Authenticated user
 */
export const getDepartmentWithSpecializations = async (
  departmentId: number
): Promise<DepartmentWithSpecializations> => {
  const response = await api.get(`/departments/${departmentId}`);
  return response.data;
};

/**
 * Get all specializations (optionally filtered by department)
 * Requires: Authenticated user
 */
export const getSpecializations = async (
  departmentId?: number,
  skip: number = 0,
  limit: number = 100
): Promise<SpecializationResponse[]> => {
  const params: any = { skip, limit };
  if (departmentId) {
    params.department_id = departmentId;
  }
  const response = await api.get("/specializations", { params });
  return response.data;
};
