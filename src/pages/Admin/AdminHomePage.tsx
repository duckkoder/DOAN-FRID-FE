import React, { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  BankOutlined,
  BookOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { getClassesStats } from "@/apis/classesAPIs/adminClass";
import { getPublicTenant, type PublicTenant } from "@/apis/platformAPIs/platform";
import { getStudentsList } from "@/apis/studentAPIs/student";
import { getTeachersList } from "@/apis/teacherAPIs/teacher";
import { useAuth } from "@/hooks/useAuth";

const { Title, Text } = Typography;

type StatItem = {
  title: string;
  value: number;
  color: string;
  icon: ReactNode;
  suffix?: string;
};

const AdminHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<PublicTenant | null>(null);
  const [stats, setStats] = useState<StatItem[]>([
    { title: "Giáo viên", value: 0, color: "#2563eb", icon: <UserOutlined /> },
    { title: "Sinh viên", value: 0, color: "#10b981", icon: <TeamOutlined /> },
    { title: "Lớp học", value: 0, color: "#f59e0b", icon: <BookOutlined /> },
  ]);

  const tenantSlug = useMemo(() => localStorage.getItem("tenantSlug") || "", []);
  const schoolName = tenant?.name || tenantSlug || "Trường học";
  const schoolCode = tenant?.school_code || tenantSlug || "tenant";
  const totalUsers = (stats[0]?.value || 0) + (stats[1]?.value || 0);
  const totalClasses = stats[2]?.value || 0;
  const averageClassSize = totalClasses > 0 ? Math.round((stats[1]?.value || 0) / totalClasses) : 0;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);

        const tenantPromise = tenantSlug ? getPublicTenant(tenantSlug).catch(() => null) : Promise.resolve(null);
        const [tenantResponse, teachersResponse, studentsResponse, classesResponse] = await Promise.all([
          tenantPromise,
          getTeachersList({ page: 1, limit: 1 }),
          getStudentsList({ page: 1, limit: 1 }),
          getClassesStats(),
        ]);

        setTenant(tenantResponse);
        setStats([
          {
            title: "Giáo viên",
            value: teachersResponse.stats.total,
            color: "#2563eb",
            icon: <UserOutlined />,
          },
          {
            title: "Sinh viên",
            value: studentsResponse.stats.total,
            color: "#10b981",
            icon: <TeamOutlined />,
          },
          {
            title: "Lớp học",
            value: classesResponse.data.total,
            color: "#f59e0b",
            icon: <BookOutlined />,
          },
        ]);
      } catch (error: any) {
        console.error("Error fetching admin dashboard:", error);
        message.error(error?.response?.data?.detail || "Không thể tải thống kê hệ thống");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [message, tenantSlug]);

  const pageHeaderStyle: React.CSSProperties = {
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

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: 16,
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)",
        padding: "32px 48px",
      }}
    >
      <Row align="middle" justify="space-between" gutter={[18, 18]} style={pageHeaderStyle}>
        <Col xs={24} lg={16}>
          <Space align="center" size={16}>
            <div style={headerIconStyle}>
              <BankOutlined style={{ fontSize: 28, color: "#2563eb" }} />
            </div>
            <div>
              <Title level={1} style={headerTitleStyle}>
                Trang chủ Admin
              </Title>
              <Text style={headerSubtitleStyle}>
                Điều phối dữ liệu, tài khoản và cấu hình vận hành cho {schoolName}
              </Text>
              <Space wrap size={8} style={{ marginTop: 10 }}>
                <Tag color="blue" style={{ borderRadius: 999, padding: "2px 10px" }}>
                  {schoolCode}
                </Tag>
                <Tag color={tenant?.status === "active" ? "green" : "default"} style={{ borderRadius: 999, padding: "2px 10px" }}>
                  {tenant?.status === "active" ? "Đang hoạt động" : "Tenant admin"}
                </Tag>
              </Space>
            </div>
          </Space>
        </Col>
        <Col xs={24} lg={8} style={{ textAlign: "right" }}>
          <Text style={{ color: "#64748b", display: "block" }}>Quản trị viên</Text>
          <Text strong style={{ color: "#0f172a", fontSize: 18 }}>
            {user?.full_name || "Admin"}
          </Text>
        </Col>
      </Row>

      <Card style={{ ...cardStyle, marginBottom: 24, background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)" }}>
        <Row gutter={[20, 20]} align="middle">
          <Col xs={24} lg={10}>
            <Space direction="vertical" size={4}>
              <Text style={{ color: "#64748b", fontWeight: 600 }}>Trường đang quản lý</Text>
              <Title level={3} style={{ margin: 0, color: "#0f172a" }}>
                {schoolName}
              </Title>
              <Text style={{ color: "#64748b" }}>
                Theo dõi nhân sự, sinh viên, lớp học và cấu hình AI của tenant.
              </Text>
            </Space>
          </Col>
          <Col xs={24} sm={8} lg={4}>
            <Statistic title="Tài khoản" value={totalUsers} prefix={<TeamOutlined />} valueStyle={{ color: "#2563eb", fontWeight: 800 }} />
          </Col>
          <Col xs={24} sm={8} lg={4}>
            <Statistic title="Sĩ số TB/lớp" value={averageClassSize} suffix="SV" prefix={<BookOutlined />} valueStyle={{ color: "#10b981", fontWeight: 800 }} />
          </Col>
          <Col xs={24} sm={8} lg={6}>
            <Text style={{ color: "#64748b", fontWeight: 600 }}>Mức sẵn sàng dữ liệu</Text>
            <Progress
              percent={Math.min(100, Math.round(((stats[0]?.value || 0) > 0 ? 35 : 0) + ((stats[1]?.value || 0) > 0 ? 35 : 0) + (totalClasses > 0 ? 30 : 0)))}
              strokeColor="#2563eb"
              trailColor="#dbeafe"
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        {loading ? (
          <Col span={24}>
            <Card style={cardStyle}>
              <div style={{ textAlign: "center", padding: "42px 0" }}>
                <Spin size="large" tip="Đang tải thống kê..." />
              </div>
            </Card>
          </Col>
        ) : (
          stats.map((item) => (
            <Col xs={24} sm={12} lg={8} key={item.title}>
              <Card hoverable style={{ ...cardStyle, background: "#fff" }}>
                <Space align="center" size={16}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `${item.color}18`,
                      color: item.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}
                  >
                    {item.icon}
                  </div>
                  <Statistic
                    title={<Text style={{ color: "#64748b", fontWeight: 600 }}>{item.title}</Text>}
                    value={item.value}
                    valueStyle={{ color: item.color, fontWeight: 800, fontSize: 30 }}
                    suffix={item.suffix}
                  />
                </Space>
              </Card>
            </Col>
          ))
        )}
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title="Thao tác nhanh" style={cardStyle}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <Button block type="primary" size="large" icon={<UserAddOutlined />} style={{ borderRadius: 10, height: 48 }} onClick={() => navigate("/admin/teachers")}>
                  Thêm giáo viên
                </Button>
              </Col>
              <Col xs={24} sm={12}>
                <Button block size="large" icon={<TeamOutlined />} style={{ borderRadius: 10, height: 48 }} onClick={() => navigate("/admin/students")}>
                  Thêm sinh viên
                </Button>
              </Col>
              <Col xs={24} sm={12}>
                <Button block size="large" icon={<BookOutlined />} style={{ borderRadius: 10, height: 48 }} onClick={() => navigate("/admin/classes")}>
                  Quản lý lớp học
                </Button>
              </Col>
              <Col xs={24} sm={12}>
                <Button block size="large" icon={<SettingOutlined />} style={{ borderRadius: 10, height: 48 }} onClick={() => navigate("/admin/settings")}>
                  Cấu hình tích hợp
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Trạng thái vận hành" style={cardStyle}>
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <Space>
                <CheckCircleOutlined style={{ color: "#10b981" }} />
                <Text>Tenant đang sẵn sàng cho quản lý dữ liệu học vụ</Text>
              </Space>
              <Space>
                <SafetyCertificateOutlined style={{ color: "#2563eb" }} />
                <Text>Phân quyền admin, giáo viên, sinh viên đang hoạt động</Text>
              </Space>
              <Space>
                <SettingOutlined style={{ color: "#f59e0b" }} />
                <Text>Cấu hình AI có thể điều chỉnh trong mục tích hợp</Text>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminHomePage;
