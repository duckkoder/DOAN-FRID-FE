import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Typography,
  Card,
  Button,
  Steps,
  Alert,
  Progress,
  Space,
  message,
  Row,
  Col,
  Avatar,
  Tag,
  Divider
} from "antd";
import {
  CameraOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  ArrowLeftOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";

const { Title, Text } = Typography;
const { Step } = Steps;

interface CapturedImage {
  id: number;
  dataUrl: string;
  timestamp: Date;
  quality: number;
}

const FaceRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
  const [isCameraFullscreen, setIsCameraFullscreen] = useState(false);
  const [isPanelFullscreen, setIsPanelFullscreen] = useState(false);
  const [isPanelZoomed, setIsPanelZoomed] = useState(false);

  const breadcrumbItems = [
    { title: "Dashboard", href: "/student" },
    { title: "Face Registration" }
  ];

  const steps = [
    {
      title: 'Chuẩn bị',
      description: 'Kiểm tra thiết bị và môi trường',
      icon: <SafetyCertificateOutlined />
    },
    {
      title: 'Thu thập dữ liệu',
      description: 'Chụp ảnh khuôn mặt từ nhiều góc độ',
      icon: <CameraOutlined />
    },
    {
      title: 'Xử lý và đăng ký',
      description: 'Hệ thống xử lý và lưu trữ dữ liệu',
      icon: <CheckCircleOutlined />
    }
  ];

  const requiredImages = 10;

  const cameraContainerRef = useRef<HTMLDivElement>(null);

  // Khởi động camera
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      console.log('Camera stream:', stream); // Thêm dòng này để debug
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        console.log('Video ref:', videoRef.current); // Debug video element
      }
      setIsCameraActive(true);
      setCurrentStep(1);
      message.success('Camera đã sẵn sàng! Bắt đầu chụp ảnh khuôn mặt.');
    } catch (error) {
      console.error('Error accessing camera:', error);
      message.error('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Dừng camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Chụp ảnh
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const newImage: CapturedImage = {
      id: Date.now(),
      dataUrl,
      timestamp: new Date(),
      quality: Math.random() * 20 + 80 // Mock quality score 80-100
    };

    setCapturedImages(prev => [...prev, newImage]);
    message.success(`Đã chụp ảnh ${capturedImages.length + 1}/${requiredImages}`);

    // Auto progress to next step when enough images
    if (capturedImages.length + 1 >= requiredImages) {
      setTimeout(() => {
        setCurrentStep(2);
        processRegistration();
      }, 1000);
    }
  }, [capturedImages.length]);

  // Xử lý đăng ký
  const processRegistration = useCallback(async () => {
    setIsLoading(true);
    setRegistrationProgress(0);

    // Simulate processing
    const interval = setInterval(() => {
      setRegistrationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsLoading(false);
          setIsRegistrationComplete(true);
          stopCamera();
          message.success('Đăng ký khuôn mặt thành công! Bạn có thể sử dụng tính năng điểm danh.');
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  }, [stopCamera]);

  // Làm lại
  const resetRegistration = useCallback(() => {
    setCapturedImages([]);
    setCurrentStep(0);
    setRegistrationProgress(0);
    setIsRegistrationComplete(false);
    stopCamera();
  }, [stopCamera]);

  // Phóng to/thu nhỏ camera
  const handleToggleCameraSize = () => {
    setIsCameraFullscreen((prev) => !prev);
    if (cameraContainerRef.current) {
      if (!isCameraFullscreen) {
        cameraContainerRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  };

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
  }, [isCameraActive]);

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
      padding: "32px 48px" 
    }}>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ borderRadius: 8, marginBottom: 16 }}
        >
          Quay lại
        </Button>
        
        <Title level={1} style={{ 
          marginBottom: 8, 
          color: "#2563eb",
          fontSize: 32,
          fontWeight: 700
        }}>
          🔒 Face Registration
        </Title>
        <Text style={{ 
          fontSize: 18, 
          color: "#64748b",
          display: "block"
        }}>
          Đăng ký khuôn mặt để sử dụng tính năng điểm danh tự động
        </Text>
      </div>

      {/* Steps */}
      <Card style={{
        borderRadius: 16,
        marginBottom: 32,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        border: "none"
      }}>
        <Steps current={currentStep} size="small">
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              icon={step.icon}
            />
          ))}
        </Steps>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Camera Section */}
        <Col xs={24} lg={12}>
          <Card
            style={{
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              border: "none",
              textAlign: 'center',
              position: 'relative',
              width: isPanelZoomed ? '100%' : undefined, // Sửa lại width động
              maxWidth: isPanelZoomed ? '100%' : 400,   // Sửa lại maxWidth động
              height: isPanelZoomed ? 500 : undefined,
              zIndex: isPanelZoomed ? 99 : 'auto',
              left: isPanelZoomed ? '50%' : undefined,
              top: isPanelZoomed ? '50%' : undefined,
              transform: isPanelZoomed ? 'translate(-50%, -50%)' : undefined,
              margin: isPanelZoomed ? '0 auto' : undefined,
              transition: 'all 0.3s'
            }}
          >
            <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
              📷 Camera Preview
            </Title>
            {/* Nút zoom panel */}
            <Button
              type="default"
              size="small"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 10,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.8)'
              }}
              onClick={() => setIsPanelZoomed(prev => !prev)}
            >
              {isPanelZoomed ? 'Thu nhỏ' : 'Phóng to'}
            </Button>
            <div
              ref={cameraContainerRef}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: isPanelZoomed ? '100%' : 400, // Sửa lại maxWidth động
                height: isPanelZoomed ? 400 : 300,
                margin: '0 auto',
                marginBottom: isPanelZoomed ? 0 : 24,
                background: isCameraActive ? undefined : '#f8fafc',
                zIndex: isPanelZoomed ? 99 : 'auto',
                transition: 'all 0.3s'
              }}
            >
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    style={{
                      width: '100%',
                      height: isPanelZoomed ? 400 : 300,
                      borderRadius: 12,
                      border: '3px solid #e5e7eb',
                      background: '#222',
                      objectFit: 'cover',
                      display: 'block',
                      transform: 'scaleX(-1)',
                      transition: 'transform 0.3s'
                    }}
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  />
                  {/* Face detection overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60%',
                    height: '70%',
                    border: '2px dashed #10b981',
                    borderRadius: '50%',
                    pointerEvents: 'none'
                  }}>
                    <div style={{
                      position: 'absolute',
                      bottom: -40,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(16, 185, 129, 0.9)',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      Đặt khuôn mặt vào khung
                    </div>
                  </div>
                </>
              ) : (
                <div style={{
                  width: '100%',
                  height: 300,
                  background: '#f8fafc',
                  border: '2px dashed #d1d5db',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16
                }}>
                  <CameraOutlined style={{ fontSize: 48, color: '#9ca3af' }} />
                  <Text type="secondary">Camera chưa được khởi động</Text>
                </div>
              )}
            </div>

            <Space size="large">
              {!isCameraActive ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<CameraOutlined />}
                  onClick={startCamera}
                  loading={isLoading}
                  style={{ borderRadius: 8 }}
                >
                  Bắt đầu
                </Button>
              ) : (
                <>
                  <Button
                    type="primary"
                    size="large"
                    icon={<CameraOutlined />}
                    onClick={captureImage}
                    disabled={capturedImages.length >= requiredImages || isLoading}
                    style={{ borderRadius: 8 }}
                  >
                    Chụp ảnh ({capturedImages.length}/{requiredImages})
                  </Button>
                  <Button
                    size="large"
                    icon={<ReloadOutlined />}
                    onClick={resetRegistration}
                    style={{ borderRadius: 8 }}
                  >
                    Làm lại
                  </Button>
                </>
              )}
            </Space>

            {currentStep === 2 && (
              <div style={{ marginTop: 24 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Đang xử lý dữ liệu...
                </Text>
                <Progress 
                  percent={registrationProgress} 
                  status={isRegistrationComplete ? "success" : "active"}
                  strokeColor="#10b981"
                />
              </div>
            )}
          </Card>
        </Col>

        {/* Info & Results */}
        <Col xs={24} lg={12}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Instructions */}
            <Card style={{
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              border: "none"
            }}>
              <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
                📋 Hướng dẫn
              </Title>
              
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Alert
                  message="Lưu ý quan trọng"
                  description="Đảm bảo ánh sáng đủ và khuôn mặt rõ ràng để có độ chính xác cao nhất."
                  type="info"
                  showIcon
                />
                
                <div>
                  <Text strong>Các bước thực hiện:</Text>
                  <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                    <li>Ngồi thẳng, nhìn thẳng vào camera</li>
                    <li>Đảm bảo khuôn mặt nằm trong khung hình</li>
                    <li>Chụp ảnh từ nhiều góc độ khác nhau</li>
                    <li>Tránh che khuất mặt bằng tay hoặc vật dụng</li>
                    <li>Giữ biểu cảm tự nhiên</li>
                  </ul>
                </div>
              </Space>
            </Card>

            {/* Captured Images */}
            {capturedImages.length > 0 && (
              <Card style={{
                borderRadius: 16,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: "none"
              }}>
                <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
                  📸 Ảnh đã chụp ({capturedImages.length}/{requiredImages})
                </Title>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap: 12,
                  marginBottom: 16
                }}>
                  {capturedImages.map((img) => (
                    <div key={img.id} style={{ textAlign: 'center' }}>
                      <Avatar
                        src={img.dataUrl}
                        size={80}
                        style={{ border: '2px solid #e5e7eb' }}
                      />
                      <div style={{ marginTop: 4 }}>
                        <Tag color={img.quality > 90 ? 'green' : img.quality > 80 ? 'orange' : 'red'} size="small">
                          {Math.round(img.quality)}%
                        </Tag>
                      </div>
                    </div>
                  ))}
                </div>

                <Progress 
                  percent={Math.round((capturedImages.length / requiredImages) * 100)}
                  strokeColor="#2563eb"
                  showInfo={false}
                />
              </Card>
            )}

            {/* Registration Success */}
            {isRegistrationComplete && (
              <Card style={{
                borderRadius: 16,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: "none",
                background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
              }}>
                <div style={{ textAlign: 'center' }}>
                  <CheckCircleOutlined style={{ fontSize: 48, color: '#10b981', marginBottom: 16 }} />
                  <Title level={4} style={{ color: '#065f46', marginBottom: 8 }}>
                    Đăng ký thành công!
                  </Title>
                  <Text style={{ color: '#047857', display: 'block', marginBottom: 16 }}>
                    Khuôn mặt của bạn đã được đăng ký vào hệ thống. Bạn có thể sử dụng tính năng điểm danh tự động.
                  </Text>
                  
                  <Space>
                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() => navigate('/student/attendance')}
                      style={{ borderRadius: 8 }}
                    >
                      Xem điểm danh
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={resetRegistration}
                      style={{ borderRadius: 8 }}
                    >
                      Đăng ký lại
                    </Button>
                  </Space>
                </div>
              </Card>
            )}
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default FaceRegisterPage;