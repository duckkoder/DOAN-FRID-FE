import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Dropdown,
  Empty,
  Input,
  List,
  Modal,
  Popover,
  Space,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
  Checkbox,
} from "antd";
import {
  MailOutlined,
  DeleteOutlined,
  EditOutlined,
  HeartOutlined,
  MessageOutlined,
  MoreOutlined,
  PaperClipOutlined,
  ReadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuProps, UploadFile, UploadProps } from "antd";

import {
  createClassPost,
  createPostComment,
  deleteClassPost,
  getClassPost,
  getClassPosts,
  getPostReactionDetails,
  removeClassPostReaction,
  reactToClassPost,
  updateClassPost,
  type ClassPostItem,
  type CommentItem,
  type MentionedDocument,
  type MentionedMember,
  type PersonProfile,
  type PostReactionDetails,
} from "../apis/classesAPIs/classPosts";
import { useAuth } from "../hooks/useAuth";
import { openClassDocument, uploadDocument } from "../apis/fileAPIs/file";
import type { ClassDocumentItem } from "../apis/classesAPIs/teacherClass";
import { REACTION_OPTIONS, normalizeReactionEmoji } from "../constants/reactions";
import "./TeacherClassPostsPanel.css";

const { Text } = Typography;
const { TextArea } = Input;

interface TeacherClassPostsPanelProps {
  classId: number;
  allowCreatePost?: boolean;
  focusPostId?: number | null;
  courseId?: string | null;
  mentionDocuments?: ClassDocumentItem[];
  mentionStudents?: MentionStudentItem[];
  mentionTeachers?: MentionTeacherItem[];
  mentionSourcesLoading?: boolean;
}

interface ProfileModalState {
  profile: PersonProfile;
}

const mentionPattern = /@(doc|sv|gv)(?:\{([^}]+)\}|:([A-Za-z0-9_-]+))/g;

const normalizeMentionValue = (value: string): string => value.trim().toLowerCase();

interface MentionStudentItem {
  id: number;
  studentId: string;
  fullName: string;
  email?: string | null;
  avatar?: string | null;
  department?: string | null;
  academicYear?: string | null;
}

interface MentionTeacherItem {
  id: number;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
  department?: string | null;
  specialization?: string | null;
}

type MentionSuggestion =
  | {
      key: string;
      type: "doc";
      title: string;
      meta: string;
      insertText: string;
    }
  | {
      key: string;
      type: "sv";
      title: string;
      meta: string;
      insertText: string;
    }
  | {
      key: string;
      type: "gv";
      title: string;
      meta: string;
      insertText: string;
    };

interface MentionPickerState {
  fieldKey: string;
  startIndex: number;
  cursorIndex: number;
  query: string;
  selectedIndex: number;
}

