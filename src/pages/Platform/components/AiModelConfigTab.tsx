import React, { useMemo } from "react";
import { Button, Form, Input, InputNumber, Popover, Switch, Tag } from "antd";
import type { FormInstance } from "antd";
import { FiCheckCircle, FiCpu, FiHelpCircle, FiRefreshCw, FiSave, FiSettings, FiSliders } from "react-icons/fi";

import type { PlatformEnvConfigItem } from "@/apis/platformAPIs/platform";

const aiModelHelp: Record<string, { title: string; summary: string; tips: string[] }> = {
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
        min={0}
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
