import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  Modal,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";

import Breadcrumb from "../../components/Breadcrumb";
import LeaveRequestModal from "../../components/LeaveRequestModal";
import TeacherClassPostsPanel from "../../components/TeacherClassPostsPanel";
import { getClassPosts } from "../../apis/classesAPIs/classPosts";
import {
  getStudentClassDetails,
  getStudentClassmates,
  type StudentClassDetailsData,
  type StudentClassmateItem,
} from "../../apis/classesAPIs/studentClass";
import {
  createLeaveRequest,
  getLeaveRequests,
  type LeaveRequestDetail,
} from "../../apis/leaveRequestAPIs/leaveRequest";
import { openClassDocument, uploadDocument } from "../../apis/fileAPIs/file";
import {
  getStudentClassAttendanceSessions,
  type StudentAttendanceSessionSummarySchema,
  type StudentClassAttendanceSummary,
} from "../../apis/attendanceAPIs/studentAttendance";

const { Title, Text, Paragraph } = Typography;

const TIME_SLOTS: Record<number, { start: string; end: string }> = {
  1: { start: "07:00", end: "07:50" },
  2: { start: "08:00", end: "08:50" },
  3: { start: "09:00", end: "09:50" },
  4: { start: "10:00", end: "10:50" },
  5: { start: "11:00", end: "11:50" },
  6: { start: "13:00", end: "13:50" },
  7: { start: "14:00", end: "14:50" },
  8: { start: "15:00", end: "15:50" },
  9: { start: "16:00", end: "16:50" },
  10: { start: "17:00", end: "17:50" },
};

interface ClassDocumentItem {
  documentId: string;
  title: string;
  postId: number;
  createdAt: string;
}

const getAttendanceStatusConfig = (status: string | null | undefined) => {
  switch (status) {
    case "present":
      return { color: "#10b981", text: "Có mặt" };
    case "late":
      return { color: "#f59e42", text: "Đi trễ" };
    case "absent":
      return { color: "#ef4444", text: "Vắng mặt" };
    default:
      return { color: "#64748b", text: "Không rõ" };
  }
};

const getLeaveStatusConfig = (status: string) => {
  switch (status) {
    case "pending":
      return { color: "#f59e42", text: "Chờ duyệt" };
    case "approved":
      return { color: "#10b981", text: "Đã duyệt" };
    case "rejected":
      return { color: "#ef4444", text: "Từ chối" };
    case "cancelled":
      return { color: "#64748b", text: "Đã hủy" };
    default:
      return { color: "#64748b", text: "Không rõ" };
  }
};

const getDayOfWeekText = (dayNum: number | null | undefined): string => {
  if (dayNum === null || dayNum === undefined) return "";
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  return days[dayNum] || "";
};

const formatScheduleDetailed = (schedule?: Record<string, string[]>) => {
  if (!schedule || Object.keys(schedule).length === 0) return [];

  const dayMapping: Record<string, string> = {
    monday: "Thứ Hai",
    tuesday: "Thứ Ba",
    wednesday: "Thứ Tư",
    thursday: "Thứ Năm",
    friday: "Thứ Sáu",
    saturday: "Thứ Bảy",
    sunday: "Chủ Nhật",
  };

  const toTime = (period: number): string => {
    const slot = TIME_SLOTS[period];
    return slot ? `${slot.start}-${slot.end}` : `Tiết ${period}`;
  };

  return Object.entries(schedule)
    .filter(([, ranges]) => Array.isArray(ranges) && ranges.length > 0)
    .map(([day, ranges]) => {
      return {
        day: dayMapping[day.toLowerCase()] || day,
        periods: ranges.map((range) => {
          const [start, end] = range.split("-").map(Number);
          return {
            range: start === end ? `Tiết ${start}` : `Tiết ${start}-${end}`,
            time: start === end ? toTime(start) : `${TIME_SLOTS[start]?.start || ""}-${TIME_SLOTS[end]?.end || ""}`,
          };
        }),
      };
    });
};

