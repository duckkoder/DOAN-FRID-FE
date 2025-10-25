/**
 * Attendance Camera Component
 * Sử dụng WebSocket trực tiếp tới AI-Service để stream frames
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Button,
  Space,
  Card,
  List,
  Avatar,
  Tag,
  Badge,
  Statistic,
  Row,
  Col,
  Alert,
  Typography,
  Progress,
} from 'antd';
import {
  CameraOutlined,
  StopOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { startAttendanceSessionWithAI, endAttendanceSession, type AISessionResponse } from '../apis/attendanceAPIs/attendanceAPIs';
import { AIWebSocketClient, type DetectionInfo, type ValidatedStudent } from '../services/aiWebSocket';
import { useSmartPolling } from '../hooks/useSmartPolling';

const { Text } = Typography;

interface AttendanceCameraProps {
  classId: number;
  visible: boolean;
  onClose: () => void;
  onSessionEnd?: () => void;
  dayOfWeek?: number;
  periodRange?: string;
  sessionIndex?: number;
}

const AttendanceCamera: React.FC<AttendanceCameraProps> = ({
  classId,
  visible,
  onClose,
  onSessionEnd,
  dayOfWeek,
  periodRange,
  sessionIndex,
}) => {
  // States
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<AISessionResponse | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Detection & Recognition states
  const [detections, setDetections] = useState<DetectionInfo[]>([]);
  const [validatedStudents, setValidatedStudents] = useState<ValidatedStudent[]>([]);
  const [totalFaces, setTotalFaces] = useState(0);
  const [fps, setFps] = useState(0);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsClientRef = useRef<AIWebSocketClient | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const fpsCounterRef = useRef({ count: 0, lastTime: Date.now() });
  const isProcessingFrameRef = useRef(false); // ✅ Track nếu đang xử lý frame

  // Smart polling cho attendance records từ Backend
  const { data: attendanceData, currentInterval } = useSmartPolling({
    sessionId: sessionInfo?.session_id || null,
    enabled: sessionInfo !== null && wsConnected,
  });

  /**
   * Start attendance session
   */
  const handleStartSession = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[StartSession] Creating session...');

      // 1. Create session với Backend → nhận WebSocket info
      const response = await startAttendanceSessionWithAI({
        class_id: classId,
        session_name: `Điểm danh ${new Date().toLocaleString('vi-VN')}`,
        late_threshold_minutes: 15,
        location: 'Classroom',
        day_of_week: dayOfWeek,
        period_range: periodRange,
        session_index: sessionIndex,
      });

      console.log('[StartSession] Session created:', response);
      setSessionInfo(response);

      // 2. Start camera
      await startCamera();

      // 3. Connect WebSocket to AI-Service
      await connectWebSocket(response);

      // 4. Start sending frames
      startFrameCapture();

    } catch (err: any) {
      console.error('[StartSession] Error:', err);
      setError(err.response?.data?.detail || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start camera
   */
  const startCamera = async () => {
    try {
      console.log('[Camera] Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      console.log('[Camera] Camera started');

    } catch (err) {
      console.error('[Camera] Error:', err);
      throw new Error('Không thể truy cập camera');
    }
  };

  /**
   * Connect WebSocket to AI-Service
   */
  const connectWebSocket = async (sessionInfo: AISessionResponse) => {
    try {
      console.log('[WebSocket] Connecting to AI-Service...');

      const wsClient = new AIWebSocketClient();
      wsClientRef.current = wsClient;

      // Setup event handlers
      wsClient.onConnected(() => {
        console.log('[WebSocket] Connected!');
        setWsConnected(true);
        setError(null);
      });

      wsClient.onDisconnected((code, reason) => {
        console.log('[WebSocket] Disconnected:', code, reason);
        setWsConnected(false);
        
        if (code === 1008) {
          setError('Session không hợp lệ hoặc đã hết hạn');
        }
      });

      wsClient.onFrameProcessed((detections, totalFaces) => {
        // console.log('[WebSocket] Frame processed:', detections.length, 'faces,', totalFaces, 'total');
        // console.log('[WebSocket] Detection details:', JSON.stringify(detections, null, 2));
        setDetections(detections);
        setTotalFaces(totalFaces);
        
        // ✅ Mark frame processing complete
        isProcessingFrameRef.current = false;
        
        // Update FPS counter
        fpsCounterRef.current.count++;
        const now = Date.now();
        if (now - fpsCounterRef.current.lastTime >= 1000) {
          setFps(fpsCounterRef.current.count);
          fpsCounterRef.current.count = 0;
          fpsCounterRef.current.lastTime = now;
        }
      });

      wsClient.onStudentValidated((student) => {
        console.log('[WebSocket] Student validated:', student.student_name);
        
        // Add to validated list (check duplicate)
        setValidatedStudents(prev => {
          const exists = prev.some(s => s.student_code === student.student_code);
          if (!exists) {
            return [...prev, student];
          }
          return prev;
        });
      });

      wsClient.onSessionStatus((status, stats) => {
        console.log('[WebSocket] Session status:', status, stats);
      });

      wsClient.onError((errorMsg) => {
        console.error('[WebSocket] Error:', errorMsg);
        setError(errorMsg);
      });

      // Connect
      await wsClient.connect(sessionInfo.ai_ws_url, sessionInfo.ai_ws_token);

    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
      throw new Error('Không thể kết nối tới AI-Service');
    }
  };

  /**
   * Start capturing and sending frames
   */
  const startFrameCapture = () => {
    console.log('[FrameCapture] Starting frame capture at 10 FPS...');

    frameIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !wsClientRef.current?.isConnected()) {
        return;
      }

      // ✅ BACKPRESSURE: Skip nếu frame trước chưa xử lý xong
      if (isProcessingFrameRef.current) {
        console.log('[FrameCapture] Skipping - previous frame still processing');
        return;
      }

      try {
        // Mark as processing
        isProcessingFrameRef.current = true;
        
        // Capture frame
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          isProcessingFrameRef.current = false;
          return;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob && wsClientRef.current) {
            wsClientRef.current.sendFrame(blob);
          } else {
            // Failed to create blob - reset flag
            isProcessingFrameRef.current = false;
          }
        }, 'image/jpeg', 0.8);

      } catch (err) {
        console.error('[FrameCapture] Error:', err);
        isProcessingFrameRef.current = false;
      }
    }, 100); // 10 FPS interval, nhưng có thể skip nếu chưa xử lý xong
  };

  /**
   * Draw bounding boxes on overlay canvas - WITH PROPER ASPECT RATIO SCALING
   */
  useEffect(() => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    
    if (!video || !canvas) {
      console.log('[Canvas] Missing refs');
      return;
    }

    // Get video element display size (getBoundingClientRect)
    const rect = video.getBoundingClientRect();
    
    // Set canvas size to match video display size
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('[Canvas] Failed to get 2d context');
      return;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If no detections, exit early
    if (detections.length === 0) return;

    // Calculate aspect ratio and scaling
    // Video actual resolution
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    if (videoWidth === 0 || videoHeight === 0) {
      console.log('[Canvas] Video not ready yet');
      return;
    }

    const videoAspect = videoWidth / videoHeight;
    const displayAspect = rect.width / rect.height;
    
    let renderWidth, renderHeight, offsetX, offsetY;
    
    if (videoAspect > displayAspect) {
      // Video is wider - fit to width (letterbox top/bottom)
      renderWidth = rect.width;
      renderHeight = rect.width / videoAspect;
      offsetX = 0;
      offsetY = (rect.height - renderHeight) / 2;
    } else {
      // Video is taller - fit to height (pillarbox left/right)
      renderHeight = rect.height;
      renderWidth = rect.height * videoAspect;
      offsetX = (rect.width - renderWidth) / 2;
      offsetY = 0;
    }
    
    // Calculate scale factors
    const scaleX = renderWidth / videoWidth;
    const scaleY = renderHeight / videoHeight;
    
    console.log('[Canvas] Scaling info:', {
      videoResolution: `${videoWidth}x${videoHeight}`,
      displaySize: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
      renderSize: `${renderWidth.toFixed(0)}x${renderHeight.toFixed(0)}`,
      offset: `${offsetX.toFixed(0)}, ${offsetY.toFixed(0)}`,
      scale: `${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}`,
      detections: detections.length
    });
    
    // Draw each detection
    detections.forEach((detection) => {
      const [x1, y1, x2, y2] = detection.bbox;
      
      // Scale coordinates to rendered video size and add offset
      const displayX1 = x1 * scaleX + offsetX;
      const displayY1 = y1 * scaleY + offsetY;
      const displayX2 = x2 * scaleX + offsetX;
      const displayY2 = y2 * scaleY + offsetY;
      const width = displayX2 - displayX1;
      const height = displayY2 - displayY1;
      
      // Determine color based on validation status
      const color = detection.is_validated ? '#52c41a' : '#1890ff';
      const lineWidth = detection.is_validated ? 3 : 2;
      const confidence = detection.confidence || 0;
      
      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(displayX1, displayY1, width, height);
      
      // Draw label if student recognized
      if (detection.student_name) {
        const label = `${detection.student_name} (${(confidence * 100).toFixed(1)}%)`;
        
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width + 10;
        const textHeight = 20;
        
        // Draw label background
        ctx.fillStyle = color;
        ctx.fillRect(displayX1, displayY1 - textHeight - 5, textWidth, textHeight);
        
        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, displayX1 + 5, displayY1 - 10);
      }
      
      // Draw track ID if available
      if (detection.track_id) {
        const trackLabel = `#${detection.track_id}`;
        ctx.fillStyle = color;
        ctx.fillRect(displayX2 - 40, displayY1, 40, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(trackLabel, displayX2 - 35, displayY1 + 14);
      }
    });
  }, [detections]);

  /**
   * Stop session
   */
  const handleStopSession = async () => {
    // Prevent duplicate calls
    if (loading || !sessionInfo) {
      console.log('[StopSession] Already stopping or no session');
      return;
    }

    try {
      setLoading(true);

      // Stop frame capture
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      
      // ✅ Reset processing flag
      isProcessingFrameRef.current = false;

      // Disconnect WebSocket
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // End session in Backend
      await endAttendanceSession(sessionInfo.session_id, { mark_absent: true });

      setCameraActive(false);
      setWsConnected(false);
      setSessionInfo(null); // Clear session info to prevent duplicate calls
      
      onSessionEnd?.();

    } catch (err: any) {
      console.error('[StopSession] Error:', err);
      setError(err.response?.data?.detail || 'Failed to stop session');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleModalClose = () => {
    if (sessionInfo) {
      Modal.confirm({
        title: 'Phiên điểm danh đang diễn ra',
        icon: <ExclamationCircleOutlined />,
        content: 'Bạn có muốn kết thúc phiên điểm danh không?',
        okText: 'Kết thúc',
        cancelText: 'Tiếp tục',
        onOk: handleStopSession,
      });
    } else {
      onClose();
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Update canvas size on window resize
   */
  useEffect(() => {
    const updateCanvasSize = () => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      
      if (video && canvas) {
        const rect = video.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        console.log('[Canvas] Size updated:', { width: rect.width, height: rect.height });
      }
    };
    
    // Listen for window resize
    window.addEventListener('resize', updateCanvasSize);
    
    // Initial size update
    updateCanvasSize();
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []); // ✅ Empty dependency - chỉ setup listener một lần

  return (
    <Modal
      title="Điểm danh bằng AI"
      open={visible}
      onCancel={handleModalClose}
      width={1200}
      footer={null}
      destroyOnClose
    >
      {error && (
        <Alert
          message="Lỗi"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        {/* Camera View */}
        <Col span={16}>
          <Card
            title={
              <Space>
                <CameraOutlined />
                <span>Camera</span>
                {wsConnected && (
                  <Tag icon={<WifiOutlined />} color="success">
                    Connected
                  </Tag>
                )}
                {!wsConnected && sessionInfo && (
                  <Tag icon={<DisconnectOutlined />} color="warning">
                    Disconnected
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Space>
                <Text type="secondary">{fps} FPS</Text>
                <Text type="secondary">Faces: {totalFaces}</Text>
              </Space>
            }
          >
            <div 
              style={{ 
                position: 'relative', 
                width: '100%', 
                height: '450px', // ✅ Fixed height thay vì paddingTop
                backgroundColor: '#000',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <video
                ref={videoRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: cameraActive ? 'block' : 'none',
                }}
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={overlayCanvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {!cameraActive && (
                <div 
                  style={{ 
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}
                >
                  <CameraOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">Camera chưa bật</Text>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              {!sessionInfo ? (
                <Button
                  type="primary"
                  icon={<CameraOutlined />}
                  onClick={handleStartSession}
                  loading={loading}
                  block
                  size="large"
                >
                  Bắt đầu điểm danh
                </Button>
              ) : (
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={handleStopSession}
                  loading={loading}
                  block
                  size="large"
                >
                  Kết thúc điểm danh
                </Button>
              )}
            </div>
          </Card>
        </Col>

        {/* Statistics & Student List */}
        <Col span={8}>
          {/* Statistics */}
          <Card title="Thống kê" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Đã xác nhận"
                  value={attendanceData?.statistics.present || 0}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Tổng số"
                  value={attendanceData?.statistics.total_students || 0}
                  prefix={<UserOutlined />}
                />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Tỷ lệ điểm danh:</Text>
              <Progress
                percent={attendanceData?.statistics.attendance_rate || 0}
                status="active"
              />
            </div>
            {currentInterval && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Polling: {(currentInterval / 1000).toFixed(1)}s
                </Text>
              </div>
            )}
          </Card>

          {/* Validated Students */}
          <Card
            title="Sinh viên đã xác nhận"
            extra={<Badge count={validatedStudents.length} showZero />}
          >
            <List
              dataSource={validatedStudents}
              renderItem={(student) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        style={{ backgroundColor: '#52c41a' }}
                        icon={<UserOutlined />}
                      />
                    }
                    title={student.student_name}
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary">{student.student_code}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Confidence: {(student.avg_confidence * 100).toFixed(1)}%
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Frames: {student.frame_count}/{student.recognition_count}
                        </Text>
                      </Space>
                    }
                  />
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                </List.Item>
              )}
              locale={{ emptyText: 'Chưa có sinh viên nào được xác nhận' }}
              style={{ maxHeight: 400, overflow: 'auto' }}
            />
          </Card>
        </Col>
      </Row>
    </Modal>
  );
};

export default AttendanceCamera;
