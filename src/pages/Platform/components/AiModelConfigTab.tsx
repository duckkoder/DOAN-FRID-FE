import React, { useMemo } from "react";
import { Button, Form, Input, InputNumber, Popover, Switch, Tag } from "antd";
import type { FormInstance } from "antd";
import { FiCheckCircle, FiCpu, FiHelpCircle, FiRefreshCw, FiSave, FiSettings, FiSliders } from "react-icons/fi";

import type { PlatformEnvConfigItem } from "@/apis/platformAPIs/platform";

const aiModelHelp: Record<string, { title: string; summary: string; tips: string[] }> = {
  AI_CONFIDENCE_THRESHOLD: {
    title: "Ngưỡng xác nhận AI",
    summary: "Điểm tin cậy trung bình tối thiểu để hệ thống tự xác nhận sinh viên có mặt. Dưới ngưỡng này, bản ghi sẽ chuyển sang trạng thái cần giáo viên xác nhận.",
    tips: ["0.70 là mức cân bằng thường dùng.", "Tăng lên 0.80-0.90 để giảm nhận nhầm, nhưng sẽ có nhiều bản ghi chờ duyệt hơn.", "Giảm dưới 0.70 chỉ nên dùng khi camera và ánh sáng ổn định."],
  },
  FACE_VERIFICATION_FPS: {
    title: "FPS xử lý",
    summary: "Số frame mỗi giây gửi vào luồng xác thực khuôn mặt. FPS cao phản hồi nhanh hơn nhưng tốn tài nguyên AI service và băng thông hơn.",
    tips: ["8-12 FPS phù hợp cho lớp học thông thường.", "Giảm FPS nếu máy AI service yếu hoặc nhiều lớp điểm danh cùng lúc.", "Tăng FPS khi cần bắt chuyển động nhanh và mạng ổn định."],
  },
  FACE_VERIFICATION_JPEG_QUALITY: {
    title: "Chất lượng JPEG",
    summary: "Mức nén ảnh gửi sang AI service. Giá trị cao giữ chi tiết khuôn mặt tốt hơn nhưng file lớn hơn.",
    tips: ["80 là mức cân bằng.", "70-75 phù hợp khi mạng yếu.", "85-90 phù hợp khi cần ảnh rõ hơn, đổi lại upload nặng hơn."],
  },
  FACE_VERIFICATION_TIMEOUT: {
    title: "Timeout phiên xác thực",
    summary: "Thời gian tối đa một phiên xác thực khuôn mặt được phép chạy trước khi hệ thống coi là hết hạn.",
    tips: ["300 giây tương đương 5 phút.", "Tăng khi lớp đông hoặc quy trình điểm danh chậm.", "Giảm khi muốn giải phóng session AI nhanh hơn."],
  },
  FACE_VERIFICATION_MIN_FACE_WIDTH: {
    title: "Kích thước mặt tối thiểu",
    summary: "Chiều rộng khuôn mặt tối thiểu trong frame để frame được chấp nhận. Giá trị cao buộc khuôn mặt gần và rõ hơn.",
    tips: ["200px giúp giảm ảnh mặt quá xa hoặc mờ.", "Giảm nếu camera đặt xa.", "Tăng nếu hay bị nhận sai do mặt quá nhỏ."],
  },
  FACE_VERIFICATION_FRAME_WIDTH: {
    title: "Chiều rộng frame",
    summary: "Chiều rộng khung hình dùng khi xử lý xác thực. Kích thước cao tăng chi tiết nhưng cũng tăng tải xử lý.",
    tips: ["640 là mức phổ biến cho realtime.", "Tăng nếu camera tốt và AI service đủ mạnh.", "Giảm nếu bị lag hoặc mạng yếu."],
  },
  FACE_VERIFICATION_FRAME_HEIGHT: {
    title: "Chiều cao frame",
    summary: "Chiều cao khung hình dùng khi xử lý xác thực, thường đi cùng frame width để giữ tỉ lệ hợp lý.",
    tips: ["480 đi cùng width 640 là cấu hình 4:3 ổn định.", "Không nên tăng riêng chiều cao quá nhiều nếu không cần.", "Giữ đồng bộ với camera để tránh crop hoặc scale xấu."],
  },
  ATTENDANCE_ALLOW_CREATE_ANYTIME: {
    title: "Cho tạo điểm danh ngoài lịch",
    summary: "Cho phép giáo viên tạo phiên điểm danh dù hiện tại không nằm trong khung lịch lớp. Đây là tùy chọn vận hành, không phải thông số nhận diện.",
    tips: ["Tắt để hệ thống bám lịch học chặt hơn.", "Bật khi trường hay có học bù, đổi tiết hoặc lịch thực tế linh hoạt.", "Nếu bật, nên audit thao tác tạo phiên để tránh lạm dụng."],
  },
  ATTENDANCE_CREATE_WINDOW_GRACE_MINUTES: {
    title: "Khoảng nới lịch điểm danh",
    summary: "Số phút nới thêm trước hoặc sau khung lịch khi kiểm tra quyền tạo phiên điểm danh.",
    tips: ["5-10 phút phù hợp nếu giáo viên thường mở phiên sớm hoặc muộn.", "Để 0 nếu muốn đúng lịch tuyệt đối.", "Không nên đặt quá cao nếu không bật học linh hoạt."],
  },
};

