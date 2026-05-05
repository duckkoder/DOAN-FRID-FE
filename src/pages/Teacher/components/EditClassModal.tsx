import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, Form, Input, Row, Col, Space, Typography, Button,
  Steps, Select, Card, Alert, message
} from 'antd';
import {
  EditOutlined, BookOutlined, CalendarOutlined,
  CheckCircleOutlined, SaveOutlined
} from '@ant-design/icons';
import { updateClass } from '../../../apis/classesAPIs/teacherClass';
import { convertFrontendScheduleToBackend } from '../../../apis/classesAPIs/teacherClass';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface EditClassModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (updatedData: any) => void;
  classData: any;
  courses: any[];
  rooms: any[];
}

const TIME_SLOT_OPTIONS = [
  { period: 1, label: 'Tiết 1 (07:00 - 07:50)' },
  { period: 2, label: 'Tiết 2 (07:50 - 08:40)' },
  { period: 3, label: 'Tiết 3 (09:00 - 09:50)' },
  { period: 4, label: 'Tiết 4 (09:50 - 10:40)' },
  { period: 5, label: 'Tiết 5 (10:40 - 11:30)' },
  { period: 6, label: 'Tiết 6 (13:00 - 13:50)' },
  { period: 7, label: 'Tiết 7 (13:50 - 14:40)' },
  { period: 8, label: 'Tiết 8 (15:00 - 15:50)' },
  { period: 9, label: 'Tiết 9 (15:50 - 16:40)' },
  { period: 10, label: 'Tiết 10 (16:40 - 17:30)' },
];

const weekDays = [
  { value: 0, label: "Thứ Hai" },
  { value: 1, label: "Thứ Ba" },
  { value: 2, label: "Thứ Tư" },
  { value: 3, label: "Thứ Năm" },
  { value: 4, label: "Thứ Sáu" },
  { value: 5, label: "Thứ Bảy" },
  { value: 6, label: "Chủ Nhật" }
];

const formatTimeRange = (periods: number[]) => {
  if (!periods || periods.length === 0) return '';
  const sorted = [...periods].sort((a, b) => a - b);
  const startPeriod = sorted[0];
  const endPeriod = sorted[sorted.length - 1];

  const startTime = TIME_SLOT_OPTIONS.find(s => s.period === startPeriod)?.label.split('(')[1].split('-')[0].trim();
  const endTime = TIME_SLOT_OPTIONS.find(s => s.period === endPeriod)?.label.split('-')[1].split(')')[0].trim();

  return `${startTime} - ${endTime}`;
};

