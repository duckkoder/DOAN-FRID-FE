import api from "../axios";

// ==================== Types ====================

export interface UploadFileResponse {
  success: boolean;
  data: {
    file_id: number;
    file_key: string;
    url: string;
    original_name: string;
    size: number;
  };
  message: string;
}

// ==================== API Functions ====================

/**
 * Upload avatar image (public)
 * Requires: Authenticated user
 * Returns: File URL on S3
 */
export const uploadAvatar = async (file: File): Promise<UploadFileResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/files/upload/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

/**
 * Upload document (private)
 * Requires: Authenticated user
 */
export const uploadDocument = async (file: File): Promise<UploadFileResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/files/upload/document", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

/**
 * Upload face image (private)
 * Requires: Authenticated user
 */
export const uploadFaceImage = async (
  file: File
): Promise<UploadFileResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/files/upload/face", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

/**
 * Delete file
 * Requires: Authenticated user (file owner)
 */
export const deleteFile = async (fileId: number): Promise<void> => {
  await api.delete(`/files/${fileId}`);
};

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
      error: "Chỉ chấp nhận file ảnh (JPG, PNG, GIF)",
    };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Kích thước file không được vượt quá 5MB",
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
