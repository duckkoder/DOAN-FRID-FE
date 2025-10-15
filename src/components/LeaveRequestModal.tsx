import React, { useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Upload,
  Button,
  Space,
  Row,
  Col,
  Typography,
  message
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text } = Typography;

interface Subject {
  value: string;
  label: string;
  teacher: string;
  schedule: Record<string, string[]>;
}

interface LeaveRequestModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  subjects: Subject[];
  preSelectedSubject?: string;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  subjects,
  preSelectedSubject
}) => {
  const [form] = Form.useForm();
  const [selectedSubject, setSelectedSubject] = useState<string>(preSelectedSubject || '');
  const [selectedDay, setSelectedDay] = useState<string>('');

  const weekDays = [
    { value: 'monday', label: 'Thứ 2' },
    { value: 'tuesday', label: 'Thứ 3' },
    { value: 'wednesday', label: 'Thứ 4' },
    { value: 'thursday', label: 'Thứ 5' },
    { value: 'friday', label: 'Thứ 6' },
    { value: 'saturday', label: 'Thứ 7' },
    { value: 'sunday', label: 'Chủ nhật' }
  ];

  React.useEffect(() => {
    if (visible && preSelectedSubject) {
      setSelectedSubject(preSelectedSubject);
      form.setFieldsValue({
        subject: preSelectedSubject
      });
    }
  }, [visible, preSelectedSubject, form]);

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setSelectedDay('');
    form.setFieldsValue({ 
      dayOfWeek: undefined,
      timeSlot: undefined,
      date: undefined
    });
  };

  const handleDayChange = (value: string) => {
    setSelectedDay(value);
    form.setFieldsValue({ 
      timeSlot: undefined,
      date: undefined
    });
  };

  // Get available days for selected subject
  const getAvailableDays = () => {
    if (!selectedSubject) return [];
    const subject = subjects.find(s => s.value === selectedSubject);
    if (!subject) return [];
    
    return Object.keys(subject.schedule).map(day => {
      const weekDay = weekDays.find(w => w.value === day);
      return {
        value: day,
        label: weekDay?.label || day
      };
    });
  };

  // Get available time slots for selected subject and day
  const getAvailableTimeSlots = () => {
    if (!selectedSubject || !selectedDay) return [];
    const subject = subjects.find(s => s.value === selectedSubject);
    if (!subject) return [];
    
    return subject.schedule[selectedDay as keyof typeof subject.schedule] || [];
  };

  // Disable past dates
  const disabledDate = (current: dayjs.Dayjs) => {
    return current && current < dayjs().startOf('day');
  };

  const handleFinish = (values: any) => {
    onSubmit(values);
    handleReset();
  };

  const handleReset = () => {
    setSelectedSubject(preSelectedSubject || '');
    setSelectedDay('');
    form.resetFields();
    if (preSelectedSubject) {
      form.setFieldsValue({ subject: preSelectedSubject });
    }
  };

  const handleCancel = () => {
    onCancel();
    handleReset();
  };

  return (
    <Modal
      title="Tạo đơn xin nghỉ học"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
      style={{ borderRadius: 16 }}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        style={{ marginTop: 16 }}
        initialValues={preSelectedSubject ? { subject: preSelectedSubject } : {}}
      >
        {/* Step 1: Chọn môn học */}
        <Form.Item
          label="Chọn môn học"
          name="subject"
          rules={[{ required: true, message: "Vui lòng chọn môn học!" }]}
        >
          <Select 
            placeholder="Chọn môn học cần nghỉ" 
            size="large"
            onChange={handleSubjectChange}
            value={selectedSubject}
            optionLabelProp="label"
          >
            {subjects.map(subject => (
              <Select.Option 
                key={subject.value} 
                value={subject.value}
                label={subject.label}
              >
                <div style={{ padding: '8px 0' }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    color: '#1f2937',
                    marginBottom: 4
                  }}>
                    {subject.label}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#6b7280'
                  }}>
                    👨‍🏫 Giảng viên: {subject.teacher}
                  </div>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          {/* Step 2: Chọn thứ */}
          <Col span={12}>
            <Form.Item
              label="Chọn thứ trong tuần"
              name="dayOfWeek"
              rules={[{ required: true, message: "Vui lòng chọn thứ!" }]}
            >
              <Select 
                placeholder="Chọn thứ" 
                size="large"
                disabled={!selectedSubject}
                onChange={handleDayChange}
              >
                {getAvailableDays().map(day => (
                  <Select.Option key={day.value} value={day.value}>
                    {day.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          {/* Step 3: Chọn khung giờ */}
          <Col span={12}>
            <Form.Item
              label="Chọn khung giờ"
              name="timeSlot"
              rules={[{ required: true, message: "Vui lòng chọn khung giờ!" }]}
            >
              <Select 
                placeholder="Chọn khung giờ" 
                size="large"
                disabled={!selectedSubject || !selectedDay}
              >
                {getAvailableTimeSlots().map((slot, index) => (
                  <Select.Option key={index} value={slot}>
                    {slot}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Step 4: Chọn ngày cụ thể */}
        <Form.Item
          label="Chọn ngày cụ thể"
          name="date"
          rules={[{ required: true, message: "Vui lòng chọn ngày nghỉ!" }]}
        >
          <DatePicker 
            style={{ width: '100%' }}
            size="large"
            format="DD/MM/YYYY"
            placeholder="Chọn ngày nghỉ"
            disabledDate={disabledDate}
            disabled={!selectedSubject || !selectedDay}
          />
        </Form.Item>

        <Form.Item
          label="Lý do nghỉ học"
          name="reason"
          rules={[
            { required: true, message: "Vui lòng nhập lý do!" },
            { min: 10, message: "Lý do phải có ít nhất 10 ký tự!" }
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Mô tả chi tiết lý do cần nghỉ học..."
          />
        </Form.Item>

        <Form.Item
          label="Đính kèm tài liệu (nếu có)"
          name="attachments"
        >
          <Upload>
            <Button icon={<UploadOutlined />}>Chọn file</Button>
          </Upload>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            Có thể đính kèm giấy chứng nhận y tế, giấy tờ liên quan...
          </Text>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit"
              size="large"
            >
              Gửi đơn
            </Button>
            <Button 
              onClick={handleCancel}
              size="large"
            >
              Hủy
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LeaveRequestModal;