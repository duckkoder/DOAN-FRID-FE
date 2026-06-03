import React, { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  KeyOutlined,
  LockOutlined,
  MailOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SyncOutlined,
} from "@ant-design/icons";

import {
  deleteTenantSecret,
  listTenantSecrets,
  listTenantSettings,
  upsertTenantSetting,
  upsertTenantSecret,
  type TenantSetting,
  type TenantSecret,
} from "@/apis/tenantSettingsAPIs/tenantSettings";
import Breadcrumb from "@/components/Breadcrumb";

const { Paragraph, Text, Title } = Typography;

const GEMINI_KEY = "gemini_api_key";
const TEACHER_EMAIL_DOMAIN_KEY = "teacher_email_domain";
const STUDENT_EMAIL_DOMAIN_KEY = "student_email_domain";

const getSettingValueFromList = (settings: TenantSetting[], keyName: string, fallback: string) =>
  settings.find((setting) => setting.key_name === keyName)?.value || fallback;

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "32px 48px",
  background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)",
};

const panelStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 16,
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
};

const statCardStyle: React.CSSProperties = {
  ...panelStyle,
  height: "100%",
};

const headerIconStyle: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 16,
  background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.16)",
};

const iconBoxStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#e0f2fe",
  color: "#1d4ed8",
  fontSize: 20,
};

const AdminTenantSettingsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<{ gemini_api_key: string }>();
  const [emailForm] = Form.useForm<{ teacher_email_domain: string; student_email_domain: string }>();
  const [secrets, setSecrets] = useState<TenantSecret[]>([]);
  const [settings, setSettings] = useState<TenantSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const geminiSecret = useMemo(
    () => secrets.find((secret) => secret.key_name === GEMINI_KEY),
    [secrets],
  );

  const isConfigured = Boolean(geminiSecret);
  const getSettingValue = (keyName: string, fallback: string) =>
    settings.find((setting) => setting.key_name === keyName)?.value || fallback;
  const teacherEmailDomain = getSettingValue(TEACHER_EMAIL_DOMAIN_KEY, "dut.udn.vn");
  const studentEmailDomain = getSettingValue(STUDENT_EMAIL_DOMAIN_KEY, "sv1.dut.udn.vn");
  const updatedAt = geminiSecret?.updated_at
    ? new Date(geminiSecret.updated_at).toLocaleString("vi-VN")
    : "Chưa có dữ liệu";

  const breadcrumbItems = [
    { title: "Trang chủ", href: "/admin" },
    { title: "Cấu hình tích hợp" },
  ];

  const fetchSecrets = async () => {
    try {
      setLoading(true);
      const [secretData, settingData] = await Promise.all([
        listTenantSecrets(),
        listTenantSettings(),
      ]);
      setSecrets(secretData.secrets);
      setSettings(settingData.settings);
      emailForm.setFieldsValue({
        teacher_email_domain: getSettingValueFromList(settingData.settings, TEACHER_EMAIL_DOMAIN_KEY, "dut.udn.vn"),
        student_email_domain: getSettingValueFromList(settingData.settings, STUDENT_EMAIL_DOMAIN_KEY, "sv1.dut.udn.vn"),
      });
    } catch {
      message.error("Không thể tải cấu hình");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSecrets();
  }, []);

  const handleSaveEmailSettings = async (values: { teacher_email_domain: string; student_email_domain: string }) => {
    try {
      setEmailSaving(true);
      await Promise.all([
        upsertTenantSetting(TEACHER_EMAIL_DOMAIN_KEY, values.teacher_email_domain.trim()),
        upsertTenantSetting(STUDENT_EMAIL_DOMAIN_KEY, values.student_email_domain.trim()),
      ]);
      message.success("Đã lưu định dạng email");
      await fetchSecrets();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Không thể lưu định dạng email");
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSave = async (values: { gemini_api_key: string }) => {
    try {
      setSaving(true);
      await upsertTenantSecret(GEMINI_KEY, values.gemini_api_key.trim());
      form.resetFields();
      message.success("Đã lưu khóa truy cập");
      await fetchSecrets();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Không thể lưu khóa truy cập");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    modal.confirm({
      title: "Xóa khóa truy cập?",
      content:
        "Sau khi xóa, các tính năng AI cần khóa Gemini sẽ tạm dừng cho đến khi lưu khóa mới.",
      okText: "Xóa khóa",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      onOk: async () => {
        try {
          setDeleting(true);
          await deleteTenantSecret(GEMINI_KEY);
          message.success("Đã xóa khóa truy cập");
          await fetchSecrets();
        } catch (err) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          message.error(detail || "Không thể xóa khóa truy cập");
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  return (
    <div style={pageStyle}>
      <Breadcrumb items={breadcrumbItems} />

      <Space direction="vertical" size={24} style={{ width: "100%", marginTop: 18 }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col>
            <Space align="center" size={14}>
              <div style={headerIconStyle}>
                <RobotOutlined style={{ fontSize: 26, color: "#2563eb" }} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0, color: "#1d4ed8", fontWeight: 800 }}>
                  Cấu hình tích hợp
                </Title>
                <Text type="secondary" style={{ fontSize: 15 }}>
                  Thiết lập khóa truy cập cho các tính năng AI của trường
                </Text>
              </div>
            </Space>
          </Col>

          <Col>
            <Button
              icon={<SyncOutlined />}
              onClick={fetchSecrets}
              loading={loading}
              size="large"
              style={{ borderRadius: 8 }}
            >
              Làm mới
            </Button>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card style={statCardStyle}>
              <Space align="center" size={14}>
                <div style={iconBoxStyle}>
                  <KeyOutlined />
                </div>
                <div>
                  <Text type="secondary">Khóa Gemini</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={isConfigured ? "green" : "default"} style={{ margin: 0, borderRadius: 6 }}>
                      {isConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
                    </Tag>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card style={statCardStyle}>
              <Space align="center" size={14}>
                <div style={{ ...iconBoxStyle, background: "#dcfce7", color: "#059669" }}>
                  <SafetyCertificateOutlined />
                </div>
                <div>
                  <Text type="secondary">Dữ liệu riêng</Text>
                  <Title level={5} style={{ margin: "2px 0 0", color: "#0f172a" }}>
                    Theo từng trường
                  </Title>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card style={statCardStyle}>
              <Space align="center" size={14}>
                <div style={{ ...iconBoxStyle, background: "#fef3c7", color: "#d97706" }}>
                  <RobotOutlined />
                </div>
                <div>
                  <Text type="secondary">Trợ lý AI</Text>
                  <Title level={5} style={{ margin: "2px 0 0", color: isConfigured ? "#059669" : "#92400e" }}>
                    {isConfigured ? "Sẵn sàng" : "Cần khóa truy cập"}
                  </Title>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <Card
          style={panelStyle}
          title={
            <Space size={12}>
              <div style={{ ...iconBoxStyle, width: 36, height: 36, borderRadius: 10, fontSize: 16 }}>
                <MailOutlined />
              </div>
              <span>Định dạng email tài khoản</span>
            </Space>
          }
          extra={
            <Tag color="blue" style={{ borderRadius: 6, margin: 0 }}>
              @{teacherEmailDomain} · @{studentEmailDomain}
            </Tag>
          }
        >
          <Form form={emailForm} layout="vertical" onFinish={handleSaveEmailSettings}>
            <Row gutter={[16, 12]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Tên miền email giáo viên"
                  name="teacher_email_domain"
                  rules={[{ required: true, message: "Nhập tên miền email giáo viên" }]}
                >
                  <Input
                    addonBefore="@"
                    placeholder="dut.udn.vn"
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Tên miền email sinh viên"
                  name="student_email_domain"
                  rules={[{ required: true, message: "Nhập tên miền email sinh viên" }]}
                >
                  <Input
                    addonBefore="@"
                    placeholder="sv1.dut.udn.vn"
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={emailSaving}
              size="large"
              style={{ borderRadius: 8 }}
            >
              Lưu định dạng email
            </Button>
          </Form>
        </Card>

        <Row gutter={[20, 20]} align="stretch">
          <Col xs={24} lg={15}>
            <Card
              style={panelStyle}
              title={
                <Space size={12}>
                  <div style={{ ...iconBoxStyle, width: 36, height: 36, borderRadius: 10, fontSize: 16 }}>
                    <KeyOutlined />
                  </div>
                  <span>Khóa truy cập Gemini</span>
                </Space>
              }
              extra={
                <Tag color={isConfigured ? "green" : "orange"} style={{ borderRadius: 6, margin: 0 }}>
                  {isConfigured ? "Đang hoạt động" : "Chưa có khóa"}
                </Tag>
              }
            >
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Row gutter={[16, 12]}>
                    <Col xs={24} md={12}>
                      <Text type="secondary">Mã cấu hình</Text>
                      <div style={{ marginTop: 6 }}>
                        <Text code style={{ borderRadius: 6, padding: "4px 8px" }}>
                          {GEMINI_KEY}
                        </Text>
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text type="secondary">Cập nhật lần cuối</Text>
                      <div style={{ marginTop: 6 }}>
                        <Text strong>{updatedAt}</Text>
                      </div>
                    </Col>
                  </Row>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSave}>
                  <Form.Item
                    label="Khóa Gemini mới"
                    name="gemini_api_key"
                    rules={[{ required: true, message: "Nhập khóa Gemini" }]}
                  >
                    <Input.Password
                      placeholder="AIza..."
                      autoComplete="new-password"
                      size="large"
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>

                  <Space wrap>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={saving}
                      size="large"
                      style={{ borderRadius: 8 }}
                    >
                      Lưu khóa
                    </Button>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!geminiSecret}
                      loading={deleting}
                      onClick={handleDelete}
                      size="large"
                      style={{ borderRadius: 8 }}
                    >
                      Xóa khóa
                    </Button>
                  </Space>
                </Form>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={9}>
            <Card style={{ ...panelStyle, height: "100%" }}>
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Space size={12}>
                  <div style={{ ...iconBoxStyle, width: 36, height: 36, borderRadius: 10, fontSize: 16 }}>
                    <SafetyCertificateOutlined />
                  </div>
                  <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                    Bảo mật
                  </Title>
                </Space>

                <Paragraph type="secondary" style={{ margin: 0 }}>
                  Khóa chỉ áp dụng cho trường hiện tại. Hệ thống dùng khóa này khi xử lý
                  các tính năng AI và không hiển thị lại giá trị đã lưu.
                </Paragraph>

                <Divider style={{ margin: "4px 0" }} />

                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {[
                    { icon: <LockOutlined />, title: "Lưu riêng theo trường" },
                    { icon: <CheckCircleOutlined />, title: "Không hiển thị lại khóa" },
                    { icon: <RobotOutlined />, title: "Có thể thay đổi bất cứ lúc nào" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <span style={{ color: "#2563eb", fontSize: 18 }}>{item.icon}</span>
                      <Text strong>{item.title}</Text>
                    </div>
                  ))}
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default AdminTenantSettingsPage;
