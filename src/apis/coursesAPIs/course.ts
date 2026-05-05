import api from "../axios";
import type { AxiosProgressEvent } from "axios";

// ==================== Types ====================

export interface CourseListItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  classesCount?: number;
  documentsCount?: number;
  createdAt: string;
}

export interface CourseDocument {
  id: string;
  title: string;
  fileUrl: string;
  isEmbedding: boolean;
  onlyClassId: string | null;
  uploadedAt: string;
}

export interface CourseDetail extends CourseListItem {
  documents: CourseDocument[];
  classes: { id: string | number; className: string; classCode: string; isActive: boolean }[];
}

export interface GetCoursesResponse {
  success: boolean;
  data: {
    courses: CourseListItem[];
    total: number;
  };
}

export interface CreateCourseRequest {
  code: string;
  title: string;
  description?: string;
}

// ==================== Course CRUD ====================

/**
 * GET /api/v1/teacher/courses
 * Lấy danh sách Học phần
 */
export const getCoursesList = async (): Promise<GetCoursesResponse> => {
  const res = await api.get("/teacher/courses");
  return res.data;
};

/**
 * POST /api/v1/teacher/courses
 * Tạo Học phần mới
 */
export const createCourse = async (
  data: CreateCourseRequest
): Promise<{ success: boolean; message: string; data: CourseListItem }> => {
  const res = await api.post("/teacher/courses", data);
  return res.data;
};

/**
 * GET /api/v1/teacher/courses/:courseId
 * Lấy chi tiết Học phần (kèm danh sách tài liệu và lớp học)
 */
export const getCourseDetail = async (
  courseId: string
): Promise<{ success: boolean; data: CourseDetail }> => {
  const res = await api.get(`/teacher/courses/${courseId}`);
  return res.data;
};

/**
 * PUT /api/v1/teacher/courses/:courseId
 * Cập nhật Học phần
 */
export const updateCourse = async (
  courseId: string,
  data: Partial<Pick<CreateCourseRequest, "title" | "description">>
): Promise<{ success: boolean; message: string }> => {
  const res = await api.put(`/teacher/courses/${courseId}`, data);
  return res.data;
};

/**
 * DELETE /api/v1/teacher/courses/:courseId
 * Xóa Học phần
 */
export const deleteCourse = async (
  courseId: string,
  password?: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/teacher/courses/${courseId}`, {
    data: password ? { password } : undefined,
  });
  return res.data;
};

// ==================== Course Document Management ====================

/**
 * POST /api/v1/teacher/courses/:courseId/documents
 * Upload tài liệu cho Học phần (dùng chung cho TẤT CẢ lớp trong học phần)
 */
export const uploadCourseDocument = async (
  courseId: string,
  file: File,
  options?: { title?: string; isEmbedding?: boolean },
  onProgress?: (e: AxiosProgressEvent) => void
): Promise<{ success: boolean; message: string; data: CourseDocument }> => {
  const fd = new FormData();
  fd.append("file", file);
  if (options?.title) fd.append("title", options.title);
  if (options?.isEmbedding !== undefined) {
    fd.append("is_embedding", String(options.isEmbedding));
  }

  const res = await api.post(`/teacher/courses/${courseId}/documents`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });
  return res.data;
};

/**
 * DELETE /api/v1/teacher/courses/:courseId/documents/:documentId
 * Xóa tài liệu khỏi Học phần
 */
export const deleteCourseDocument = async (
  courseId: string,
  documentId: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/teacher/courses/${courseId}/documents/${documentId}`);
  return res.data;
};

// ==================== Class Private Document Upload ====================

/**
 * POST /api/v1/teacher/courses/:courseId/classes/:classId/documents
 * Upload tài liệu RIÊNG TƯ cho một lớp cụ thể (only_class_id được set)
 * Mặc định: is_embedding = true
 */
export const uploadClassPrivateDocument = async (
  courseId: string,
  classId: number,
  file: File,
  options?: { title?: string; isEmbedding?: boolean },
  onProgress?: (e: AxiosProgressEvent) => void
): Promise<{ success: boolean; message: string; data: CourseDocument }> => {
  const fd = new FormData();
  fd.append("file", file);
  if (options?.title) fd.append("title", options.title);
  fd.append("is_embedding", String(options?.isEmbedding ?? true));

  const res = await api.post(
    `/teacher/courses/${courseId}/classes/${classId}/documents`,
    fd,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    }
  );
  return res.data;
};
