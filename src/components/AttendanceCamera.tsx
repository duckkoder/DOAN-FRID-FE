/**
 * AttendanceCamera Component
 * Component điểm danh real-time sử dụng camera
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
  Spin,
  Typography,
} from 'antd';
import {
  CameraOutlined,
  StopOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  startAttendanceSession,
  recognizeFrame,
  endAttendanceSession,
  connectAttendanceWebSocket,
  frameToBase64,
  type RecognizedStudent,
  type EndSessionResponse,
  type Detection,
} from '../apis/attendanceAPIs/attendanceAPIs';

const { Text } = Typography;

interface AttendanceCameraProps {
  classId: number;
  visible: boolean;
  onClose: () => void;
  onSessionEnd?: (result: EndSessionResponse) => void;
}

const AttendanceCamera: React.FC<AttendanceCameraProps> = ({
  classId,
  visible,
  onClose,
  onSessionEnd,
}) => {
  // States
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState<RecognizedStudent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]); // Thêm state để lưu detections

  // ✅ Handler để xử lý khi user muốn đóng modal
  const handleModalClose = () => {
    console.log('[ModalClose] User wants to close, sessionId:', sessionId);
    
    if (sessionId !== null) {
      // Có session đang chạy - hiện cảnh báo
      Modal.confirm({
        title: 'Phiên điểm danh đang diễn ra',
        icon: <ExclamationCircleOutlined />,
        content: 'Bạn có muốn kết thúc phiên điểm danh trước khi đóng không?',
        okText: 'Kết thúc phiên',
        cancelText: 'Tiếp tục điểm danh',
        onOk: async () => {
          console.log('[ModalClose] User chose to end session');
          await handleEndSession();
        },
        onCancel: () => {
          console.log('[ModalClose] User chose to continue');
        },
      });
    } else {
      // Không có session - đóng bình thường
      console.log('[ModalClose] No active session, closing normally');
      onClose();
    }
  };

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // Canvas để vẽ bbox
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<number | null>(null);
  const cameraStartedRef = useRef<boolean>(false); // Use ref instead of state
  const sessionIdRef = useRef<number | null>(null); // ✅ Thêm ref để lưu sessionId

  // Statistics
  const stats = {
    total: recognizedStudents.length,
    present: recognizedStudents.filter((s) => s.status === 'present').length,
    late: recognizedStudents.filter((s) => s.status === 'late').length,
  };

  // ============= Camera Functions =============

  // Hàm vẽ bounding boxes và thông tin lên canvas overlay
  const drawDetections = (detections: Detection[]) => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    
    if (!video || !canvas) return;
    
    // Get video element dimensions
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate actual video dimensions and offset when using objectFit: 'contain'
    const videoAspect = video.videoWidth / video.videoHeight;
    const displayAspect = rect.width / rect.height;
    
    let renderWidth, renderHeight, offsetX, offsetY;
    
    if (videoAspect > displayAspect) {
      // Video is wider - fit to width
      renderWidth = rect.width;
      renderHeight = rect.width / videoAspect;
      offsetX = 0;
      offsetY = (rect.height - renderHeight) / 2;
    } else {
      // Video is taller - fit to height
      renderHeight = rect.height;
      renderWidth = rect.height * videoAspect;
      offsetX = (rect.width - renderWidth) / 2;
      offsetY = 0;
    }
    
    // Calculate scale factors based on rendered video size
    const scaleX = renderWidth / video.videoWidth;
    const scaleY = renderHeight / video.videoHeight;
    
    console.log('[DrawDetections]', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      displayWidth: rect.width,
      displayHeight: rect.height,
      renderWidth,
      renderHeight,
      offsetX,
      offsetY,
      scaleX,
      scaleY,
      numDetections: detections.length
    });
    
    // Draw each detection
    detections.forEach((detection) => {
      const [x1, y1, x2, y2] = detection.bbox;
      
      console.log('[DrawDetections] Detection:', {
        original: detection.bbox,
        studentId: detection.student_id,
        confidence: detection.confidence
      });
      
      // Scale coordinates to rendered video size and add offset
      const displayX1 = x1 * scaleX + offsetX;
      const displayY1 = y1 * scaleY + offsetY;
      const displayX2 = x2 * scaleX + offsetX;
      const displayY2 = y2 * scaleY + offsetY;
      const width = displayX2 - displayX1;
      const height = displayY2 - displayY1;
      
      console.log('[DrawDetections] Scaled:', {
        displayX1,
        displayY1,
        displayX2,
        displayY2,
        width,
        height
      });
      
      // Determine color based on recognition status
      const isRecognized = detection.student_id;
      const boxColor = isRecognized ? '#52c41a' : '#1890ff'; // Green if recognized, blue otherwise
      const confidence = detection.recognition_confidence || detection.confidence;
      
      // Draw bounding box
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(displayX1, displayY1, width, height);
      
      // Draw label background
      const label = isRecognized 
        ? `${detection.student_name || detection.student_code || detection.student_id} (${(confidence * 100).toFixed(1)}%)`
        : `Unknown (${(confidence * 100).toFixed(1)}%)`;
      
      ctx.font = 'bold 14px Arial';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width + 10;
      const textHeight = 20;
      
      // Draw label background
      ctx.fillStyle = boxColor;
      ctx.fillRect(displayX1, displayY1 - textHeight - 5, textWidth, textHeight);
      
      // Draw label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, displayX1 + 5, displayY1 - 10);
      
      // Draw track ID if available
      if (detection.track_id) {
        const trackLabel = `#${detection.track_id}`;
        ctx.fillStyle = boxColor;
        ctx.fillRect(displayX2 - 40, displayY1, 40, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(trackLabel, displayX2 - 35, displayY1 + 14);
      }
    });
  };

  const startCamera = async () => {
    return new Promise<void>((resolve, reject) => {
      console.log('[Camera] Requesting camera access...');
      
      navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      })
      .then((stream) => {
        console.log('[Camera] Stream received:', stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            console.log('[Camera] Video metadata loaded');
            cameraStartedRef.current = true; // Use ref
            console.log('[Camera] Camera started successfully!');
            resolve(); // Resolve promise khi camera thực sự ready
          };
        } else {
          console.error('[Camera] videoRef.current is null!');
          reject(new Error('Video ref is null'));
        }
      })
      .catch((err) => {
        console.error('[Camera] Error starting camera:', err);
        setError('Không thể bật camera. Vui lòng kiểm tra quyền truy cập.');
        reject(err);
      });
    });
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    cameraStartedRef.current = false; // Use ref
  };

  // ============= Session Functions =============

  const handleStartSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Bắt đầu phiên điểm danh
      const session = await startAttendanceSession({
        class_id: classId,
        late_threshold_minutes: 15,
      });

      setSessionId(session.id);
      sessionIdRef.current = session.id; // ✅ Cập nhật ref

      // 2. Kết nối WebSocket
      const ws = connectAttendanceWebSocket(
        session.id,
        (data) => {
          console.log('[WebSocket] Received:', data);

          // Handle attendance_update
          if (data.type === 'attendance_update' && data.student) {
            setRecognizedStudents((prev) => {
              // Check if student already in list
              const exists = prev.find((s) => s.student_id === data.student.student_id);
              if (exists) return prev;

              // Add new student
              return [...prev, data.student];
            });
          }
        },
        (error) => {
          console.error('[WebSocket] Error:', error);
        }
      );

      wsRef.current = ws;

      // 3. Bật camera
      await startCamera();

      // 4. Bắt đầu gửi frames
      startRecognition();

      setLoading(false);
    } catch (err: any) {
      console.error('Error starting session:', err);
      setError(err.response?.data?.detail || 'Không thể bắt đầu phiên điểm danh');
      setLoading(false);
    }
  };

  const startRecognition = () => {
    console.log('[Recognition] Starting recognition loop...');
    
    // Gửi frame mỗi 2 giây
    const interval = setInterval(async () => {
      const currentSessionId = sessionIdRef.current; // ✅ Lấy sessionId từ ref
      console.log('[Recognition] Interval tick - sessionId:', currentSessionId, 'videoRef:', !!videoRef.current, 'cameraStarted:', cameraStartedRef.current);
      
      // ✅ Kiểm tra sessionId vẫn còn active (không null)
      if (!currentSessionId) {
        console.log('[Recognition] Skipping - session ended');
        return;
      }
      
      if (!videoRef.current || !cameraStartedRef.current) {
        console.log('[Recognition] Skipping - video not ready');
        return;
      }

      try {
        setRecognizing(true);
        console.log('[Recognition] Capturing frame...');

         // Capture frame
         const imageBase64 = frameToBase64(videoRef.current, canvasRef.current || undefined);
         console.log('[Recognition] Frame captured:', {
           imageSize: imageBase64.length,
           videoWidth: videoRef.current.videoWidth,
           videoHeight: videoRef.current.videoHeight
         });

        // Send to backend - use sessionId from ref
        console.log('[Recognition] Sending to backend with sessionId:', currentSessionId);
        const result = await recognizeFrame(currentSessionId, imageBase64);
        console.log('[Recognition] Backend response:', result);

        // Update detections state to draw on canvas
        if (result.detections && result.detections.length > 0) {
          console.log('[Recognition] Received detections:', result.detections);
          setDetections(result.detections);
          drawDetections(result.detections);
        } else {
          // Clear detections if no faces detected
          console.log('[Recognition] No detections received');
          setDetections([]);
          drawDetections([]);
        }

        // Update recognized students from response (backup nếu WebSocket chậm)
        if (result.students_recognized.length > 0) {
          setRecognizedStudents((prev) => {
            const newStudents = result.students_recognized.filter(
              (newStudent) => !prev.find((s) => s.student_id === newStudent.student_id)
            );
            return [...prev, ...newStudents];
          });
        }
      } catch (err: any) {
        console.error('[Recognition] Error:', err);
        // Don't show error for every frame failure
      } finally {
        setRecognizing(false);
      }
    }, 2000); // 2 seconds

    intervalRef.current = interval;
  };

  const stopRecognition = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);

      // Stop recognition and camera
      stopRecognition();
      stopCamera();

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // End session
      const result = await endAttendanceSession(sessionId, {
        mark_absent: true,
      });

      // ✅ Reset sessionId để đảm bảo có thể bắt đầu phiên mới
      setSessionId(null);
      sessionIdRef.current = null; // ✅ Reset ref
      setRecognizedStudents([]);
      setDetections([]); // Clear detections
      
      // Clear overlay canvas
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      }

      // Callback
      if (onSessionEnd) {
        onSessionEnd(result);
      }

      // Close modal
      onClose();
    } catch (err: any) {
      console.error('Error ending session:', err);
      setError(err.response?.data?.detail || 'Không thể kết thúc phiên');
    } finally {
      setLoading(false);
    }
  };

  // ============= Effects =============

  // Update canvas overlay size when video size changes
  useEffect(() => {
    const updateCanvasSize = () => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      
      if (video && canvas) {
        const rect = video.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Redraw detections after resize
        if (detections.length > 0) {
          drawDetections(detections);
        }
      }
    };
    
    // Listen for window resize
    window.addEventListener('resize', updateCanvasSize);
    
    // Initial size update
    updateCanvasSize();
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [detections]);

  // Cleanup when modal closes - end session if still active
  useEffect(() => {
    if (!visible && sessionIdRef.current !== null) {
      // Modal đóng nhưng session vẫn đang chạy - cleanup
      console.log('[Cleanup] Modal closed with active session, cleaning up...');
      
      const cleanup = async () => {
        const currentSessionId = sessionIdRef.current;
        if (!currentSessionId) return;

        try {
          // Stop recognition and camera immediately
          stopRecognition();
          stopCamera();

          // Close WebSocket
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }

          // End session at backend
          await endAttendanceSession(currentSessionId, {
            mark_absent: true,
          });

          console.log('[Cleanup] Session ended successfully');
        } catch (err: any) {
          console.error('[Cleanup] Error ending session:', err);
        } finally {
          // Reset all states
          setSessionId(null);
          sessionIdRef.current = null;
          setRecognizedStudents([]);
          setDetections([]);
          setError(null);
          setRecognizing(false);
          setLoading(false);
        }
      };

      cleanup();
    } else if (!visible) {
      // Modal đóng và không có session - chỉ reset state
      setSessionId(null);
      sessionIdRef.current = null;
      setRecognizedStudents([]);
      setDetections([]);
      setError(null);
      setRecognizing(false);
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      console.log('[Unmount] Component unmounting, cleaning up...');
      
      stopRecognition();
      stopCamera();
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // If there's an active session when unmounting, try to end it
      if (sessionIdRef.current !== null) {
        console.log('[Unmount] Active session detected, attempting to end...');
        const sessionId = sessionIdRef.current;
        
        // Use navigator.sendBeacon or fetch with keepalive for cleanup during unload
        endAttendanceSession(sessionId, { mark_absent: true })
          .then(() => console.log('[Unmount] Session ended successfully'))
          .catch(err => console.error('[Unmount] Failed to end session:', err));
      }
    };
  }, []);

  // ============= Render =============

  return (
    <Modal
      title={
        <Space>
          <CameraOutlined />
          <span>Điểm danh bằng Camera</span>
          {sessionId && <Badge status="processing" text="Đang diễn ra" />}
        </Space>
      }
      open={visible}
      onCancel={handleModalClose}
      width={1000}
      footer={null}
      destroyOnClose
      maskClosable={false}
      keyboard={false}
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

      {sessionId && (
        <Alert
          message="Phiên điểm danh đang diễn ra"
          description="Vui lòng kết thúc phiên trước khi đóng modal để tránh mất dữ liệu."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={16}>
        {/* Camera View */}
        <Col span={14}>
          <Card
            title="Camera"
            extra={
              recognizing && <Spin size="small" tip="Đang nhận diện..." />
            }
          >
            <div style={{ position: 'relative', width: '100%', paddingTop: '75%' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain', // Changed from 'cover' to 'contain' to preserve aspect ratio
                  backgroundColor: '#000',
                  borderRadius: 8,
                }}
              />
              {/* Overlay canvas để vẽ bounding boxes */}
              <canvas
                ref={overlayCanvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none', // Allow clicks to pass through
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <Space style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
              {!sessionId ? (
                <Button
                  type="primary"
                  icon={<CameraOutlined />}
                  onClick={handleStartSession}
                  loading={loading}
                  size="large"
                >
                  Bắt đầu điểm danh
                </Button>
              ) : (
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={handleEndSession}
                  loading={loading}
                  size="large"
                >
                  Kết thúc phiên
                </Button>
              )}
            </Space>
          </Card>
        </Col>

        {/* Recognized Students */}
        <Col span={10}>
          <Card title="Sinh viên đã điểm danh" style={{ height: '100%' }}>
            {/* Statistics */}
            <Row gutter={8} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic
                  title="Tổng"
                  value={stats.total}
                  valueStyle={{ fontSize: 20 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Đúng giờ"
                  value={stats.present}
                  valueStyle={{ fontSize: 20, color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Trễ"
                  value={stats.late}
                  valueStyle={{ fontSize: 20, color: '#faad14' }}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>

            {/* List */}
            <List
              size="small"
              dataSource={recognizedStudents}
              locale={{ emptyText: 'Chưa có sinh viên nào được điểm danh' }}
              style={{ maxHeight: 400, overflow: 'auto' }}
              renderItem={(student) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={
                      <Space>
                        <Text strong>{student.full_name}</Text>
                        <Tag color={student.status === 'present' ? 'green' : 'orange'}>
                          {student.status === 'present' ? 'Đúng giờ' : 'Trễ'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary">
                          {student.student_code}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Độ tin cậy: {(student.confidence_score * 100).toFixed(1)}%
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </Modal>
  );
};

export default AttendanceCamera;