const TeacherClassPostsPanel: React.FC<TeacherClassPostsPanelProps> = ({
  classId,
  allowCreatePost = true,
  focusPostId = null,
  courseId = null,
  mentionDocuments = [],
  mentionStudents = [],
  mentionTeachers = [],
  mentionSourcesLoading = false,
}) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ClassPostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ClassPostItem | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [updating, setUpdating] = useState(false);
  const [expandedComments, setExpandedComments] = useState<number[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<number | null>(null);
  const [commentSubmittingKey, setCommentSubmittingKey] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileModalState | null>(null);
  const [content, setContent] = useState("");
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isPrivateToClass, setIsPrivateToClass] = useState(false);
  const [isEmbeddingEnabled, setIsEmbeddingEnabled] = useState(true);
  const [mentionPicker, setMentionPicker] = useState<MentionPickerState | null>(null);
  const [reactionDetails, setReactionDetails] = useState<Record<number, PostReactionDetails>>({});
  const [reactionDetailsLoadingPostId, setReactionDetailsLoadingPostId] = useState<number | null>(null);
  const [openReactionPostId, setOpenReactionPostId] = useState<number | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      if (focusPostId) {
        const response = await getClassPost(focusPostId, { includeComments: true });
        setPosts(response.data.post ? [response.data.post] : []);
      } else {
        const response = await getClassPosts(classId, { includeComments: true, limit: 50, offset: 0 });
        setPosts(response.data.items || []);
      }
    } catch (error: unknown) {
      const maybeError = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      message.error(maybeError?.response?.data?.detail || maybeError?.response?.data?.message || maybeError?.message || "Không thể tải bài đăng");
    } finally {
      setLoading(false);
    }
  }, [classId, focusPostId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const uploadProps: UploadProps = {
    multiple: true,
    beforeUpload: () => false,
    fileList: uploadFiles,
    onChange: ({ fileList }) => setUploadFiles(fileList),
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png",
  };

  const handleCreatePost = async (): Promise<void> => {
    const trimmed = content.trim();
    if (!trimmed) {
      message.warning("Nhập nội dung bài đăng trước nhé");
      return;
    }

    setCreating(true);
    try {
      const attachmentDocumentIds: string[] = [];
      for (const uploadFile of uploadFiles) {
        if (!uploadFile.originFileObj) continue;
        const uploaded = await uploadDocument(uploadFile.originFileObj, {
          courseId: (!isPrivateToClass && courseId) ? courseId : undefined,
          onlyClassId: (isPrivateToClass || !courseId) ? String(classId) : undefined,
          isEmbedding: isEmbeddingEnabled,
          title: uploadFile.name,
        });
        if (uploaded.data.document_id) {
          attachmentDocumentIds.push(uploaded.data.document_id);
        }
      }

      await createClassPost(classId, {
        content: trimmed,
        attachment_document_ids: attachmentDocumentIds,
      });

      setContent("");
      setUploadFiles([]);
      setComposerOpen(false);
      message.success("Đăng bài thành công");
      await fetchPosts();
    } catch (error: unknown) {
      const maybeError = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      message.error(maybeError?.response?.data?.detail || maybeError?.response?.data?.message || maybeError?.message || "Không thể tạo bài đăng");
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePost = async (postId: number): Promise<void> => {
    try {
      await deleteClassPost(postId);
      message.success("Đã xóa bài đăng");
      await fetchPosts();
    } catch (error: unknown) {
      const maybeError = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      message.error(maybeError?.response?.data?.detail || maybeError?.response?.data?.message || maybeError?.message || "Không thể xóa bài đăng");
    }
  };

  const handleUpdatePost = async (): Promise<void> => {
    if (!editingPost) return;
    const trimmed = editingContent.trim();
    if (!trimmed) {
      message.warning("Nội dung thông báo không được để trống");
      return;
    }

    setUpdating(true);
    try {
      await updateClassPost(editingPost.id, { content: trimmed });
      message.success("Đã cập nhật thông báo");
      setEditingPost(null);
      setEditingContent("");
      await fetchPosts();
    } catch (error: unknown) {
      const maybeError = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      message.error(maybeError?.response?.data?.detail || maybeError?.response?.data?.message || maybeError?.message || "Không thể cập nhật thông báo");
    } finally {
      setUpdating(false);
    }
  };

  const isOwnerPost = (post: ClassPostItem): boolean => {
    const teacherId = user?.teacher_id;
    return typeof teacherId === "number" && teacherId === post.teacherId;
  };

  const toggleComments = (postId: number): void => {
    setExpandedComments((prev) => (prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]));
  };

  const topReactions = (post: ClassPostItem): Array<[string, number]> => {
    const normalizedSummary = Object.entries(post.reactions.byEmoji).reduce<Record<string, number>>((acc, [emoji, count]) => {
      const normalizedEmoji = normalizeReactionEmoji(emoji) || emoji;
      acc[normalizedEmoji] = (acc[normalizedEmoji] || 0) + count;
      return acc;
    }, {});

    return Object.entries(normalizedSummary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  };

  const mentionSuggestions = useMemo<MentionSuggestion[]>(() => {
    const query = normalizeMentionValue(mentionPicker?.query || "");

    const documents = (query
      ? mentionDocuments.filter(
          (item) =>
            normalizeMentionValue(item.title || "").includes(query) ||
            normalizeMentionValue(item.documentId).includes(query)
        )
      : mentionDocuments
    ).map<MentionSuggestion>((item) => ({
      key: `doc-${item.documentId}`,
      type: "doc",
      title: item.title || item.documentId,
      meta: item.isPrivate ? "Tài liệu riêng tư" : "Tài liệu lớp",
      insertText: `@doc{${item.title || item.documentId}}`,
    }));

    const students = (query
      ? mentionStudents.filter(
          (item) =>
            normalizeMentionValue(item.fullName).includes(query) ||
            normalizeMentionValue(item.studentId).includes(query) ||
            normalizeMentionValue(item.email || "").includes(query)
        )
      : mentionStudents
    ).map<MentionSuggestion>((item) => ({
      key: `sv-${item.id}`,
      type: "sv",
      title: item.fullName,
      meta: item.studentId,
      insertText: `@sv{${item.fullName}${item.studentId ? ` - ${item.studentId}` : ""}}`,
    }));

    const teachers = (query
      ? mentionTeachers.filter(
          (item) =>
            normalizeMentionValue(item.fullName).includes(query) ||
            normalizeMentionValue(item.email || "").includes(query)
        )
      : mentionTeachers
    ).map<MentionSuggestion>((item) => ({
      key: `gv-${item.id}`,
      type: "gv",
      title: item.fullName,
      meta: item.email || "Giảng viên",
      insertText: `@gv{${item.fullName}}`,
    }));

    return [...documents, ...students, ...teachers].slice(0, 12);
  }, [mentionDocuments, mentionPicker?.query, mentionStudents, mentionTeachers]);

  const activeMentionCount = mentionSuggestions.length;

  const updateFieldValue = (fieldKey: string, nextValue: string): void => {
    if (fieldKey === "composer") {
      setContent(nextValue);
      return;
    }

    if (fieldKey === "edit") {
      setEditingContent(nextValue);
      return;
    }

    if (fieldKey.startsWith("comment-")) {
      const postId = Number(fieldKey.replace("comment-", ""));
      setCommentDrafts((prev) => ({ ...prev, [postId]: nextValue }));
      return;
    }

    if (fieldKey.startsWith("reply-")) {
      const commentId = Number(fieldKey.replace("reply-", ""));
      setReplyDrafts((prev) => ({ ...prev, [commentId]: nextValue }));
    }
  };

  const syncMentionPicker = (fieldKey: string, value: string, cursorIndex: number): void => {
    const beforeCursor = value.slice(0, cursorIndex);
    const startIndex = beforeCursor.lastIndexOf("@");

    if (startIndex < 0) {
      setMentionPicker((prev) => (prev?.fieldKey === fieldKey ? null : prev));
      return;
    }

    const query = beforeCursor.slice(startIndex + 1);
    if (/[{}\n\r]/.test(query) || query.length > 60) {
      setMentionPicker((prev) => (prev?.fieldKey === fieldKey ? null : prev));
      return;
    }

    setMentionPicker({
      fieldKey,
      startIndex,
      cursorIndex,
      query,
      selectedIndex: 0,
    });
  };

  const handleDraftChange = (
    fieldKey: string,
    value: string,
    cursorIndex: number,
    updateValue: (value: string) => void
  ): void => {
    updateValue(value);
    syncMentionPicker(fieldKey, value, cursorIndex);
  };

  const insertMention = (
    fieldKey: string,
    currentValue: string,
    cursorIndex: number,
    mentionText: string
  ): void => {
    if (!mentionPicker || mentionPicker.fieldKey !== fieldKey) return;

    const nextValue = `${currentValue.slice(0, mentionPicker.startIndex)}${mentionText} ${currentValue.slice(cursorIndex)}`;
    updateFieldValue(fieldKey, nextValue);
    setMentionPicker(null);
  };

  const selectActiveMention = (fieldKey: string, currentValue: string, cursorIndex: number): void => {
    if (!mentionPicker || mentionPicker.fieldKey !== fieldKey) return;

    const suggestion = mentionSuggestions[mentionPicker.selectedIndex];
    if (!suggestion) return;
    insertMention(fieldKey, currentValue, cursorIndex, suggestion.insertText);
  };

  const keepTextAreaCursor = (target: HTMLTextAreaElement, cursorIndex: number): void => {
    window.requestAnimationFrame(() => {
      target.setSelectionRange(cursorIndex, cursorIndex);
    });
  };

  const handleMentionKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    fieldKey: string,
    currentValue: string,
    submit?: () => void
  ): void => {
    const cursorIndex = event.currentTarget.selectionStart ?? currentValue.length;

    if (!mentionPicker || mentionPicker.fieldKey !== fieldKey) {
      if (event.key === "Enter" && !event.shiftKey && submit) {
        event.preventDefault();
        submit();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      keepTextAreaCursor(event.currentTarget, cursorIndex);
      setMentionPicker((prev) =>
        prev
          ? {
              ...prev,
              selectedIndex: activeMentionCount ? (prev.selectedIndex + 1) % activeMentionCount : 0,
            }
          : prev
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      keepTextAreaCursor(event.currentTarget, cursorIndex);
      setMentionPicker((prev) =>
        prev
          ? {
              ...prev,
              selectedIndex: activeMentionCount
                ? (prev.selectedIndex - 1 + activeMentionCount) % activeMentionCount
                : 0,
            }
          : prev
      );
      return;
    }

    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      selectActiveMention(fieldKey, currentValue, cursorIndex);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setMentionPicker(null);
    }
  };

  const handleOpenDocument = async (documentId: string, title?: string | null): Promise<void> => {
    try {
      await openClassDocument(documentId, title || undefined);
    } catch (error) {
      const maybeError = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      message.error(
        maybeError?.response?.data?.detail ||
        maybeError?.response?.data?.message ||
        maybeError?.message ||
        "Khong the mo tai lieu"
      );
    }
  };

  const renderMentionPicker = (fieldKey: string, currentValue: string): React.ReactNode => {
    if (!mentionPicker || mentionPicker.fieldKey !== fieldKey) return null;

    return (
      <div className="mention-picker">
        <div className="mention-picker-search">
          @{mentionPicker.query || "tìm tài liệu hoặc sinh viên"} <span>↑↓ chọn, Enter chèn</span>
        </div>

        <div className="mention-picker-list">
          {mentionSourcesLoading ? (
            <div className="mention-picker-empty">Đang tải gợi ý...</div>
          ) : mentionSuggestions.length ? (
            mentionSuggestions.map((item, index) => (
                <button
                  type="button"
                  key={item.key}
                  className={`mention-picker-option ${index === mentionPicker.selectedIndex ? "active" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertMention(fieldKey, currentValue, mentionPicker.cursorIndex, item.insertText)}
                >
                  {item.type === "doc" ? <ReadOutlined /> : <UserOutlined />}
                  <span className="mention-picker-main">{item.title}</span>
                  <Tag
                    color={item.type === "doc" ? "blue" : item.type === "gv" ? "gold" : "green"}
                    className="mention-picker-kind"
                  >
                    {item.type}
                  </Tag>
                  <span className="mention-picker-meta">{item.meta}</span>
                </button>
            ))
          ) : (
            <div className="mention-picker-empty">Không có gợi ý phù hợp</div>
          )}
        </div>
      </div>
    );
  };

  const findMentionedDocument = (
    rawValue: string,
    isIdSyntax: boolean,
    documents: MentionedDocument[]
  ): MentionedDocument | undefined => {
    const normalizedValue = normalizeMentionValue(rawValue);
    if (isIdSyntax) {
      const mentionedDocument = documents.find((item) => normalizeMentionValue(item.documentId) === normalizedValue);
      const sourceDocument = mentionDocuments.find((item) => normalizeMentionValue(item.documentId) === normalizedValue);
      if (mentionedDocument) return mentionedDocument;
      if (sourceDocument) {
        return { documentId: sourceDocument.documentId, documentTitle: sourceDocument.title || sourceDocument.documentId };
      }
      return undefined;
    }

    const mentionedDocument = documents.find((item) => normalizeMentionValue(item.documentTitle) === normalizedValue);
    const sourceDocument = mentionDocuments.find((item) => normalizeMentionValue(item.title || "") === normalizedValue);
    if (mentionedDocument) return mentionedDocument;
    if (sourceDocument) {
      return { documentId: sourceDocument.documentId, documentTitle: sourceDocument.title || sourceDocument.documentId };
    }
    return undefined;
  };

  const findMentionedMember = (
    rawValue: string,
    isIdSyntax: boolean,
    members: MentionedMember[]
  ): MentionedMember | undefined => {
    const normalizedValue = normalizeMentionValue(rawValue);
    const studentCodeFromLabel = rawValue.includes(" - ") ? rawValue.split(" - ").pop()?.trim() : null;
    const nameFromLabel = rawValue.includes(" - ") ? rawValue.split(" - ").slice(0, -1).join(" - ").trim() : rawValue.trim();
    const normalizedNameFromLabel = normalizeMentionValue(nameFromLabel);
    if (isIdSyntax) {
      const member = members.find((item) => String(item.studentId) === rawValue.trim());
      const sourceStudent = mentionStudents.find((item) => String(item.id) === rawValue.trim());
      if (member) return member;
      if (sourceStudent) return { studentId: sourceStudent.id, mentionedName: sourceStudent.fullName };
      return undefined;
    }

    const member = members.find(
      (item) =>
        normalizeMentionValue(item.mentionedName) === normalizedValue ||
        normalizeMentionValue(item.mentionedName) === normalizedNameFromLabel ||
        String(item.studentId) === rawValue.trim()
    );
    const sourceStudent = mentionStudents.find(
      (item) =>
        normalizeMentionValue(item.fullName) === normalizedValue ||
        normalizeMentionValue(item.fullName) === normalizedNameFromLabel ||
        normalizeMentionValue(item.studentId) === normalizedValue ||
        normalizeMentionValue(item.studentId) === normalizeMentionValue(studentCodeFromLabel || "")
    );
    if (member) return member;
    if (sourceStudent) return { studentId: sourceStudent.id, mentionedName: sourceStudent.fullName };
    return undefined;
  };

  const findMentionedTeacher = (rawValue: string, isIdSyntax: boolean): MentionTeacherItem | undefined => {
    const normalizedValue = normalizeMentionValue(rawValue);
    if (isIdSyntax) {
      return mentionTeachers.find((item) => String(item.id) === rawValue.trim());
    }

    return mentionTeachers.find(
      (item) =>
        normalizeMentionValue(item.fullName) === normalizedValue ||
        normalizeMentionValue(item.email || "") === normalizedValue
    );
  };

  const isCurrentUserMemberMention = (member: MentionedMember): boolean => {
    return typeof user?.student_id === "number" && user.student_id === member.studentId;
  };

  const isCurrentUserTeacherMention = (teacher: MentionTeacherItem): boolean => {
    return typeof user?.teacher_id === "number" && user.teacher_id === teacher.id;
  };

  const renderMentionedContent = (
    rawContent: string,
    documentMentions: MentionedDocument[] = [],
    memberMentions: MentionedMember[] = []
  ): React.ReactNode => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;

    Array.from(rawContent.matchAll(mentionPattern)).forEach((match, index) => {
      const fullMatch = match[0];
      const mentionType = match[1];
      const mentionValue = match[2] || match[3] || "";
      const isIdSyntax = Boolean(match[3]);
      const startIndex = match.index ?? 0;

      if (startIndex > lastIndex) {
        nodes.push(rawContent.slice(lastIndex, startIndex));
      }

      if (mentionType === "doc") {
        const document = findMentionedDocument(mentionValue, isIdSyntax, documentMentions);
        if (document) {
          nodes.push(
            <Tag
              key={`doc-mention-${document.documentId}-${startIndex}-${index}`}
              color="blue"
              className="mention-tag mention-tag-doc"
              role="button"
              tabIndex={0}
              onClick={() => void handleOpenDocument(document.documentId, document.documentTitle)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void handleOpenDocument(document.documentId, document.documentTitle);
                }
              }}
            >
              <ReadOutlined /> {document.documentTitle || document.documentId}
            </Tag>
          );
        } else {
          nodes.push(fullMatch);
        }
      } else if (mentionType === "sv") {
        const member = findMentionedMember(mentionValue, isIdSyntax, memberMentions);
        if (member) {
          nodes.push(
            <Tag
              key={`member-mention-${member.studentId}-${startIndex}-${index}`}
              color="green"
              className={`mention-tag mention-tag-member ${isCurrentUserMemberMention(member) ? "mention-tag-self" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() =>
                openProfileModal({
                  profile: {
                    role: "student",
                    id: member.studentId,
                    fullName: member.mentionedName,
                  },
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openProfileModal({
                    profile: {
                      role: "student",
                      id: member.studentId,
                      fullName: member.mentionedName,
                    },
                  });
                }
              }}
            >
              <UserOutlined /> {member.mentionedName}
            </Tag>
          );
        } else {
          nodes.push(fullMatch);
        }
      } else {
        const teacher = findMentionedTeacher(mentionValue, isIdSyntax);
        if (teacher) {
          nodes.push(
            <Tag
              key={`teacher-mention-${teacher.id}-${startIndex}-${index}`}
              className={`mention-tag mention-tag-teacher ${isCurrentUserTeacherMention(teacher) ? "mention-tag-self" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() =>
                openProfileModal({
                  profile: {
                    role: "teacher",
                    id: teacher.id,
                    fullName: teacher.fullName,
                    email: teacher.email,
                    avatarUrl: teacher.avatarUrl,
                    department: teacher.department,
                    specialization: teacher.specialization,
                  },
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openProfileModal({
                    profile: {
                      role: "teacher",
                      id: teacher.id,
                      fullName: teacher.fullName,
                      email: teacher.email,
                      avatarUrl: teacher.avatarUrl,
                      department: teacher.department,
                      specialization: teacher.specialization,
                    },
                  });
                }
              }}
            >
              <UserOutlined /> {teacher.fullName}
            </Tag>
          );
        } else {
          nodes.push(fullMatch);
        }
      }

      lastIndex = startIndex + fullMatch.length;
    });

    if (lastIndex < rawContent.length) {
      nodes.push(rawContent.slice(lastIndex));
    }

    return nodes.length ? nodes : rawContent;
  };

  const reactionMenuItems = (post: ClassPostItem): MenuProps["items"] => {
    const options = REACTION_OPTIONS;
    const myReaction = normalizeReactionEmoji(post.reactions.myReaction);
    return options.map((emoji) => ({
      key: `${post.id}-${emoji}`,
      label: (
        <span className="reaction-menu-emoji">
          {emoji}
        </span>
      ),
      onClick: async () => {
        try {
          if (myReaction === emoji) {
            await removeClassPostReaction(post.id);
          } else {
            await reactToClassPost(post.id, emoji);
          }
          setReactionDetails((prev) => {
            const next = { ...prev };
            delete next[post.id];
            return next;
          });
          await fetchPosts();
        } catch (error: unknown) {
          const maybeError = error as { response?: { status?: number; data?: { detail?: string; message?: string } }; message?: string };
          if (maybeError?.response?.status === 403) {
            message.warning("Role hiện tại chưa được react bài đăng");
          } else {
            message.error(maybeError?.response?.data?.detail || maybeError?.response?.data?.message || maybeError?.message || "Không thể thả reaction");
          }
        }
      },
    }));
  };

  const fetchReactionDetails = async (postId: number): Promise<void> => {
    if (reactionDetails[postId]) return;
    setReactionDetailsLoadingPostId(postId);
    try {
      const response = await getPostReactionDetails(postId);
      setReactionDetails((prev) => ({ ...prev, [postId]: response.data }));
    } catch (error: unknown) {
      const maybeError = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      message.error(maybeError?.response?.data?.detail || maybeError?.response?.data?.message || maybeError?.message || "Không thể tải danh sách reaction");
    } finally {
      setReactionDetailsLoadingPostId(null);
    }
  };

  const renderReactionList = (items: PostReactionDetails["items"]): React.ReactNode => (
    <List
      size="small"
      className="reaction-panel-list"
      dataSource={items}
      renderItem={(item) => (
        <List.Item className="reaction-panel-item">
          <Space size={8} align="center">
            <Avatar size={32} src={item.actorProfile.avatarUrl || undefined}>
              {(item.actorProfile.fullName || "U").slice(0, 1).toUpperCase()}
            </Avatar>
            <Space direction="vertical" size={0}>
              <Text strong>{item.actorProfile.fullName || "Người dùng"}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.actorRole === "teacher" ? "Giảng viên" : item.actorProfile.studentCode || "Sinh viên"}
              </Text>
            </Space>
          </Space>
          <span className="reaction-panel-emoji">{normalizeReactionEmoji(item.emoji) || item.emoji}</span>
        </List.Item>
      )}
    />
  );

  const renderReactionPanel = (post: ClassPostItem): React.ReactNode => {
    const details = reactionDetails[post.id];
    if (reactionDetailsLoadingPostId === post.id && !details) {
      return <div className="reaction-panel-empty">Đang tải...</div>;
    }

    if (!details || details.items.length === 0) {
      return <div className="reaction-panel-empty">Chưa có reaction</div>;
    }

    const normalizedItems = details.items.map((item) => ({
      ...item,
      emoji: normalizeReactionEmoji(item.emoji) || item.emoji,
    }));
    const normalizedByEmoji = normalizedItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.emoji] = (acc[item.emoji] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="reaction-panel">
        <Tabs
          size="small"
          items={[
            {
              key: "all",
              label: `Tất cả ${details.total}`,
              children: renderReactionList(normalizedItems),
            },
            ...Object.entries(normalizedByEmoji)
              .sort((a, b) => b[1] - a[1])
              .map(([emoji, count]) => ({
                key: emoji,
                label: (
                  <span className="reaction-panel-tab">
                    {emoji} {count}
                  </span>
                ),
                children: renderReactionList(normalizedItems.filter((item) => item.emoji === emoji)),
              })),
          ]}
        />
      </div>
    );
  };

  const handleSubmitComment = async (postId: number, parentCommentId?: number): Promise<void> => {
    const isReply = typeof parentCommentId === "number";
    const text = (isReply ? replyDrafts[parentCommentId] : commentDrafts[postId] || "").trim();
    if (!text) {
      message.warning("Nhập bình luận trước khi gửi");
      return;
    }

    const submitKey = isReply ? `reply-${parentCommentId}` : `post-${postId}`;
    setCommentSubmittingKey(submitKey);
    try {
      await createPostComment(postId, {
        content: text,
        parent_comment_id: parentCommentId,
      });

      if (isReply && typeof parentCommentId === "number") {
        setReplyDrafts((prev) => ({ ...prev, [parentCommentId]: "" }));
        setActiveReplyCommentId(null);
      } else {
        setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      }

      await fetchPosts();
    } catch (error: unknown) {
      const maybeError = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      message.error(maybeError?.response?.data?.detail || maybeError?.response?.data?.message || maybeError?.message || "Không thể gửi bình luận");
    } finally {
      setCommentSubmittingKey(null);
    }
  };

  const renderCommentTree = (postId: number, comments: CommentItem[], depth = 0): React.ReactNode => {
    if (!comments.length) {
      return <Text type="secondary">Chưa có bình luận.</Text>;
    }

    return (
      <List
        size="small"
        dataSource={comments}
        renderItem={(comment) => {
          const authorName = comment.studentName || (comment.authorRole === "teacher" ? "Giáo viên" : "Thành viên");
          const isReplyBoxOpen = activeReplyCommentId === comment.id;
          const indent = depth > 0 ? Math.min(depth * 14, 42) : 0;

          return (
            <List.Item className="post-comment-item" style={{ marginLeft: indent }}>
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space size={8} align="start" style={{ width: "100%" }}>
                  <Avatar
                    size={32}
                    src={comment.authorProfile?.avatarUrl || undefined}
                    style={{ cursor: "pointer", background: comment.authorRole === "teacher" ? "#dbeafe" : "#edf2f7", color: "#1e293b" }}
                    onClick={() =>
                      openProfileModal({
                        profile: comment.authorProfile || {
                          role: comment.authorRole === "teacher" ? "teacher" : "student",
                          id: comment.authorId || comment.teacherId || comment.studentId || 0,
                          fullName: authorName,
                        },
                      })
                    }
                  >
                    {authorName.slice(0, 1).toUpperCase()}
                  </Avatar>

                  <Space direction="vertical" size={2} style={{ width: "100%" }}>
                    <Space size={6} align="start">
                      {depth > 0 && <Text type="secondary">↳</Text>}
                      <Text strong>{authorName}</Text>
                      {comment.authorRole === "teacher" && (
                        <Tag color="blue" style={{ borderRadius: 10, marginInlineStart: 0 }}>
                          GV
                        </Tag>
                      )}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(comment.createdAt).toLocaleString("vi-VN")}
                      </Text>
                    </Space>
                    <Text className="mention-content">
                      {renderMentionedContent(comment.content, comment.documentMentions, comment.memberMentions)}
                    </Text>
                  </Space>
                </Space>

                <Button
                  type="link"
                  size="small"
                  className="comment-reply-btn"
                  onClick={() => setActiveReplyCommentId(isReplyBoxOpen ? null : comment.id)}
                >
                  {isReplyBoxOpen ? "Đóng trả lời" : "Trả lời"}
                </Button>

                {isReplyBoxOpen && (
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <TextArea
                      value={replyDrafts[comment.id] || ""}
                      onChange={(e) =>
                        handleDraftChange(`reply-${comment.id}`, e.target.value, e.target.selectionStart, (nextValue) =>
                          setReplyDrafts((prev) => ({ ...prev, [comment.id]: nextValue }))
                        )
                      }
                      onKeyDown={(e) =>
                        handleMentionKeyDown(e, `reply-${comment.id}`, replyDrafts[comment.id] || "", () =>
                          void handleSubmitComment(postId, comment.id)
                        )
                      }
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      placeholder={`Trả lời ${authorName}... hỗ trợ @doc{Tên tài liệu}, @sv{MSSV hoặc tên}, @gv{Tên giảng viên}`}
                      maxLength={2000}
                    />
                    {renderMentionPicker(`reply-${comment.id}`, replyDrafts[comment.id] || "")}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <Button size="small" onClick={() => setActiveReplyCommentId(null)}>
                        Hủy
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        loading={commentSubmittingKey === `reply-${comment.id}`}
                        onClick={() => void handleSubmitComment(postId, comment.id)}
                      >
                        Gửi trả lời
                      </Button>
                    </div>
                  </Space>
                )}

                {comment.replies.length > 0 && renderCommentTree(postId, comment.replies, depth + 1)}
              </Space>
            </List.Item>
          );
        }}
      />
    );
  };

  const postMenuItems = (post: ClassPostItem): MenuProps["items"] => [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: "Sửa thông báo",
      onClick: () => {
        setEditingPost(post);
        setEditingContent(post.content);
      },
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Xóa thông báo",
      danger: true,
      onClick: () => {
        void handleDeletePost(post.id);
      },
    },
  ];

  const openProfileModal = (profile: ProfileModalState) => {
    setSelectedProfile(profile);
  };

  const closeProfileModal = () => {
    setSelectedProfile(null);
  };

  return (
    <div className="class-posts-panel" style={{ position: "relative", paddingBottom: 88 }}>
      <Card className="class-posts-wrapper" style={{ borderRadius: 16 }}>
        {posts.length === 0 && !loading ? (
          <Empty description="Chưa có thông báo nào" />
        ) : (
          <List
            loading={loading}
            dataSource={posts}
            itemLayout="vertical"
            renderItem={(post) => (
              <List.Item
                key={post.id}
                className="class-post-card"
                style={{
                  borderRadius: 16,
                  border: "1px solid #e5eaf3",
                  padding: 18,
                  marginBottom: 14,
                  background: "#ffffff",
                }}
                actions={[
                  <Button
                    key="comments-toggle"
                    type="text"
                    icon={<MessageOutlined />}
                    onClick={() => toggleComments(post.id)}
                    className="feed-action-btn"
                  >
                    {post.comments.length}
                  </Button>,
                  <Dropdown key="react-btn" menu={{ items: reactionMenuItems(post) }} trigger={["click"]} overlayClassName="reaction-dropdown">
                    <Button
                      type="text"
                      icon={post.reactions.myReaction ? undefined : <HeartOutlined />}
                      className="feed-action-btn"
                    >
                      {normalizeReactionEmoji(post.reactions.myReaction)
                        ? `${normalizeReactionEmoji(post.reactions.myReaction)} ${post.reactions.total}`
                        : post.reactions.total}
                    </Button>
                  </Dropdown>,
                ]}
              >
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar
                        icon={<UserOutlined />}
                        src={post.teacherProfile?.avatarUrl || undefined}
                        style={{ cursor: "pointer", background: "#dbeafe", color: "#1e3a8a" }}
                        onClick={() =>
                          openProfileModal({
                            profile: post.teacherProfile || {
                              role: "teacher",
                              id: post.teacherId,
                              fullName: post.teacherName || "Giáo viên",
                            },
                          })
                        }
                      >
                        {(post.teacherName || "GV").slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Space direction="vertical" size={0}>
                        <Space size={6}>
                          <Text strong>{post.teacherName || "Giáo viên"}</Text>
                          <Tag color="blue" style={{ borderRadius: 10, marginInlineStart: 0 }}>
                            GV
                          </Tag>
                        </Space>
                        <Text type="secondary">{new Date(post.createdAt).toLocaleString("vi-VN")}</Text>
                      </Space>
                    </div>
                    {isOwnerPost(post) && (
                      <Dropdown menu={{ items: postMenuItems(post) }} trigger={["click"]}>
                        <Button type="text" icon={<MoreOutlined />} />
                      </Dropdown>
                    )}
                  </div>

                  <Text className="mention-content">
                    {renderMentionedContent(post.content, post.documentMentions, post.memberMentions)}
                  </Text>

                  {post.attachments.length > 0 && (
                    <>
                      <Divider style={{ margin: "8px 0" }} />
                      <Space direction="vertical" size={6} style={{ width: "100%" }}>
                        <Text strong><ReadOutlined /> Tài liệu đính kèm</Text>
                        <Space wrap>
                          {post.attachments.map((item) => (
                            <Tag
                              key={item.documentId}
                              color="blue"
                              style={{ cursor: "pointer", borderRadius: 12, paddingInline: 10, paddingBlock: 4 }}
                              onClick={() => void handleOpenDocument(item.documentId, item.title)}
                            >
                              {item.title || item.documentId}
                            </Tag>
                          ))}
                        </Space>
                      </Space>
                    </>
                  )}

                  {Object.keys(post.reactions.byEmoji).length > 0 && (
                    <Popover
                      trigger="click"
                      placement="bottomLeft"
                      open={openReactionPostId === post.id}
                      onOpenChange={(open) => {
                        setOpenReactionPostId(open ? post.id : null);
                        if (open) void fetchReactionDetails(post.id);
                      }}
                      content={renderReactionPanel(post)}
                    >
                      <button type="button" className="reaction-summary-btn">
                        <span className="reaction-summary-stack">
                          {topReactions(post).map(([emoji]) => (
                            <span key={`${post.id}-top-${emoji}`} className="reaction-summary-emoji">
                              {emoji}
                            </span>
                          ))}
                        </span>
                        <span className="reaction-summary-count">{post.reactions.total}</span>
                      </button>
                    </Popover>
                  )}

                  {expandedComments.includes(post.id) && (
                    <Card
                      size="small"
                      title={`Bình luận (${post.comments.length})`}
                      style={{
                        borderRadius: 12,
                        background: "#fbfcff",
                        border: "1px solid #e4eaf5",
                      }}
                    >
                      <Space direction="vertical" size={10} style={{ width: "100%", marginBottom: 10 }}>
                        <TextArea
                          value={commentDrafts[post.id] || ""}
                          onChange={(e) =>
                            handleDraftChange(`comment-${post.id}`, e.target.value, e.target.selectionStart, (nextValue) =>
                              setCommentDrafts((prev) => ({ ...prev, [post.id]: nextValue }))
                            )
                          }
                          onKeyDown={(e) =>
                            handleMentionKeyDown(e, `comment-${post.id}`, commentDrafts[post.id] || "", () =>
                              void handleSubmitComment(post.id)
                            )
                          }
                          autoSize={{ minRows: 2, maxRows: 5 }}
                          placeholder="Viết bình luận... hỗ trợ @doc{Tên tài liệu}, @sv{MSSV hoặc tên}, @gv{Tên giảng viên}"
                          maxLength={2000}
                          style={{ background: "#ffffff" }}
                        />
                        {renderMentionPicker(`comment-${post.id}`, commentDrafts[post.id] || "")}
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <Button
                            type="primary"
                            size="small"
                            loading={commentSubmittingKey === `post-${post.id}`}
                            onClick={() => void handleSubmitComment(post.id)}
                          >
                            Gửi
                          </Button>
                        </div>
                      </Space>
                      {renderCommentTree(post.id, post.comments)}
                    </Card>
                  )}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>

      {allowCreatePost && (
        <Button
          type="primary"
          shape="round"
          size="large"
          icon={<EditOutlined />}
          onClick={() => setComposerOpen(true)}
          style={{
            position: "fixed",
            right: 36,
            bottom: 28,
            zIndex: 30,
            boxShadow: "0 10px 20px rgba(0,0,0,0.18)",
          }}
        >
          Đăng thông báo
        </Button>
      )}

      {allowCreatePost && (
        <Modal
          title="Tạo thông báo mới"
          open={composerOpen}
          onCancel={() => setComposerOpen(false)}
          onOk={() => void handleCreatePost()}
          okText="Đăng bài"
          cancelText="Hủy"
          confirmLoading={creating}
          width={720}
        >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <TextArea
              value={content}
              onChange={(e) =>
                handleDraftChange("composer", e.target.value, e.target.selectionStart, setContent)
              }
              onKeyDown={(e) => handleMentionKeyDown(e, "composer", content)}
              placeholder="Soạn thông báo... hỗ trợ @doc{Tên tài liệu}, @sv{MSSV hoặc tên}, @gv{Tên giảng viên}"
              autoSize={{ minRows: 5, maxRows: 10 }}
              maxLength={4000}
            />
            {renderMentionPicker("composer", content)}

            <Upload {...uploadProps}>
              <Button icon={<PaperClipOutlined />}>Đính kèm tài liệu</Button>
            </Upload>

            <Space direction="vertical" size={4}>
              <Checkbox 
                checked={isPrivateToClass} 
                onChange={(e) => setIsPrivateToClass(e.target.checked)}
              >
                Chỉ dành riêng cho lớp học này (Riêng tư)
              </Checkbox>
              <Checkbox 
                checked={isEmbeddingEnabled} 
                onChange={(e) => setIsEmbeddingEnabled(e.target.checked)}
              >
                Kích hoạt AI Embedding (Cho phép hỏi đáp RAG trên tài liệu này)
              </Checkbox>
            </Space>

            <Text type="secondary">Đính kèm file để hệ thống tự tạo tài liệu và gắn vào thông báo.</Text>
          </Space>
        </Modal>
      )}

      <Modal
        title="Sửa thông báo"
        open={!!editingPost}
        onCancel={() => {
          setEditingPost(null);
          setEditingContent("");
        }}
        onOk={() => void handleUpdatePost()}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={updating}
        width={720}
      >
        <TextArea
          value={editingContent}
          onChange={(e) =>
            handleDraftChange("edit", e.target.value, e.target.selectionStart, setEditingContent)
          }
          onKeyDown={(e) => handleMentionKeyDown(e, "edit", editingContent)}
          autoSize={{ minRows: 5, maxRows: 10 }}
          maxLength={4000}
        />
        {renderMentionPicker("edit", editingContent)}
      </Modal>

      <Modal
        open={!!selectedProfile}
        onCancel={closeProfileModal}
        footer={null}
        width={560}
        title={null}
      >
        {selectedProfile && (
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Space size={12} align="center">
              <Avatar size={68} src={selectedProfile.profile.avatarUrl || undefined} style={{ background: selectedProfile.profile.role === "teacher" ? "#dbeafe" : "#ecfeff", color: "#0f172a" }}>
                {(selectedProfile.profile.fullName || "U").slice(0, 1).toUpperCase()}
              </Avatar>
              <Space direction="vertical" size={2}>
                <Text strong style={{ fontSize: 22 }}>{selectedProfile.profile.fullName || "Người dùng"}</Text>
                <Space>
                  <Tag color={selectedProfile.profile.role === "teacher" ? "blue" : "green"} style={{ borderRadius: 10 }}>
                    {selectedProfile.profile.role === "teacher" ? "Giảng viên" : "Sinh viên"}
                  </Tag>
                  {selectedProfile.profile.id ? <Text type="secondary">ID: {selectedProfile.profile.id}</Text> : null}
                </Space>
              </Space>
            </Space>

            <Tabs
              items={[
                {
                  key: "overview",
                  label: "Tổng quan",
                  children: (
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                      {selectedProfile.profile.role === "student" ? (
                        <>
                          <Text>MSSV: {selectedProfile.profile.studentCode || "Chưa có"}</Text>
                          <Text>Khoa: {selectedProfile.profile.department || "Chưa có"}</Text>
                          <Text>Niên khóa: {selectedProfile.profile.academicYear || "Chưa có"}</Text>
                        </>
                      ) : (
                        <>
                          <Text>Khoa: {selectedProfile.profile.department || "Chưa có"}</Text>
                          <Text>Chuyên ngành: {selectedProfile.profile.specialization || "Chưa có"}</Text>
                        </>
                      )}
                    </Space>
                  ),
                },
                {
                  key: "contact",
                  label: "Liên hệ",
                  children: (
                    <Space align="center" size={8}>
                      <MailOutlined />
                      <Text type="secondary">{selectedProfile.profile.email || "Chưa có email"}</Text>
                    </Space>
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default TeacherClassPostsPanel;

