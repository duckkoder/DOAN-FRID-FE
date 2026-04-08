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
  Space,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
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
  removeClassPostReaction,
  reactToClassPost,
  updateClassPost,
  type ClassPostItem,
  type CommentItem,
  type PersonProfile,
} from "../apis/classesAPIs/classPosts";
import { openClassDocument, uploadDocument } from "../apis/fileAPIs/file";
import { useAuth } from "../hooks/useAuth";
import "./TeacherClassPostsPanel.css";

const { Text } = Typography;
const { TextArea } = Input;

const toPseudoCourseId = (classId: number): string => {
  const numeric = String(Math.max(0, classId));
  const tail = numeric.padStart(12, "0").slice(-12);
  return `00000000-0000-0000-0000-${tail}`;
};

interface TeacherClassPostsPanelProps {
  classId: number;
  allowCreatePost?: boolean;
  focusPostId?: number | null;
}

interface ProfileModalState {
  profile: PersonProfile;
}

const TeacherClassPostsPanel: React.FC<TeacherClassPostsPanelProps> = ({
  classId,
  allowCreatePost = true,
  focusPostId = null,
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

  const courseId = useMemo(() => toPseudoCourseId(classId), [classId]);

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
          courseId,
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
    return Object.entries(post.reactions.byEmoji)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  };

  const reactionMenuItems = (post: ClassPostItem): MenuProps["items"] => {
    const options = ["👍", "❤️", "😂", "😮", "😢", "👏"];
    return options.map((emoji) => ({
      key: `${post.id}-${emoji}`,
      label: (
        <span style={{ fontSize: 18 }}>
          {emoji}
        </span>
      ),
      onClick: async () => {
        try {
          if (post.reactions.myReaction === emoji) {
            await removeClassPostReaction(post.id);
          } else {
            await reactToClassPost(post.id, emoji);
          }
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
                    <Text>{comment.content}</Text>
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
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                      onPressEnter={(e) => {
                        if (e.shiftKey) return;
                        e.preventDefault();
                        void handleSubmitComment(postId, comment.id);
                      }}
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      placeholder={`Trả lời ${authorName}...`}
                      maxLength={2000}
                    />
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
                  <Dropdown key="react-btn" menu={{ items: reactionMenuItems(post) }} trigger={["click"]}>
                    <Button
                      type="text"
                      icon={post.reactions.myReaction ? undefined : <HeartOutlined />}
                      className="feed-action-btn"
                    >
                      {post.reactions.myReaction ? `${post.reactions.myReaction} ${post.reactions.total}` : post.reactions.total}
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

                  <Text style={{ whiteSpace: "pre-wrap" }}>{post.content}</Text>

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
                              onClick={async () => {
                                try {
                                  await openClassDocument(item.documentId);
                                } catch (error) {
                                  const maybeError = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
                                  message.error(
                                    maybeError?.response?.data?.detail ||
                                    maybeError?.response?.data?.message ||
                                    maybeError?.message ||
                                    "Không thể mở tài liệu"
                                  );
                                }
                              }}
                            >
                              {item.title || item.documentId}
                            </Tag>
                          ))}
                        </Space>
                      </Space>
                    </>
                  )}

                  {Object.keys(post.reactions.byEmoji).length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Space size={4}>
                        {topReactions(post).map(([emoji]) => (
                          <span key={`${post.id}-top-${emoji}`} style={{ fontSize: 18, lineHeight: 1 }}>
                            {emoji}
                          </span>
                        ))}
                      </Space>
                      <Text type="secondary">{post.reactions.total}</Text>
                    </div>
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
                          onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onPressEnter={(e) => {
                            if (e.shiftKey) return;
                            e.preventDefault();
                            void handleSubmitComment(post.id);
                          }}
                          autoSize={{ minRows: 2, maxRows: 5 }}
                          placeholder="Viết bình luận..."
                          maxLength={2000}
                          style={{ background: "#ffffff" }}
                        />
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
              onChange={(e) => setContent(e.target.value)}
              placeholder="Soạn thông báo... hỗ trợ @doc{Tên tài liệu}, @sv{MSSV hoặc tên}"
              autoSize={{ minRows: 5, maxRows: 10 }}
              maxLength={4000}
            />

            <Upload {...uploadProps}>
              <Button icon={<PaperClipOutlined />}>Đính kèm tài liệu</Button>
            </Upload>

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
          onChange={(e) => setEditingContent(e.target.value)}
          autoSize={{ minRows: 5, maxRows: 10 }}
          maxLength={4000}
        />
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
