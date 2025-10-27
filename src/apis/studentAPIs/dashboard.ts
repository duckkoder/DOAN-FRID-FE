import api from "../axios";
import type { StudentDashboardResponseSchema } from '../../types/studentDashboard';

// ==================== API FUNCTIONS ====================

/**
 * Get student dashboard data
 * GET /student/dashboard
 */
export const getStudentDashboardData = async (): Promise<StudentDashboardResponseSchema> => {
  try {
    const response = await api.get("/student/dashboard");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching student dashboard data:", error);
    // You might want to define a more specific ApiError interface if not already done
    const apiError = {
      message: error.response?.data?.message || "Failed to fetch dashboard data",
      errors: error.response?.data?.errors,
      statusCode: error.response?.status
    };
    throw apiError;
  }
};