type AiModelConfigTabProps = {
  aiModelConfig: PlatformEnvConfigItem[];
  form: FormInstance<Record<string, string | number | boolean | null>>;
  loading: boolean;
  saving: boolean;
  onReload: () => void;
  onSave: (values: Record<string, string | number | boolean | null>) => void;
};

const groupLabel: Record<string, string> = {
  Model: "Nhận diện khuôn mặt",
  Attendance: "Luồng điểm danh",
};

const renderInput = (item: PlatformEnvConfigItem) => {
  if (item.value_type === "bool") return <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />;
  if (item.value_type === "int") return <InputNumber min={0} controls style={{ width: "100%" }} />;
  if (item.value_type === "float") {
    return (
      <InputNumber
        min={item.key === "AI_CONFIDENCE_THRESHOLD" ? 0 : undefined}
        max={item.key === "AI_CONFIDENCE_THRESHOLD" ? 1 : undefined}
        step={0.01}
        controls
        style={{ width: "100%" }}
      />
    );
  }
  return <Input />;
};

const AiModelConfigTab: React.FC<AiModelConfigTabProps> = ({ aiModelConfig, form, loading, saving, onReload, onSave }) => {
  const groups = useMemo(() => (
    aiModelConfig.reduce<Record<string, PlatformEnvConfigItem[]>>((acc, item) => {
      acc[item.group] = [...(acc[item.group] || []), item];
      return acc;
    }, {})
  ), [aiModelConfig]);

  const configuredCount = aiModelConfig.filter(item => item.configured).length;

  return (
    <div className="platform-ai-page">
      <section className="platform-ai-hero">
        <div className="platform-ai-hero-icon"><FiCpu /></div>
        <div className="platform-ai-hero-copy">
          <Tag color="blue">Model tuning</Tag>
          <h2>Cấu hình model AI</h2>
          <p>Chỉnh ngưỡng nhận diện, chất lượng ảnh, kích thước frame và luật tạo phiên để phù hợp camera, mạng và cách vận hành của trường.</p>
        </div>
        <Button icon={<FiRefreshCw />} onClick={onReload} loading={loading}>
          Tải lại
        </Button>
      </section>

      <div className="platform-ai-metrics">
        <div>
          <FiSliders />
          <strong>{aiModelConfig.length}</strong>
          <span>Thông số</span>
        </div>
        <div>
          <FiCheckCircle />
          <strong>{configuredCount}</strong>
          <span>Đã cấu hình</span>
        </div>
        <div>
          <FiSettings />
          <strong>{Object.keys(groups).length}</strong>
          <span>Nhóm config</span>
        </div>
      </div>

      <div className="platform-table-card platform-ai-config-card">
        <div className="platform-ai-card-head">
          <div>
            <h2>Thông số vận hành</h2>
            <p>Không chỉnh secret, token hay URL ở đây. Chỉ lưu các tham số tuning an toàn cho model.</p>
          </div>
          <Button type="primary" icon={<FiSave />} loading={saving} onClick={() => form.submit()}>
            Lưu config
          </Button>
        </div>

        <Form form={form} layout="vertical" onFinish={onSave} className="platform-env-config-form">
          {Object.entries(groups).map(([group, items]) => (
            <section className="platform-env-group" key={group}>
              <div className="platform-env-group-head">
                <span>{groupLabel[group] || group}</span>
                <small>{items.length} biến</small>
              </div>

              <div className="platform-env-list">
                {items.map(item => {
                  const help = aiModelHelp[item.key];
                  return (
                    <div className="platform-env-row" key={item.key}>
                      <div className="platform-env-meta">
                        <div className="platform-env-title-line">
                          <strong>{help?.title || item.label}</strong>
                          <Popover
                            placement="left"
                            title={help?.title || item.label}
                            content={
                              <div className="platform-env-help">
                                <p>{help?.summary || item.description}</p>
                                {help?.tips?.map(tip => <div key={tip}>• {tip}</div>)}
                              </div>
                            }
                          >
                            <button className="platform-env-help-button" type="button" aria-label={`Giải thích ${item.key}`}>
                              <FiHelpCircle />
                            </button>
                          </Popover>
                        </div>
                        <code>{item.key}</code>
                        <p>{help?.summary || item.description}</p>
                      </div>

                      <Form.Item name={item.key} valuePropName={item.value_type === "bool" ? "checked" : "value"} style={{ marginBottom: 0 }}>
                        {renderInput(item)}
                      </Form.Item>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </Form>
      </div>
    </div>
  );
};

export default AiModelConfigTab;
