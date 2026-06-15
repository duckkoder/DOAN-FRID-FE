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
  overrideAttendanceToPresent,
  getStudentFaceImageByRecordId,
  type SessionAttendanceResponse,
  type AttendanceRecord
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

  // Fetch session details
  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!sessionId) {
        setError("ID phiÃªn khÃ´ng há»£p lá»‡");
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
        const errorMsg = err?.response?.data?.detail || err?.message || "KhÃ´ng thá»ƒ táº£i chi tiáº¿t phiÃªn Ä‘iá»ƒm danh";
        setError(errorMsg);
        message.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId]);


  // Refetch session data
  const refetchData = async () => {
    if (!sessionId) return;
    
    try {
      const response = await getSessionAttendance(parseInt(sessionId));
      setSessionData(response);
    } catch (err: any) {
      console.error("Failed to refresh session details:", err);
      message.error("KhÃ´ng thá»ƒ lÃ m má»›i dá»¯ liá»‡u");
    }
  };

  // Handle confirm attendance
  const handleConfirmAttendance = async (recordId: number, studentName: string) => {
    setActionLoading(prev => ({ ...prev, [recordId]: true }));
    
    try {
      await confirmAttendance(recordId, {
        notes: `Confirmed by teacher - ${dayjs().format("HH:mm DD/MM/YYYY")}`
      });
      
      message.success(`ÄÃ£ xÃ¡c nháº­n ${studentName} cÃ³ máº·t`);
      await refetchData();
    } catch (err: any) {
      console.error("Failed to confirm attendance:", err);
      message.error(err?.response?.data?.detail || "KhÃ´ng thá»ƒ xÃ¡c nháº­n Ä‘iá»ƒm danh");
    } finally {
      setActionLoading(prev => ({ ...prev, [recordId]: false }));
    }
  };

  // Handle reject attendance â€” just open modal
  const handleRejectAttendance = (recordId: number, studentName: string) => {
    setRejectModal({ open: true, recordId, studentName });
  };

  const doRejectAttendance = async () => {
    if (!rejectModal) return;
    const { recordId, studentName } = rejectModal;
    setActionLoading(prev => ({ ...prev, [recordId]: true }));
    try {
      await rejectAttendance(recordId, { notes: `GiÃ¡o viÃªn tá»« chá»‘i - AI nháº­n diá»‡n sai` });
      message.success(`ÄÃ£ Ä‘Ã¡nh dáº¥u ${studentName} váº¯ng máº·t`);
      setRejectModal(null);
      await refetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "KhÃ´ng thá»ƒ tá»« chá»‘i Ä‘iá»ƒm danh");
    } finally {
      setActionLoading(prev => ({ ...prev, [recordId]: false }));
    }
  };

  // Handle override absent â†’ present â€” just open modal
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
      message.success(`ÄÃ£ cáº­p nháº­t ${studentName} thÃ nh CÃ³ máº·t`);
      setOverrideModal(null);
      setStudentFaceImage(null);
      await refetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "KhÃ´ng thá»ƒ cáº­p nháº­t Ä‘iá»ƒm danh");
    } finally {
      setActionLoading(prev => ({ ...prev, [recordId]: false }));
    }
  };

  // Handle confirm all pending â€” just open modal
  const handleConfirmAllPending = () => {
    if (!sessionId || !sessionData) return;
    const pendingCount = sessionData.statistics.pending_count || 0;
    if (pendingCount === 0) { message.info("KhÃ´ng cÃ³ sinh viÃªn nÃ o chá» xÃ¡c nháº­n"); return; }
    setConfirmAllModal(true);
  };

  const doConfirmAllPending = async () => {
    if (!sessionId || !sessionData) return;
    const pendingCount = sessionData.statistics.pending_count || 0;
    setConfirmingAll(true);
    try {
      await confirmAllPending(parseInt(sessionId));
      message.success(`ÄÃ£ xÃ¡c nháº­n táº¥t cáº£ ${pendingCount} sinh viÃªn`);
      setConfirmAllModal(false);
      await refetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "KhÃ´ng thá»ƒ xÃ¡c nháº­n táº¥t cáº£");
    } finally {
      setConfirmingAll(false);
    }
  };

  // Get status config
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { color: "#faad14", text: "Chá»", icon: <ClockCircleOutlined /> };
      case "present":
        return { color: "#10b981", text: "CÃ³ máº·t", icon: <CheckCircleOutlined /> };
      case "absent":
        return { color: "#ef4444", text: "Váº¯ng máº·t", icon: <CloseCircleOutlined /> };
      case "excused":
        return { color: "#8b5cf6", text: "Nghá»‰ phÃ©p", icon: <CheckCircleOutlined /> };
      default:
        return { color: "#64748b", text: "KhÃ´ng rÃµ", icon: <UserOutlined /> };
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
      title: "Sinh viÃªn",
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
      title: "Tráº¡ng thÃ¡i",
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
      title: "Giá» vÃ o",
      dataIndex: "recorded_at",
      key: "recorded_at",
      width: 180,
      render: (time: string | null) =>
        time ? (
          <Text>{dayjs(time).format("HH:mm:ss - DD/MM/YYYY")}</Text>
        ) : (
          <Text type="secondary">ChÆ°a vÃ o</Text>
        )
    },
    {
      title: "Nháº­t kÃ½ khuÃ´n máº·t",
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
      title: "Ghi chÃº",
      dataIndex: "notes",
      key: "notes",
      render: (notes: string | null) =>
        notes ? <Text style={{ fontSize: 12 }}>{notes}</Text> : <Text type="secondary">-</Text>
    },
    {
      title: "HÃ nh Ä‘á»™ng",
      key: "actions",
      width: 160,
      align: "center" as const,
      render: (_: any, record: AttendanceRecord) => {
        const isLoading = actionLoading[record.id] || false;

        // Pending: confirm / reject buttons
        if (record.status === 'pending') {
          return (
            <Space size="small">
              <Tooltip title="XÃ¡c nháº­n cÃ³ máº·t">
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
              <Tooltip title="ÄÃ¡nh dáº¥u váº¯ng máº·t">
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
            <Tooltip title="AI khÃ´ng nháº­n diá»‡n Ä‘Æ°á»£c? Chá»‰nh thÃ nh CÃ³ máº·t">
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
                Sá»­a
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
      message.error("KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á»ƒ xuáº¥t");
      return;
    }

    setExporting(true);
    const loadingMsg = message.loading("Äang táº¡o file Excel...", 0);

    try {
      // Small delay for UI to render loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      const { session, records, statistics } = sessionData;

      // Create Excel data
      const excelData = [
        // Session header info
        ["DANH SÃCH ÄIá»‚M DANH"],
        [`PhiÃªn: ${session.session_name || `PhiÃªn #${session.id}`}`],
        [`Thá»i gian: ${dayjs(session.start_time).format("HH:mm - DD/MM/YYYY")}`],
        [`Äá»‹a Ä‘iá»ƒm: ${session.location || "ChÆ°a xÃ¡c Ä‘á»‹nh"}`],
        [],
        // Statistics
        ["THá»NG KÃŠ"],
        [`Tá»•ng sinh viÃªn: ${statistics.total_students}`],
        [`CÃ³ máº·t: ${statistics.present_count}`],
        [`Chá»: ${statistics.pending_count || 0}`],
        [`Váº¯ng máº·t: ${statistics.absent_count}`],
        [`Nghá»‰ phÃ©p: ${statistics.excused_count}`],
        [`Tá»· lá»‡: ${statistics.attendance_rate.toFixed(2)}%`],
        [],
        // Table header
        ["STT", "MÃ£ sinh viÃªn", "Há» tÃªn", "Tráº¡ng thÃ¡i", "Giá» vÃ o", "Ghi chÃº"]
      ];

      // Add student data
      records.forEach((record, index) => {
        excelData.push([
          (index + 1).toString(),
          record.student_code,
          record.student_name,
          getStatusConfig(record.status).text,
          record.recorded_at ? dayjs(record.recorded_at).format("HH:mm:ss - DD/MM/YYYY") : "ChÆ°a vÃ o",
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
      message.success("ÄÃ£ xuáº¥t Excel thÃ nh cÃ´ng!", 2);
    } catch (error) {
      loadingMsg(); // Close loading message
      console.error("Export Excel error:", error);
      message.error("Lá»—i xuáº¥t Excel");
    } finally {
      setExporting(false);
    }
  };

  // Breadcrumb
  const breadcrumbItems = [
    { title: "Dashboard", href: "/teacher" },
    { title: "Quáº£n lÃ½ Lá»›p", href: "/teacher/classes" },
    { title: "Chi tiáº¿t PhiÃªn Äiá»ƒm danh" }
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
        <Spin size="large" tip="Äang táº£i chi tiáº¿t phiÃªn Ä‘iá»ƒm danh..." />
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
            description={error || "KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u"}
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
              Quay láº¡i
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
              // âœ… Navigate back with preserved tab
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
          ðŸ“‹ {session.session_name || `PhiÃªn Äiá»ƒm danh #${session.id}`}
        </Title>

        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label={<><CalendarOutlined /> Giá» báº¯t Ä‘áº§u</>}>
            {dayjs(session.start_time).format("HH:mm - DD/MM/YYYY")}
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> Giá» káº¿t thÃºc</>}>
            {session.end_time
              ? dayjs(session.end_time).format("HH:mm - DD/MM/YYYY")
              : "Äang diá»…n ra"}
          </Descriptions.Item>
          <Descriptions.Item label="Tráº¡ng thÃ¡i">
            <Tag color={session.status === "finished" ? "success" : "processing"}>
              {session.status === "finished" ? "HoÃ n thÃ nh" : "Äang diá»…n ra"}
            </Tag>
          </Descriptions.Item>
          {session.location && (
            <Descriptions.Item label={<><EnvironmentOutlined /> Äá»‹a Ä‘iá»ƒm</>} span={2}>
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
              title="Tá»•ng sinh viÃªn"
              value={statistics.total_students}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#2563eb" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="CÃ³ máº·t"
              value={statistics.present_count}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#10b981" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Chá»"
              value={statistics.pending_count || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Váº¯ng máº·t"
              value={statistics.absent_count}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: "#ef4444" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Nghá»‰ phÃ©p"
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
              Tá»· lá»‡ Ä‘iá»ƒm danh
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

      {/* Attendance Table */}
      <Card
        title="ðŸ“Š Danh sÃ¡ch Äiá»ƒm danh Chi tiáº¿t"
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
                XÃ¡c nháº­n Táº¥t cáº£ ({sessionData.statistics.pending_count})
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

      {/* â”€â”€ Reject Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal
        open={!!rejectModal?.open}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ef4444' }} />
            <span>Tá»« chá»‘i Äiá»ƒm danh</span>
          </Space>
        }
        okText="XÃ¡c nháº­n Váº¯ng"
        cancelText="Há»§y"
        okButtonProps={{ danger: true, loading: rejectModal ? (actionLoading[rejectModal.recordId] || false) : false }}
        onOk={doRejectAttendance}
        onCancel={() => setRejectModal(null)}
      >
        <p>
          Báº¡n cÃ³ cháº¯c muá»‘n Ä‘Ã¡nh dáº¥u{' '}
          <strong>{rejectModal?.studentName}</strong>{' '}
          lÃ  <strong style={{ color: '#ef4444' }}>Váº¯ng máº·t</strong>?
        </p>
      </Modal>

      {/* â”€â”€ Override Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal
        open={!!overrideModal?.open}
        title={
          <Space>
            <EditOutlined style={{ color: '#2563eb' }} />
            <span>Chá»‰nh sá»­a Äiá»ƒm danh (AI Miss)</span>
          </Space>
        }
        okText="XÃ¡c nháº­n CÃ³ máº·t"
        cancelText="Há»§y"
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
            Báº¡n cÃ³ cháº¯c muá»‘n Ä‘Ã¡nh dáº¥u{' '}
            <strong>{overrideModal?.studentName}</strong>{' '}
            lÃ  <strong style={{ color: '#10b981' }}>CÃ³ máº·t</strong>?
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
              áº¢nh Ä‘á»‘i chiáº¿u Ä‘Äƒng kÃ½ gá»‘c (ÄÃ£ duyá»‡t)
            </span>
            
            {loadingFaceImage ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin tip="Äang táº£i áº£nh Ä‘á»‘i chiáº¿u..." size="small" />
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
                      <EyeOutlined /> Xem áº£nh gá»‘c
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
                  KhÃ´ng tÃ¬m tháº¥y áº£nh Ä‘Äƒng kÃ½ Ä‘á»‘i chiáº¿u
                </span>
              </div>
            )}
          </div>

          <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
            * Vui lÃ²ng Ä‘á»‘i chiáº¿u gÆ°Æ¡ng máº·t cá»§a sinh viÃªn trÆ°á»›c khi xÃ¡c nháº­n cÃ³ máº·t thá»§ cÃ´ng Ä‘á»ƒ Ä‘áº£m báº£o tÃ­nh trung thá»±c.
          </p>
        </div>
      </Modal>

      {/* â”€â”€ Confirm All Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal
        open={confirmAllModal}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#10b981' }} />
            <span>XÃ¡c nháº­n Táº¥t cáº£</span>
          </Space>
        }
        okText="XÃ¡c nháº­n Táº¥t cáº£"
        cancelText="Há»§y"
        okButtonProps={{
          style: { backgroundColor: '#10b981', borderColor: '#10b981' },
          loading: confirmingAll
        }}
        onOk={doConfirmAllPending}
        onCancel={() => setConfirmAllModal(false)}
      >
        <p>
          Báº¡n cÃ³ muá»‘n xÃ¡c nháº­n táº¥t cáº£{' '}
          <strong>{sessionData?.statistics.pending_count ?? 0}</strong>{' '}
          sinh viÃªn Ä‘ang chá» lÃ  <strong style={{ color: '#10b981' }}>CÃ³ máº·t</strong>?
        </p>
      </Modal>
    </div>
  );
};

export default SessionDetailPage;

