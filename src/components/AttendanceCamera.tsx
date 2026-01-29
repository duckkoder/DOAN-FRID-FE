/**
 * Attendance Camera Component
 * Uses WebSocket directly to AI-Service to stream frames
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Button,
  Space,
  Card,
  Tag,
  Badge,
  Alert,
  Typography,
  FloatButton,
} from 'antd';
import {
  CameraOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  WifiOutlined,
  DisconnectOutlined,
  BarChartOutlined,
  TeamOutlined,
  SwapOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { startAttendanceSessionWithAI, endAttendanceSession, resumeAttendanceSession, type AISessionResponse } from '../apis/attendanceAPIs/attendanceAPIs';
import { AIWebSocketClient, type DetectionInfo } from '../services/aiWebSocket';
import { useSmartPolling } from '../hooks/useSmartPolling';
import { useFrameCapture } from '../hooks/useFrameCapture';
import PendingConfirmationPanel from './PendingConfirmationPanel';
import StatisticsPanel from './StatisticsPanel';
import ConfirmedStudentsPanel from './ConfirmedStudentsPanel';

const { Text } = Typography;

interface AttendanceCameraProps {
  classId: number;
  visible: boolean;
  onClose: () => void;
  onSessionEnd?: () => void;
  dayOfWeek?: number;
  periodRange?: string;
  sessionIndex?: number;
  /** Session ID để resume (nếu có session ongoing) */
  resumeSessionId?: number;
}

