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

/** Minimal specialization shape used inside DepartmentWithSpecializations */
export interface SpecializationInDepartment {
  id: number;
  name: string;
  code: string;
  description: string | null;
  department_id: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentWithSpecializations extends DepartmentResponse {
  specializations: SpecializationInDepartment[];
}

export interface DepartmentCreateRequest {
  name: string;
  code: string;
  description?: string | null;
}

export interface DepartmentUpdateRequest {
  name?: string;
  code?: string;
  description?: string | null;
}

// ==================== Department API Functions ====================

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
 * Get department with its specializations
 * Requires: Authenticated user
 */
export const getDepartmentWithSpecializations = async (
  departmentId: number
): Promise<DepartmentWithSpecializations> => {
  const response = await api.get(`/departments/${departmentId}`);
  return response.data;
};

/**
 * Create a new department
 * Requires: Admin
 */
export const createDepartment = async (
  data: DepartmentCreateRequest
): Promise<DepartmentResponse> => {
  const response = await api.post("/departments", data);
  return response.data;
};

/**
 * Update a department
 * Requires: Admin
 */
export const updateDepartment = async (
  departmentId: number,
  data: DepartmentUpdateRequest
): Promise<DepartmentResponse> => {
  const response = await api.put(`/departments/${departmentId}`, data);
  return response.data;
};

/**
 * Delete a department
 * Requires: Admin
 */
export const deleteDepartment = async (departmentId: number): Promise<void> => {
  await api.delete(`/departments/${departmentId}`);
};
