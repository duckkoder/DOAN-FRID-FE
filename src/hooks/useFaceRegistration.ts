/**
 * Custom Hook: useFaceRegistration
 * Quản lý WebSocket connection, webcam streaming, và face registration process
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { message as antMessage } from "antd";
import type {
  FaceRegistrationOptions,
  ProcessedFrame,
  RegistrationCompletionData,
  WSResponse,
  WSProcessedFrameResponse,
  WSStepCompletedResponse,
  WSRegistrationCompletedResponse,
  WSCollectionCompletedResponse,
  WSStudentConfirmedResponse,
  WSErrorResponse,
  FaceRegistrationErrorCodeType,
  PreviewImageData,
} from "../types/faceRegistration";
import { FaceRegistrationErrorCode } from "../types/faceRegistration";

interface UseFaceRegistrationReturn {
  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  // State
  isConnected: boolean;
  isStreaming: boolean;
  processedFrame: ProcessedFrame | null;
  error: string | null;
  isCompleted: boolean;
  completionData: RegistrationCompletionData | null;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  
  // New states for student review
  isReviewing: boolean;
  previewImages: PreviewImageData[];
  registrationStatus: string | null; // "pending_admin_review", "rejected", etc.

  // Actions
  connect: () => void;
  disconnect: () => void;
  startWebcam: () => Promise<boolean>;
  stopWebcam: () => void;
  startStreaming: () => void;
  stopStreaming: () => void;
  restart: () => void;
  cancel: () => void;
  confirmImages: (accept: boolean) => void; // New: confirm collected images
}

// Get WebSocket URL from environment variable
const DEFAULT_SERVER_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";
const DEFAULT_FPS = 10;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 2000; // 2 seconds

export function useFaceRegistration({
  studentId,
  serverUrl = DEFAULT_SERVER_URL,
  fps = DEFAULT_FPS,
}: FaceRegistrationOptions): UseFaceRegistrationReturn {
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [processedFrame, setProcessedFrame] = useState<ProcessedFrame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionData, setCompletionData] = useState<RegistrationCompletionData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  
  // New states for student review workflow
  const [isReviewing, setIsReviewing] = useState(false);
  const [previewImages, setPreviewImages] = useState<PreviewImageData[]>([]);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);

  /**
   * Handle WebSocket messages
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: WSResponse = JSON.parse(event.data);

      switch (data.type) {
        case "processed_frame": {
          const frameData = data as WSProcessedFrameResponse;
          setProcessedFrame({
            instruction: frameData.instruction,
            currentStep: frameData.current_step,
            totalSteps: frameData.total_steps,
            progress: frameData.progress,
            status: frameData.status,
            conditionMet: frameData.condition_met,
            faceDetected: frameData.face_detected,
            poseAngles: frameData.pose_angles,
            boundingBox: frameData.bounding_box,
            landmarks: frameData.landmarks,
          });
          break;
        }

        case "step_completed": {
          const stepData = data as WSStepCompletedResponse;
          console.log(`✅ Step ${stepData.step_number} completed:`, stepData.step_name);
          antMessage.success(`Bước ${stepData.step_number}/14 hoàn thành: ${stepData.step_name}`);
          break;
        }

        case "collection_completed": {
          const collectionData = data as WSCollectionCompletedResponse;
          console.log("📸 Collection completed! Waiting for student review...", collectionData);
          
          // Stop streaming and webcam
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsStreaming(false);
          }
          
          // Stop webcam to release camera
          if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach((track) => track.stop());
            videoRef.current.srcObject = null;
          }
          
          // Set review mode
          setIsReviewing(true);
          setPreviewImages(collectionData.preview_images);
          setProcessedFrame(null); // Clear processed frame
          
          antMessage.success({
            content: "Đã thu thập đủ 14 ảnh! Vui lòng xem lại và xác nhận.",
            duration: 5,
          });
          break;
        }

        case "student_confirmed": {
          const confirmData = data as WSStudentConfirmedResponse;
          console.log("✅ Student confirmed:", confirmData);
          
          setIsReviewing(false);
          setRegistrationStatus(confirmData.status || null);
          
          if (confirmData.accepted) {
            // Student accepted - now uploading and waiting for admin
            antMessage.success({
              content: confirmData.message || "Đang upload ảnh và chờ admin duyệt...",
              duration: 3,
            });
            
            // Set completed state
            setIsCompleted(true);
            setCompletionData({
              success: true,
              message: confirmData.message,
              studentId,
              registrationId: confirmData.registration_id || 0,
              totalImages: 14,
              verificationData: [],
            });
            
            // Stop webcam
            if (videoRef.current && videoRef.current.srcObject) {
              const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
              tracks.forEach((track) => track.stop());
              videoRef.current.srcObject = null;
            }
            
            // Reload page after 2 seconds
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            // Student rejected - can re-collect
            antMessage.info(confirmData.message || "Đã hủy. Bạn có thể thu thập lại.");
            setPreviewImages([]);
            
            // Restart streaming for re-collection
            setIsStreaming(true);
          }
          break;
        }

        case "registration_completed": {
          const completeData = data as WSRegistrationCompletedResponse;
          console.log("🎉 Registration completed!", completeData);
          
          setIsCompleted(true);
          setCompletionData({
            success: completeData.success,
            message: completeData.message,
            studentId: completeData.student_id,
            registrationId: completeData.registration_id,
            totalImages: completeData.total_images,
            verificationData: completeData.verification_data,
          });
          
          // Stop streaming
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsStreaming(false);
          }
          
          // Stop webcam and turn off camera
          if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach((track) => track.stop());
            videoRef.current.srcObject = null;
          }
          
          antMessage.success("Đăng ký khuôn mặt thành công! 🎉");
          break;
        }

        case "error": {
          const errorData = data as WSErrorResponse;
          console.error("❌ Error:", errorData.error_code, errorData.message);
          
          setError(errorData.message);
          handleErrorCode(errorData.error_code as FaceRegistrationErrorCodeType, errorData.message);
          break;
        }

        case "status": {
          console.log("📌 Status:", data.message);
          break;
        }

        case "restarted": {
          console.log("🔄 Session restarted");
          antMessage.info("Đã khởi động lại quá trình đăng ký");
          setProcessedFrame(null);
          setIsCompleted(false);
          setCompletionData(null);
          break;
        }

        default:
          console.log("Unknown message type:", data);
      }
    } catch (err) {
      console.error("Failed to parse WebSocket message:", err);
    }
  }, []);

  /**
   * Handle error codes
   */
  const handleErrorCode = useCallback((errorCode: FaceRegistrationErrorCodeType, errorMessage: string) => {
    switch (errorCode) {
      case FaceRegistrationErrorCode.STUDENT_NOT_FOUND:
        antMessage.error("Không tìm thấy học sinh. Vui lòng kiểm tra lại ID.");
        break;

      case FaceRegistrationErrorCode.ALREADY_REGISTERED:
        antMessage.warning("Khuôn mặt đã được đăng ký. Bạn có thể đăng ký lại nếu muốn.");
        break;

      case FaceRegistrationErrorCode.NO_FACE_DETECTED:
        // Không hiển thị message vì quá nhiều
        console.warn("No face detected");
        break;

      case FaceRegistrationErrorCode.S3_UPLOAD_FAILED:
        antMessage.error("Lỗi upload ảnh. Vui lòng thử lại.");
        break;

      case FaceRegistrationErrorCode.DATABASE_ERROR:
        antMessage.error("Lỗi hệ thống. Vui lòng liên hệ quản trị viên.");
        disconnect();
        break;

      case FaceRegistrationErrorCode.INVALID_FRAME:
        console.error("Invalid frame format");
        break;

      case FaceRegistrationErrorCode.WEBSOCKET_ERROR:
        antMessage.error("Lỗi kết nối WebSocket. Đang thử kết nối lại...");
        break;

      default:
        antMessage.error(errorMessage || "Đã xảy ra lỗi không xác định");
    }
  }, []);

  /**
   * Attempt to reconnect
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnect attempts reached");
      setConnectionStatus("error");
      setError("Không thể kết nối tới server. Vui lòng thử lại sau.");
      antMessage.error("Không thể kết nối tới server sau nhiều lần thử.");
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;

    console.log(`Attempting reconnect ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, []);

  /**
   * Connect WebSocket
   */
  const connect = useCallback(() => {
    // Clear existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Always get fresh URL from environment variable to support mobile testing
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || serverUrl;
    const wsUrl = `${wsBaseUrl}/api/v1/ws/face-registration/${studentId}`;
    console.log("Connecting to:", wsUrl);

    setConnectionStatus("connecting");
    setError(null);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setIsConnected(true);
      setConnectionStatus("connected");
      setError(null);
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts
      antMessage.success("Kết nối thành công!");
    };

    ws.onmessage = handleMessage;

    ws.onerror = (event) => {
      console.error("❌ WebSocket error:", event);
      setConnectionStatus("error");
      setError("Lỗi kết nối WebSocket");
    };

    ws.onclose = (event) => {
      console.log("🔌 WebSocket disconnected", event);
      setIsConnected(false);
      setConnectionStatus("disconnected");

      // Attempt reconnect if not a clean close
      if (!event.wasClean && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        attemptReconnect();
      }
    };

    wsRef.current = ws;
  }, [
    , serverUrl, handleMessage, attemptReconnect]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus("disconnected");
    reconnectAttemptsRef.current = 0;
  }, []);

  /**
   * Start webcam
   */
  const startWebcam = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      console.log("📹 Webcam started");
      antMessage.success("Camera đã sẵn sàng!");
      return true;
    } catch (err: any) {
      console.error("Failed to start webcam:", err);

      if (err.name === "NotAllowedError") {
        antMessage.error("Vui lòng cho phép truy cập camera.");
        setError("Không có quyền truy cập camera");
      } else if (err.name === "NotFoundError") {
        antMessage.error("Không tìm thấy camera trên thiết bị.");
        setError("Không tìm thấy camera");
      } else {
        antMessage.error("Không thể khởi động camera.");
        setError("Lỗi khởi động camera");
      }

      return false;
    }
  }, []);

  /**
   * Stop webcam
   */
  const stopWebcam = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    console.log("📹 Webcam stopped");
  }, []);

  /**
   * Send frame to server
   */
  const sendFrame = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Match canvas size to actual video dimensions (portrait or landscape)
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    // Flip horizontally so backend receives mirrored image
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-videoWidth, 0);
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.restore();

    // Convert to base64
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    // Send to server
    const message = {
      type: "frame",
      data: dataUrl,
    };

    try {
      wsRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error("Failed to send frame:", err);
    }
  }, []);

  /**
   * Start streaming frames
   */
  const startStreaming = useCallback(() => {
    if (intervalRef.current) {
      console.warn("Streaming already started");
      return;
    }

    const interval = 1000 / fps; // Convert FPS to milliseconds
    intervalRef.current = setInterval(sendFrame, interval);
    setIsStreaming(true);
    console.log(`📤 Started streaming at ${fps} FPS`);
  }, [fps, sendFrame]);

  /**
   * Stop streaming frames
   */
  const stopStreaming = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsStreaming(false);
    console.log("📤 Stopped streaming");
  }, []);

  /**
   * Restart verification
   */
  const restart = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "restart" }));
      setIsCompleted(false);
      setCompletionData(null);
      setProcessedFrame(null);
      setError(null);
      console.log("🔄 Restart request sent");
    }
  }, []);

  /**
   * Cancel verification
   */
  const cancel = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cancel" }));
    }
    stopStreaming();
    stopWebcam();
    disconnect();
    console.log("❌ Cancelled");
  }, [disconnect, stopStreaming, stopWebcam]);

  /**
   * Confirm collected images (accept or reject)
   */
  const confirmImages = useCallback(async (accept: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: "student_confirm",
        accept,
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`📤 Sent student confirmation: ${accept ? "ACCEPT" : "REJECT"}`);
      
      if (!accept) {
        // If rejected, clear preview images and restart webcam for re-collection
        setPreviewImages([]);
        setIsReviewing(false);
        
        // Restart webcam
        const webcamStarted = await startWebcam();
        if (webcamStarted) {
          startStreaming();
        }
      }
    } else {
      antMessage.error("Không thể gửi xác nhận. Vui lòng thử lại.");
    }
  }, [startWebcam, startStreaming]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up useFaceRegistration");
      stopStreaming();
      stopWebcam();
      disconnect();
    };
  }, [disconnect, stopStreaming, stopWebcam]);

  return {
    // Refs
    videoRef,
    canvasRef,

    // State
    isConnected,
    isStreaming,
    processedFrame,
    error,
    isCompleted,
    completionData,
    connectionStatus,
    isReviewing,
    previewImages,
    registrationStatus,

    // Actions
    connect,
    disconnect,
    startWebcam,
    stopWebcam,
    startStreaming,
    stopStreaming,
    restart,
    cancel,
    confirmImages,
  };
}