const AttendanceCamera: React.FC<AttendanceCameraProps> = ({
  classId,
  visible,
  onClose,
  onSessionEnd,
  dayOfWeek,
  periodRange,
  sessionIndex,
  resumeSessionId,
}) => {
  // States
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<AISessionResponse | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Detection & Recognition states
  const [detections, setDetections] = useState<DetectionInfo[]>([]);
  const [totalFaces, setTotalFaces] = useState(0);
  
  // ✅ Frame capture stats từ hook
  const [captureStats, setCaptureStats] = useState({ fps: 0, skipped: 0 });
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const isBrowser = typeof window !== 'undefined';
  const isLandscapeMode = isMobile && isBrowser && window.innerWidth > window.innerHeight;
  
  // Camera state
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // 'user' = front, 'environment' = back
  
  // ✅ Panel states
  const [pendingPanelVisible, setPendingPanelVisible] = useState(false);
  const [statisticsPanelVisible, setStatisticsPanelVisible] = useState(false);
  const [studentsPanelVisible, setStudentsPanelVisible] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
  // ✅ Track new confirmed students (for badge notification)
  const [newConfirmedCount, setNewConfirmedCount] = useState(0);
  const lastViewedConfirmedCountRef = useRef(0);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsClientRef = useRef<AIWebSocketClient | null>(null);
  const orientationRestartTimeoutRef = useRef<number | null>(null);
  const lastOrientationRef = useRef<'portrait' | 'landscape' | null>(null);
  const isRestartingRef = useRef(false);

  // ✅ Dynamic Frame Capture Hook với Web Worker
  const { 
    startCapture, 
    stopCapture, 
    markFrameComplete, 
    stats: frameCaptureStats 
  } = useFrameCapture({
    targetFps: 10,
    minFps: 3,
    maxFps: 15,
    quality: 0.8,
    useWorker: true,
    onFrameReady: (blob) => {
      if (wsClientRef.current?.isConnected()) {
        wsClientRef.current.sendFrame(blob);
      } else {
        markFrameComplete(); // Reset nếu không gửi được
      }
    },
    onError: (error) => {
      console.error('[FrameCapture] Error:', error);
    },
    onFrameSkipped: () => {
      // Optional: track skipped frames
    },
  });

  // ✅ Update capture stats
  useEffect(() => {
    setCaptureStats({
      fps: frameCaptureStats.actualFps,
      skipped: frameCaptureStats.skippedFrames,
    });
  }, [frameCaptureStats.actualFps, frameCaptureStats.skippedFrames]);

  // Smart polling cho attendance records từ Backend
  const { data: attendanceData, currentInterval } = useSmartPolling({
    sessionId: sessionInfo?.session_id || null,
    enabled: sessionInfo !== null && wsConnected,
  });

  /**
   * ✅ Update pending count từ attendance data
   * ✅ FIX: Use specific value as dependency to prevent unnecessary updates
   */
  useEffect(() => {
    const newPendingCount = attendanceData?.statistics?.pending_count ?? 0;
    setPendingCount(prev => prev !== newPendingCount ? newPendingCount : prev);
  }, [attendanceData?.statistics?.pending_count]);

  /**
   * ✅ Track new confirmed students for badge notification
   */
  useEffect(() => {
    const currentConfirmedCount = attendanceData?.statistics?.present_count ?? 0;
    
    // Nếu có session và có sự tăng số lượng confirmed students
    if (sessionInfo && currentConfirmedCount > lastViewedConfirmedCountRef.current) {
      const newCount = currentConfirmedCount - lastViewedConfirmedCountRef.current;
      setNewConfirmedCount(prev => prev + newCount);
    }
    
    // Luôn update ref để track total count hiện tại
    lastViewedConfirmedCountRef.current = currentConfirmedCount;
  }, [attendanceData?.statistics?.present_count, sessionInfo]);

  /**
   * Reset states when modal opens fresh (without active session)
   */
  useEffect(() => {
    if (visible && !sessionInfo) {
      // ✅ Reset tất cả states khi mở modal mới
      setDetections([]);
      setTotalFaces(0);
      setCaptureStats({ fps: 0, skipped: 0 });
      setError(null);
      setCameraActive(false);
      setWsConnected(false);
    }
  }, [visible, sessionInfo]);

  /**
   * ✅ Auto resume session when modal opens with resumeSessionId
   */
  useEffect(() => {
    const handleResumeSession = async () => {
      if (!visible || !resumeSessionId || sessionInfo) return;
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('[ResumeSession] Resuming session:', resumeSessionId);
        
        // 1. Call resume API to get new WebSocket token
        const response = await resumeAttendanceSession(resumeSessionId);
        
        console.log('[ResumeSession] Got response:', response);
        setSessionInfo(response);

        // 2. Start camera
        await startCamera();

        // 3. Connect WebSocket to AI-Service
        await connectWebSocket(response);

        // 4. Start sending frames
        startFrameCapture();
        
        console.log('[ResumeSession] Session resumed successfully');

      } catch (err: any) {
        console.error('[ResumeSession] Error:', err);
        setError(err.response?.data?.detail || 'Unable to resume attendance session. Session may have ended.');
      } finally {
        setLoading(false);
      }
    };
    
    handleResumeSession();
  }, [visible, resumeSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset panels when modal closes
  useEffect(() => {
    if (!visible) {
      setStatisticsPanelVisible(false);
      setStudentsPanelVisible(false);
      setPendingPanelVisible(false);
      // Reset new confirmed count
      setNewConfirmedCount(0);
      lastViewedConfirmedCountRef.current = 0;
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
        setError('Unable to restart camera after rotating device');
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

      

      // 1. Create session với Backend → nhận WebSocket info
      // ✅ Fix: Generate session_name with Vietnam timezone (UTC+7)
      const now = new Date();
      const sessionName = `Attendance ${now.toLocaleString('en-US', { 
        timeZone: 'Asia/Ho_Chi_Minh',
        hour12: false 
      })}`;
      
      const response = await startAttendanceSessionWithAI({
        class_id: classId,
        session_name: sessionName,
        late_threshold_minutes: 15,
        location: 'Classroom',
        day_of_week: dayOfWeek,
        period_range: periodRange,
        session_index: sessionIndex,
      });

      
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
      

    } catch (err) {
      console.error('[Camera] Error:', err);
      throw new Error('Unable to access camera');
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
      
    } catch (err) {
      console.error('[Camera] Toggle error:', err);
      setError('Unable to toggle camera');
    }
  };

  /**
   * Connect WebSocket to AI-Service
   */
  const connectWebSocket = async (sessionInfo: AISessionResponse) => {
    try {
      

      const wsClient = new AIWebSocketClient();
      wsClientRef.current = wsClient;

      // Setup event handlers
      wsClient.onConnected(() => {
        
        setWsConnected(true);
        setError(null);
      });

      wsClient.onDisconnected((code, reason) => {
        
        setWsConnected(false);
        
        if (code === 1008) {
          setError('Session is invalid or has expired');
        }
      });

      wsClient.onFrameProcessed((detections, totalFaces) => {
        setDetections(detections);
        setTotalFaces(totalFaces);
        
        // ✅ Mark frame processing complete - cho phép capture frame tiếp theo
        markFrameComplete();
      });

      wsClient.onStudentValidated((student) => {
        
        // Validated student info will be fetched from backend via polling
      });

      wsClient.onSessionStatus((status, stats) => {
        
      });

      wsClient.onError((errorMsg) => {
        console.error('[WebSocket] Error:', errorMsg);
        setError(errorMsg);
      });

      // Connect
      await wsClient.connect(sessionInfo.ai_ws_url, sessionInfo.ai_ws_token);

    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
      throw new Error('Unable to connect to AI-Service');
    }
  };

  /**
   * Start capturing and sending frames
   * ✅ Sử dụng Dynamic Frame Rate Hook với Web Worker
   */
  const startFrameCapture = () => {
    if (videoRef.current) {
      console.log('[FrameCapture] Starting with dynamic rate and Web Worker');
      startCapture(videoRef.current);
    }
  };

  /**
   * Stop frame capture
   */
  const stopFrameCapture = () => {
    stopCapture();
  };

  /**
   * Draw bounding boxes on overlay canvas - WITH PROPER ASPECT RATIO SCALING
   * ✅ OPTIMIZED: Continuous animation loop for smooth rendering
   */
  useEffect(() => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    
    if (!video || !canvas) return;

    let animationFrameId: number;
    let isRunning = true;
    
    const drawDetections = () => {
      if (!isRunning) return;
      
      // Get video element display size (getBoundingClientRect)
      const rect = video.getBoundingClientRect();
      
      // Set canvas size to match video display size exactly
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId = requestAnimationFrame(drawDetections);
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // If no detections or video not ready, continue loop
      if (detections.length === 0 || video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrameId = requestAnimationFrame(drawDetections);
        return;
      }

      // Calculate aspect ratio and scaling for object-fit: cover
      // Video actual resolution (from camera stream)
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      const videoAspect = videoWidth / videoHeight;
      const containerAspect = canvas.width / canvas.height;
      
      let scaleX, scaleY, offsetX, offsetY;
      
      // With object-fit: cover, video fills the entire container
      // One dimension matches exactly, the other is cropped
      if (videoAspect > containerAspect) {
        // Video is wider than container - fit to height, crop left/right
        // Video height fills container height completely
        scaleY = canvas.height / videoHeight;
        scaleX = scaleY; // Same scale to maintain aspect ratio
        
        // Calculate how much is cropped from left and right
        const renderedWidth = videoWidth * scaleX;
        offsetX = (canvas.width - renderedWidth) / 2;
        offsetY = 0;
      } else {
        // Video is taller/equal - fit to width, crop top/bottom  
        // Video width fills container width completely
        scaleX = canvas.width / videoWidth;
        scaleY = scaleX; // Same scale to maintain aspect ratio
        
        // Calculate how much is cropped from top and bottom
        const renderedHeight = videoHeight * scaleY;
        offsetX = 0;
        offsetY = (canvas.height - renderedHeight) / 2;
      }
    
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
      
      // ✅ DETERMINE ANTI-SPOOFING STATUS - HIGHEST PRIORITY
      // If anti-spoofing explicitly says not live (is_live === false) OR spoofing_type is 'spoof',
      // treat as spoofed/fake and render in red with label "Fake".
      const isSpoofed = (typeof detection.is_live === 'boolean' && detection.is_live === false)
        || (detection.spoofing_type && detection.spoofing_type === 'spoof');
      
      // ✅ OPTIMIZATION: Remove console.log in production for better performance

      // ✅ DETERMINE COLOR AND LABEL - ANTI-SPOOFING HAS HIGHEST PRIORITY
      let color: string;
      let lineWidth = 2;
      let labelText: string | null = null;
      let labelColor: string;
      
      // 🔴 PRIORITY 1: Anti-spoofing detection (FAKE/SPOOF faces)
      if (isSpoofed) {
        color = '#ff4d4f'; // Antd red for fake/spoof
        lineWidth = 3;
        labelColor = '#ff4d4f';
        
        // Generate label for spoof faces
        const spoofConf = typeof detection.spoofing_confidence === 'number'
          ? ` (${(detection.spoofing_confidence * 100).toFixed(1)}%)`
          : '';
        labelText = `FAKE${spoofConf}`;
      }
      // 🟢 PRIORITY 2: Normal face detection with status
      else if (detection.status) {
        switch (detection.status) {
          case 'detecting':
            labelText = 'Detecting...';
            color = '#faad14'; // Orange
            labelColor = '#faad14';
            lineWidth = 2;
            break;
          case 'unknown':
            labelText = 'Unknown';
            color = '#ff4d4f'; // Red
            labelColor = '#ff4d4f';
            lineWidth = 2;
            break;
          case 'recognized':
            labelText = detection.student_name || detection.student_id || 'Recognized';
            color = '#52c41a'; // Green
            labelColor = '#52c41a';
            lineWidth = 3;
            break;
          case 'validated':
            labelText = `✓ ${detection.student_name || detection.student_id}`;
            color = '#389e0d'; // Dark green
            labelColor = '#389e0d';
            lineWidth = 3;
            break;
          default:
            color = '#1890ff';
            labelColor = '#1890ff';
            lineWidth = 2;
        }
      }
      // 🔵 PRIORITY 3: Fallback to validated/recognized logic
      else if (detection.is_validated) {
        color = '#52c41a'; // Green
        labelColor = '#52c41a';
        lineWidth = 3;
        labelText = detection.student_name || detection.student_id || 'Validated';
      } else if (detection.student_name) {
        color = '#1890ff'; // Blue
        labelColor = '#1890ff';
        lineWidth = 2;
        labelText = detection.student_name;
      } else {
        // No recognition yet
        color = '#1890ff';
        labelColor = '#1890ff';
        lineWidth = 2;
        labelText = null;
      }
      
      // Draw bounding box with determined color
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(displayX1, displayY1, width, height);

      if (labelText) {
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width + 10;
        const textHeight = 20;

        // Draw label background - use labelColor instead of color
        ctx.fillStyle = labelColor;
        ctx.fillRect(displayX1, displayY1 - textHeight - 5, textWidth, textHeight);

        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, displayX1 + 5, displayY1 - 10);
      }
      
        // Draw track ID if available
        if (detection.track_id) {
          const trackLabel = `#${detection.track_id}`;
          ctx.fillStyle = labelColor; // Use labelColor for consistency
          ctx.fillRect(displayX2 - 40, displayY1, 40, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Arial';
          ctx.fillText(trackLabel, displayX2 - 35, displayY1 + 14);
        }
      });
      
      // Continue animation loop
      animationFrameId = requestAnimationFrame(drawDetections);
    };

    // Start animation loop
    drawDetections();

    return () => {
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [detections]);

  /**
   * Stop session
   */
  const handleStopSession = async () => {
    // Prevent duplicate calls
    if (loading || !sessionInfo) {
      return;
    }

    try {
      setLoading(true);

      // ✅ Stop frame capture (hook handles cleanup)
      stopFrameCapture();

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
      setSessionInfo(null);
      setDetections([]);
      setTotalFaces(0);
      setCaptureStats({ fps: 0, skipped: 0 });
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
        title: 'Attendance session in progress',
        icon: <ExclamationCircleOutlined />,
        content: 'Do you want to end the attendance session?',
        okText: 'End',
        cancelText: 'Continue',
        onOk: handleStopSession,
      });
    } else {
      // ✅ Reset states khi đóng modal (không có session active)
      setDetections([]);
      setTotalFaces(0);
      setCaptureStats({ fps: 0, skipped: 0 });
      setError(null);
      onClose();
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // ✅ Stop frame capture (hook tự cleanup)
      stopCapture();
      
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [stopCapture]);

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
   * ✅ FIX: Only update state if value actually changes + debounce resize
   */
  useEffect(() => {
    let resizeTimer: number;
    
    const updateCanvasSize = () => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      
      if (video && canvas) {
        const rect = video.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
      
      // Detect mobile device (works in both portrait and landscape)
      const mobile = detectMobileDevice();
      setIsMobile(prev => prev !== mobile ? mobile : prev);
    };
    
    // ✅ Debounced resize handler to prevent excessive updates
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateCanvasSize, 150);
    };
    
    // Orientation change should be immediate (not debounced)
    const handleOrientationChange = () => {
      updateCanvasSize();
    };
    
    // Listen for window resize and orientation change
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Initial size update
    updateCanvasSize();
    
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []); // ✅ Run only once on mount


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
                {captureStats.fps} FPS
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
          flex: isMobile ? 1 : undefined,
          aspectRatio: isMobile ? undefined : '4/3',
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
                {loading ? 'Starting camera...' : 'Camera not started'}
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
                {isLandscape && isMobile ? 'Disconnected' : 'AI Disconnected'}
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
              <Text style={{ color: '#fff', fontSize: 10 }}>{captureStats.fps} FPS</Text>
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
            title={facingMode === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
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
            {isLandscape && isMobile ? 'Start' : 'Start Attendance'}
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
            {isLandscape && isMobile ? 'End' : 'End Attendance'}
          </Button>
        )}
      </div>
    </Card>
  );
  };


  return (
    <Modal
      title={isLandscapeMode ? null : 'AI Attendance'}
      open={visible}
      onCancel={handleModalClose}
      width={isMobile ? '100%' : 900}
      style={isMobile ? { top: 0, padding: 0, maxWidth: '100vw' } : { top: 20 }}
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
          message="Error"
          description={
            <div>
              <p>{error}</p>
              {resumeSessionId && (
                <Button 
                  type="primary" 
                  danger 
                  size="small" 
                  style={{ marginTop: 8 }}
                  onClick={onClose}
                >
                  Close and go back
                </Button>
              )}
            </div>
          }
          type="error"
          closable={!resumeSessionId}
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* ✅ Camera Full Screen - All Modes */}
      <div
        style={{
          position: 'relative',
          height: isLandscapeMode ? '100%' : isMobile ? 'calc(100vh - 160px)' : undefined,
          minHeight: isLandscapeMode ? 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' : undefined,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          backgroundColor: isLandscapeMode ? '#000' : undefined,
        }}
      >
        {renderCameraView()}
      </div>

      {/* ✅ FloatButton Group - All Modes */}
      {sessionInfo && (
        <FloatButton.Group
          shape="circle"
          style={{
            position: 'fixed',
            right: isMobile ? 16 : 24,
            top: isMobile ? '50%' : '50%',
            transform: 'translateY(-50%)',
            zIndex: 1002,
          }}
        >
          <FloatButton
            icon={<BarChartOutlined />}
            tooltip="Statistics"
            onClick={() => setStatisticsPanelVisible(true)}
            type="primary"
          />
          {/* ✅ Confirmed Students Button with "new students" badge */}
          <Badge 
            count={newConfirmedCount} 
            offset={[-5, 5]}
            style={{ backgroundColor: '#52c41a' }}
          >
            <FloatButton
              icon={<TeamOutlined />}
              tooltip={newConfirmedCount > 0 ? `${newConfirmedCount} new students` : 'Student List'}
              onClick={() => {
                setStudentsPanelVisible(true);
                // ✅ Reset badge khi user mở panel
                setNewConfirmedCount(0);
              }}
              type="primary"
            />
          </Badge>
          {pendingCount > 0 && (
            <Badge count={pendingCount} offset={[-5, 5]}>
              <FloatButton
                icon={<ClockCircleOutlined />}
                tooltip="Pending Confirmation"
                onClick={() => setPendingPanelVisible(true)}
                style={{ backgroundColor: '#faad14' }}
              />
            </Badge>
          )}
        </FloatButton.Group>
      )}

      {/* ✅ Statistics Panel */}
      <StatisticsPanel
        visible={statisticsPanelVisible}
        onClose={() => setStatisticsPanelVisible(false)}
        sessionActive={sessionInfo !== null}
        confirmedCount={attendanceData?.statistics?.present_count || 0}
        pendingCount={pendingCount}
        totalStudents={attendanceData?.statistics?.total_students || 0}
        attendanceRate={attendanceData?.statistics?.attendance_rate || 0}
        wsConnected={wsConnected}
        hasData={attendanceData !== undefined && attendanceData !== null}
        currentInterval={currentInterval}
      />

      {/* ✅ Confirmed Students Panel */}
      <ConfirmedStudentsPanel
        visible={studentsPanelVisible}
        onClose={() => setStudentsPanelVisible(false)}
        sessionActive={sessionInfo !== null}
        confirmedStudents={attendanceData?.records?.filter(r => r.status === 'present') || []}
        pendingCount={pendingCount}
        wsConnected={wsConnected}
        onOpenPendingPanel={() => {
          setStudentsPanelVisible(false);
          setPendingPanelVisible(true);
        }}
      />

      {/* Pending Confirmation Panel */}
      <PendingConfirmationPanel
        visible={pendingPanelVisible}
        onClose={() => setPendingPanelVisible(false)}
        sessionId={sessionInfo?.session_id || null}
        onConfirmed={() => {
          // Force refresh polling data ngay lập tức sau khi xác nhận
          
          // Smart polling sẽ tự động fetch lại trong vài giây
        }}
      />
    </Modal>
  );
};

export default AttendanceCamera;
