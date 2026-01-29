/**
 * Statistics Panel Component
 * Hiển thị thống kê điểm danh trong một Drawer
 */
import React from 'react';
import {
  Drawer,
  Card,
  Statistic,
  Row,
  Col,
  Progress,
  Typography,
  Space,
  Empty,
  Alert,
} from 'antd';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface StatisticsPanelProps {
  visible: boolean;
  onClose: () => void;
  sessionActive: boolean;
  confirmedCount: number;
  pendingCount: number;
  totalStudents: number;
  attendanceRate: number;
  wsConnected: boolean;
  hasData: boolean;
  currentInterval?: number | null;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  visible,
  onClose,
  sessionActive,
  confirmedCount,
  pendingCount,
  totalStudents,
  attendanceRate,
  wsConnected,
  hasData,
  currentInterval,
}) => {
  return (
    <Drawer
      title={
        <Space>
          <BarChartOutlined />
          <span>Attendance Statistics</span>
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
          description="Start attendance session to view statistics"
          imageStyle={{ height: 100, marginTop: 60 }}
        />
      ) : (
        <>
          {wsConnected && !hasData && (
            <Alert
              message="Loading data"
              description="Connecting to server to get attendance statistics..."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card>
                <Statistic
                  title="Confirmed"
                  value={confirmedCount}
                  valueStyle={{ color: '#52c41a', fontSize: 28 }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic
                  title="Pending"
                  value={pendingCount}
                  valueStyle={{ color: '#faad14', fontSize: 28 }}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card>
                <Statistic
                  title="Total"
                  value={totalStudents}
                  valueStyle={{ fontSize: 28 }}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic
                  title="Rate"
                  value={attendanceRate}
                  suffix="%"
                  valueStyle={{
                    color:
                      attendanceRate >= 80
                        ? '#52c41a'
                        : attendanceRate >= 50
                        ? '#faad14'
                        : '#f5222d',
                    fontSize: 28,
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Card style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
              Attendance rate:
            </Text>
            <Progress
              percent={attendanceRate}
              status="active"
              strokeColor={
                attendanceRate >= 80
                  ? '#52c41a'
                  : attendanceRate >= 50
                  ? '#faad14'
                  : '#f5222d'
              }
              strokeWidth={12}
            />
          </Card>

          {currentInterval && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Updates every {(currentInterval / 1000).toFixed(1)}s
              </Text>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
};

export default StatisticsPanel;

