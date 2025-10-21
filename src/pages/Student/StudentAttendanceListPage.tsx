import React, { useState, useEffect, useRef } from "react";
import {
  Typography,
  Card,
  Button,
  Tag,
  Space,
  Statistic,
  Table,
  Spin,
  Alert,
  message,
  Progress
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WifiOutlined,
  DisconnectOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";
import { 
  getCurrentSessionAttendance,
  connectAttendanceWebSocket,
  getAttendanceStatusColor,
  getAttendanceStatusText,
  type SessionAttendanceResponse,
  type StudentAttendanceInfo,
  type WSAttendanceUpdate
} from "../../apis/attendanceAPIs/studentAttendance";

const { Title, Text } = Typography;

const StudentAttendanceListPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ classId: string }>();
  const classId = parseInt(params.classId || "0", 10);

  // State management
  const [attendanceSession, setAttendanceSession] = useState<SessionAttendanceResponse['session'] | null>(null);
  const [attendanceList, setAttendanceList] = useState<StudentAttendanceInfo[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<SessionAttendanceResponse['stats'] | null>(null);
  const [myStudentId, setMyStudentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Breadcrumb
  const breadcrumbItems = [
    { title: "Dashboard", href: "/student" },
    { title: "Classes", href: "/student/classes" },
    { title: "Chi tiết lớp", href: `/student/classes/${classId}` },
    { title: "Điểm danh realtime" }
  ];

  // Fetch attendance session on mount
  useEffect(() => {
    if (classId) {
      fetchAttendanceSession();
    }
  }, [classId]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        console.log('Closing WebSocket connection');
        wsRef.current.close();
      }
    };
  }, []);

  // Fetch attendance session
  const fetchAttendanceSession = async () => {
    setLoading(true);
    try {
      const response = await getCurrentSessionAttendance(classId);
      console.log("Current attendance session:", response);
      
      if (response.has_active_session && response.session) {
        setAttendanceSession(response.session);
        setAttendanceList(response.students);
        setAttendanceStats(response.stats);
        setMyStudentId(response.my_student_id);
        
        // Connect WebSocket for real-time updates
        connectWebSocket(response.session.id);
      } else {
        // No active session
        message.info('Hiện tại không có phiên điểm danh nào đang diễn ra');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch attendance session:', err);
      message.error('Không thể tải danh sách điểm danh');
    } finally {
      setLoading(false);
    }
  };

  // Connect to WebSocket for real-time updates
  const connectWebSocket = (sessionId: number) => {
    try {
      const ws = connectAttendanceWebSocket(sessionId);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected to session:', sessionId);
        setWsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data: WSAttendanceUpdate = JSON.parse(event.data);
          console.log('📨 WebSocket message:', data);
          
          // Handle attendance_update messages
          if (data.type === 'attendance_update') {
            // Update the student in the list
            setAttendanceList(prevList => {
              const studentIndex = prevList.findIndex(
                s => s.student_id === data.student.student_id
              );
              
              if (studentIndex !== -1) {
                // Update existing student
                const updatedList = [...prevList];
                updatedList[studentIndex] = {
                  ...updatedList[studentIndex],
                  is_present: true,
                  status: data.student.status,
                  recorded_at: data.student.recorded_at,
                  confidence_score: data.student.confidence_score
                };
                
                // Re-sort: attended first
                updatedList.sort((a, b) => {
                  if (a.is_present !== b.is_present) {
                    return a.is_present ? -1 : 1;
                  }
                  return a.full_name.localeCompare(b.full_name);
                });
                
                return updatedList;
              }
              
              return prevList;
            });
            
            // Update stats
            setAttendanceStats(prevStats => {
              if (!prevStats) return prevStats;
              return {
                ...prevStats,
                present_count: prevStats.present_count + 1,
                absent_count: prevStats.absent_count - 1
              };
            });
            
            // Show notification if it's the current user
            if (data.student.student_id === myStudentId) {
              message.success({
                content: `✅ Bạn đã được điểm danh lúc ${new Date(data.student.recorded_at).toLocaleTimeString('vi-VN')}`,
                duration: 5
              });
            } else {
              // Show subtle notification for other students
              message.info({
                content: `${data.student.full_name} vừa được điểm danh`,
                duration: 2
              });
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'MSSV',
      dataIndex: 'student_code',
      key: 'student_code',
      width: 120,
      fixed: 'left' as const,
      render: (code: string) => <strong>{code}</strong>
    },
    {
      title: 'Họ và tên',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 200,
      fixed: 'left' as const,
      render: (name: string, record: StudentAttendanceInfo) => (
        <span>
          {name}
          {record.student_id === myStudentId && (
            <Tag color="blue" style={{ marginLeft: 8 }}>Bạn</Tag>
          )}
        </span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_present',
      key: 'status',
      width: 150,
      filters: [
        { text: 'Đã điểm danh', value: true },
        { text: 'Chưa điểm danh', value: false }
      ],
      onFilter: (value: any, record: StudentAttendanceInfo) => record.is_present === value,
      render: (_: boolean, record: StudentAttendanceInfo) => {
        if (record.is_present && record.status) {
          return (
            <Tag color={getAttendanceStatusColor(record.status)} icon={<CheckCircleOutlined />}>
              {getAttendanceStatusText(record.status)}
            </Tag>
          );
        }
        return (
          <Tag color="default" icon={<ClockCircleOutlined />}>
            Chưa điểm danh
          </Tag>
        );
      }
    },
    {
      title: 'Thời gian',
      dataIndex: 'recorded_at',
      key: 'recorded_at',
      width: 120,
      sorter: (a: StudentAttendanceInfo, b: StudentAttendanceInfo) => {
        if (!a.recorded_at) return 1;
        if (!b.recorded_at) return -1;
        return new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime();
      },
      render: (time: string | null) => {
        if (!time) return <Text type="secondary">-</Text>;
        return new Date(time).toLocaleTimeString('vi-VN');
      }
    },
    {
      title: 'Độ tin cậy',
      dataIndex: 'confidence_score',
      key: 'confidence_score',
      width: 120,
      sorter: (a: StudentAttendanceInfo, b: StudentAttendanceInfo) => {
        return (a.confidence_score || 0) - (b.confidence_score || 0);
      },
      render: (score: number | null) => {
        if (!score) return <Text type="secondary">-</Text>;
        const percentage = (score * 100).toFixed(1);
        const color = score >= 0.8 ? '#52c41a' : score >= 0.6 ? '#faad14' : '#ff4d4f';
        return (
          <span style={{ color, fontWeight: 500 }}>
            {percentage}%
          </span>
        );
      }
    }
  ];

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
        padding: "32px 48px",
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Spin size="large" tip="Đang tải danh sách điểm danh..." />
      </div>
    );
  }

  // No active session
  if (!attendanceSession) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
        padding: "32px 48px"
      }}>
        <Breadcrumb items={breadcrumbItems} />
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/student/classes/${classId}`)}
          style={{ borderRadius: 8, marginBottom: 16 }}
        >
          Quay lại lớp học
        </Button>
        <Alert
          message="Không có phiên điểm danh nào đang diễn ra"
          description="Hiện tại lớp học này chưa có phiên điểm danh nào. Vui lòng quay lại sau khi giáo viên bắt đầu điểm danh."
          type="info"
          showIcon
        />
      </div>
    );
  }

  const attendancePercentage = attendanceStats 
    ? Math.round((attendanceStats.present_count / attendanceStats.total_students) * 100)
    : 0;

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
      padding: "32px 48px" 
    }}>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/student/classes/${classId}`)}
          style={{ borderRadius: 8, marginBottom: 16 }}
        >
          Quay lại lớp học
        </Button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0, color: "#2563eb" }}>
            📹 {attendanceSession.session_name}
          </Title>
          
          <Space>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchAttendanceSession}
              disabled={loading}
            >
              Làm mới
            </Button>
          </Space>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <Card style={{ borderRadius: 12 }}>
          <Statistic
            title="Tổng số sinh viên"
            value={attendanceStats?.total_students || 0}
            prefix="👥"
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
        
        <Card style={{ borderRadius: 12 }}>
          <Statistic
            title="Đã điểm danh"
            value={attendanceStats?.present_count || 0}
            suffix={`/ ${attendanceStats?.total_students || 0}`}
            prefix="✅"
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
        
        <Card style={{ borderRadius: 12 }}>
          <Statistic
            title="Chưa điểm danh"
            value={attendanceStats?.absent_count || 0}
            prefix="⏳"
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
        
        <Card style={{ borderRadius: 12 }}>
          <Statistic
            title="Tỷ lệ"
            value={attendancePercentage}
            suffix="%"
            prefix="📊"
            valueStyle={{ color: attendancePercentage >= 80 ? '#52c41a' : '#faad14' }}
          />
          <Progress 
            percent={attendancePercentage} 
            size="small" 
            showInfo={false}
            strokeColor={attendancePercentage >= 80 ? '#52c41a' : '#faad14'}
            style={{ marginTop: 8 }}
          />
        </Card>
      </div>

      {/* Main Table */}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Danh sách sinh viên</span>
            <Space>
              {wsConnected ? (
                <Tag color="success" icon={<WifiOutlined />}>
                  Đang cập nhật realtime
                </Tag>
              ) : (
                <Tag color="default" icon={<DisconnectOutlined />}>
                  Mất kết nối
                </Tag>
              )}
              <Text type="secondary">
                Bắt đầu: {new Date(attendanceSession.start_time).toLocaleTimeString('vi-VN')}
              </Text>
            </Space>
          </div>
        }
        style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      >
        <Table
          columns={columns}
          dataSource={attendanceList}
          rowKey="student_id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} sinh viên`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          size="middle"
          bordered
          rowClassName={(record) => 
            record.student_id === myStudentId ? 'highlighted-row' : ''
          }
          scroll={{ x: 800 }}
        />
        
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary">
            💡 Danh sách tự động cập nhật khi AI nhận diện sinh viên
          </Text>
        </div>
      </Card>

      {/* Custom CSS for highlighted row */}
      <style>{`
        .highlighted-row {
          background-color: rgba(24, 144, 255, 0.08) !important;
        }
        .highlighted-row:hover {
          background-color: rgba(24, 144, 255, 0.12) !important;
        }
      `}</style>
    </div>
  );
};

export default StudentAttendanceListPage;
