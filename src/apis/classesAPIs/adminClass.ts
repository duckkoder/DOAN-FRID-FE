import api from "../axios";

// ==================== INTERFACES ====================

export interface ClassStatsData {
  total: number;
  active: number;
  inactive: number;
}

export interface GetClassStatsResponse {
  success: boolean;
  data: ClassStatsData;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]> | string;
  statusCode?: number;
}

// ==================== API FUNCTIONS ====================

/**
 * Get classes statistics (admin only)
 * @returns Promise with classes statistics
 * @throws ApiError if request fails
 */
export const getClassesStats = async (): Promise<GetClassStatsResponse> => {
  try {
    const response = await api.get<GetClassStatsResponse>("/admin/classes/stats");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching classes stats:", error);
    
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || "Failed to fetch classes statistics",
      errors: error.response?.data?.errors,
      statusCode: error.response?.status,
    };
    
    throw apiError;
  }
};
