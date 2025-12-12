import React, { useMemo } from "react";
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Upload,
  Button,
  Space,
  Typography,
  message,
  Row,
  Col,
  Tag,
  Alert
} from "antd";
import {
  UploadOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  CloseCircleOutlined,
  WarningOutlined
} from "@ant-design/icons";
import type { UploadFile, RcFile } from "antd/es/upload/interface";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { TextArea } = Input;
const { Text } = Typography;

interface LeaveRequestModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  loading?: boolean;
  subjects: Array<{
    value: string;
    label: string;
    teacher?: string;
    schedule?: Record<string, string[]>;
  }>;
  preSelectedSubject?: string;
  initialValues?: any;
  title?: string;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
  subjects,
  preSelectedSubject,
  initialValues,
  title = "Tạo đơn xin nghỉ học"
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = React.useState<UploadFile[]>([]);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  // ✅ Get selected subject's schedule
  const selectedSubject = Form.useWatch('subject', form);
  const currentSubjectSchedule = useMemo(() => {
    const subject = subjects.find(s => s.value === selectedSubject);
    return subject?.schedule || {};
  }, [selectedSubject, subjects]);

  // ✅ Get available days of week from schedule
  const availableDaysOfWeek = useMemo(() => {
    const dayMapping: Record<string, { value: string; label: string; sortOrder: number }> = {
      monday: { value: 'Monday', label: 'Thứ 2', sortOrder: 1 },
      tuesday: { value: 'Tuesday', label: 'Thứ 3', sortOrder: 2 },
      wednesday: { value: 'Wednesday', label: 'Thứ 4', sortOrder: 3 },
      thursday: { value: 'Thursday', label: 'Thứ 5', sortOrder: 4 },
      friday: { value: 'Friday', label: 'Thứ 6', sortOrder: 5 },
      saturday: { value: 'Saturday', label: 'Thứ 7', sortOrder: 6 },
      sunday: { value: 'Sunday', label: 'Chủ nhật', sortOrder: 0 }
    };

    const days = Object.keys(currentSubjectSchedule)
      .filter(day => currentSubjectSchedule[day] && currentSubjectSchedule[day].length > 0)
      .map(day => dayMapping[day.toLowerCase()])
      .filter(Boolean)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return days;
  }, [currentSubjectSchedule]);

  // ✅ Get available time slots for selected day
  const selectedDayOfWeek = Form.useWatch('dayOfWeek', form);
  const availableTimeSlots = useMemo(() => {
    if (!selectedDayOfWeek || !currentSubjectSchedule) {
      return [];
    }

    const dayKey = selectedDayOfWeek.toLowerCase();
    const periods = currentSubjectSchedule[dayKey as keyof typeof currentSubjectSchedule] || [];

    return periods.map(periodRange => {
      const [start, end] = periodRange.split('-').map(Number);
      
      const getTimeFromPeriod = (period: number): string => {
        const baseHour = 6;
        const periodDuration = 50;
        const breakDuration = 10;
        
        const totalMinutes = (period - 1) * (periodDuration + breakDuration);
        const hours = baseHour + Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      };

      const startTime = getTimeFromPeriod(start);
      const endPeriod = end || start;
      const endTime = getTimeFromPeriod(endPeriod + 1);

      return {
        value: periodRange,
        label: start === end 
          ? `Tiết ${start} (${startTime} - ${endTime})`
          : `Tiết ${start}-${end} (${startTime} - ${endTime})`,
        periods: periodRange
      };
    });
  }, [selectedDayOfWeek, currentSubjectSchedule]);

  // ✅ Disable dates that don't match available days
  const disabledDate = (current: Dayjs) => {
    if (!current) return false;

    if (current.isBefore(dayjs(), 'day')) {
      return true;
    }

    if (availableDaysOfWeek.length === 0) {
      return true;
    }

    const dayOfWeek = current.day();
    const isAvailable = availableDaysOfWeek.some(d => d.sortOrder === dayOfWeek);
    
    return !isAvailable;
  };

  // ✅ Auto-set dayOfWeek when date is selected
  const handleDateChange = (date: Dayjs | null) => {
    if (date) {
      const dayOfWeek = date.day();
      const matchingDay = availableDaysOfWeek.find(d => d.sortOrder === dayOfWeek);
      
      if (matchingDay) {
        form.setFieldValue('dayOfWeek', matchingDay.value);
      }
      
      form.setFieldValue('timeSlot', undefined);
    } else {
      form.setFieldValue('dayOfWeek', undefined);
      form.setFieldValue('timeSlot', undefined);
    }
  };

  // ✅ FIXED: File validation with better error messages
  const beforeUpload = (file: RcFile) => {
    setUploadError(null);

    // ✅ Check file type
    const isJPG = file.type === 'image/jpeg';
    const isPNG = file.type === 'image/png';
    const isGIF = file.type === 'image/gif';
    const isPDF = file.type === 'application/pdf';
    
    const isValidType = isJPG || isPNG || isGIF || isPDF;

    if (!isValidType) {
      const errorMsg = `File "${file.name}" không hợp lệ. Chỉ chấp nhận file ảnh (JPG, PNG, GIF) hoặc PDF!`;
      setUploadError(errorMsg);
      message.error({
        content: errorMsg,
        duration: 4
      });
      return Upload.LIST_IGNORE;
    }

    // ✅ Check file size (max 5MB)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      const fileSize = (file.size / 1024 / 1024).toFixed(2);
      const errorMsg = `File "${file.name}" quá lớn (${fileSize}MB). Vui lòng chọn file nhỏ hơn 5MB!`;
      setUploadError(errorMsg);
      message.error({
        content: errorMsg,
        duration: 4
      });
      return Upload.LIST_IGNORE;
    }

    // ✅ Clear error if file is valid
    setUploadError(null);
    return false; // Prevent auto upload
  };

  const handleFileChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    // Clear error when file list changes
    if (newFileList.length === 0) {
      setUploadError(null);
    }
    
    // Only keep the last file
    setFileList(newFileList.slice(-1));
  };

  const handleRemoveFile = () => {
    setFileList([]);
    setUploadError(null);
  };

  const handleOk = () => {
    form.validateFields().then((values) => {
      // ✅ Check if there's an upload error
      if (uploadError) {
        message.error('Vui lòng chọn file hợp lệ trước khi gửi đơn!');
        return;
      }

      const formData = {
        ...values,
        evidenceFile: fileList.length > 0 ? fileList : undefined
      };
      onSubmit(formData);
    }).catch((errorInfo) => {
      
      message.error('Vui lòng điền đầy đủ thông tin bắt buộc!');
    });
  };

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    setUploadError(null);
    onCancel();
  };

  // Initialize form with initial values
  React.useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue(initialValues);
    } else if (visible && preSelectedSubject) {
      form.setFieldValue('subject', preSelectedSubject);
    }
    
    // Reset states when modal closes
    if (!visible) {
      setFileList([]);
      setUploadError(null);
    }
  }, [visible, preSelectedSubject, initialValues, form]);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📝</span>
          <span>{title}</span>
        </div>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={600}
      confirmLoading={loading}
      okText="Gửi đơn"
      cancelText="Hủy"
      maskClosable={!loading}
      keyboard={!loading}
      okButtonProps={{
        disabled: loading || !!uploadError,
        style: { borderRadius: 8 }
      }}
      cancelButtonProps={{
        disabled: loading,
        style: { borderRadius: 8 }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          subject: preSelectedSubject
        }}
      >
        {/* Subject Selection */}
        <Form.Item
          label="Môn học"
          name="subject"
          rules={[{ required: true, message: 'Vui lòng chọn môn học!' }]}
        >
          <Select
            placeholder="Chọn môn học"
            size="large"
            style={{ borderRadius: 8 }}
            disabled={!!preSelectedSubject}
          >
            {subjects.map(subject => (
              <Select.Option key={subject.value} value={subject.value}>
                <div>
                  <Text strong>{subject.label}</Text>
                  {subject.teacher && (
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      • {subject.teacher}
                    </Text>
                  )}
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Schedule Info Display */}
        {availableDaysOfWeek.length > 0 && (
          <div style={{
            padding: '12px 16px',
            background: '#f0f9ff',
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid #bae6fd'
          }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong style={{ color: '#0369a1', fontSize: 13 }}>
                📅 Lịch học của môn này:
              </Text>
              <Space size={8} wrap>
                {availableDaysOfWeek.map(day => (
                  <Tag key={day.value} color="blue" style={{ margin: 0 }}>
                    {day.label}
                  </Tag>
                ))}
              </Space>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Bạn chỉ có thể chọn ngày thuộc các thứ trên
              </Text>
            </Space>
          </div>
        )}

        <Row gutter={16}>
          {/* Date Selection */}
          <Col xs={24} sm={12}>
            <Form.Item
              label="Ngày nghỉ"
              name="date"
              rules={[{ required: true, message: 'Vui lòng chọn ngày nghỉ!' }]}
            >
              <DatePicker
                placeholder="Chọn ngày"
                size="large"
                style={{ width: '100%', borderRadius: 8 }}
                format="DD/MM/YYYY"
                disabledDate={disabledDate}
                onChange={handleDateChange}
                disabled={availableDaysOfWeek.length === 0}
              />
            </Form.Item>
          </Col>

          {/* Day of Week (Auto-filled, read-only) */}
          <Col xs={24} sm={12}>
            <Form.Item
              label="Thứ"
              name="dayOfWeek"
              rules={[{ required: true, message: 'Vui lòng chọn ngày trước!' }]}
            >
              <Select
                placeholder="Tự động điền"
                size="large"
                style={{ borderRadius: 8 }}
                disabled
              >
                {availableDaysOfWeek.map(day => (
                  <Select.Option key={day.value} value={day.value}>
                    {day.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Time Slot Selection */}
        <Form.Item
          label={
            <Space>
              <span>Buổi học</span>
              <Tag color="orange" style={{ fontSize: 11 }}>
                Bắt buộc
              </Tag>
            </Space>
          }
          name="timeSlot"
          rules={[{ required: true, message: 'Vui lòng chọn buổi học!' }]}
        >
          <Select
            placeholder={
              selectedDayOfWeek 
                ? "Chọn buổi học muốn nghỉ" 
                : "Vui lòng chọn ngày nghỉ trước"
            }
            size="large"
            style={{ borderRadius: 8 }}
            disabled={!selectedDayOfWeek || availableTimeSlots.length === 0}
            allowClear
          >
            {availableTimeSlots.map(slot => (
              <Select.Option key={slot.value} value={slot.value}>
                {slot.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Time Slots Info Display */}
        {selectedDayOfWeek && availableTimeSlots.length > 0 && (
          <div style={{
            padding: '12px 16px',
            background: '#fef3c7',
            borderRadius: 8,
            marginBottom: 16,
            marginTop: -8,
            border: '1px solid #fde68a'
          }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong style={{ color: '#92400e', fontSize: 12 }}>
                ⏰ Các buổi học trong ngày:
              </Text>
              <Space size={4} wrap>
                {availableTimeSlots.map(slot => (
                  <Tag key={slot.value} color="gold" style={{ margin: 0, fontSize: 11 }}>
                    {slot.label}
                  </Tag>
                ))}
              </Space>
            </Space>
          </div>
        )}

        {/* Reason */}
        <Form.Item
          label="Lý do nghỉ học"
          name="reason"
          rules={[
            { required: true, message: 'Vui lòng nhập lý do nghỉ học!' },
            { min: 10, message: 'Lý do phải có ít nhất 10 ký tự!' }
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Mô tả chi tiết lý do nghỉ học của bạn..."
            maxLength={500}
            showCount
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        {/* ✅ Upload Error Alert */}
        {uploadError && (
          <Alert
            message="Lỗi file minh chứng"
            description={uploadError}
            type="error"
            showIcon
            icon={<WarningOutlined />}
            closable
            onClose={() => setUploadError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Evidence File Upload */}
        <Form.Item
          label={
            <Space>
              <span>File minh chứng (không bắt buộc)</span>
              <Tag color="blue" style={{ fontSize: 11 }}>
                JPG, PNG, GIF, PDF &lt; 5MB
              </Tag>
            </Space>
          }
          name="evidenceFile"
        >
          <Upload
            beforeUpload={beforeUpload}
            fileList={fileList}
            onChange={handleFileChange}
            maxCount={1}
            accept=".jpg,.jpeg,.png,.gif,.pdf,image/jpeg,image/png,image/gif,application/pdf"
          >
            <Button
              icon={<UploadOutlined />}
              size="large"
              style={{ borderRadius: 8, width: '100%' }}
              disabled={fileList.length >= 1}
              danger={!!uploadError}
            >
              {fileList.length >= 1 ? 'Đã chọn file' : 'Chọn file minh chứng'}
            </Button>
          </Upload>
        </Form.Item>

        {/* File Preview */}
        {fileList.length > 0 && !uploadError && (
          <div style={{
            padding: '12px 16px',
            background: '#f9fafb',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            marginTop: -8
          }}>
            <Row align="middle" justify="space-between">
              <Col flex="auto">
                <Space>
                  {fileList[0].type?.includes('pdf') ? (
                    <FilePdfOutlined style={{ fontSize: 20, color: '#ef4444' }} />
                  ) : (
                    <FileImageOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
                  )}
                  <div>
                    <Text strong style={{ fontSize: 13 }}>
                      {fileList[0].name}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {((fileList[0].size || 0) / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  </div>
                </Space>
              </Col>
              <Col>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={handleRemoveFile}
                >
                  Xóa
                </Button>
              </Col>
            </Row>
          </div>
        )}

        {/* Helper Text */}
        <div style={{
          padding: '12px 16px',
          background: '#fef3c7',
          borderRadius: 8,
          marginTop: 16,
          border: '1px solid #fde68a'
        }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 <strong>Lưu ý:</strong> Đơn xin nghỉ học sẽ được gửi đến giáo viên để xem xét. 
            Bạn nên gửi đơn trước ít nhất 1 ngày và cung cấp file minh chứng nếu có thể.
          </Text>
        </div>
      </Form>
    </Modal>
  );
};

export default LeaveRequestModal;