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
  Tooltip
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
  ExclamationCircleOutlined
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import {
  getSessionAttendance,
  confirmAttendance,
  rejectAttendance,
  confirmAllPending,
  type SessionAttendanceResponse,
  type AttendanceRecord
} from "../../apis/attendanceAPIs/attendanceAPIs";

const { Title, Text } = Typography;

const SessionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [sessionData, setSessionData] = useState<SessionAttendanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});
  const [confirmingAll, setConfirmingAll] = useState<boolean>(false);

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
        notes: `Xác nhận bởi giáo viên - ${dayjs().format("HH:mm DD/MM/YYYY")}`
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

  // Handle reject attendance
  const handleRejectAttendance = (recordId: number, studentName: string) => {
    Modal.confirm({
      title: "Từ chối điểm danh",
      icon: <ExclamationCircleOutlined />,
      content: `Bạn có chắc muốn đánh dấu ${studentName} là vắng không?`,
      okText: "Xác nhận",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        setActionLoading(prev => ({ ...prev, [recordId]: true }));
        
        try {
          await rejectAttendance(recordId, {
            notes: `Từ chối bởi giáo viên - AI nhận diện không chính xác`
          });
          
          message.success(`Đã đánh dấu ${studentName} vắng`);
          await refetchData();
        } catch (err: any) {
          console.error("Failed to reject attendance:", err);
          message.error(err?.response?.data?.detail || "Không thể từ chối điểm danh");
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
      message.info("Không có sinh viên nào đang chờ xác nhận");
      return;
    }
    
    Modal.confirm({
      title: "Xác nhận tất cả",
      icon: <ExclamationCircleOutlined />,
      content: `Bạn có chắc muốn xác nhận tất cả ${pendingCount} sinh viên đang chờ là có mặt không?`,
      okText: "Xác nhận tất cả",
      cancelText: "Hủy",
      onOk: async () => {
        setConfirmingAll(true);
        
        try {
          await confirmAllPending(parseInt(sessionId));
          message.success(`Đã xác nhận tất cả ${pendingCount} sinh viên`);
          await refetchData();
        } catch (err: any) {
          console.error("Failed to confirm all pending:", err);
          message.error(err?.response?.data?.detail || "Không thể xác nhận tất cả");
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
        return { color: "#faad14", text: "Chờ xác nhận", icon: <ClockCircleOutlined /> };
      case "present":
        return { color: "#10b981", text: "Có mặt", icon: <CheckCircleOutlined /> };
      case "absent":
        return { color: "#ef4444", text: "Vắng", icon: <CloseCircleOutlined /> };
      case "excused":
        return { color: "#8b5cf6", text: "Có phép", icon: <CheckCircleOutlined /> };
      default:
        return { color: "#64748b", text: "Không xác định", icon: <UserOutlined /> };
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
      title: "Thời gian điểm danh",
      dataIndex: "recorded_at",
      key: "recorded_at",
      width: 180,
      render: (time: string | null) =>
        time ? (
          <Text>{dayjs(time).format("HH:mm:ss - DD/MM/YYYY")}</Text>
        ) : (
          <Text type="secondary">Chưa điểm danh</Text>
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
      width: 150,
      align: "center" as const,
      render: (_, record: AttendanceRecord) => {
        // Chỉ hiển thị actions cho sinh viên pending
        if (record.status !== 'pending') {
          return <Text type="secondary">-</Text>;
        }

        const isLoading = actionLoading[record.id] || false;

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
            <Tooltip title="Đánh dấu vắng">
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
      message.error("Không có dữ liệu để xuất");
      return;
    }

    setExporting(true);
    const loadingMsg = message.loading("Đang tạo file Excel...", 0);

    try {
      // Delay nhỏ để UI kịp render loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      const { session, records, statistics } = sessionData;

      // Tạo dữ liệu cho Excel
      const excelData = [
        // Header thông tin phiên
        ["BẢNG ĐIỂM DANH"],
        [`Phiên: ${session.session_name || `Phiên #${session.id}`}`],
        [`Thời gian: ${dayjs(session.start_time).format("HH:mm - DD/MM/YYYY")}`],
        [`Địa điểm: ${session.location || "Không xác định"}`],
        [],
        // Thống kê
        ["THỐNG KÊ"],
        [`Tổng sinh viên: ${statistics.total_students}`],
        [`Có mặt: ${statistics.present_count}`],
        [`Chờ xác nhận: ${statistics.pending_count || 0}`],
        [`Vắng: ${statistics.absent_count}`],
        [`Có phép: ${statistics.excused_count}`],
        [`Tỷ lệ: ${statistics.attendance_rate.toFixed(2)}%`],
        [],
        // Header bảng
        ["STT", "Mã sinh viên", "Họ và tên", "Trạng thái", "Thời gian", "Ghi chú"]
      ];

      // Thêm dữ liệu sinh viên
      records.forEach((record, index) => {
        excelData.push([
          (index + 1).toString(),
          record.student_code,
          record.student_name,
          getStatusConfig(record.status).text,
          record.recorded_at ? dayjs(record.recorded_at).format("HH:mm:ss - DD/MM/YYYY") : "Chưa điểm danh",
          record.notes || "-"
        ]);
      });

      // Tạo workbook và worksheet
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Điểm danh");

      // Styling (optional - set column widths)
      ws["!cols"] = [
        { wch: 5 },  // STT
        { wch: 15 }, // Mã SV
        { wch: 25 }, // Tên
        { wch: 12 }, // Trạng thái
        { wch: 20 }, // Thời gian
        { wch: 35 }  // Ghi chú
      ];

      // Xuất file
      const fileName = `DiemDanh_${session.id}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;
      XLSX.writeFile(wb, fileName);

      loadingMsg(); // Tắt loading message
      message.success("Xuất Excel thành công!", 2);
    } catch (error) {
      loadingMsg(); // Tắt loading message
      console.error("Export Excel error:", error);
      message.error("Có lỗi khi xuất Excel");
    } finally {
      setExporting(false);
    }
  };

  // Breadcrumb
  const breadcrumbItems = [
    { title: "Dashboard", href: "/teacher" },
    { title: "Quản lý lớp học", href: "/teacher/classes" },
    { title: "Chi tiết phiên điểm danh" }
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
            <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
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
            onClick={() => navigate(-1)}
            size="large"
          >
            Quay lại
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
          📋 {session.session_name || `Phiên điểm danh #${session.id}`}
        </Title>

        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label={<><CalendarOutlined /> Thời gian bắt đầu</>}>
            {dayjs(session.start_time).format("HH:mm - DD/MM/YYYY")}
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> Thời gian kết thúc</>}>
            {session.end_time
              ? dayjs(session.end_time).format("HH:mm - DD/MM/YYYY")
              : "Đang diễn ra"}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={session.status === "finished" ? "success" : "processing"}>
              {session.status === "finished" ? "Đã kết thúc" : "Đang diễn ra"}
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
              title="Chờ xác nhận"
              value={statistics.pending_count || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Vắng"
              value={statistics.absent_count}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: "#ef4444" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4.8}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <Statistic
              title="Có phép"
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

      {/* Attendance Table */}
      <Card
        title="📊 Danh sách điểm danh chi tiết"
        style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
        extra={
          <Space>
            {/* Hiển thị nút "Xác nhận tất cả" nếu có sinh viên pending */}
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
                Xác nhận tất cả ({sessionData.statistics.pending_count})
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
              {exporting ? "Đang xuất..." : "Xuất Excel"}
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
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} sinh viên`,
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
