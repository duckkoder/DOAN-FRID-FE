import api from "../axios";
import type { AxiosProgressEvent } from "axios";

// ==================== Types ====================

export type UploadedFileInfo = {
  file_id: number;
  file_key?: string;
  url?: string;
  original_name?: string;
  filename?: string;
  size?: number;
  category?: string;
  is_public?: boolean;
  created_at?: string;
  document_id?: string | null;
  document_title?: string | null;
};

export type UploadResponse = {
  success: boolean;
  data: UploadedFileInfo;
  message?: string;
};

export type MyFilesResponse = {
  success: boolean;
  data: UploadedFileInfo[];
  total: number;
};

type UploadDocumentOptions = {
  courseId?: string;
  title?: string;
};

// ==================== API Functions ====================

/**
 * Upload avatar (public image)
 * @param file HTML File
 * @param onProgress optional progress callback (e: AxiosProgressEvent)
 */
export async function uploadAvatar(
  file: File,
  onProgress?: (e: AxiosProgressEvent) => void
): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await api.post("/files/upload/avatar", fd, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });
  return res.data;
}

/**
 * Upload document (private)
 */
export async function uploadDocument(
  file: File,
  options?: UploadDocumentOptions,
  onProgress?: (e: AxiosProgressEvent) => void
): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  if (options?.courseId) {
    fd.append("course_id", options.courseId);
  }
  if (options?.title) {
    fd.append("title", options.title);
  }

  const res = await api.post("/files/upload/document", fd, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });
  return res.data;
}

/**
 * Upload face image (private)
 */
export async function uploadFaceImage(
  file: File,
  onProgress?: (e: AxiosProgressEvent) => void
): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await api.post("/files/upload/face", fd, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });
  return res.data;
}

/**
 * Get download / presigned URL for a file
 */
export async function getDownloadUrl(fileId: number): Promise<{ success: boolean; data: { file_id: number; url: string } }> {
  const res = await api.get(`/files/download/${fileId}`);
  return res.data;
}

/**
 * Delete file by id
 */
export async function deleteFile(fileId: number): Promise<{ success: boolean; message?: string }> {
  const res = await api.delete(`/files/${fileId}`);
  return res.data;
}

/**
 * Get current user's uploaded files
 */
export async function getMyFiles(): Promise<MyFilesResponse> {
  const res = await api.get("/files/my-files");
  return res.data;
}

/**
 * Open class document content through backend stream endpoint (auth required).
 */
export async function openClassDocument(documentId: string): Promise<void> {
  const res = await api.get(`/files/documents/${documentId}/content`, {
    responseType: "blob",
  });

  const blob = new Blob([res.data], {
    type: (res.headers["content-type"] as string) || "application/octet-stream",
  });

  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");

  // Delay revoke to avoid cutting off the new tab while loading large files.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

// ==================== Helper Functions ====================

/**
 * Validate image file before upload
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Only image files are accepted (JPG, PNG, GIF)",
    };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "File size must not exceed 5MB",
    };
  }

  return { valid: true };
};

/**
 * Convert file to base64 for preview
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};
