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
  WarningOutlined
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
  
  // Spoof detections state
  const [spoofDetections, setSpoofDetections] = useState<SpoofDetection[]>([]);
  const [spoofLoading, setSpoofLoading] = useState<boolean>(false);

  // Fetch session details
  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!sessionId) {
        setError("Invalid session ID");
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
        const errorMsg = err?.response?.data?.detail || err?.message || "Could not load attendance session details";
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
      message.error("Could not refresh data");
    }
  };

  // Handle confirm attendance
  const handleConfirmAttendance = async (recordId: number, studentName: string) => {
    setActionLoading(prev => ({ ...prev, [recordId]: true }));
    
    try {
      await confirmAttendance(recordId, {
        notes: `Confirmed by teacher - ${dayjs().format("HH:mm DD/MM/YYYY")}`
      });
      
      message.success(`Confirmed ${studentName} as present`);
      await refetchData();
    } catch (err: any) {
      console.error("Failed to confirm attendance:", err);
      message.error(err?.response?.data?.detail || "Could not confirm attendance");
    } finally {
      setActionLoading(prev => ({ ...prev, [recordId]: false }));
    }
  };

  // Handle reject attendance
  const handleRejectAttendance = (recordId: number, studentName: string) => {
    Modal.confirm({
      title: "Reject Attendance",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to mark ${studentName} as absent?`,
      okText: "Confirm",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        setActionLoading(prev => ({ ...prev, [recordId]: true }));
        
        try {
          await rejectAttendance(recordId, {
            notes: `Rejected by teacher - AI recognition incorrect`
          });
          
          message.success(`Marked ${studentName} as absent`);
          await refetchData();
        } catch (err: any) {
          console.error("Failed to reject attendance:", err);
          message.error(err?.response?.data?.detail || "Could not reject attendance");
        } finally {
          setActionLoading(prev => ({ ...prev, [recordId]: false }));
        }
      }
    });
  };

  // Handle confirm all pending
  const handleConfirmAllPending = () => {
    if (!sessionId || !sessionData) return;
    
    const pendingCount = sessionData.statistics.pending_count || 0;
    
    if (pendingCount === 0) {
      message.info("No students pending confirmation");
      return;
    }
    
    Modal.confirm({
      title: "Confirm All",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to confirm all ${pendingCount} pending students as present?`,
      okText: "Confirm All",
      cancelText: "Cancel",
      onOk: async () => {
        setConfirmingAll(true);
        
        try {
          await confirmAllPending(parseInt(sessionId));
          message.success(`Confirmed all ${pendingCount} students`);
          await refetchData();
        } catch (err: any) {
          console.error("Failed to confirm all pending:", err);
          message.error(err?.response?.data?.detail || "Could not confirm all");
        } finally {
          setConfirmingAll(false);
        }
      }
    });
  };

  // Get status config
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { color: "#faad14", text: "Pending", icon: <ClockCircleOutlined /> };
      case "present":
        return { color: "#10b981", text: "Present", icon: <CheckCircleOutlined /> };
      case "absent":
        return { color: "#ef4444", text: "Absent", icon: <CloseCircleOutlined /> };
      case "excused":
        return { color: "#8b5cf6", text: "Excused", icon: <CheckCircleOutlined /> };
      default:
        return { color: "#64748b", text: "Unknown", icon: <UserOutlined /> };
    }
  };

  // Table columns
  const columns = [
    {
      title: "No.",
      key: "index",
      width: 60,
      align: "center" as const,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      title: "Student",
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
      title: "Status",
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
      title: "Check-in Time",
      dataIndex: "recorded_at",
      key: "recorded_at",
      width: 180,
      render: (time: string | null) =>
        time ? (
          <Text>{dayjs(time).format("HH:mm:ss - DD/MM/YYYY")}</Text>
        ) : (
          <Text type="secondary">Not checked in</Text>
        )
    },
    {
      title: "Face Photo",
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
                  <EyeOutlined /> View
                </div>
              )
            }}
          />
        ) : (
          <Text type="secondary">-</Text>
        )
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      render: (notes: string | null) =>
        notes ? <Text style={{ fontSize: 12 }}>{notes}</Text> : <Text type="secondary">-</Text>
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      align: "center" as const,
      render: (_, record: AttendanceRecord) => {
        // Only show actions for pending students
        if (record.status !== 'pending') {
          return <Text type="secondary">-</Text>;
        }

        const isLoading = actionLoading[record.id] || false;

        return (
          <Space size="small">
            <Tooltip title="Confirm present">
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
            <Tooltip title="Mark absent">
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
    }
  ];

  // Handle export Excel
  const handleExportExcel = async () => {
    if (!sessionData) {
      message.error("No data to export");
      return;
    }

    setExporting(true);
    const loadingMsg = message.loading("Creating Excel file...", 0);

    try {
      // Small delay for UI to render loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      const { session, records, statistics } = sessionData;

      // Create Excel data
      const excelData = [
        // Session header info
        ["ATTENDANCE SHEET"],
        [`Session: ${session.session_name || `Session #${session.id}`}`],
        [`Time: ${dayjs(session.start_time).format("HH:mm - DD/MM/YYYY")}`],
        [`Location: ${session.location || "Not specified"}`],
        [],
        // Statistics
        ["STATISTICS"],
        [`Total Students: ${statistics.total_students}`],
        [`Present: ${statistics.present_count}`],
        [`Pending: ${statistics.pending_count || 0}`],
        [`Absent: ${statistics.absent_count}`],
        [`Excused: ${statistics.excused_count}`],
        [`Rate: ${statistics.attendance_rate.toFixed(2)}%`],
        [],
        // Table header
        ["No.", "Student ID", "Full Name", "Status", "Time", "Notes"]
      ];

      // Add student data
      records.forEach((record, index) => {
        excelData.push([
          (index + 1).toString(),
          record.student_code,
          record.student_name,
          getStatusConfig(record.status).text,
          record.recorded_at ? dayjs(record.recorded_at).format("HH:mm:ss - DD/MM/YYYY") : "Not checked in",
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
      message.success("Excel exported successfully!", 2);
    } catch (error) {
      loadingMsg(); // Close loading message
      console.error("Export Excel error:", error);
      message.error("Error exporting Excel");
    } finally {
      setExporting(false);
    }
  };

  // Breadcrumb
  const breadcrumbItems = [
    { title: "Dashboard", href: "/teacher" },
    { title: "Class Management", href: "/teacher/classes" },
    { title: "Attendance Session Details" }
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
        <Spin size="large" tip="Loading attendance session details..." />
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
            description={error || "Data not found"}
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
              Go Back
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
          📋 {session.session_name || `Attendance Session #${session.id}`}
        </Title>

        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label={<><CalendarOutlined /> Start Time</>}>
            {dayjs(session.start_time).format("HH:mm - DD/MM/YYYY")}
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> End Time</>}>
            {session.end_time
              ? dayjs(session.end_time).format("HH:mm - DD/MM/YYYY")
              : "Ongoing"}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={session.status === "finished" ? "success" : "processing"}>
              {session.status === "finished" ? "Finished" : "Ongoing"}
            </Tag>
          </Descriptions.Item>
          {session.location && (
            <Descriptions.Item label={<><EnvironmentOutlined /> Location</>} span={2}>
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
              title="Total Students"
              value={statistics.total_students}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#2563eb" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Present"
              value={statistics.present_count}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#10b981" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Pending"
              value={statistics.pending_count || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Absent"
              value={statistics.absent_count}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: "#ef4444" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Excused"
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
              Attendance Rate
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
              <span>Spoof Detections</span>
              {spoofDetections.length > 0 && (
                <Tag color="error">{spoofDetections.length} detected</Tag>
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
              <Spin tip="Loading spoof detections..." />
            </div>
          ) : spoofDetections.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: "#10b981" }}>
                  <CheckCircleOutlined style={{ marginRight: 8 }} />
                  No spoofing attempts detected in this session
                </span>
              }
            />
          ) : (
            <div>
              <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                The following faces were detected as potential spoofing attempts (photos, masks, or other fake faces).
                These were not counted as valid attendance.
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
                                  <EyeOutlined /> View
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
                            <Text type="secondary">No image</Text>
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
                                Confidence: {(spoof.spoofing_confidence * 100).toFixed(1)}%
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
        title="📊 Detailed Attendance List"
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
                Confirm All ({sessionData.statistics.pending_count})
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
    </div>
  );
};

export default SessionDetailPage;
