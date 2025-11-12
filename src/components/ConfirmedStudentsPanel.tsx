/**
 * Confirmed Students Panel Component
 * Hiển thị danh sách sinh viên đã xác nhận điểm danh trong một Drawer
 */
import React from 'react';
import {
  Drawer,
  List,
  Avatar,
  Space,
  Typography,
  Badge,
  Empty,
  Alert,
  Button,
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { AttendanceRecord } from '../hooks/useSmartPolling';

const { Text } = Typography;

interface ConfirmedStudentsPanelProps {
  visible: boolean;
  onClose: () => void;
  sessionActive: boolean;
  confirmedStudents: AttendanceRecord[];
  pendingCount: number;
  wsConnected: boolean;
  onOpenPendingPanel?: () => void;
}

const ConfirmedStudentsPanel: React.FC<ConfirmedStudentsPanelProps> = ({
  visible,
  onClose,
  sessionActive,
  confirmedStudents,
  pendingCount,
  wsConnected,
  onOpenPendingPanel,
}) => {
  const confirmedCount = confirmedStudents.length;

  return (
    <Drawer
      title={
        <Space>
          <TeamOutlined />
          <span>Sinh viên đã xác nhận</span>
          <Badge
            count={confirmedCount}
            showZero
            style={{ backgroundColor: confirmedCount > 0 ? '#52c41a' : '#d9d9d9' }}
          />
        </Space>
      }
      placement="right"
      width={typeof window !== 'undefined' && window.innerWidth <= 768 ? '85%' : 400}
      open={visible}
      onClose={onClose}
      zIndex={1001}
      destroyOnClose
      maskClosable
    >
      {!sessionActive ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Bắt đầu phiên điểm danh để xem danh sách"
          imageStyle={{ height: 100, marginTop: 60 }}
        />
      ) : (
        <>
          {wsConnected && confirmedCount === 0 && pendingCount === 0 && (
            <Alert
              message="Đang chờ nhận diện"
              description="Camera đang hoạt động. Sinh viên sẽ xuất hiện ở đây khi được AI nhận diện và xác nhận."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Warning nếu có pending */}
          {pendingCount > 0 && (
            <Alert
              message={`${pendingCount} sinh viên chờ xác nhận`}
              description="Độ tin cậy nhận diện thấp. Vui lòng kiểm tra và xác nhận."
              type="warning"
              showIcon
              icon={<ClockCircleOutlined />}
              action={
                onOpenPendingPanel ? (
                  <Button
                    size="small"
                    type="primary"
                    onClick={onOpenPendingPanel}
                    style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
                  >
                    Xem ngay
                  </Button>
                ) : undefined
              }
              style={{ marginBottom: 16 }}
            />
          )}

          <List
            dataSource={confirmedStudents}
            renderItem={(record) => (
              <List.Item
                key={record.id}
                style={{
                  borderLeft: '3px solid #52c41a',
                  paddingLeft: 12,
                  marginBottom: 8,
                  backgroundColor: '#f6ffed',
                  borderRadius: 4,
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      size={48}
                      style={{ backgroundColor: '#52c41a' }}
                      icon={<UserOutlined />}
                    />
                  }
                  title={<Text strong>{record.student_name}</Text>}
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.student_code}
                      </Text>
                      {record.confidence_score && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Confidence: {(record.confidence_score * 100).toFixed(1)}%
                        </Text>
                      )}
                      {record.recorded_at && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {new Date(record.recorded_at).toLocaleTimeString('vi-VN')}
                        </Text>
                      )}
                    </Space>
                  }
                />
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
              </List.Item>
            )}
            locale={{
              emptyText: wsConnected
                ? 'Đang chờ nhận diện sinh viên...'
                : 'Chưa có sinh viên nào được xác nhận',
            }}
          />
        </>
      )}
    </Drawer>
  );
};

export default ConfirmedStudentsPanel;

