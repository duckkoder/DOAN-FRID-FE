import api from "../axios";
import type { DepartmentResponse } from "../departmentAPIs/department";

// ==================== Types ====================

export interface SpecializationResponse {
  id: number;
  name: string;
  code: string;
  description: string | null;
  department_id: number;
  created_at: string;
  updated_at: string;
}

export interface SpecializationWithDepartment extends SpecializationResponse {
  department: DepartmentResponse;
}

export interface SpecializationCreateRequest {
  name: string;
  code: string;
  description?: string | null;
  department_id: number;
}

export interface SpecializationUpdateRequest {
  name?: string;
  code?: string;
  description?: string | null;
  department_id?: number;
}

// ==================== Specialization API Functions ====================

/**
 * Get all specializations, optionally filtered by department
 * GET /specializations?department_id=...
 * Requires: Authenticated user
 */
export const getSpecializations = async (
  departmentId?: number,
  skip: number = 0,
  limit: number = 100
): Promise<SpecializationResponse[]> => {
  const params: Record<string, any> = { skip, limit };
  if (departmentId !== undefined) {
    params.department_id = departmentId;
  }
  const response = await api.get("/specializations", { params });
  return response.data;
};

/**
 * Get a single specialization with its department info
 * GET /specializations/{id}
 * Requires: Authenticated user
 */
export const getSpecializationById = async (
  specializationId: number
): Promise<SpecializationWithDepartment> => {
  const response = await api.get(`/specializations/${specializationId}`);
  return response.data;
};

/**
 * Create a new specialization
 * POST /specializations
 * Requires: Admin
 */
export const createSpecialization = async (
  data: SpecializationCreateRequest
): Promise<SpecializationResponse> => {
  const response = await api.post("/specializations", data);
  return response.data;
};

/**
 * Update a specialization
 * PUT /specializations/{id}
 * Requires: Admin
 */
export const updateSpecialization = async (
  specializationId: number,
  data: SpecializationUpdateRequest
): Promise<SpecializationResponse> => {
  const response = await api.put(`/specializations/${specializationId}`, data);
  return response.data;
};

/**
 * Delete a specialization
 * DELETE /specializations/{id}
 * Requires: Admin
 */
export const deleteSpecialization = async (
  specializationId: number
): Promise<void> => {
  await api.delete(`/specializations/${specializationId}`);
};
