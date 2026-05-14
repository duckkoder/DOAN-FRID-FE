import api from "../axios";

export interface ClassDocumentItem {
  document_id: string;
  title: string;
  file_url: string;
  created_at: string;
  is_private: boolean;
  is_embedding: boolean;
}

export interface ClassDocumentListResponse {
  success: boolean;
  data: ClassDocumentItem[];
  message: string;
}

export const getClassDocuments = async (classId: number): Promise<ClassDocumentListResponse> => {
  const response = await api.get(`/classes/${classId}/documents`);
  return response.data;
};
