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
  Tabs,
  Drawer,
  FloatButton,
} from 'antd';
import {
  CameraOutlined,
  StopOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WifiOutlined,
  DisconnectOutlined,
  BarChartOutlined,
  TeamOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { startAttendanceSessionWithAI, endAttendanceSession, type AISessionResponse } from '../apis/attendanceAPIs/attendanceAPIs';
import { AIWebSocketClient, type DetectionInfo, type ValidatedStudent } from '../services/aiWebSocket';
import { useSmartPolling } from '../hooks/useSmartPolling';

const { Text } = Typography;
const { TabPane } = Tabs;

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
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('camera');
  const [landscapePanel, setLandscapePanel] = useState<'stats' | 'students' | null>(null);
  const isBrowser = typeof window !== 'undefined';
  const isLandscapeMode = isMobile && isBrowser && window.innerWidth > window.innerHeight;
  
  // Camera state
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // 'user' = front, 'environment' = back
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsClientRef = useRef<AIWebSocketClient | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const fpsCounterRef = useRef({ count: 0, lastTime: Date.now() });
  const isProcessingFrameRef = useRef(false); // ✅ Track nếu đang xử lý frame
  const orientationRestartTimeoutRef = useRef<number | null>(null);
  const lastOrientationRef = useRef<'portrait' | 'landscape' | null>(null);
  const isRestartingRef = useRef(false);

  // Smart polling cho attendance records từ Backend
  const { data: attendanceData, currentInterval } = useSmartPolling({
    sessionId: sessionInfo?.session_id || null,
    enabled: sessionInfo !== null && wsConnected,
  });

  /**
   * Reset states when modal opens fresh (without active session)
   */
  useEffect(() => {
    if (visible && !sessionInfo) {
      // ✅ Reset tất cả states khi mở modal mới
      setDetections([]);
      setValidatedStudents([]);
      setTotalFaces(0);
      setFps(0);
      setError(null);
      setCameraActive(false);
      setWsConnected(false);
      setLandscapePanel(null);
    }
  }, [visible, sessionInfo]);

  // Reset landscape drawers when orientation changes back
  useEffect(() => {
    if (!isLandscapeMode) {
      setLandscapePanel(null);
    }
  }, [isLandscapeMode]);

  useEffect(() => {
    if (!visible) {
      setLandscapePanel(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!cameraActive) return;

    const getOrientation = () => (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    lastOrientationRef.current = getOrientation();

    const ensureVideoPlaying = () => {
      if (!videoRef.current) return;
      const playPromise = videoRef.current.play();
      playPromise?.catch(err => console.warn('[Camera] Replay failed after ensureVideoPlaying:', err));

      if (overlayCanvasRef.current) {
        const rect = videoRef.current.getBoundingClientRect();
        overlayCanvasRef.current.width = rect.width;
        overlayCanvasRef.current.height = rect.height;
      }
    };

    const restartCamera = async () => {
      if (isRestartingRef.current) return;
      isRestartingRef.current = true;
      try {
        await startCamera(facingMode);
        ensureVideoPlaying();
      } catch (err) {
        console.error('[Camera] Orientation restart failed:', err);
        setError('Không thể khởi động lại camera sau khi xoay thiết bị');
      } finally {
        if (orientationRestartTimeoutRef.current) {
          window.clearTimeout(orientationRestartTimeoutRef.current);
          orientationRestartTimeoutRef.current = null;
        }
        isRestartingRef.current = false;
      }
    };

    const scheduleAction = (shouldRestart: boolean) => {
      if (orientationRestartTimeoutRef.current) {
        window.clearTimeout(orientationRestartTimeoutRef.current);
      }
      orientationRestartTimeoutRef.current = window.setTimeout(() => {
        ensureVideoPlaying();
        if (shouldRestart) {
          void restartCamera();
        }
      }, shouldRestart ? 200 : 0);
    };

    const handleOrientationChange = () => {
      if (!cameraActive) return;
      const currentOrientation = getOrientation();
      const orientationChanged = lastOrientationRef.current !== currentOrientation;
      lastOrientationRef.current = currentOrientation;
      scheduleAction(orientationChanged);
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        scheduleAction(false);
      }
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (orientationRestartTimeoutRef.current) {
        window.clearTimeout(orientationRestartTimeoutRef.current);
        orientationRestartTimeoutRef.current = null;
      }
      isRestartingRef.current = false;
    };
  }, [cameraActive, facingMode]);

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
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      console.log('[Camera] Starting camera with facingMode:', mode);
      
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: mode,
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      console.log('[Camera] Camera started with facingMode:', mode);

    } catch (err) {
      console.error('[Camera] Error:', err);
      throw new Error('Không thể truy cập camera');
    }
  };

  /**
   * Toggle between front and back camera (mobile only)
   */
  const toggleCamera = async () => {
    if (!isMobile || !cameraActive) return;
    
    try {
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newMode);
      await startCamera(newMode);
      console.log('[Camera] Switched to', newMode === 'user' ? 'front' : 'back', 'camera');
    } catch (err) {
      console.error('[Camera] Toggle error:', err);
      setError('Không thể chuyển đổi camera');
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

      // ✅ Reset ALL states để tránh hiển thị data cũ
      setCameraActive(false);
      setWsConnected(false);
      setSessionInfo(null); // Clear session info to prevent duplicate calls
      setDetections([]); // Clear detections
      setValidatedStudents([]); // Clear validated students
      setTotalFaces(0); // Reset counters
      setFps(0);
      setError(null);
      
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
      // ✅ Reset states khi đóng modal (không có session active)
      setDetections([]);
      setValidatedStudents([]);
      setTotalFaces(0);
      setFps(0);
      setError(null);
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
   * Detect if device is mobile (not just based on width)
   */
  const detectMobileDevice = () => {
    // Check if device has touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check user agent for mobile keywords
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // Check screen size (both portrait and landscape)
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 768;
    
    // Device is mobile if it has touch AND (is in mobile UA OR has small screen in portrait)
    return hasTouch && (isMobileUA || smallScreen);
  };

  /**
   * Update canvas size on window resize and detect mobile
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
      
      // Detect mobile device (works in both portrait and landscape)
      const mobile = detectMobileDevice();
      setIsMobile(mobile);
      
      console.log('[Mobile Detection]', {
        isMobile: mobile,
        width: window.innerWidth,
        height: window.innerHeight,
        minDimension: Math.min(window.innerWidth, window.innerHeight),
        userAgent: navigator.userAgent,
        hasTouch: 'ontouchstart' in window
      });
    };
    
    // Listen for window resize and orientation change
    window.addEventListener('resize', updateCanvasSize);
    window.addEventListener('orientationchange', updateCanvasSize);
    
    // Initial size update
    updateCanvasSize();
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('orientationchange', updateCanvasSize);
    };
  }, []); // ✅ Run only once on mount

  /**
   * Auto switch to camera tab on mobile when session starts (only once)
   */
  useEffect(() => {
    if (isMobile && sessionInfo && activeTab !== 'camera') {
      setActiveTab('camera');
    }
  }, [isMobile, sessionInfo]); // Only run when isMobile or sessionInfo changes

  // Render Camera View
  const renderCameraView = () => {
    const isLandscape = isLandscapeMode;
    
    return (
      <Card
        title={
          isLandscape && isMobile ? null : (
            isMobile ? (
              // Compact title for mobile portrait
              <Space size={4}>
                <CameraOutlined style={{ fontSize: 14 }} />
                {wsConnected && <Tag icon={<WifiOutlined />} color="success" style={{ fontSize: 10, padding: '0 4px' }}>OK</Tag>}
              </Space>
            ) : (
              // Full title for desktop
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
            )
          )
        }
        extra={
          isLandscape && isMobile ? null : (
            <Space size={isMobile ? 4 : 8}>
              <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>
                {fps} FPS
              </Text>
              <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>
                Faces: {totalFaces}
              </Text>
            </Space>
          )
        }
        style={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: isLandscape && isMobile ? 'none' : undefined,
          boxShadow: isLandscape && isMobile ? 'none' : undefined,
          margin: isLandscape && isMobile ? 0 : undefined,
          background: isLandscape && isMobile ? 'transparent' : undefined,
          flex: 1
        }}
        bodyStyle={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: isLandscape && isMobile ? '0' : (isMobile ? '12px' : '16px'),
          overflow: 'hidden',
          paddingBottom: isLandscape && isMobile ? 0 : undefined,
          background: isLandscape && isMobile ? 'transparent' : undefined
        }}
        headStyle={
          isLandscape && isMobile ? { display: 'none' } : undefined
        }
      >
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          flex: 1,
          minHeight: 0,
          backgroundColor: '#000',
          borderRadius: isLandscape && isMobile ? '0' : '8px',
          overflow: 'hidden',
          marginBottom: isLandscape && isMobile ? 0 : 12
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
            objectFit: 'cover',
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
              width: '80%',
            }}
          >
            <CameraOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                {loading ? 'Đang khởi động camera...' : 'Camera chưa bật'}
              </Text>
            </div>
          </div>
        )}
        
        {/* Connection Status Overlay */}
        {sessionInfo && !wsConnected && (
          <div 
            style={{ 
              position: 'absolute',
              top: isLandscape && isMobile ? 8 : 16,
              right: isLandscape && isMobile ? 8 : 16,
              background: 'rgba(255, 77, 79, 0.9)',
              padding: isLandscape && isMobile ? '4px 8px' : '8px 16px',
              borderRadius: isLandscape && isMobile ? 4 : 8,
              color: '#fff',
              zIndex: 20
            }}
          >
            <Space size={4}>
              <DisconnectOutlined style={{ fontSize: isLandscape && isMobile ? 10 : 12 }} />
              <Text style={{ color: '#fff', fontSize: isLandscape && isMobile ? 10 : 12 }}>
                {isLandscape && isMobile ? 'Mất kết nối' : 'Mất kết nối AI'}
              </Text>
            </Space>
          </div>
        )}
        
        {/* FPS & Faces Counter Overlay for Landscape */}
        {isLandscape && isMobile && (
          <div 
            style={{ 
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '4px 8px',
              borderRadius: 4,
              color: '#fff',
              zIndex: 20
            }}
          >
            <Space size={8}>
              <Text style={{ color: '#fff', fontSize: 10 }}>{fps} FPS</Text>
              <Text style={{ color: '#fff', fontSize: 10 }}>Faces: {totalFaces}</Text>
              {wsConnected && <Tag color="success" style={{ fontSize: 9, padding: '0 4px', margin: 0 }}>OK</Tag>}
            </Space>
          </div>
        )}
        
        {/* Camera Toggle Button (Mobile Only) */}
        {isMobile && cameraActive && (
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<SwapOutlined rotate={90} />}
            onClick={toggleCamera}
            style={{
              position: 'absolute',
              bottom: isLandscape ? 48 : 16,
              right: isLandscape ? 12 : 16,
              width: isLandscape ? 36 : 56,
              height: isLandscape ? 36 : 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              zIndex: 90,
              fontSize: isLandscape ? 14 : 20,
              backgroundColor: 'rgba(24, 144, 255, 0.9)',
              backdropFilter: 'blur(8px)'
            }}
            title={facingMode === 'user' ? 'Chuyển sang camera sau' : 'Chuyển sang camera trước'}
          />
        )}
      </div>

      {/* Action buttons - compact for landscape */}
      <div style={{ 
        flexShrink: 0,
        position: isLandscape && isMobile ? 'fixed' : 'relative',
        bottom: isLandscape && isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)' : 'auto',
        left: isLandscape && isMobile ? '50%' : 'auto',
        transform: isLandscape && isMobile ? 'translateX(-50%)' : 'none',
        width: isLandscape && isMobile ? 'auto' : '100%',
        zIndex: isLandscape && isMobile ? 100 : 'auto'
      }}>
        {!sessionInfo ? (
          <Button
            type="primary"
            icon={<CameraOutlined />}
            onClick={handleStartSession}
            loading={loading}
            block={!(isLandscape && isMobile)}
            size={isLandscape && isMobile ? "middle" : "large"}
            style={isLandscape && isMobile ? { 
              height: 32, 
              fontSize: 12,
              padding: '0 16px',
              backgroundColor: 'rgba(24, 144, 255, 0.95)',
              borderColor: 'rgba(24, 144, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              borderRadius: 16
            } : undefined}
          >
            {isLandscape && isMobile ? 'Bắt đầu' : 'Bắt đầu điểm danh'}
          </Button>
        ) : (
          <Button
            danger
            icon={<StopOutlined />}
            onClick={handleStopSession}
            loading={loading}
            block={!(isLandscape && isMobile)}
            size={isLandscape && isMobile ? "middle" : "large"}
            style={isLandscape && isMobile ? { 
              height: 32, 
              fontSize: 12,
              padding: '0 16px',
              backgroundColor: 'rgba(255, 77, 79, 0.95)',
              borderColor: 'rgba(255, 77, 79, 0.95)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              borderRadius: 16
            } : undefined}
          >
            {isLandscape && isMobile ? 'Kết thúc' : 'Kết thúc điểm danh'}
          </Button>
        )}
      </div>
    </Card>
  );
  };

  // Render Statistics View
  const renderStatistics = () => (
    <Card 
      title={<Space><BarChartOutlined /> Thống kê</Space>} 
      style={{ height: isMobile ? 'auto' : '100%' }}
    >
      {!sessionInfo ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <BarChartOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <Text type="secondary">Bắt đầu phiên điểm danh để xem thống kê</Text>
        </div>
      ) : (
        <>
          {wsConnected && !attendanceData && (
            <Alert
              message="Đang tải dữ liệu"
              description="Đang kết nối với server để lấy thống kê điểm danh..."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={12}>
              <Statistic
                title="Đã xác nhận"
                value={attendanceData?.statistics?.present || validatedStudents.length}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={12} sm={12}>
              <Statistic
                title="Tổng số"
                value={attendanceData?.statistics?.total_students || 0}
                prefix={<UserOutlined />}
              />
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Tỷ lệ điểm danh:</Text>
            <Progress
              percent={attendanceData?.statistics?.attendance_rate || 0}
              status="active"
              strokeColor={
                (attendanceData?.statistics?.attendance_rate || 0) >= 80 
                  ? '#52c41a' 
                  : (attendanceData?.statistics?.attendance_rate || 0) >= 50 
                  ? '#faad14' 
                  : '#f5222d'
              }
            />
          </div>
          {currentInterval && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Polling: {(currentInterval / 1000).toFixed(1)}s
              </Text>
            </div>
          )}
          {wsConnected && validatedStudents.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ⚡ Realtime: {validatedStudents.length} sinh viên đã được AI nhận diện
              </Text>
            </div>
          )}
        </>
      )}
    </Card>
  );

  // Render Student List View
  const renderStudentList = () => (
    <Card
      title={<Space><TeamOutlined /> Sinh viên đã xác nhận</Space>}
      extra={
        !isMobile && sessionInfo && (
          <Badge 
            count={validatedStudents.length} 
            showZero 
            style={{ backgroundColor: validatedStudents.length > 0 ? '#52c41a' : '#d9d9d9' }}
          />
        )
      }
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column'
      }}
      bodyStyle={{ 
        flex: 1, 
        overflow: 'auto',
        padding: isMobile ? '12px' : '16px',
        maxHeight: isMobile ? 'none' : undefined
      }}
    >
      {!sessionInfo ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <TeamOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <Text type="secondary">Bắt đầu phiên điểm danh để xem danh sách</Text>
        </div>
      ) : (
        <>
          {wsConnected && validatedStudents.length === 0 && (
            <Alert
              message="Đang chờ nhận diện"
              description="Camera đang hoạt động. Sinh viên sẽ xuất hiện ở đây khi được AI nhận diện và xác nhận."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <List
            dataSource={validatedStudents}
            renderItem={(student) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar
                      size={isMobile ? 40 : 48}
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
                      {!isMobile && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Frames: {student.frame_count}/{student.recognition_count}
                        </Text>
                      )}
                    </Space>
                  }
                />
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: isMobile ? 18 : 20 }} />
              </List.Item>
            )}
            locale={{ 
              emptyText: wsConnected 
                ? 'Đang chờ nhận diện sinh viên...' 
                : 'Chưa có sinh viên nào được xác nhận' 
            }}
            style={{ 
              maxHeight: isMobile ? 'calc(100vh - 350px)' : 350, 
              overflow: 'auto',
              minHeight: isMobile ? 150 : 'auto'
            }}
          />
        </>
      )}
    </Card>
  );

  return (
    <Modal
      title={isLandscapeMode ? null : 'Điểm danh bằng AI'}
      open={visible}
      onCancel={handleModalClose}
      width={isMobile ? '100%' : 1200}
      style={isMobile ? { top: 0, padding: 0, maxWidth: '100vw' } : undefined}
      styles={isMobile ? { 
        body: { padding: isLandscapeMode ? 0 : 16 },
        content: isLandscapeMode ? { backgroundColor: '#000' } : undefined
      } : undefined}
      footer={null}
      destroyOnClose
    >
      <style>
        {`
          @media (max-width: 768px) {
            .ant-modal {
              max-width: 100vw !important;
              margin: 0 !important;
              height: 100vh !important;
              top: 0 !important;
            }
            
            .ant-modal-content {
              border-radius: 0 !important;
              height: 100vh !important;
              display: flex !important;
              flex-direction: column !important;
            }
            
            .ant-modal-body {
              flex: 1 !important;
              overflow-y: auto !important;
            }
            
            .ant-tabs {
              height: 100% !important;
            }
            
            .ant-tabs-content {
              height: 100% !important;
            }
            
            .ant-tabs-tabpane {
              height: 100% !important;
            }
            
            .ant-tabs-tab {
              padding: 12px 8px !important;
              font-size: 13px !important;
              flex: 1 !important;
              justify-content: center !important;
            }
            
            .ant-tabs-nav {
              margin-bottom: 12px !important;
            }
            
            .ant-card {
              border-radius: 8px !important;
            }
            
            .ant-card-head {
              padding: 12px 16px !important;
              min-height: auto !important;
            }
            
            .ant-card-head-title {
              font-size: 14px !important;
            }
            
            .ant-card-body {
              padding: 12px !important;
            }
            
            .ant-statistic-title {
              font-size: 12px !important;
            }
            
            .ant-statistic-content {
              font-size: 20px !important;
            }
            
            .ant-list-item {
              padding: 12px 0 !important;
            }
            
            .ant-list-item-meta-title {
              font-size: 14px !important;
            }
            
            .ant-list-item-meta-description {
              font-size: 12px !important;
            }
            
            .ant-btn-lg {
              height: 48px !important;
              font-size: 16px !important;
            }
            
            /* Floating action button */
            .ant-btn-circle {
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            }
            
            /* Smooth scrolling */
            .ant-list {
              -webkit-overflow-scrolling: touch;
            }
            
            /* Progress bar */
            .ant-progress {
              margin-top: 8px;
            }
            
            /* Badge in tabs */
            .ant-tabs-tab .ant-badge {
              margin-left: 4px;
            }
          }
          
          @media (max-width: 480px) {
            .ant-tabs-tab {
              font-size: 11px !important;
              padding: 10px 2px !important;
            }
            
            .ant-tabs-tab .anticon {
              font-size: 16px !important;
            }
            
            .ant-tabs-tab span {
              display: none; /* Hide text on very small screens */
            }
            
            .ant-statistic-content {
              font-size: 18px !important;
            }
            
            .ant-card-head {
              padding: 10px 12px !important;
            }
            
            .ant-card-body {
              padding: 10px !important;
            }
          }
          
          /* Landscape mode on mobile - maximize camera space */
          @media (max-width: 1024px) and (orientation: landscape) {
            .ant-modal-header {
              padding: 4px 12px !important;
              min-height: auto !important;
            }
            
            .ant-modal-title {
              font-size: 13px !important;
              line-height: 1.2 !important;
            }
            
            .ant-modal-close {
              top: 2px !important;
              width: 32px !important;
              height: 32px !important;
              line-height: 32px !important;
            }
            
            .ant-modal-body {
              padding: 0 !important;
              overflow: hidden !important;
            }
            
            .ant-tabs {
              margin: 0 !important;
            }
            
            .ant-tabs-nav {
              margin-bottom: 0 !important;
              padding: 2px 4px !important;
            }
            
            .ant-tabs-tab {
              padding: 3px 8px !important;
              font-size: 11px !important;
              margin: 0 2px !important;
              line-height: 1.2 !important;
            }
            
            .ant-tabs-content-holder {
              padding: 0 !important;
            }
            
            .ant-card {
              margin-bottom: 0 !important;
              border: none !important;
            }
            
            .ant-card-head {
              display: none !important;
            }
            
            .ant-card-body {
              padding: 0 !important;
            }
            
            .ant-btn-lg {
              height: 32px !important;
              font-size: 12px !important;
              padding: 0 12px !important;
            }
            
            .ant-tag {
              font-size: 9px !important;
              padding: 0 4px !important;
              line-height: 14px !important;
              margin: 0 !important;
            }
            
            /* Hide modal title in landscape */
            .ant-modal-header {
              display: none !important;
            }
          }
        `}
      </style>

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

      {isLandscapeMode ? (
        <>
          <div
            style={{
              position: 'relative',
              height: '100%',
              minHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              backgroundColor: '#000',
            }}
          >
            {renderCameraView()}
          </div>

          <FloatButton.Group
            shape="circle"
            style={{
              position: 'fixed',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 120,
            }}
          >
            <FloatButton
              icon={<BarChartOutlined />}
              tooltip="Thống kê"
              onClick={() => setLandscapePanel('stats')}
            />
            <FloatButton
              icon={<TeamOutlined />}
              tooltip="Danh sách"
              onClick={() => setLandscapePanel('students')}
            />
          </FloatButton.Group>

          <Drawer
            placement="right"
            open={landscapePanel === 'stats'}
            onClose={() => setLandscapePanel(null)}
            width="75%"
            destroyOnClose
            title="Thống kê"
            styles={{ body: { padding: 16 } }}
          >
            {renderStatistics()}
          </Drawer>

          <Drawer
            placement="right"
            open={landscapePanel === 'students'}
            onClose={() => setLandscapePanel(null)}
            width="75%"
            destroyOnClose
            title="Sinh viên đã xác nhận"
            styles={{ body: { padding: 16 } }}
          >
            {renderStudentList()}
          </Drawer>
        </>
      ) : isMobile ? (
        // Mobile Layout - Tabs (Portrait)
        <>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            size="large"
            style={{ 
              marginTop: -8,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
            tabBarStyle={{ 
              position: 'sticky', 
              top: 0, 
              zIndex: 10, 
              backgroundColor: '#fff',
              marginBottom: 0,
              paddingTop: isLandscapeMode ? 4 : 8,
              flexShrink: 0
            }}
          >
            <TabPane 
              tab={<Space><CameraOutlined /> Camera</Space>} 
              key="camera"
            >
              <div style={{ 
                height: isLandscapeMode 
                  ? 'calc(100vh - 110px)'
                  : 'calc(100vh - 200px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                margin: 0,
                padding: 0
              }}>
                {renderCameraView()}
              </div>
            </TabPane>
            <TabPane 
              tab={
                <Space>
                  <BarChartOutlined /> 
                  <span>Thống kê</span>
                  {(attendanceData?.statistics?.present || 0) > 0 && (
                    <Badge 
                      count={attendanceData?.statistics?.present || 0} 
                      style={{ backgroundColor: '#52c41a' }}
                    />
                  )}
                </Space>
              } 
              key="stats"
            >
              <div style={{ 
                padding: '8px 0',
                height: 'calc(100vh - 280px)',
                overflow: 'auto'
              }}>
                {renderStatistics()}
              </div>
            </TabPane>
            <TabPane 
              tab={
                <Space>
                  <TeamOutlined /> 
                  <span>Danh sách</span>
                  {validatedStudents.length > 0 && (
                    <Badge 
                      count={validatedStudents.length} 
                      style={{ backgroundColor: '#1890ff' }}
                    />
                  )}
                </Space>
              } 
              key="students"
            >
              <div style={{ 
                padding: '8px 0',
                height: 'calc(100vh - 280px)',
                overflow: 'auto'
              }}>
                {renderStudentList()}
              </div>
            </TabPane>
          </Tabs>

          {/* Floating Action Button for Mobile - Show in Stats/Students tabs */}
          {sessionInfo && activeTab !== 'camera' && (
            <div
              style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1000,
              }}
            >
              <Button
                danger
                shape="circle"
                size="large"
                icon={<StopOutlined />}
                onClick={handleStopSession}
                loading={loading}
                style={{
                  width: 56,
                  height: 56,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  fontSize: 20,
                }}
              />
            </div>
          )}
        </>
      ) : (
        // Desktop Layout - Side by Side
        <Row gutter={[16, 16]} style={{ maxHeight: '75vh', overflow: 'hidden' }}>
          {/* Camera View */}
          <Col span={16}>
            {renderCameraView()}
          </Col>

          {/* Statistics & Student List */}
          <Col span={8} style={{ display: 'flex', flexDirection: 'column', height: '75vh', overflow: 'hidden' }}>
            <div style={{ marginBottom: 16, flexShrink: 0 }}>
              {renderStatistics()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {renderStudentList()}
            </div>
          </Col>
        </Row>
      )}
    </Modal>
  );
};

export default AttendanceCamera;
