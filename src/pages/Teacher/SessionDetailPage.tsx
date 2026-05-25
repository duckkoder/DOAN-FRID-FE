import React, { useState, useEffect } from "react";
import {
  Typography,
  Card,
  Table,
  Tag,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Spin,
  message,
  Descriptions,
  Avatar,
  Progress,
  Empty,
  Modal,
  Tooltip,
  Image
} from "antd";
import {
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FileExcelOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  WarningOutlined,
  EditOutlined
} from "@ant-design/icons";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import {
  getSessionAttendance,
  confirmAttendance,
  rejectAttendance,
  confirmAllPending,
  getSessionSpoofDetections,
  overrideAttendanceToPresent,
  getStudentFaceImageByRecordId,
  type SessionAttendanceResponse,
  type AttendanceRecord,
  type SpoofDetection,
  type SpoofDetectionsResponse
} from "../../apis/attendanceAPIs/attendanceAPIs";

const { Title, Text } = Typography;

const SessionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [sessionData, setSessionData] = useState<SessionAttendanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});
  const [confirmingAll, setConfirmingAll] = useState<boolean>(false);

  // Modal states
  const [rejectModal, setRejectModal] = useState<{ open: boolean; recordId: number; studentName: string } | null>(null);
  const [overrideModal, setOverrideModal] = useState<{ open: boolean; recordId: number; studentName: string } | null>(null);
  const [confirmAllModal, setConfirmAllModal] = useState(false);
  const [studentFaceImage, setStudentFaceImage] = useState<string | null>(null);
  const [loadingFaceImage, setLoadingFaceImage] = useState<boolean>(false);

  // Spoof detections state
  const [spoofDetections, setSpoofDetections] = useState<SpoofDetection[]>([]);
  const [spoofLoading, setSpoofLoading] = useState<boolean>(false);

  // Fetch session details
  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!sessionId) {
        setError("ID phiên không hợp lệ");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getSessionAttendance(parseInt(sessionId));
        setSessionData(response);
      } catch (err: any) {
        console.error("Failed to load session details:", err);
        const errorMsg = err?.response?.data?.detail || err?.message || "Không thể tải chi tiết phiên điểm danh";
        setError(errorMsg);
        message.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId]);

  // Fetch spoof detections
  useEffect(() => {
    const fetchSpoofDetections = async () => {
      if (!sessionId || !sessionData) return;
      
      // Chỉ fetch nếu phiên đã kết thúc
      if (sessionData.session.status !== "finished") return;
      
      setSpoofLoading(true);
      try {
        const response = await getSessionSpoofDetections(parseInt(sessionId));
        setSpoofDetections(response.spoof_detections);
      } catch (err: any) {
        console.error("Failed to load spoof detections:", err);
        // Không hiện message lỗi cho spoof (optional feature)
      } finally {
        setSpoofLoading(false);
      }
    };

    fetchSpoofDetections();
  }, [sessionId, sessionData?.session.status]);

  // Refetch session data
  const refetchData = async () => {
    if (!sessionId) return;
    
    try {
      const response = await getSessionAttendance(parseInt(sessionId));
      setSessionData(response);
    } catch (err: any) {
      console.error("Failed to refresh session details:", err);
      message.error("Không thể làm mới dữ liệu");
    }
  };

  // Handle confirm attendance
  const handleConfirmAttendance = async (recordId: number, studentName: string) => {
    setActionLoading(prev => ({ ...prev, [recordId]: true }));
    
    try {
      await confirmAttendance(recordId, {
        notes: `Confirmed by teacher - ${dayjs().format("HH:mm DD/MM/YYYY")}`
      });
      
      message.success(`Đã xác nhận ${studentName} có mặt`);
      await refetchData();
    } catch (err: any) {
      console.error("Failed to confirm attendance:", err);
      message.error(err?.response?.data?.detail || "Không thể xác nhận điểm danh");
    } finally {
      setActionLoading(prev => ({ ...prev, [recordId]: false }));
    }
  };

  // Handle reject attendance — just open modal
  const handleRejectAttendance = (recordId: number, studentName: string) => {
    setRejectModal({ open: true, recordId, studentName });
  };

  const doRejectAttendance = async () => {
    if (!rejectModal) return;
    const { recordId, studentName } = rejectModal;
    setActionLoading(prev => ({ ...prev, [recordId]: true }));
    try {
      await rejectAttendance(recordId, { notes: `Giáo viên từ chối - AI nhận diện sai` });
      message.success(`Đã đánh dấu ${studentName} vắng mặt`);
      setRejectModal(null);
      await refetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Không thể từ chối điểm danh");
    } finally {
      setActionLoading(prev => ({ ...prev, [recordId]: false }));
    }
  };

  // Handle override absent → present — just open modal
  const handleOverrideToPresent = async (recordId: number, studentName: string) => {
    setOverrideModal({ open: true, recordId, studentName });
    setStudentFaceImage(null);
    setLoadingFaceImage(true);
    try {
      const res = await getStudentFaceImageByRecordId(recordId);
      if (res && res.success && res.image_url) {
        setStudentFaceImage(res.image_url);
      }
    } catch (err) {
      console.error("Failed to fetch student face image:", err);
    } finally {
      setLoadingFaceImage(false);
    }
  };

  const doOverrideToPresent = async () => {
    if (!overrideModal) return;
    const { recordId, studentName } = overrideModal;
    setActionLoading(prev => ({ ...prev, [recordId]: true }));
    try {
      await overrideAttendanceToPresent(recordId);
      message.success(`Đã cập nhật ${studentName} thành Có mặt`);
      setOverrideModal(null);
      setStudentFaceImage(null);
      await refetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Không thể cập nhật điểm danh");
    } finally {
      setActionLoading(prev => ({ ...prev, [recordId]: false }));
    }
  };

  // Handle confirm all pending — just open modal
  const handleConfirmAllPending = () => {
    if (!sessionId || !sessionData) return;
    const pendingCount = sessionData.statistics.pending_count || 0;
    if (pendingCount === 0) { message.info("Không có sinh viên nào chờ xác nhận"); return; }
    setConfirmAllModal(true);
  };

  const doConfirmAllPending = async () => {
    if (!sessionId || !sessionData) return;
    const pendingCount = sessionData.statistics.pending_count || 0;
    setConfirmingAll(true);
    try {
      await confirmAllPending(parseInt(sessionId));
      message.success(`Đã xác nhận tất cả ${pendingCount} sinh viên`);
      setConfirmAllModal(false);
      await refetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Không thể xác nhận tất cả");
    } finally {
      setConfirmingAll(false);
    }
  };

  // Get status config
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { color: "#faad14", text: "Chờ", icon: <ClockCircleOutlined /> };
      case "present":
        return { color: "#10b981", text: "Có mặt", icon: <CheckCircleOutlined /> };
      case "absent":
        return { color: "#ef4444", text: "Vắng mặt", icon: <CloseCircleOutlined /> };
      case "excused":
        return { color: "#8b5cf6", text: "Nghỉ phép", icon: <CheckCircleOutlined /> };
      default:
        return { color: "#64748b", text: "Không rõ", icon: <UserOutlined /> };
    }
  };

  // Table columns
  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center" as const,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      title: "Sinh viên",
      key: "student",
      render: (record: AttendanceRecord) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text strong>{record.student_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.student_code}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      align: "center" as const,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: "Giờ vào",
      dataIndex: "recorded_at",
      key: "recorded_at",
      width: 180,
      render: (time: string | null) =>
        time ? (
          <Text>{dayjs(time).format("HH:mm:ss - DD/MM/YYYY")}</Text>
        ) : (
          <Text type="secondary">Chưa vào</Text>
        )
    },
    {
      title: "Nhật ký khuôn mặt",
      dataIndex: "image_path",
      key: "image_path",
      width: 100,
      align: "center" as const,
      render: (imagePath: string | null) =>
        imagePath ? (
          <Image
            width={50}
            height={50}
            src={imagePath}
            alt="Face evidence"
            style={{ objectFit: "cover", borderRadius: 4 }}
            preview={{
              mask: (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <EyeOutlined /> Xem
                </div>
              )
            }}
          />
        ) : (
          <Text type="secondary">-</Text>
        )
    },
    {
      title: "Ghi chú",
      dataIndex: "notes",
      key: "notes",
      render: (notes: string | null) =>
        notes ? <Text style={{ fontSize: 12 }}>{notes}</Text> : <Text type="secondary">-</Text>
    },
    {
      title: "Hành động",
      key: "actions",
      width: 160,
      align: "center" as const,
      render: (_: any, record: AttendanceRecord) => {
        const isLoading = actionLoading[record.id] || false;

        // Pending: confirm / reject buttons
        if (record.status === 'pending') {
          return (
            <Space size="small">
              <Tooltip title="Xác nhận có mặt">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => handleConfirmAttendance(record.id, record.student_name)}
                  loading={isLoading}
                  disabled={isLoading}
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                />
              </Tooltip>
              <Tooltip title="Đánh dấu vắng mặt">
                <Button
                  danger
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => handleRejectAttendance(record.id, record.student_name)}
                  loading={isLoading}
                  disabled={isLoading}
                />
              </Tooltip>
            </Space>
          );
        }

        // Absent: show override button so teacher can fix AI miss-recognition
        if (record.status === 'absent') {
          return (
            <Tooltip title="AI không nhận diện được? Chỉnh thành Có mặt">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOverrideToPresent(record.id, record.student_name)}
                loading={isLoading}
                disabled={isLoading}
                style={{
                  borderColor: '#2563eb',
                  color: '#2563eb',
                  fontSize: 12
                }}
              >
                Sửa
              </Button>
            </Tooltip>
          );
        }

        // Present / Excused: no action needed
        return <Text type="secondary">-</Text>;
      }
    }
  ];

  // Handle export Excel
  const handleExportExcel = async () => {
    if (!sessionData) {
      message.error("Không có dữ liệu để xuất");
      return;
    }

    setExporting(true);
    const loadingMsg = message.loading("Đang tạo file Excel...", 0);

    try {
      // Small delay for UI to render loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      const { session, records, statistics } = sessionData;

      // Create Excel data
      const excelData = [
        // Session header info
        ["DANH SÁCH ĐIỂM DANH"],
        [`Phiên: ${session.session_name || `Phiên #${session.id}`}`],
        [`Thời gian: ${dayjs(session.start_time).format("HH:mm - DD/MM/YYYY")}`],
        [`Địa điểm: ${session.location || "Chưa xác định"}`],
        [],
        // Statistics
        ["THỐNG KÊ"],
        [`Tổng sinh viên: ${statistics.total_students}`],
        [`Có mặt: ${statistics.present_count}`],
        [`Chờ: ${statistics.pending_count || 0}`],
        [`Vắng mặt: ${statistics.absent_count}`],
        [`Nghỉ phép: ${statistics.excused_count}`],
        [`Tỷ lệ: ${statistics.attendance_rate.toFixed(2)}%`],
        [],
        // Table header
        ["STT", "Mã sinh viên", "Họ tên", "Trạng thái", "Giờ vào", "Ghi chú"]
      ];

      // Add student data
      records.forEach((record, index) => {
        excelData.push([
          (index + 1).toString(),
          record.student_code,
          record.student_name,
          getStatusConfig(record.status).text,
          record.recorded_at ? dayjs(record.recorded_at).format("HH:mm:ss - DD/MM/YYYY") : "Chưa vào",
          record.notes || "-"
        ]);
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");

      // Styling (optional - set column widths)
      ws["!cols"] = [
        { wch: 5 },  // No.
        { wch: 15 }, // Student ID
        { wch: 25 }, // Name
        { wch: 12 }, // Status
        { wch: 20 }, // Time
        { wch: 35 }  // Notes
      ];

      // Export file
      const fileName = `Attendance_${session.id}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;
      XLSX.writeFile(wb, fileName);

      loadingMsg(); // Close loading message
      message.success("Đã xuất Excel thành công!", 2);
    } catch (error) {
      loadingMsg(); // Close loading message
      console.error("Export Excel error:", error);
      message.error("Lỗi xuất Excel");
    } finally {
      setExporting(false);
    }
  };

  // Breadcrumb
  const breadcrumbItems = [
    { title: "Dashboard", href: "/teacher" },
    { title: "Quản lý Lớp", href: "/teacher/classes" },
    { title: "Chi tiết Phiên Điểm danh" }
  ];

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)"
        }}
      >
        <Spin size="large" tip="Đang tải chi tiết phiên điểm danh..." />
      </div>
    );
  }

  // Error state
  if (error || !sessionData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "32px 48px",
          background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)"
        }}
      >
        <Breadcrumb items={breadcrumbItems} />
        <Card style={{ marginTop: 24, textAlign: "center" }}>
          <Empty
            description={error || "Không tìm thấy dữ liệu"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => {
                const state = location.state as { from?: string; tab?: string } | null;
                if (state?.from && state?.tab) {
                  navigate(`${state.from}?tab=${state.tab}`);
                } else {
                  navigate(-1);
                }
              }}
            >
              Quay lại
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  const { session, records, statistics } = sessionData;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)",
        padding: "32px 48px"
      }}
    >
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              // ✅ Navigate back with preserved tab
              const state = location.state as { from?: string; tab?: string } | null;
              if (state?.from && state?.tab) {
                // Go back to specific class detail page with tab
                navigate(`${state.from}?tab=${state.tab}`);
              } else {
                // Fallback to default back navigation
                navigate(-1);
              }
            }}
            size="large"
          >
            Go Back
          </Button>
        </Space>
      </div>

      {/* Session Info */}
      <Card
        style={{
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          marginBottom: 24
        }}
      >
        <Title level={3} style={{ marginBottom: 24 }}>
          📋 {session.session_name || `Phiên Điểm danh #${session.id}`}
        </Title>

        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label={<><CalendarOutlined /> Giờ bắt đầu</>}>
            {dayjs(session.start_time).format("HH:mm - DD/MM/YYYY")}
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> Giờ kết thúc</>}>
            {session.end_time
              ? dayjs(session.end_time).format("HH:mm - DD/MM/YYYY")
              : "Đang diễn ra"}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={session.status === "finished" ? "success" : "processing"}>
              {session.status === "finished" ? "Hoàn thành" : "Đang diễn ra"}
            </Tag>
          </Descriptions.Item>
          {session.location && (
            <Descriptions.Item label={<><EnvironmentOutlined /> Địa điểm</>} span={2}>
              {session.location}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Tổng sinh viên"
              value={statistics.total_students}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#2563eb" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Có mặt"
              value={statistics.present_count}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#10b981" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Chờ"
              value={statistics.pending_count || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Vắng mặt"
              value={statistics.absent_count}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: "#ef4444" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Nghỉ phép"
              value={statistics.excused_count || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#8b5cf6" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Attendance Rate */}
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <Row align="middle" gutter={24}>
          <Col flex="auto">
            <Title level={4} style={{ marginBottom: 8 }}>
              Tỷ lệ điểm danh
            </Title>
            <Progress
              percent={statistics.attendance_rate}
              strokeColor={{
                "0%": "#10b981",
                "100%": "#059669"
              }}
              status="active"
            />
          </Col>
          <Col>
            <Statistic
              value={statistics.attendance_rate}
              suffix="%"
              valueStyle={{
                fontSize: 36,
                color: statistics.attendance_rate >= 80 ? "#10b981" : "#ef4444"
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* Spoof Detections Section */}
      {session.status === "finished" && (
        <Card
          title={
            <Space>
              <WarningOutlined style={{ color: "#ef4444" }} />
              <span>Phát hiện giả mạo</span>
              {spoofDetections.length > 0 && (
                <Tag color="error">{spoofDetections.length} phát hiện</Tag>
              )}
            </Space>
          }
          style={{ 
            borderRadius: 16, 
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            marginBottom: 24,
            borderLeft: spoofDetections.length > 0 ? "4px solid #ef4444" : undefined
          }}
        >
          {spoofLoading ? (
            <div style={{ textAlign: "center", padding: "24px" }}>
              <Spin tip="Đang tải phát hiện giả mạo..." />
            </div>
          ) : spoofDetections.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: "#10b981" }}>
                  <CheckCircleOutlined style={{ marginRight: 8 }} />
                  Không phát hiện giả mạo trong phiên này
                </span>
              }
            />
          ) : (
            <div>
              <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                Những khuôn mặt sau đã được phát hiện là giả mạo (hình ảnh, mặt nạ hoặc mặt giả khác).
                Chúng không được tính là điểm danh hợp lệ.
              </Text>
              <Row gutter={[16, 16]}>
                {spoofDetections.map((spoof) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={spoof.id}>
                    <Card
                      hoverable
                      size="small"
                      style={{ 
                        borderRadius: 8,
                        border: "1px solid #fecaca",
                        backgroundColor: "#fef2f2"
                      }}
                      cover={
                        spoof.image_path ? (
                          <Image
                            src={spoof.image_path}
                            alt={`Spoof detection #${spoof.id}`}
                            style={{ 
                              height: 150, 
                              objectFit: "cover",
                              borderTopLeftRadius: 8,
                              borderTopRightRadius: 8
                            }}
                            preview={{
                              mask: (
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <EyeOutlined /> Xem
                                </div>
                              )
                            }}
                          />
                        ) : (
                          <div 
                            style={{ 
                              height: 150, 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              backgroundColor: "#fee2e2",
                              borderTopLeftRadius: 8,
                              borderTopRightRadius: 8
                            }}
                          >
                            <Text type="secondary">Đang tải ảnh</Text>
                          </div>
                        )
                      }
                    >
                      <Card.Meta
                        title={
                          <Tag color="error" style={{ margin: 0 }}>
                            <WarningOutlined /> {spoof.spoofing_type.toUpperCase()}
                          </Tag>
                        }
                        description={
                          <div style={{ marginTop: 8 }}>
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Độ chính xác: {(spoof.spoofing_confidence * 100).toFixed(1)}%
                              </Text>
                            </div>
                            {spoof.detected_at && (
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {dayjs(spoof.detected_at).format("HH:mm:ss")}
                                </Text>
                              </div>
                            )}
                            {spoof.frame_count !== null && (
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Frame #{spoof.frame_count}
                                </Text>
                              </div>
                            )}
                          </div>
                        }
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </Card>
      )}

      {/* Attendance Table */}
      <Card
        title="📊 Danh sách Điểm danh Chi tiết"
        style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
        extra={
          <Space>
            {/* Show "Confirm All" button if there are pending students */}
            {sessionData && (sessionData.statistics.pending_count || 0) > 0 && (
              <Button
                type="default"
                icon={<CheckCircleOutlined />}
                onClick={handleConfirmAllPending}
                loading={confirmingAll}
                disabled={confirmingAll}
                style={{
                  backgroundColor: '#faad14',
                  borderColor: '#faad14',
                  color: '#fff'
                }}
              >
                Xác nhận Tất cả ({sessionData.statistics.pending_count})
              </Button>
            )}
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              loading={exporting}
              disabled={exporting}
              style={{
                background: exporting 
                  ? "#94a3b8" 
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: "none"
              }}
            >
              {exporting ? "Exporting..." : "Export Excel"}
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 15,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} students`,
            showSizeChanger: true,
            pageSizeOptions: ["10", "15", "20", "50"]
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* ── Reject Modal ─────────────────────────── */}
      <Modal
        open={!!rejectModal?.open}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ef4444' }} />
            <span>Từ chối Điểm danh</span>
          </Space>
        }
        okText="Xác nhận Vắng"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: rejectModal ? (actionLoading[rejectModal.recordId] || false) : false }}
        onOk={doRejectAttendance}
        onCancel={() => setRejectModal(null)}
      >
        <p>
          Bạn có chắc muốn đánh dấu{' '}
          <strong>{rejectModal?.studentName}</strong>{' '}
          là <strong style={{ color: '#ef4444' }}>Vắng mặt</strong>?
        </p>
      </Modal>

      {/* ── Override Modal ───────────────────────── */}
      <Modal
        open={!!overrideModal?.open}
        title={
          <Space>
            <EditOutlined style={{ color: '#2563eb' }} />
            <span>Chỉnh sửa Điểm danh (AI Miss)</span>
          </Space>
        }
        okText="Xác nhận Có mặt"
        cancelText="Hủy"
        okButtonProps={{
          style: { backgroundColor: '#10b981', borderColor: '#10b981' },
          loading: overrideModal ? (actionLoading[overrideModal.recordId] || false) : false
        }}
        onOk={doOverrideToPresent}
        onCancel={() => {
          setOverrideModal(null);
          setStudentFaceImage(null);
        }}
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <p style={{ margin: 0 }}>
            Bạn có chắc muốn đánh dấu{' '}
            <strong>{overrideModal?.studentName}</strong>{' '}
            là <strong style={{ color: '#10b981' }}>Có mặt</strong>?
          </p>

          <div 
            style={{ 
              border: '1px solid #e2e8f0', 
              borderRadius: 12, 
              padding: 16, 
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <span style={{ fontWeight: 600, color: '#475569', fontSize: 13 }}>
              Ảnh đối chiếu đăng ký gốc (Đã duyệt)
            </span>
            
            {loadingFaceImage ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin tip="Đang tải ảnh đối chiếu..." size="small" />
              </div>
            ) : studentFaceImage ? (
              <Image
                src={studentFaceImage}
                alt="Student registration front face"
                style={{ 
                  height: 180, 
                  width: 180, 
                  objectFit: 'cover', 
                  borderRadius: 8,
                  border: '2px solid #2563eb'
                }}
                preview={{
                  mask: (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                      <EyeOutlined /> Xem ảnh gốc
                    </div>
                  )
                }}
              />
            ) : (
              <div 
                style={{ 
                  height: 180, 
                  width: 180, 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: '#cbd5e1',
                  borderRadius: 8,
                  padding: 8,
                  textAlign: 'center'
                }}
              >
                <WarningOutlined style={{ fontSize: 24, color: '#64748b', marginBottom: 8 }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Không tìm thấy ảnh đăng ký đối chiếu
                </span>
              </div>
            )}
          </div>

          <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
            * Vui lòng đối chiếu gương mặt của sinh viên trước khi xác nhận có mặt thủ công để đảm bảo tính trung thực.
          </p>
        </div>
      </Modal>

      {/* ── Confirm All Modal ────────────────────── */}
      <Modal
        open={confirmAllModal}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#10b981' }} />
            <span>Xác nhận Tất cả</span>
          </Space>
        }
        okText="Xác nhận Tất cả"
        cancelText="Hủy"
        okButtonProps={{
          style: { backgroundColor: '#10b981', borderColor: '#10b981' },
          loading: confirmingAll
        }}
        onOk={doConfirmAllPending}
        onCancel={() => setConfirmAllModal(false)}
      >
        <p>
          Bạn có muốn xác nhận tất cả{' '}
          <strong>{sessionData?.statistics.pending_count ?? 0}</strong>{' '}
          sinh viên đang chờ là <strong style={{ color: '#10b981' }}>Có mặt</strong>?
        </p>
      </Modal>
    </div>
  );
};

export default SessionDetailPage;