const EditClassModal: React.FC<EditClassModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  classData,
  courses,
  rooms
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayPeriods, setDayPeriods] = useState<Record<number, number[]>>({});
  const [dayRooms, setDayRooms] = useState<Record<number, string>>({});
  const [editSchedules, setEditSchedules] = useState<any[]>([]);

  // Watchers
  const subjectSuffix = Form.useWatch('subject', form);
  const editingCourse = useMemo(() => courses.find(c => c.id === classData?.courseId), [courses, classData?.courseId]);
  const editCourseCodePrefix = useMemo(() =>
    editingCourse ? editingCourse.code : (classData?.subject.split(' - ')[0] || '')
    , [editingCourse, classData?.subject]);

  useEffect(() => {
    if (visible && classData) {
      // Parse schedule
      const scheduleList = classData.schedule?.schedules || [];
      const days: number[] = [];
      const periods: Record<number, number[]> = {};
      const roomsMap: Record<number, string> = {};

      scheduleList.forEach((entry: any) => {
        const dayNum = entry.day;
        const entryPeriods = entry.periods || [];
        if (entryPeriods.length === 0) return;

        if (!days.includes(dayNum)) days.push(dayNum);

        if (periods[dayNum]) {
          periods[dayNum] = Array.from(new Set([...periods[dayNum], ...entryPeriods])).sort((a, b) => a - b);
        } else {
          periods[dayNum] = [...entryPeriods].sort((a, b) => a - b);
        }
        roomsMap[dayNum] = entry.location || "";
      });

      setSelectedDays(days.sort((a, b) => a - b));
      setDayPeriods(periods);
      setDayRooms(roomsMap);

      // Initial subject strip
      let stripped = classData.subject;
      const code = editingCourse ? editingCourse.code : classData.subject.split(' - ')[0];
      if (stripped.startsWith(`${code} - `)) {
        stripped = stripped.replace(`${code} - `, "");
      }

      form.setFieldsValue({
        subject: stripped,
        description: classData.description
      });

      updateSchedulesFromPeriods(periods);
      setCurrentStep(0);
      setError(null);
    }
  }, [visible, classData, editingCourse, form]);

  const updateSchedulesFromPeriods = (periods: Record<number, number[]>) => {
    const newSchedules = Object.keys(periods).map(dayStr => {
      const day = parseInt(dayStr);
      const sorted = [...periods[day]].sort((a, b) => a - b);

      const sessions: any[] = [];
      if (sorted.length > 0) {
        let currentSession: number[] = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] === sorted[i - 1] + 1) {
            currentSession.push(sorted[i]);
          } else {
            sessions.push({ id: Math.random(), periods: currentSession });
            currentSession = [sorted[i]];
          }
        }
        sessions.push({ id: Math.random(), periods: currentSession });
      }

      return { day, sessions };
    });
    setEditSchedules(newSchedules);
  };

  const handleDayChange = (days: number[]) => {
    setSelectedDays(days);
    const newPeriods = { ...dayPeriods };
    const newRooms = { ...dayRooms };

    Object.keys(newPeriods).forEach(d => {
      if (!days.includes(parseInt(d))) delete newPeriods[parseInt(d)];
    });
    Object.keys(newRooms).forEach(d => {
      if (!days.includes(parseInt(d))) delete newRooms[parseInt(d)];
    });

    setDayPeriods(newPeriods);
    setDayRooms(newRooms);
    updateSchedulesFromPeriods(newPeriods);
  };

  const handlePeriodChange = (day: number, periods: number[]) => {
    const newPeriods = { ...dayPeriods, [day]: periods };
    setDayPeriods(newPeriods);
    updateSchedulesFromPeriods(newPeriods);
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['subject', 'description']);
      } else if (currentStep === 1) {
        if (selectedDays.length === 0) return message.error('Vui lòng chọn ít nhất một ngày học!');
        const missing = selectedDays.find(d => !dayRooms[d]);
        if (missing !== undefined) {
          const label = weekDays.find(wd => wd.value === missing)?.label || `Ngày ${missing}`;
          return message.error(`Vui lòng chọn phòng học cho ${label}!`);
        }
      }
      setCurrentStep(prev => prev + 1);
    } catch (e) { }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // Use getFieldValue per field to avoid getting stale undefined values when steps unmount
      const subjectValue = form.getFieldValue('subject') || "";
      const descriptionValue = form.getFieldValue('description') || null;
      const finalSubject = editCourseCodePrefix ? `${editCourseCodePrefix} - ${subjectValue}`.trim() : subjectValue;

      const schedulesWithLoc = editSchedules.map(s => ({
        ...s,
        location: dayRooms[s.day] || ''
      }));
      const backendSchedule = convertFrontendScheduleToBackend(schedulesWithLoc);

      // Change check
      const noChange = finalSubject === classData.subject &&
        (descriptionValue) === (classData.description || null) &&
        JSON.stringify(backendSchedule) === JSON.stringify(classData.schedule);

      if (noChange) {
        message.info('Không có thay đổi nào');
        onCancel();
        return;
      }

      console.log("Saving class with name:", finalSubject);
      await updateClass(classData.id, {
        class_name: finalSubject,
        description: descriptionValue,
        schedule: backendSchedule
      });

      message.success('Cập nhật lớp thành công');
      onSuccess(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Lỗi cập nhật lớp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<Space><EditOutlined style={{ color: '#2563eb' }} /><Text strong style={{ fontSize: 18 }}>Chỉnh sửa thông tin Lớp</Text></Space>}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={850}
      bodyStyle={{ padding: '0 24px 24px' }}
    >
      <div style={{ padding: '24px 0' }}>
        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 32 }}
          items={[{ title: 'Cơ bản', icon: <BookOutlined /> }, { title: 'Lịch học', icon: <CalendarOutlined /> }, { title: 'Xác nhận', icon: <CheckCircleOutlined /> }]}
        />
      </div>

      {error && <Alert message="Lỗi" description={error} type="error" showIcon style={{ marginBottom: 24 }} />}

      <Form form={form} layout="vertical" preserve={true}>
        {currentStep === 0 && (
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <Space direction="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Học phần hiện tại:</Text>
                  <Text strong style={{ fontSize: 16, color: '#1e40af' }}>
                    {editingCourse ? `${editingCourse.code} - ${editingCourse.title}` : (classData?.subject.split(' - ')[0] || "Đang tải...")}
                  </Text>
                </Space>
              </div>
            </Col>
            <Col span={24}>
              <Form.Item label="Tên Lớp" name="subject" rules={[{ required: true, message: 'Nhập tên lớp!' }]}>
                <Input size="large" addonBefore={editCourseCodePrefix ? `${editCourseCodePrefix} -` : undefined} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Mô tả" name="description" rules={[{ required: true, message: 'Nhập mô tả!' }]}>
                <TextArea rows={5} />
              </Form.Item>
            </Col>
          </Row>
        )}

        {currentStep === 1 && (
          <div>
            <Form.Item label={<Text strong>Chọn ngày:</Text>}>
              <Select mode="multiple" size="large" value={selectedDays} onChange={handleDayChange} style={{ width: '100%' }}>
                {weekDays.map(d => <Option key={d.value} value={d.value}>{d.label}</Option>)}
              </Select>
            </Form.Item>
            {selectedDays.sort().map(day => (
              <Card key={day} size="small" style={{ marginBottom: 20, borderRadius: 12, borderLeft: '4px solid #3b82f6' }} title={<Space><CalendarOutlined />{weekDays.find(wd => wd.value === day)?.label}</Space>}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>Phòng:</Text>
                    <Select showSearch size="large" style={{ width: '100%' }} value={dayRooms[day] || undefined} onChange={v => setDayRooms(p => ({ ...p, [day]: v }))}>
                      {rooms.map(r => <Option key={r.name} value={r.name}>{r.name}</Option>)}
                    </Select>
                  </Col>
                  <Col span={12}>
                    <Text strong>Tiết:</Text>
                    <Select mode="multiple" size="large" style={{ width: '100%' }} value={dayPeriods[day] || []} onChange={p => handlePeriodChange(day, p)}>
                      {TIME_SLOT_OPTIONS.map(s => <Option key={s.period} value={s.period}>{s.label}</Option>)}
                    </Select>
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        )}

        {currentStep === 2 && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Card title="Cơ bản" size="small">
              <Text type="secondary">Tên lớp:</Text><br /><Text strong>{editCourseCodePrefix} - {subjectSuffix}</Text>
            </Card>
            <Card title="Lịch học" size="small">
              {editSchedules.map(s => (
                <div key={s.day} style={{ marginBottom: 8 }}>
                  <Text strong>{weekDays.find(wd => wd.value === s.day)?.label}</Text>: {dayRooms[s.day]} ({s.sessions.map((sess: any) => formatTimeRange(sess.periods)).join(', ')})
                </div>
              ))}
            </Card>
          </Space>
        )}

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={onCancel}>Hủy</Button>
          {currentStep > 0 && <Button onClick={() => setCurrentStep(s => s - 1)}>Quay lại</Button>}
          {currentStep < 2 ? (
            <Button type="primary" onClick={handleNext}>Tiếp theo</Button>
          ) : (
            <Button type="primary" loading={loading} onClick={handleSave} icon={<SaveOutlined />}>Lưu thay đổi</Button>
          )}
        </div>
      </Form>
    </Modal>
  );
};

export default EditClassModal;
