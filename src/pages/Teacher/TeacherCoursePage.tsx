import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Typography,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  message,
  Statistic,
  Row,
  Col,
  Drawer,
  Upload,
  Checkbox,
  Divider,
  Popconfirm,
  Spin,
  Empty,
  Select,
} from "antd";
import {
  PlusOutlined,
  BookOutlined,
  NumberOutlined,
  UploadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  SwapOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import dayjs from "dayjs";

import Breadcrumb from "../../components/Breadcrumb";
import {
  getCoursesList,
  createCourse,
  getCourseDetail,
  deleteCourse,
  deleteCourseDocument,
  uploadCourseDocument,
  type CourseListItem,
  type CourseDetail,
  type CourseDocument,
} from "../../apis/coursesAPIs/course";
import { deleteClass, restoreClass, updateClassCourse } from "../../apis/classesAPIs/teacherClass";

const { Title, Text } = Typography;
const { Option } = Select;

const TeacherCoursePage: React.FC = () => {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Create course modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Course detail drawer
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Upload document state (for course-level docs)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isEmbeddingEnabled, setIsEmbeddingEnabled] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Delete Course with password
  const [deleteCourseModalVisible, setDeleteCourseModalVisible] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<CourseListItem | null>(null);
  const [deleteCoursePassword, setDeleteCoursePassword] = useState("");
  const [deletingCourse, setDeletingCourse] = useState(false);

  // Delete Class with password
  const [deleteClassModalVisible, setDeleteClassModalVisible] = useState(false);
  const [classToDelete, setClassToDelete] = useState<any | null>(null);
  const [deleteClassPassword, setDeleteClassPassword] = useState("");
  const [deletingClass, setDeletingClass] = useState(false);

  // Change Course for a class
  const [changeCourseModalVisible, setChangeCourseModalVisible] = useState(false);
  const [classToChange, setClassToChange] = useState<any | null>(null);
  const [newCourseId, setNewCourseId] = useState<string>("");
  const [changingCourse, setChangingCourse] = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCoursesList();
      if (res.success) {
        setCourses(res.data.courses);
      }
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi tải danh sách Học phần!");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await createCourse({
        code: values.code,
        title: values.title,
        description: values.description,
      });
      if (res.success) {
        message.success("Tạo học phần thành công!");
        setIsModalVisible(false);
        form.resetFields();
        fetchCourses();
      }
    } catch (err) {
      console.error(err);
      message.error("Tạo học phần thất bại!");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete || !deleteCoursePassword) return;
    setDeletingCourse(true);
    try {
      await deleteCourse(courseToDelete.id, deleteCoursePassword);
      message.success("Đã xóa học phần!");
      setDeleteCourseModalVisible(false);
      setDeleteCoursePassword("");
      fetchCourses();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xóa học phần thất bại! Kiểm tra lại mật khẩu.");
    } finally {
      setDeletingCourse(false);
    }
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete || !deleteClassPassword || !selectedCourse) return;
    setDeletingClass(true);
    try {
      await deleteClass(classToDelete.id, deleteClassPassword);
      message.success("Đã khóa lớp học!");
      setDeleteClassModalVisible(false);
      setDeleteClassPassword("");
      
      // Refresh course details to update class list
      openCourseDetail(selectedCourse.id);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || err?.message || "Khóa lớp thất bại! Kiểm tra lại mật khẩu.");
    } finally {
      setDeletingClass(false);
    }
  };

  const handleRestoreClass = async (cls: any) => {
    if (!selectedCourse) return;
    try {
      await restoreClass(cls.id);
      message.success("Đã mở khóa lớp học!");
      openCourseDetail(selectedCourse.id);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || err?.message || "Mở khóa thất bại!");
    }
  };

  const confirmChangeCourse = async () => {
    if (!classToChange || !newCourseId || !selectedCourse) return;
    setChangingCourse(true);
    try {
      await updateClassCourse(classToChange.id, newCourseId);
      message.success("Đã chuyển lớp sang học phần khác!");
      setChangeCourseModalVisible(false);
      fetchCourses();
      openCourseDetail(selectedCourse.id);
    } catch (err: any) {
      message.error("Chuyển học phần thất bại!");
    } finally {
      setChangingCourse(false);
    }
  };

  const openCourseDetail = async (courseId: string) => {
    setDrawerVisible(true);
    setLoadingDetail(true);
    try {
      const res = await getCourseDetail(courseId);
      if (res.success) setSelectedCourse(res.data);
    } catch {
      message.error("Không thể tải chi tiết học phần!");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUploadCourseDocument = async () => {
    if (!selectedCourse || uploadFiles.length === 0) {
      message.warning("Vui lòng chọn file tài liệu!");
      return;
    }
    setUploadingDoc(true);
    try {
      for (const uf of uploadFiles) {
        if (!uf.originFileObj) continue;
        await uploadCourseDocument(selectedCourse.id, uf.originFileObj, {
          title: uf.name,
          isEmbedding: isEmbeddingEnabled,
        });
      }
      message.success("Tải tài liệu lên thành công!");
      setUploadFiles([]);
      // Refresh course detail
      openCourseDetail(selectedCourse.id);
    } catch {
      message.error("Tải tài liệu thất bại!");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedCourse) return;
    try {
      await deleteCourseDocument(selectedCourse.id, docId);
      message.success("Đã xóa tài liệu!");
      openCourseDetail(selectedCourse.id);
    } catch {
      message.error("Xóa tài liệu thất bại!");
    }
  };

  const uploadProps: UploadProps = {
    multiple: true,
    beforeUpload: () => false,
    fileList: uploadFiles,
    onChange: ({ fileList }) => setUploadFiles(fileList),
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt",
  };

  const columns = [
    {
      title: "Mã HP",
      dataIndex: "code",
      key: "code",
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Tên Học phần",
      dataIndex: "title",
      key: "title",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Số Lớp",
      dataIndex: "classesCount",
      key: "classesCount",
      align: "center" as const,
      render: (count: number) => <Tag color={count > 0 ? "green" : "default"}>{count} lớp</Tag>,
    },
    {
      title: "Tài liệu",
      dataIndex: "documentsCount",
      key: "documentsCount",
      align: "center" as const,
      render: (count: number) => (
        <Tag color={count > 0 ? "purple" : "default"}>{count} file</Tag>
      ),
    },
    {
      title: "Ngày Tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: unknown, record: CourseListItem) => (
        <Space>
          <Button
            type="link"
            icon={<FolderOpenOutlined />}
            onClick={() => openCourseDetail(record.id)}
          >
            Quản lý
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setCourseToDelete(record);
              setDeleteCoursePassword("");
              setDeleteCourseModalVisible(true);
            }}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  const pageHeaderStyle: React.CSSProperties = {
    marginTop: 18,
    marginBottom: 26,
  };

  const headerIconStyle: React.CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 16px 34px rgba(37, 99, 235, 0.18)",
    flexShrink: 0,
  };

  const headerTitleStyle: React.CSSProperties = {
    margin: 0,
    color: "#2563eb",
    fontSize: "clamp(30px, 4vw, 40px)",
    fontWeight: 800,
    lineHeight: 1.12,
  };

  const headerSubtitleStyle: React.CSSProperties = {
    display: "block",
    marginTop: 6,
    color: "#64748b",
    fontSize: 16,
    lineHeight: 1.5,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc", padding: "32px 48px" }}>
      <Breadcrumb
        items={[{ title: "Trang chủ", href: "/teacher" }, { title: "Quản lý Học phần" }]}
      />

      <Row align="middle" justify="space-between" gutter={[18, 18]} style={pageHeaderStyle}>
        <Col xs={24} md={18}>
          <Space align="center" size={16}>
            <div style={headerIconStyle}>
              <BookOutlined style={{ fontSize: 28, color: "#2563eb" }} />
            </div>
            <div>
              <Title level={1} style={headerTitleStyle}>
                Quản lý Học phần
              </Title>
              <Text style={headerSubtitleStyle}>
                Nhóm lớp học, quản lý tài liệu dùng chung và cấu hình học phần cho AI RAG
              </Text>
            </div>
          </Space>
        </Col>
        <Col xs={24} md={6} style={{ textAlign: "right" }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setIsModalVisible(true)}
            style={{ borderRadius: 10, fontWeight: 600 }}
          >
            Tạo Học phần
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="Tổng số Học phần"
              value={courses.length}
              prefix={<BookOutlined />}
              valueStyle={{ color: "#2563eb" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="Tổng số Lớp đang liên kết"
              value={courses.reduce((sum, c) => sum + (c.classesCount || 0), 0)}
              prefix={<NumberOutlined />}
              valueStyle={{ color: "#10b981" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="Tổng tài liệu"
              value={courses.reduce((sum, c) => sum + (c.documentsCount || 0), 0)}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "#7c3aed" }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <Table
          columns={columns}
          dataSource={courses}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create Course Modal */}
      <Modal
        title="Tạo Học Phần Mới"
        open={isModalVisible}
        onOk={handleCreate}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        confirmLoading={submitting}
        okText="Tạo"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Mã Học phần (VD: PBL6, CTDL)"
            name="code"
            rules={[{ required: true, message: "Vui lòng nhập mã học phần" }]}
          >
            <Input placeholder="Nhập mã học phần" />
          </Form.Item>
          <Form.Item
            label="Tên Học phần"
            name="title"
            rules={[{ required: true, message: "Vui lòng nhập tên học phần" }]}
          >
            <Input placeholder="VD: Project Based Learning 6" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn về môn học..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Course Password Modal */}
      <Modal
        title="Xác nhận xóa Học Phần"
        open={deleteCourseModalVisible}
        onOk={confirmDeleteCourse}
        onCancel={() => {
          setDeleteCourseModalVisible(false);
          setDeleteCoursePassword("");
        }}
        confirmLoading={deletingCourse}
        okText="Xác nhận Xóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true, disabled: !deleteCoursePassword }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="danger" strong>CẢNH BÁO: </Text>
          <Text>Hành động này sẽ xóa toàn bộ Học phần <strong>{courseToDelete?.title}</strong> và tất cả tài liệu bên trong. Các lớp học sẽ bị gỡ liên kết.</Text>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text strong>Vui lòng nhập mật khẩu tài khoản của bạn để xác nhận:</Text>
        </div>
        <Input.Password
          placeholder="Nhập mật khẩu"
          value={deleteCoursePassword}
          onChange={(e) => setDeleteCoursePassword(e.target.value)}
          onPressEnter={confirmDeleteCourse}
        />
      </Modal>

      {/* Delete Class Password Modal */}
      <Modal
        title="Xác nhận khóa Lớp Học"
        open={deleteClassModalVisible}
        onOk={confirmDeleteClass}
        onCancel={() => {
          setDeleteClassModalVisible(false);
          setDeleteClassPassword("");
        }}
        confirmLoading={deletingClass}
        okText="Xác nhận Khóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true, disabled: !deleteClassPassword }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="danger" strong>CẢNH BÁO: </Text>
          <Text>Bạn đang chuẩn bị khóa (ẩn) lớp <strong>{classToDelete?.className}</strong>. Học sinh sẽ không thể thấy lớp này nữa.</Text>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text strong>Vui lòng nhập mật khẩu tài khoản của bạn để xác nhận:</Text>
        </div>
        <Input.Password
          placeholder="Nhập mật khẩu"
          value={deleteClassPassword}
          onChange={(e) => setDeleteClassPassword(e.target.value)}
          onPressEnter={confirmDeleteClass}
        />
      </Modal>

      {/* Change Course Modal */}
      <Modal
        title="Chuyển lớp sang Học phần khác"
        open={changeCourseModalVisible}
        onOk={confirmChangeCourse}
        onCancel={() => {
          setChangeCourseModalVisible(false);
          setNewCourseId("");
        }}
        confirmLoading={changingCourse}
        okText="Chuyển"
        cancelText="Hủy"
        okButtonProps={{ disabled: !newCourseId }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Chọn Học phần đích cho lớp <strong>{classToChange?.className}</strong>:</Text>
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="-- Chọn Học phần mới --"
          value={newCourseId}
          onChange={setNewCourseId}
        >
          {courses.filter(c => c.id !== selectedCourse?.id).map((course) => (
            <Option key={course.id} value={course.id}>
              {course.code} - {course.title}
            </Option>
          ))}
        </Select>
      </Modal>

      {/* Course Detail Drawer */}
      <Drawer
        title={selectedCourse ? `📖 ${selectedCourse.title} (${selectedCourse.code})` : "Chi tiết Học phần"}
        width={700}
        open={drawerVisible}
        onClose={() => { setDrawerVisible(false); setSelectedCourse(null); setUploadFiles([]); }}
      >
        {loadingDetail ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : selectedCourse ? (
          <Space direction="vertical" size={24} style={{ width: "100%" }}>
            {/* Course Info */}
            <Card size="small" style={{ borderRadius: 12, background: "#f0f7ff" }}>
              <Space direction="vertical" size={4}>
                <Text type="secondary">Mã: <Tag color="blue">{selectedCourse.code}</Tag></Text>
                {selectedCourse.description && (
                  <Text>{selectedCourse.description}</Text>
                )}
                <Text type="secondary">
                  {selectedCourse.classes.length} lớp đang dùng học phần này
                </Text>
              </Space>
            </Card>

            <Divider style={{ margin: "8px 0" }}>
              <Text strong>📁 Tài liệu Học phần (Dùng chung cho tất cả lớp)</Text>
            </Divider>

            {/* Upload Area */}
            <Card size="small" style={{ borderRadius: 12, border: "1px dashed #2563eb" }}>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>Chọn tài liệu để tải lên</Button>
                </Upload>
                <Checkbox
                  checked={isEmbeddingEnabled}
                  onChange={(e) => setIsEmbeddingEnabled(e.target.checked)}
                >
                  🤖 Kích hoạt AI Embedding (RAG chat sẽ đọc được tài liệu này)
                </Checkbox>
                <Button
                  type="primary"
                  onClick={handleUploadCourseDocument}
                  loading={uploadingDoc}
                  disabled={uploadFiles.length === 0}
                  icon={<UploadOutlined />}
                >
                  Tải lên ({uploadFiles.length} file)
                </Button>
              </Space>
            </Card>

            {/* Documents List */}
            {selectedCourse.documents.length === 0 ? (
              <Empty description="Chưa có tài liệu nào" />
            ) : (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                {selectedCourse.documents.map((doc: CourseDocument) => (
                  <Card
                    key={doc.id}
                    size="small"
                    style={{ borderRadius: 10 }}
                    extra={
                      <Popconfirm
                        title="Xóa tài liệu này?"
                        onConfirm={() => handleDeleteDocument(doc.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    }
                  >
                    <Space>
                      <FileTextOutlined style={{ color: "#2563eb" }} />
                      <Space direction="vertical" size={0}>
                        <Text strong>{doc.title}</Text>
                        <Space size={6}>
                          <Tag color={doc.isEmbedding ? "green" : "default"} style={{ borderRadius: 8 }}>
                            {doc.isEmbedding ? "🤖 AI Enabled" : "No AI"}
                          </Tag>
                          {doc.onlyClassId && (
                            <Tag color="orange" style={{ borderRadius: 8 }}>Riêng tư</Tag>
                          )}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(doc.uploadedAt).format("DD/MM/YYYY HH:mm")}
                          </Text>
                        </Space>
                      </Space>
                    </Space>
                  </Card>
                ))}
              </Space>
            )}

            <Divider style={{ margin: "16px 0 8px 0" }}>
              <Text strong>🏫 Danh sách Lớp thuộc Học phần</Text>
            </Divider>

            {/* Classes List */}
            {selectedCourse.classes.length === 0 ? (
              <Empty description="Chưa có lớp nào thuộc học phần này" />
            ) : (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                {selectedCourse.classes.map((cls) => {
                  const isInactive = !Boolean(cls.isActive);
                  return (
                  <Card
                    key={cls.id}
                    size="small"
                    style={{
                      borderRadius: 10,
                      borderLeft: `4px solid ${isInactive ? '#ef4444' : '#10b981'}`,
                      background: isInactive ? '#fff5f5' : undefined
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space direction="vertical" size={0}>
                        <Space size={6}>
                          <Text strong>{cls.className}</Text>
                          {isInactive && <Tag color="red" style={{ fontSize: 11 }}>🔒 Đã khóa</Tag>}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>Mã Lớp: {cls.classCode}</Text>
                      </Space>
                      <Space>
                        <Button
                          size="small"
                          icon={<SwapOutlined />}
                          onClick={() => {
                            setClassToChange(cls);
                            setNewCourseId("");
                            setChangeCourseModalVisible(true);
                          }}
                        >
                          Đổi HP
                        </Button>
                        {isInactive ? (
                          <Popconfirm
                            title="Bạn muốn mở khóa lớp học này?"
                            description="Học sinh sẽ có thể xem lại lớp này"
                            onConfirm={() => handleRestoreClass(cls)}
                            okText="Mở Khóa"
                            cancelText="Hủy"
                          >
                            <Button
                              size="small"
                              type="primary"
                              ghost
                              icon={<UnlockOutlined />}
                              style={{ borderColor: '#10b981', color: '#10b981' }}
                            >
                              Mở Khóa
                            </Button>
                          </Popconfirm>
                        ) : (
                          <Button
                            size="small"
                            danger
                            icon={<LockOutlined />}
                            onClick={() => {
                              setClassToDelete(cls);
                              setDeleteClassPassword("");
                              setDeleteClassModalVisible(true);
                            }}
                          >
                            Khóa
                          </Button>
                        )}
                      </Space>
                    </div>
                  </Card>
                  );
                })}
              </Space>
            )}

          </Space>
        ) : null}
      </Drawer>
    </div>
  );
};

export default TeacherCoursePage;
