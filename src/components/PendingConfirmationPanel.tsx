/**
 * Pending Confirmation Panel Component
 * Hiển thị danh sách sinh viên chờ xác nhận và cho phép giáo viên xác nhận/từ chối
 * (Hybrid Approach - Realtime + After Session)
 */
import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  Avatar,
  Button,
  Space,
  Tag,
  Typography,
  Popconfirm,
  message,
  Badge,
  Empty,
  Spin,
} from 'antd';
import {
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  getPendingStudents,
  confirmAttendance,
  rejectAttendance,
  confirmAllPending,
  type PendingStudent,
} from '../apis/attendanceAPIs/attendanceAPIs';

const { Text, Title } = Typography;

interface PendingConfirmationPanelProps {
  visible: boolean;
  onClose: () => void;
  sessionId: number | null;
  onConfirmed?: () => void; // Callback khi xác nhận thành công (refresh data)
}

const PendingConfirmationPanel: React.FC<PendingConfirmationPanelProps> = ({
  visible,
  onClose,
  sessionId,
  onConfirmed,
}) => {
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmingIds, setConfirmingIds] = useState<Set<number>>(new Set());
  const [rejectingIds, setRejectingIds] = useState<Set<number>>(new Set());
  const [confirmingAll, setConfirmingAll] = useState(false);
  const prevCountRef = React.useRef<number>(0); // Track previous count

  /**
   * Fetch pending students
   */
  const fetchPendingStudents = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const response = await getPendingStudents(sessionId);
      setPendingStudents(response.students);
    } catch (error: any) {
      console.error('[PendingPanel] Failed to fetch pending students:', error);
      message.error(error.response?.data?.detail || 'Không thể tải danh sách sinh viên chờ xác nhận');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch khi panel mở hoặc sessionId thay đổi
   */
  useEffect(() => {
    if (visible && sessionId) {
      fetchPendingStudents();
    }
  }, [visible, sessionId]);

  /**
   * ✅ UX Improvement: Tự động đóng panel khi đã xác nhận hết tất cả
   * ✅ FIX: Remove onClose from dependencies to prevent infinite loop
   */
  useEffect(() => {
    const currentCount = pendingStudents.length;
    
    // Chỉ tự động đóng khi:
    // 1. Panel đang mở
    // 2. Trước đó có pending students (prevCountRef.current > 0)
    // 3. Giờ không còn nữa (currentCount === 0)
    // 4. Không đang loading
    if (visible && prevCountRef.current > 0 && currentCount === 0 && !loading) {
      // Đợi một chút để user thấy empty state hoặc success message
      const timer = setTimeout(() => {
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
    
    // Update ref
    prevCountRef.current = currentCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, pendingStudents.length, loading]);

  /**
   * Xác nhận một sinh viên
   */
  const handleConfirm = async (recordId: number, studentName: string) => {
    try {
      setConfirmingIds((prev) => new Set(prev).add(recordId));
      
      await confirmAttendance(recordId);
      
      message.success(`Đã xác nhận điểm danh cho ${studentName}`);
      
      // Remove từ danh sách pending
      setPendingStudents((prev) => prev.filter((s) => s.record_id !== recordId));
      
      // Callback để refresh data
      onConfirmed?.();
    } catch (error: any) {
      console.error('[PendingPanel] Confirm failed:', error);
      message.error(error.response?.data?.detail || 'Không thể xác nhận điểm danh');
    } finally {
      setConfirmingIds((prev) => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
    }
  };

  /**
   * Từ chối một sinh viên
   */
  const handleReject = async (recordId: number, studentName: string) => {
    try {
      setRejectingIds((prev) => new Set(prev).add(recordId));
      
      await rejectAttendance(recordId, {
        reason: 'Giáo viên xác nhận nhận diện sai',
      });
      
      message.success(`Đã từ chối điểm danh cho ${studentName}`);
      
      // Remove từ danh sách pending
      setPendingStudents((prev) => prev.filter((s) => s.record_id !== recordId));
      
      // Callback để refresh data
      onConfirmed?.();
    } catch (error: any) {
      console.error('[PendingPanel] Reject failed:', error);
      message.error(error.response?.data?.detail || 'Không thể từ chối điểm danh');
    } finally {
      setRejectingIds((prev) => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
    }
  };

  /**
   * Xác nhận tất cả hàng loạt
   */
  const handleConfirmAll = async () => {
    if (!sessionId) return;

    try {
      setConfirmingAll(true);
      
      const response = await confirmAllPending(sessionId);
      
      message.success(`Đã xác nhận ${response.confirmed_count} sinh viên`);
      
      // Clear danh sách pending
      setPendingStudents([]);
      
      // Callback để refresh data
      onConfirmed?.();
    } catch (error: any) {
      console.error('[PendingPanel] Confirm all failed:', error);
      message.error(error.response?.data?.detail || 'Không thể xác nhận tất cả');
    } finally {
      setConfirmingAll(false);
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#faad14' }} />
          <span>Chờ xác nhận</span>
          <Badge 
            count={pendingStudents.length} 
            showZero 
            style={{ backgroundColor: '#faad14' }} 
          />
        </Space>
      }
      placement="right"
      width={typeof window !== 'undefined' && window.innerWidth <= 768 ? '85%' : 400}
      open={visible}
      onClose={onClose}
      zIndex={10000}
      destroyOnClose
      maskClosable
      getContainer={() => document.body}
      rootStyle={{ zIndex: 10000 }}
      extra={
        pendingStudents.length > 0 && (
          <Popconfirm
            title="Xác nhận tất cả"
            description={`Bạn có chắc muốn xác nhận tất cả ${pendingStudents.length} sinh viên?`}
            onConfirm={handleConfirmAll}
            okText="Xác nhận"
            cancelText="Hủy"
            icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
          >
            <Button 
              type="primary" 
              size="small"
              loading={confirmingAll}
            >
              Xác nhận tất cả
            </Button>
          </Popconfirm>
        )
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Đang tải...</Text>
          </div>
        </div>
      ) : pendingStudents.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không có sinh viên chờ xác nhận"
          style={{ marginTop: 60 }}
        />
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {pendingStudents.length} sinh viên cần xác nhận do độ chính xác nhận diện thấp
            </Text>
          </div>

          <List
            dataSource={pendingStudents}
            renderItem={(student) => (
              <List.Item
                key={student.record_id}
                style={{
                  borderLeft: '3px solid #faad14',
                  paddingLeft: 12,
                  marginBottom: 12,
                  backgroundColor: '#fffbf0',
                  borderRadius: 4,
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      size={48}
                      style={{ backgroundColor: '#faad14' }}
                      icon={<UserOutlined />}
                    />
                  }
                  title={
                    <Space direction="vertical" size={0}>
                      <Text strong>{student.full_name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {student.student_code}
                      </Text>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ marginTop: 4 }}>
                      {student.confidence_score !== null && (
                        <Tag color="orange">
                          Confidence: {(student.confidence_score * 100).toFixed(1)}%
                        </Tag>
                      )}
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(student.recorded_at).toLocaleString('vi-VN')}
                      </Text>
                    </Space>
                  }
                />
                <Space direction="vertical" size={4}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={() => handleConfirm(student.record_id, student.full_name)}
                    loading={confirmingIds.has(student.record_id)}
                    disabled={rejectingIds.has(student.record_id)}
                    style={{ width: '100%' }}
                  >
                    Xác nhận
                  </Button>
                  <Popconfirm
                    title="Từ chối điểm danh"
                    description="Sinh viên sẽ được đánh dấu vắng"
                    onConfirm={() => handleReject(student.record_id, student.full_name)}
                    okText="Từ chối"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<CloseOutlined />}
                      loading={rejectingIds.has(student.record_id)}
                      disabled={confirmingIds.has(student.record_id)}
                      style={{ width: '100%' }}
                    >
                      Từ chối
                    </Button>
                  </Popconfirm>
                </Space>
              </List.Item>
            )}
          />
        </>
      )}
    </Drawer>
  );
};

export default PendingConfirmationPanel;