const formatScheduleSimple = (schedule?: Record<string, string[]>): string => {
  if (!schedule || Object.keys(schedule).length === 0) return "Không có lịch học";
  const dayMapping: Record<string, string> = {
    monday: "T2",
    tuesday: "T3",
    wednesday: "T4",
    thursday: "T5",
    friday: "T6",
    saturday: "T7",
    sunday: "CN",
  };
  return Object.entries(schedule)
    .filter(([, ranges]) => Array.isArray(ranges) && ranges.length > 0)
    .map(([day]) => dayMapping[day.toLowerCase()] || day)
    .join(", ");
};

const resolveAvatarUrl = (avatar?: string | null): string | undefined => {
  if (!avatar) return undefined;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "";
  if (!base) return avatar;
  return `${base.replace(/\/$/, "")}/${avatar.replace(/^\//, "")}`;
};

const StudentClassDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ classId: string }>();

  const validTabs = ["posts", "documents", "attendance", "class-info"] as const;
  type TabKey = (typeof validTabs)[number];

  const initialTab = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab");
    return validTabs.includes(tab as TabKey) ? (tab as TabKey) : "posts";
  }, [location.search]);

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);

  const [classData, setClassData] = useState<StudentClassDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [classAttendanceSummary, setClassAttendanceSummary] = useState<StudentClassAttendanceSummary | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDetail[]>([]);
  const [leaveRequestsLoading, setLeaveRequestsLoading] = useState(false);
  const [submittingLeaveRequest, setSubmittingLeaveRequest] = useState(false);

  const [documentsData, setDocumentsData] = useState<ClassDocumentItem[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [activeDocumentPostId, setActiveDocumentPostId] = useState<number | null>(null);
  const [classmates, setClassmates] = useState<StudentClassmateItem[]>([]);
  const [loadingClassmates, setLoadingClassmates] = useState(false);
  const [selectedClassmate, setSelectedClassmate] = useState<StudentClassmateItem | null>(null);

  const classId = useMemo(() => {
    if (!params.classId) return null;
    const parsed = parseInt(params.classId, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [params.classId]);

  const breadcrumbItems = [
    { title: "Bảng điều khiển", href: "/student" },
    { title: "Lớp học", href: "/student/classes" },
    { title: classData?.class.className || "Chi tiết lớp" },
  ];

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab");
    const resolvedTab = validTabs.includes(tab as TabKey) ? (tab as TabKey) : "posts";
    if (resolvedTab !== activeTab) {
      setActiveTab(resolvedTab);
    }
  }, [location.search]);

  useEffect(() => {
    if (!classId) {
      setError("Mã lớp không hợp lệ");
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [details, attendance] = await Promise.all([
          getStudentClassDetails(classId),
          getStudentClassAttendanceSessions(classId),
        ]);
        setClassData(details.data);
        setClassAttendanceSummary(attendance);
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e.message || "Không thể tải thông tin lớp");
        message.error(e.message || "Không thể tải thông tin lớp");
      } finally {
        setLoading(false);
      }
    };

    const fetchLeave = async () => {
      setLeaveRequestsLoading(true);
      try {
        const response = await getLeaveRequests(classId);
        setLeaveRequests(response.data.leaveRequests);
      } catch {
        message.error("Không thể tải lịch sử xin nghỉ phép");
      } finally {
        setLeaveRequestsLoading(false);
      }
    };

    fetchAll();
    fetchLeave();
  }, [classId]);

  useEffect(() => {
    if (!classId || activeTab !== "documents") return;

    const fetchDocuments = async () => {
      setLoadingDocuments(true);
      try {
        const response = await getClassPosts(classId, { includeComments: false, limit: 100, offset: 0 });
        const docMap = new Map<string, ClassDocumentItem>();

        response.data.items.forEach((post) => {
          post.attachments.forEach((attachment) => {
            if (!docMap.has(attachment.documentId)) {
              docMap.set(attachment.documentId, {
                documentId: attachment.documentId,
                title: attachment.title || attachment.documentId,
                postId: post.id,
                createdAt: post.createdAt,
              });
            }
          });
        });

        const docs = Array.from(docMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setDocumentsData(docs);
      } catch {
        message.error("Không thể tải tài liệu lớp học");
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [activeTab, classId]);

  useEffect(() => {
    if (!classId || activeTab !== "class-info") return;

    const fetchClassmates = async () => {
      setLoadingClassmates(true);
      try {
        const response = await getStudentClassmates(classId);
        setClassmates(response.data.students || []);
      } catch {
        message.error("Không thể tải danh sách học sinh trong lớp");
      } finally {
        setLoadingClassmates(false);
      }
    };

    fetchClassmates();
  }, [activeTab, classId]);

  const handleSubmitLeaveRequest = async (values: {
    reason: string;
    date: dayjs.Dayjs;
    dayOfWeek: string;
    timeSlot: string;
    evidenceFile?: Array<{ originFileObj?: File }>;
  }) => {
    if (!classId) {
      message.error("Không tìm thấy thông tin lớp");
      return;
    }

    setSubmittingLeaveRequest(true);
    try {
      let evidenceFileId: number | null = null;
      const file = values.evidenceFile?.[0]?.originFileObj;

      if (file) {
        message.loading({ content: "Đang tải lên file minh chứng...", key: "uploadFile", duration: 0 });
        const uploadResponse = await uploadDocument(file, undefined, (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            message.loading({ content: `Đang tải lên file: ${percent}%`, key: "uploadFile", duration: 0 });
          }
        });

        if (uploadResponse.success && uploadResponse.data.file_id) {
          evidenceFileId = uploadResponse.data.file_id;
          message.success({ content: "Tải lên file minh chứng thành công", key: "uploadFile", duration: 2 });
        } else {
          throw new Error(uploadResponse.message || "Tải file thất bại");
        }
      }

      message.loading({ content: "Đang gửi đơn xin nghỉ...", key: "createLeave", duration: 0 });

      const response = await createLeaveRequest({
        class_id: classId,
        reason: values.reason,
        leave_date: values.date.toISOString(),
        day_of_week: values.dayOfWeek,
        time_slot: values.timeSlot,
        evidence_file_id: evidenceFileId,
      });

      if (!response.success) {
        throw new Error(response.message || "Gửi yêu cầu thất bại");
      }

      message.success({ content: "Đã gửi đơn xin nghỉ thành công", key: "createLeave", duration: 3 });
      const refreshed = await getLeaveRequests(classId);
      setLeaveRequests(refreshed.data.leaveRequests);
      setIsLeaveModalVisible(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      message.error({ content: e.message || "Không thể gửi yêu cầu", key: "createLeave", duration: 4 });
    } finally {
      setSubmittingLeaveRequest(false);
    }
  };

  const attendanceColumns = [
    {
      title: "Ngày",
      dataIndex: "start_time",
      key: "start_time",
      render: (startTime: string) => dayjs(startTime).format("DD/MM/YYYY"),
    },
    {
      title: "Thông tin phiên",
      key: "session_info",
      render: (record: StudentAttendanceSessionSummarySchema) => (
        <div>
          <Text strong>{record.session_name || "Không có tên phiên"}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.day_of_week !== null && record.day_of_week !== undefined
              ? `${getDayOfWeekText(record.day_of_week)}, `
              : ""}
            {record.period_range || ""}
          </Text>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "student_attendance_status",
      key: "student_attendance_status",
      render: (status: string | null | undefined) => {
        const config = getAttendanceStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "Giờ vào",
      dataIndex: "student_recorded_at",
      key: "student_recorded_at",
      render: (time: string | null) => (time ? dayjs(time).format("HH:mm") : "-"),
    },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, #f7fafc 0%, #f1f5f9 100%)" }}>
        <Spin size="large" tip="Đang tải thông tin lớp..." />
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div style={{ padding: 24, background: "linear-gradient(180deg, #f7fafc 0%, #f1f5f9 100%)", minHeight: "100vh" }}>
        <Breadcrumb items={breadcrumbItems} />
        <Alert
          message="Không thể tải thông tin lớp"
          description={error || "Lớp không tồn tại hoặc bạn chưa tham gia lớp này"}
          type="error"
          showIcon
        />
      </div>
    );
  }

  const { class: classInfo, enrollment } = classData;
  const statusConfig = classInfo.isActive
    ? { color: "#10b981", text: "Hoạt động" }
    : { color: "#64748b", text: "Không hoạt động" };

  const totalSessions = classAttendanceSummary?.total_sessions || 0;
  const presentCount = classAttendanceSummary?.attended_sessions || 0;
  const lateCount = classAttendanceSummary?.late_sessions || 0;
  const absentCount = classAttendanceSummary?.absent_sessions || 0;
  const attendanceRate = classAttendanceSummary?.attendance_rate
    ? Math.round(classAttendanceSummary.attendance_rate)
    : 0;
  const scheduleDetails = formatScheduleDetailed(classInfo.schedule);

  const handleTabChange = (key: string) => {
    const nextKey = validTabs.includes(key as TabKey) ? (key as TabKey) : "posts";
    setActiveTab(nextKey);
    const nextSearch = new URLSearchParams(location.search);
    nextSearch.set("tab", nextKey);
    navigate(`${location.pathname}?${nextSearch.toString()}`, { replace: true });
  };

  return (
    <div
      style={{
        padding: 24,
        background: "linear-gradient(180deg, #f7fafc 0%, #eef2f7 100%)",
        minHeight: "100vh",
      }}
    >
      <Breadcrumb items={breadcrumbItems} />

      <Card
        style={{
          marginBottom: 16,
          borderRadius: 14,
          border: "1px solid #e6edf5",
          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
          Quay lại
        </Button>

        <Space direction="vertical" size={6}>
          <Title level={2} style={{ margin: 0 }}>
            {classInfo.className}
          </Title>
          <Space wrap>
            <Text>
              <UserOutlined /> {classInfo.teacherName}
            </Text>
            {classInfo.location && (
              <Text>
                <EnvironmentOutlined /> Phòng {classInfo.location}
              </Text>
            )}
            <Text>
              <TeamOutlined /> {classInfo.totalStudents} thành viên
            </Text>
            <Text>
              <CalendarOutlined /> {formatScheduleSimple(classInfo.schedule)}
            </Text>
            <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
          </Space>
        </Space>
      </Card>

      <Card
        style={{
          borderRadius: 14,
          border: "1px solid #e6edf5",
          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
        }}
      >
      <Tabs className="class-detail-tabs" activeKey={activeTab} onChange={handleTabChange} size="large">
        <Tabs.TabPane tab="📝 Bài đăng" key="posts">
          <TeacherClassPostsPanel classId={classInfo.id} allowCreatePost={false} />
        </Tabs.TabPane>

        <Tabs.TabPane tab="📚 Tài liệu" key="documents">
          <Card title="Tài liệu lớp học" style={{ borderRadius: 12 }}>
            <Table
              loading={loadingDocuments}
              dataSource={documentsData}
              rowKey="documentId"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: "Chưa có tài liệu nào" }}
              columns={[
                {
                  title: "Tên tài liệu",
                  dataIndex: "title",
                  key: "title",
                  render: (value: string, record: ClassDocumentItem) => (
                    <Button
                      type="link"
                      style={{ paddingInline: 0, height: "auto" }}
                      onClick={async () => {
                        try {
                          await openClassDocument(record.documentId);
                        } catch {
                          message.error("Không thể mở tài liệu");
                        }
                      }}
                    >
                      {value}
                    </Button>
                  ),
                },
                {
                  title: "Bài đăng",
                  dataIndex: "postId",
                  key: "postId",
                  width: 100,
                  render: (value: number) => (
                    <Button
                      type="link"
                      style={{ paddingInline: 0 }}
                      onClick={() => setActiveDocumentPostId(value)}
                    >
                      #{value}
                    </Button>
                  ),
                },
                {
                  title: "Thời gian",
                  dataIndex: "createdAt",
                  key: "createdAt",
                  width: 220,
                  render: (value: string) => new Date(value).toLocaleString("vi-VN"),
                },
              ]}
            />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="📅 Điểm danh" key="attendance">
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={6}>
              <Card style={{ borderRadius: 12 }}>
                <Statistic title="Tỷ lệ" value={attendanceRate} suffix="%" />
                <Progress percent={attendanceRate} size="small" showInfo={false} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card style={{ borderRadius: 12 }}>
                <Statistic title="Có mặt" value={presentCount} suffix={`/${totalSessions}`} prefix={<CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card style={{ borderRadius: 12 }}>
                <Statistic title="Đi trễ" value={lateCount} suffix={`/${totalSessions}`} prefix={<ClockCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card style={{ borderRadius: 12 }}>
                <Statistic title="Vắng mặt" value={absentCount} suffix={`/${totalSessions}`} prefix={<ExclamationCircleOutlined />} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <CalendarOutlined />
                    Lịch sử điểm danh của bạn
                  </Space>
                }
                loading={attendanceLoading}
                style={{ borderRadius: 12 }}
              >
                {attendanceError ? (
                  <Alert type="error" showIcon message="Lỗi tải điểm danh" description={attendanceError} />
                ) : (
                  <Table
                    dataSource={classAttendanceSummary?.sessions || []}
                    columns={attendanceColumns}
                    rowKey="session_id"
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: <Empty description="Không có dữ liệu điểm danh" /> }}
                  />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                title={
                  <Space>
                    <FileTextOutlined />
                    Đơn xin nghỉ
                  </Space>
                }
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsLeaveModalVisible(true)}
                    loading={submittingLeaveRequest}
                  >
                    Xin nghỉ
                  </Button>
                }
                loading={leaveRequestsLoading}
                style={{ borderRadius: 12 }}
              >
                {leaveRequests.length > 0 ? (
                  <Timeline>
                    {leaveRequests.map((request) => {
                      const config = getLeaveStatusConfig(request.status);
                      return (
                        <Timeline.Item key={request.id} color={config.color}>
                          <Text strong>{dayjs(request.leaveDate).format("DD/MM/YYYY")}</Text>
                          <br />
                          <Tag color={config.color}>{config.text}</Tag>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {request.reason}
                          </Text>
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
                ) : (
                  <Empty description="Chưa có đơn xin nghỉ" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <TeamOutlined />
              Thông tin lớp học ({classInfo.totalStudents})
            </span>
          }
          key="class-info"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="Thông tin cơ bản" style={{ borderRadius: 12 }}>
                <Space direction="vertical" size={6}>
                  <Text>
                    <BookOutlined /> Mã lớp: <strong>{classInfo.classCode}</strong>
                  </Text>
                  <Text>
                    <UserOutlined /> Giảng viên: {classInfo.teacherName}
                  </Text>
                  <Text>
                    <TeamOutlined /> Thành viên: {classInfo.totalStudents}
                  </Text>
                  {classInfo.location && (
                    <Text>
                      <EnvironmentOutlined /> Phòng: {classInfo.location}
                    </Text>
                  )}
                  <Text>
                    <CalendarOutlined /> Tham gia từ: {dayjs(enrollment.joinedAt).format("DD/MM/YYYY HH:mm")}
                  </Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="Lịch học" style={{ borderRadius: 12 }}>
                {scheduleDetails.length > 0 ? (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {scheduleDetails.map((daySchedule) => (
                      <Card key={daySchedule.day} size="small">
                        <Text strong>{daySchedule.day}</Text>
                        <div style={{ marginTop: 6 }}>
                          {daySchedule.periods.map((period) => (
                            <Tag key={`${daySchedule.day}-${period.range}`} color="blue" style={{ marginBottom: 6 }}>
                              {period.range} ({period.time})
                            </Tag>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </Space>
                ) : (
                  <Empty description="Không có lịch học" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
          </Row>

          {classInfo.description && (
            <Card title="Mô tả lớp" style={{ marginTop: 16, borderRadius: 12 }}>
              <Paragraph style={{ marginBottom: 0 }}>{classInfo.description}</Paragraph>
            </Card>
          )}

          <Card title="Danh sách học sinh" style={{ marginTop: 16, borderRadius: 12 }}>
            <Table
              loading={loadingClassmates}
              dataSource={classmates}
              rowKey="id"
              pagination={{ pageSize: 8 }}
              locale={{ emptyText: "Chưa có học sinh" }}
              columns={[
                {
                  title: "Avatar",
                  key: "avatar",
                  width: 76,
                  align: "center" as const,
                  render: (record: StudentClassmateItem) => (
                    <Avatar src={resolveAvatarUrl(record.avatar)} icon={<UserOutlined />}>
                      {record.fullName?.slice(0, 1).toUpperCase()}
                    </Avatar>
                  ),
                },
                {
                  title: "Học sinh",
                  key: "student",
                  render: (record: StudentClassmateItem) => (
                    <Space>
                      <Button
                        type="link"
                        style={{ padding: 0 }}
                        onClick={() => setSelectedClassmate(record)}
                      >
                        {record.fullName}
                      </Button>
                      <Text type="secondary">({record.studentId})</Text>
                    </Space>
                  )
                },
                {
                  title: "Email",
                  dataIndex: "email",
                  key: "email",
                },
                {
                  title: "Khoa",
                  dataIndex: "department",
                  key: "department",
                  render: (value: string | null) => value || "-",
                },
                {
                  title: "Tỷ lệ",
                  key: "attendanceRate",
                  width: 120,
                  render: (record: StudentClassmateItem) => `${record.attendanceStats.attendanceRate.toFixed(1)}%`,
                },
              ]}
            />
          </Card>
        </Tabs.TabPane>
      </Tabs>
      </Card>

      <Modal
        title={selectedClassmate ? selectedClassmate.fullName : "Thông tin học sinh"}
        open={!!selectedClassmate}
        onCancel={() => setSelectedClassmate(null)}
        footer={null}
      >
        {selectedClassmate && (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Space align="center" size={12}>
              <Avatar size={64} src={resolveAvatarUrl(selectedClassmate.avatar)} icon={<UserOutlined />}>
                {selectedClassmate.fullName?.slice(0, 1).toUpperCase()}
              </Avatar>
              <Space direction="vertical" size={0}>
                <Text strong style={{ fontSize: 18 }}>{selectedClassmate.fullName}</Text>
                <Text type="secondary">{selectedClassmate.studentId}</Text>
              </Space>
            </Space>
            <Text><strong>MSSV:</strong> {selectedClassmate.studentId}</Text>
            <Text><strong>Email:</strong> {selectedClassmate.email}</Text>
            <Text><strong>Điện thoại:</strong> {selectedClassmate.phone || "Chưa có"}</Text>
            <Text><strong>Khoa:</strong> {selectedClassmate.department || "Chưa có"}</Text>
            <Text><strong>Niên khóa:</strong> {selectedClassmate.academicYear || "Chưa có"}</Text>
            <Text><strong>Ngày tham gia lớp:</strong> {dayjs(selectedClassmate.joinedAt).format("DD/MM/YYYY HH:mm")}</Text>
          </Space>
        )}
      </Modal>

      <Modal
        title={activeDocumentPostId ? `Bài đăng #${activeDocumentPostId}` : "Bài đăng"}
        open={!!activeDocumentPostId}
        onCancel={() => setActiveDocumentPostId(null)}
        footer={null}
        width={920}
        destroyOnHidden
      >
        {classId && activeDocumentPostId ? (
          <TeacherClassPostsPanel classId={classId} allowCreatePost={false} focusPostId={activeDocumentPostId} />
        ) : null}
      </Modal>

      <LeaveRequestModal
        visible={isLeaveModalVisible}
        onCancel={() => setIsLeaveModalVisible(false)}
        onSubmit={handleSubmitLeaveRequest}
        loading={submittingLeaveRequest}
        subjects={[
          {
            value: classInfo.id.toString(),
            label: classInfo.className,
            teacher: classInfo.teacherName,
            schedule: classInfo.schedule,
          },
        ]}
        preSelectedSubject={classInfo.id.toString()}
      />
    </div>
  );
};

export default StudentClassDetailPage;