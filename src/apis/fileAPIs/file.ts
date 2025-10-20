import api from "../axios";
import type { AxiosProgressEvent } from "axios";

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
  onProgress?: (e: AxiosProgressEvent) => void
): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("file", file);

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