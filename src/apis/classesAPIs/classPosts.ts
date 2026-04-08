import api from "../axios";

export interface MentionedDocument {
  documentId: string;
  documentTitle: string;
}

export interface MentionedMember {
  studentId: number;
  mentionedName: string;
}

export interface PersonProfile {
  role: "student" | "teacher";
  id: number;
  fullName: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  studentCode?: string | null;
  department?: string | null;
  specialization?: string | null;
  academicYear?: string | null;
}

export interface CommentItem {
  id: number;
  postId: number;
  studentId: number | null;
  teacherId?: number | null;
  authorId?: number | null;
  authorRole?: "student" | "teacher" | null;
  studentName: string | null;
  authorProfile?: PersonProfile | null;
  content: string;
  parentCommentId: number | null;
  createdAt: string;
  documentMentions: MentionedDocument[];
  memberMentions: MentionedMember[];
  replies: CommentItem[];
}

export interface PostAttachmentItem {
  documentId: string;
  title: string | null;
  fileUrl: string | null;
}

export interface ClassPostItem {
  id: number;
  classId: number;
  teacherId: number;
  teacherName: string | null;
  teacherProfile?: PersonProfile | null;
  content: string;
  createdAt: string;
  attachments: PostAttachmentItem[];
  documentMentions: MentionedDocument[];
  memberMentions: MentionedMember[];
  reactions: {
    total: number;
    byEmoji: Record<string, number>;
    myReaction: string | null;
  };
  comments: CommentItem[];
}

export interface ListClassPostsResponse {
  success: boolean;
  data: {
    items: ClassPostItem[];
    total: number;
    limit: number;
    offset: number;
  };
}

interface CreatePostResponse {
  success: boolean;
  data: { post: ClassPostItem };
  message: string;
}

interface UpdatePostResponse {
  success: boolean;
  data: { post: ClassPostItem };
  message: string;
}

interface GetClassPostResponse {
  success: boolean;
  data: { post: ClassPostItem };
}

export const getClassPosts = async (
  classId: number,
  options?: { includeComments?: boolean; limit?: number; offset?: number }
): Promise<ListClassPostsResponse> => {
  const params = {
    include_comments: options?.includeComments ?? true,
    limit: options?.limit ?? 20,
    offset: options?.offset ?? 0,
  };
  const response = await api.get(`/class-posts/classes/${classId}/posts`, { params });
  return response.data;
};

export const getClassPost = async (
  postId: number,
  options?: { includeComments?: boolean }
): Promise<GetClassPostResponse> => {
  const params = {
    include_comments: options?.includeComments ?? true,
  };
  const response = await api.get(`/class-posts/posts/${postId}`, { params });
  return response.data;
};

export const createClassPost = async (
  classId: number,
  payload: { content: string; attachment_document_ids: string[] }
): Promise<CreatePostResponse> => {
  const response = await api.post(`/class-posts/classes/${classId}/posts`, payload);
  return response.data;
};

export const deleteClassPost = async (postId: number): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/class-posts/posts/${postId}`);
  return response.data;
};

export const updateClassPost = async (
  postId: number,
  payload: { content?: string; attachment_document_ids?: string[] }
): Promise<UpdatePostResponse> => {
  const response = await api.patch(`/class-posts/posts/${postId}`, payload);
  return response.data;
};

export const reactToClassPost = async (
  postId: number,
  emoji: string
): Promise<{
  success: boolean;
  data: {
    postId: number;
    myReaction: string;
    reactionSummary: Record<string, number>;
    total: number;
  };
  message: string;
}> => {
  const response = await api.post(`/class-posts/posts/${postId}/reactions`, { emoji });
  return response.data;
};

export const removeClassPostReaction = async (
  postId: number
): Promise<{
  success: boolean;
  data: {
    postId: number;
    reactionSummary: Record<string, number>;
    total: number;
  };
  message: string;
}> => {
  const response = await api.delete(`/class-posts/posts/${postId}/reactions`);
  return response.data;
};

export const createPostComment = async (
  postId: number,
  payload: { content: string; parent_comment_id?: number | null }
): Promise<{
  success: boolean;
  data: { comment: CommentItem };
  message: string;
}> => {
  const response = await api.post(`/class-posts/posts/${postId}/comments`, payload);
  return response.data;
};
