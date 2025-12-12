import React, { useState, useEffect } from 'react';
import { Typography, Card, Button, Steps, Alert, Progress, Space, Row, Col, Tag, Spin, Badge, Statistic, Image, message } from 'antd';
import { CameraOutlined, CheckCircleOutlined, ReloadOutlined, SafetyCertificateOutlined, EyeOutlined, ArrowLeftOutlined, CloseCircleOutlined, LoadingOutlined, CheckOutlined, CloseOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb';
import { useFaceRegistration } from '../../hooks/useFaceRegistration';
import { useAuth } from '../../hooks/useAuth';
import { getMyRegistrationStatus, loadPendingReviewImages, confirmPendingReview } from '../../apis/faceRegistrationAPIs/faceRegistration';
import type { FaceRegistrationStatus } from '../../apis/faceRegistrationAPIs/faceRegistration';

const { Title, Text } = Typography;
const { Step } = Steps;

const FaceRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.student_id || NaN;
  
  const {
    videoRef,
    canvasRef,
    isConnected,
    processedFrame,
    error,
    isCompleted,
    completionData,
    connectionStatus,
    isReviewing,
    previewImages,
    registrationStatus,
    connect,
    startWebcam,
    startStreaming,
    restart,
    cancel,
    confirmImages,
  } = useFaceRegistration({
    studentId,
    serverUrl: import.meta.env.VITE_WS_FaceRegister_URL || 'ws://localhost:8000',
    fps: 10,
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [initialStatus, setInitialStatus] = useState<FaceRegistrationStatus | null>(null);
  const [pendingReviewData, setPendingReviewData] = useState<any>(null);
  const [isLoadingPendingReview, setIsLoadingPendingReview] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(4 / 3); // Default 4:3

  const breadcrumbItems = [
    { title: "Trang chủ", href: "/student" },
    { title: "Đăng ký khuôn mặt" }
  ];

  // Check registration status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const statusData = await getMyRegistrationStatus();
        setInitialStatus(statusData);
        
        
        // If status is pending_student_review, load pending review images
        if (statusData.status === 'pending_student_review') {
          setIsLoadingPendingReview(true);
          try {
            const reviewData = await loadPendingReviewImages();
            setPendingReviewData(reviewData);
            
          } catch (error: any) {
            console.error('Failed to load pending review images:', error);
            console.error('Error response:', error?.response?.data);
            message.error(error?.response?.data?.detail || 'Không thể tải ảnh đang chờ xác nhận');
          } finally {
            setIsLoadingPendingReview(false);
          }
        }
      } catch (error) {
        console.error('Failed to check registration status:', error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    checkStatus();
  }, []);

  // Handler for confirming pending review images via REST API
  const handleConfirmPendingReview = async (accept: boolean) => {
    setIsConfirming(true);
    try {
      const result = await confirmPendingReview(accept);
      
      if (result.success) {
        message.success(result.message);
        
        // Clear pending review data
        setPendingReviewData(null);
        
        // Refresh status
        const newStatus = await getMyRegistrationStatus();
        setInitialStatus(newStatus);
        
        // If rejected, they can register again - no need to reload
        // If accepted, they should see the pending_admin_review status
      }
    } catch (error: any) {
      console.error('Failed to confirm review:', error);
      message.error(error?.response?.data?.detail || 'Không thể xác nhận. Vui lòng thử lại.');
    } finally {
      setIsConfirming(false);
    }
  };

  const steps = [
    {
      title: 'Chuẩn bị',
      description: 'Kết nối và khởi động camera',
      icon: <SafetyCertificateOutlined />,
    },
    {
      title: 'Thu thập dữ liệu',
      description: 'Thu thập ảnh khuôn mặt (12 bước)',
      icon: <CameraOutlined />,
    },
    {
      title: 'Hoàn thành',
      description: 'Xử lý và lưu trữ dữ liệu',
      icon: <CheckCircleOutlined />,
    },
  ];

  useEffect(() => {
    if (isCompleted) {
      setCurrentStep(2);
    } else if (isConnected && processedFrame) {
      setCurrentStep(1);
    } else {
      setCurrentStep(0);
    }
  }, [isConnected, processedFrame, isCompleted]);

  const handleStart = async () => {
    connect();
    const webcamStarted = await startWebcam();
    if (webcamStarted) {
      // Detect video aspect ratio after webcam starts
      setTimeout(() => {
        if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
          const aspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight;
          setVideoAspectRatio(aspectRatio);
          
        }
        startStreaming();
      }, 500);
    }
  };

  // Draw canvas overlay on video
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !isConnected) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('🎨 Canvas drawing effect initialized', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      videoPaused: video.paused,
      isConnected
    });

    let animationFrameId: number;

    const drawFrame = () => {
      // Check if video is ready and playing
      if (!video.videoWidth || !video.videoHeight) {
        animationFrameId = requestAnimationFrame(drawFrame);
        return;
      }
      
      if (video.paused || video.ended) {
        animationFrameId = requestAnimationFrame(drawFrame);
        return;
      }
      
      // Match canvas size to video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      // Save context state
      ctx.save();
      
      // Flip horizontally for mirror effect
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      
      // Draw video frame (flipped)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Restore context to draw overlays normally (not flipped)
      ctx.restore();
      
      // Draw overlays if we have face metadata
      if (processedFrame && processedFrame.faceDetected) {
        const { boundingBox, poseAngles, instruction, conditionMet, progress } = processedFrame;
        
        // Draw bounding box (backend already receives flipped image, so coordinates are correct)
        if (boundingBox) {
          const x = boundingBox.x * canvas.width;
          const y = boundingBox.y * canvas.height;
          const width = boundingBox.width * canvas.width;
          const height = boundingBox.height * canvas.height;
          
          ctx.strokeStyle = conditionMet ? '#10b981' : '#ef4444';
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);
        }
        
        // Draw instruction text
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(instruction, 20, 50);
        
        // Draw status
        ctx.fillStyle = conditionMet ? '#10b981' : '#f59e0b';
        ctx.font = '16px sans-serif';
        const statusText = conditionMet ? 'CORRECT POSE' : 'ADJUST POSE';
        ctx.fillText(statusText, 20, 140);
        
        // Draw pose angles
        if (poseAngles) {
          ctx.fillStyle = '#ef4444';
          ctx.font = '14px sans-serif';
          ctx.fillText(`Pitch: ${poseAngles.pitch.toFixed(1)}°`, canvas.width - 150, 50);
          ctx.fillText(`Yaw: ${poseAngles.yaw.toFixed(1)}°`, canvas.width - 150, 80);
          ctx.fillText(`Roll: ${poseAngles.roll.toFixed(1)}°`, canvas.width - 150, 110);
        }
        
        // Draw progress bar if condition met
        if (conditionMet && progress > 0) {
          const barWidth = canvas.width - 40;
          const barHeight = 20;
          const barX = 20;
          const barY = canvas.height - 40;
          
          // Background
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          
          // Progress
          ctx.fillStyle = '#10b981';
          ctx.fillRect(barX, barY, (barWidth * progress) / 100, barHeight);
          
          // Border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
      } else if (processedFrame && !processedFrame.faceDetected) {
        // No face detected
        ctx.fillStyle = '#ef4444';
        ctx.font = '24px sans-serif';
        ctx.fillText('No face detected', 20, 50);
      }
      
      animationFrameId = requestAnimationFrame(drawFrame);
    };
    
    drawFrame();

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [processedFrame, videoRef, canvasRef, isConnected]);

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge status='success' text='Đã kết nối' />;
      case 'connecting':
        return <Badge status='processing' text='Đang kết nối...' />;
      case 'error':
        return <Badge status='error' text='Lỗi kết nối' />;
      default:
        return <Badge status='default' text='Chưa kết nối' />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)', padding: '16px 16px 32px' }}>
      <Breadcrumb items={breadcrumbItems} />
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} size="small" style={{ borderRadius: 8, marginBottom: 12 }}>
          Quay lại
        </Button>
        <Title level={2} style={{ marginBottom: 8, color: '#2563eb', fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: 700 }}>
          🔒 Face Registration
        </Title>
        <Text style={{ fontSize: 'clamp(14px, 3.5vw, 18px)', color: '#64748b', display: 'block' }}>
          Đăng ký khuôn mặt để sử dụng tính năng điểm danh tự động
        </Text>
      </div>

      {/* Loading Status */}
      {isLoadingStatus && (
        <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: 'none', textAlign: 'center', padding: '24px 16px' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 'clamp(32px, 8vw, 48px)' }} spin />} />
          <Text type='secondary' style={{ display: 'block', marginTop: 12, fontSize: 'clamp(14px, 3.5vw, 16px)' }}>
            Đang kiểm tra trạng thái đăng ký...
          </Text>
        </Card>
      )}

      {/* Status Blocking UI - when student cannot register */}
      {!isLoadingStatus && initialStatus && !initialStatus.can_register && initialStatus.status !== 'pending_student_review' && (
        <Card style={{ 
          borderRadius: 12, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
          border: 'none',
          background: initialStatus.status === 'approved' 
            ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' 
            : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
        }}>
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            {initialStatus.status === 'approved' ? (
              <>
                <CheckCircleOutlined style={{ fontSize: 'clamp(48px, 12vw, 64px)', color: '#10b981', marginBottom: 12 }} />
                <Title level={4} style={{ color: '#065f46', marginBottom: 8, fontSize: 'clamp(16px, 4vw, 20px)' }}>
                  Khuôn mặt đã được phê duyệt ✅
                </Title>
                <Text style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', color: '#047857', display: 'block', marginBottom: 16 }}>
                  {initialStatus.message}
                </Text>
              </>
            ) : initialStatus.status === 'pending_admin_review' ? (
              <>
                <ClockCircleOutlined style={{ fontSize: 'clamp(48px, 12vw, 64px)', color: '#d97706', marginBottom: 12 }} />
                <Title level={4} style={{ color: '#92400e', marginBottom: 8, fontSize: 'clamp(16px, 4vw, 20px)' }}>
                  Đang chờ admin phê duyệt ⏳
                </Title>
                <Text style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', color: '#b45309', display: 'block', marginBottom: 16 }}>
                  {initialStatus.message}
                </Text>
              </>
            ) : (
              <>
                <ExclamationCircleOutlined style={{ fontSize: 'clamp(48px, 12vw, 64px)', color: '#6b7280', marginBottom: 12 }} />
                <Title level={4} style={{ color: '#374151', marginBottom: 8, fontSize: 'clamp(16px, 4vw, 20px)' }}>
                  Không thể đăng ký
                </Title>
                <Text style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', color: '#4b5563', display: 'block', marginBottom: 16 }}>
                  {initialStatus.message}
                </Text>
              </>
            )}

            {initialStatus.details && (
              <Alert 
                message="Chi tiết" 
                description={
                  <div>
                    <Text strong>Trạng thái: </Text>
                    <Tag color={
                      initialStatus.status === 'approved' ? 'success' : 
                      initialStatus.status === 'pending_admin_review' ? 'warning' :
                      initialStatus.status === 'pending_student_review' ? 'processing' : 'default'
                    }>
                      {initialStatus.status}
                    </Tag>
                  </div>
                }
                type="info" 
                showIcon 
                style={{ marginTop: 16, textAlign: 'left' }}
              />
            )}
            
            <Button 
              type="primary" 
              size="middle" 
              onClick={() => navigate('/student')} 
              style={{ marginTop: 16, borderRadius: 8, width: '100%', maxWidth: 300 }}
              icon={<ArrowLeftOutlined />}
            >
              Quay về Dashboard
            </Button>
          </div>
        </Card>
      )}

      {/* Pending Student Review UI - show review interface */}
      {!isLoadingStatus && initialStatus && initialStatus.status === 'pending_student_review' && (
        <Card style={{ 
          borderRadius: 12, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
          border: 'none',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
        }}>
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <EyeOutlined style={{ fontSize: 'clamp(48px, 12vw, 64px)', color: '#d97706', marginBottom: 12 }} />
            <Title level={4} style={{ color: '#92400e', marginBottom: 8, fontSize: 'clamp(16px, 4vw, 20px)' }}>
              Xem lại ảnh đã thu thập 📸
            </Title>
            <Text style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', color: '#b45309', display: 'block', marginBottom: 16 }}>
              Vui lòng kiểm tra {pendingReviewData?.total_images || 0} ảnh khuôn mặt của bạn
            </Text>
            
            {isLoadingPendingReview ? (
              <Spin indicator={<LoadingOutlined style={{ fontSize: 'clamp(32px, 8vw, 48px)' }} spin />} />
            ) : pendingReviewData && pendingReviewData.preview_images ? (
              <>
                {/* Preview Images Grid */}
                <Row gutter={[8, 8]} style={{ marginBottom: 16, maxHeight: '400px', overflowY: 'auto' }}>
                  {pendingReviewData.preview_images.map((img: any, index: number) => (
                    <Col xs={12} sm={8} md={6} key={index}>
                      <div style={{ position: 'relative' }}>
                        <Image 
                          src={`data:image/jpeg;base64,${img.image_base64}`}
                          alt={img.step_name}
                          style={{ 
                            width: '100%', 
                            borderRadius: 8,
                            border: '2px solid #d1d5db'
                          }}
                          preview={{
                            mask: <div style={{ fontSize: 12 }}>{img.step_name}</div>
                          }}
                        />
                        <div style={{ 
                          position: 'absolute', 
                          top: 4, 
                          left: 4, 
                          background: 'rgba(0,0,0,0.7)', 
                          color: 'white', 
                          padding: '2px 6px', 
                          borderRadius: 4, 
                          fontSize: 10 
                        }}>
                          {img.step_number}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
                
                <Alert 
                  message="Lưu ý" 
                  description="Sau khi chấp nhận, ảnh sẽ được gửi cho admin duyệt. Nếu không hài lòng, bạn có thể từ chối và thu thập lại." 
                  type="warning" 
                  showIcon 
                  style={{ marginBottom: 16, textAlign: 'left' }}
                />
                
                <Space size="middle" direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    size="middle" 
                    icon={<CheckOutlined />} 
                    onClick={() => handleConfirmPendingReview(true)}
                    loading={isConfirming}
                    style={{ borderRadius: 8, background: '#10b981', borderColor: '#10b981', width: '100%' }}
                  >
                    Chấp nhận
                  </Button>
                  <Button 
                    size="middle" 
                    danger 
                    icon={<CloseOutlined />} 
                    onClick={() => handleConfirmPendingReview(false)}
                    loading={isConfirming}
                    style={{ borderRadius: 8, width: '100%' }}
                  >
                    Từ chối & Thu thập lại
                  </Button>
                </Space>
              </>
            ) : (
              <Alert 
                message="Không có dữ liệu" 
                description="Không thể tải ảnh. Vui lòng thử lại hoặc liên hệ admin." 
                type="error" 
                showIcon 
              />
            )}
          </div>
        </Card>
      )}

      {/* Rejection Notice - show when rejected status (can still register) */}
      {!isLoadingStatus && initialStatus && initialStatus.status === 'rejected' && initialStatus.can_register && (
        <Alert
          message="Đăng ký trước đó đã bị từ chối"
          description={
            <div>
              <Text strong style={{ color: '#dc2626' }}>Lý do từ chối: </Text>
              <Text>{initialStatus.details?.rejection_reason || 'Không có lý do cụ thể'}</Text>
              <br />
              <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                Vui lòng chụp lại ảnh khuôn mặt với chất lượng tốt hơn để đăng ký lại.
              </Text>
              {initialStatus.details?.admin_reviewed_at && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  Ngày từ chối: {new Date(initialStatus.details.admin_reviewed_at).toLocaleString('vi-VN')}
                </Text>
              )}
            </div>
          }
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {/* Main Registration UI - only show when can register */}
      {!isLoadingStatus && (!initialStatus || initialStatus.can_register) && (
        <>
      <Card style={{ borderRadius: 12, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: 'none' }}>
        <Steps current={currentStep} size='small' direction="horizontal" responsive={false}>
          {steps.map((step, index) => (
            <Step key={index} title={step.title} description={window.innerWidth > 768 ? step.description : ''} icon={step.icon} />
          ))}
        </Steps>
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: 'none', textAlign: 'center', padding: 'clamp(12px, 3vw, 24px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <Title level={5} style={{ margin: 0, color: '#374151', fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 600 }}>
                {isReviewing ? '👁️ Xem lại ảnh đã thu thập' : '📷 Camera Preview'}
              </Title>
              {!isReviewing && getConnectionBadge()}
            </div>
            
            {/* Preview Images when reviewing */}
            {isReviewing && previewImages.length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <Alert 
                  message="Đã thu thập xong!" 
                  description="Vui lòng kiểm tra các ảnh khuôn mặt bên dưới. Nếu hài lòng, hãy chấp nhận để gửi cho admin duyệt." 
                  type="success" 
                  showIcon 
                  style={{ marginBottom: 16, fontSize: 'clamp(13px, 3.5vw, 15px)' }}
                />
                <Row gutter={[8, 8]} style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: 16 }}>
                  {previewImages.map((img, index) => (
                    <Col xs={12} sm={8} md={6} lg={6} key={index}>
                      <div style={{ position: 'relative' }}>
                        <Image 
                          src={`data:image/jpeg;base64,${img.image_base64}`}
                          alt={img.step_name}
                          style={{ 
                            width: '100%', 
                            borderRadius: 8,
                            border: '2px solid #10b981'
                          }}
                          preview={{
                            mask: <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)' }}>{img.step_name}</div>
                          }}
                        />
                        <div style={{ 
                          position: 'absolute', 
                          top: 4, 
                          left: 4, 
                          background: 'rgba(0,0,0,0.7)', 
                          color: 'white', 
                          padding: '2px 6px', 
                          borderRadius: 4, 
                          fontSize: 'clamp(10px, 2.5vw, 12px)',
                          fontWeight: 600
                        }}>
                          {img.step_number}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
                <Space size='middle' wrap style={{ justifyContent: 'center', width: '100%' }}>
                  <Button 
                    type='primary' 
                    size='large' 
                    icon={<CheckOutlined />} 
                    onClick={() => confirmImages(true)}
                    style={{ 
                      borderRadius: 8, 
                      minWidth: 'clamp(140px, 40vw, 180px)', 
                      height: 'clamp(44px, 12vw, 48px)',
                      fontSize: 'clamp(15px, 4vw, 17px)',
                      fontWeight: 600,
                      background: '#10b981',
                      borderColor: '#10b981'
                    }}
                  >
                    Chấp nhận
                  </Button>
                  <Button 
                    size='large' 
                    danger 
                    icon={<CloseOutlined />} 
                    onClick={() => confirmImages(false)}
                    style={{ 
                      borderRadius: 8, 
                      minWidth: 'clamp(120px, 35vw, 140px)',
                      height: 'clamp(44px, 12vw, 48px)',
                      fontSize: 'clamp(14px, 3.5vw, 16px)'
                    }}
                  >
                    Từ chối & Thu thập lại
                  </Button>
                </Space>
              </div>
            ) : (
              <>
            <div style={{ 
              position: 'relative', 
              width: '100%', 
              maxWidth: videoAspectRatio < 1 ? 'min(90vw, 450px)' : 'min(90vw, 600px)', // Responsive max width
              margin: '0 auto', 
              marginBottom: 16,
              paddingTop: `${(1 / videoAspectRatio) * 100}%`, // Dynamic aspect ratio based on video
              background: '#f8fafc',
              borderRadius: 12
            }}>
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isConnected ? (
                  <>
                    <canvas 
                      ref={canvasRef} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        borderRadius: 12, 
                        border: `3px solid ${processedFrame?.conditionMet ? '#10b981' : '#e5e7eb'}`, 
                        background: '#222', 
                        objectFit: 'contain'
                      }} 
                    />
                  </>
                ) : connectionStatus === 'connecting' ? (
                  <div style={{ width: '100%', height: '100%', background: '#f8fafc', border: '2px dashed #d1d5db', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 }}>
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 'clamp(32px, 8vw, 48px)' }} spin />} />
                    <Text type='secondary' style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}>Đang kết nối WebSocket...</Text>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#f8fafc', border: '2px dashed #d1d5db', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 }}>
                    <CameraOutlined style={{ fontSize: 'clamp(32px, 8vw, 48px)', color: '#9ca3af' }} />
                    <Text type='secondary' style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}>Camera chưa được khởi động</Text>
                  </div>
                )}
              </div>
              <video ref={videoRef} style={{ display: 'none' }} autoPlay muted playsInline />
            </div>
            {error && <Alert message='Lỗi' description={error} type='error' showIcon closable style={{ marginBottom: 12, fontSize: 'clamp(13px, 3.5vw, 15px)' }} />}
            <Space size='middle' wrap style={{ justifyContent: 'center', width: '100%' }}>
              {!isConnected ? (
                <Button 
                  type='primary' 
                  size='large' 
                  icon={<CameraOutlined />} 
                  onClick={handleStart} 
                  loading={connectionStatus === 'connecting'} 
                  style={{ 
                    borderRadius: 8, 
                    minWidth: 'clamp(140px, 40vw, 180px)', 
                    height: 'clamp(44px, 12vw, 48px)',
                    fontSize: 'clamp(15px, 4vw, 17px)',
                    fontWeight: 600
                  }}
                >
                  Bắt đầu
                </Button>
              ) : (
                <>
                  <Button 
                    type='primary' 
                    size='large' 
                    icon={<ReloadOutlined />} 
                    onClick={restart} 
                    disabled={isCompleted} 
                    style={{ 
                      borderRadius: 8, 
                      minWidth: 'clamp(120px, 35vw, 140px)',
                      height: 'clamp(44px, 12vw, 48px)',
                      fontSize: 'clamp(14px, 3.5vw, 16px)'
                    }}
                  >
                    Làm lại
                  </Button>
                  <Button 
                    size='large' 
                    danger 
                    icon={<CloseCircleOutlined />} 
                    onClick={cancel} 
                    style={{ 
                      borderRadius: 8, 
                      minWidth: 'clamp(100px, 30vw, 120px)',
                      height: 'clamp(44px, 12vw, 48px)',
                      fontSize: 'clamp(14px, 3.5vw, 16px)'
                    }}
                  >
                    Hủy
                  </Button>
                </>
              )}
            </Space>
            </>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10} style={{ display: isReviewing ? 'none' : 'block' }}>
          <Space direction='vertical' size='middle' style={{ width: '100%' }}>
            {processedFrame && (
              <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: 'none', padding: 'clamp(12px, 3vw, 20px)' }}>
                <Title level={5} style={{ marginBottom: 12, color: '#374151', fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 600 }}>📊 Tiến độ</Title>
                <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 'clamp(15px, 4vw, 17px)' }}>
                      Bước {processedFrame.currentStep + 1} / {processedFrame.totalSteps}
                    </Text>
                    <Progress 
                      percent={processedFrame.progress} 
                      status={isCompleted ? 'success' : 'active'} 
                      strokeColor='#10b981' 
                      strokeWidth={window.innerWidth < 768 ? 12 : 10}
                    />
                  </div>
                  {processedFrame.poseAngles && (
                    <div style={{ background: '#f8fafc', padding: 'clamp(10px, 3vw, 12px)', borderRadius: 8 }}>
                      <Text type='secondary' strong style={{ display: 'block', marginBottom: 8, fontSize: 'clamp(13px, 3.5vw, 15px)' }}>Góc độ khuôn mặt:</Text>
                      <Row gutter={[8, 8]}>
                        <Col xs={8} sm={8}>
                          <Statistic 
                            title='Pitch' 
                            value={processedFrame.poseAngles.pitch.toFixed(1)} 
                            suffix='°' 
                            valueStyle={{ fontSize: 'clamp(16px, 4.5vw, 20px)', fontWeight: 600 }} 
                          />
                        </Col>
                        <Col xs={8} sm={8}>
                          <Statistic 
                            title='Yaw' 
                            value={processedFrame.poseAngles.yaw.toFixed(1)} 
                            suffix='°' 
                            valueStyle={{ fontSize: 'clamp(16px, 4.5vw, 20px)', fontWeight: 600 }} 
                          />
                        </Col>
                        <Col xs={8} sm={8}>
                          <Statistic 
                            title='Roll' 
                            value={processedFrame.poseAngles.roll.toFixed(1)} 
                            suffix='°' 
                            valueStyle={{ fontSize: 'clamp(16px, 4.5vw, 20px)', fontWeight: 600 }} 
                          />
                        </Col>
                      </Row>
                    </div>
                  )}
                </Space>
              </Card>
            )}
            <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: 'none', padding: 'clamp(12px, 3vw, 20px)' }}>
              <Title level={5} style={{ marginBottom: 12, color: '#374151', fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 600 }}>📋 Hướng dẫn</Title>
              <Space direction='vertical' size='small' style={{ width: '100%' }}>
                <Alert message='Lưu ý quan trọng' description='Hệ thống sẽ tự động thu thập 12 bước ảnh từ các góc độ khác nhau. Hãy làm theo hướng dẫn hiển thị trên màn hình.' type='info' showIcon style={{ fontSize: 'clamp(13px, 3.5vw, 15px)' }} />
                <div>
                  <Text strong style={{ fontSize: 'clamp(13px, 3.5vw, 15px)' }}>Các bước thực hiện:</Text>
                  <ul style={{ marginTop: 8, paddingLeft: 16, fontSize: 'clamp(13px, 3.5vw, 15px)', lineHeight: '1.6' }}>
                    <li style={{ marginBottom: 6 }}>Đảm bảo ánh sáng đủ và khuôn mặt rõ ràng</li>
                    <li style={{ marginBottom: 6 }}>Ngồi thẳng, giữ khuôn mặt trong khung hình</li>
                    <li style={{ marginBottom: 6 }}>Làm theo hướng dẫn: nhìn thẳng, quay trái/phải, ngẩng/cúi</li>
                    <li style={{ marginBottom: 6 }}>Giữ tư thế ổn định khi chỉ thị Tư thế đúng xuất hiện</li>
                    <li>Hệ thống sẽ tự động chụp ảnh và chuyển bước</li>
                  </ul>
                </div>
              </Space>
            </Card>
            
            {/* Completion Card */}
            {isCompleted && completionData && (
              <Card style={{ 
                borderRadius: 12, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
                border: 'none', 
                background: registrationStatus === 'pending_admin_review' 
                  ? 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' 
                  : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
              }}>
                <div style={{ textAlign: 'center', padding: '8px' }}>
                  {registrationStatus === 'pending_admin_review' ? (
                    <>
                      <LoadingOutlined style={{ fontSize: 'clamp(32px, 8vw, 48px)', color: '#7c3aed', marginBottom: 12 }} />
                      <Title level={5} style={{ color: '#5b21b6', marginBottom: 8, fontSize: 'clamp(14px, 3.5vw, 16px)' }}>Đang chờ duyệt!</Title>
                      <Text style={{ color: '#6d28d9', display: 'block', marginBottom: 8, fontSize: 'clamp(12px, 3vw, 14px)' }}>
                        Ảnh khuôn mặt của bạn đã được gửi và đang chờ admin phê duyệt.
                      </Text>
                      <Text type='secondary' style={{ display: 'block', marginBottom: 12, fontSize: 'clamp(12px, 3vw, 14px)' }}>
                        Bạn sẽ nhận được thông báo khi admin xem xét xong.
                      </Text>
                      <Alert 
                        message="Trạng thái: Đang chờ phê duyệt" 
                        description="Quá trình duyệt có thể mất vài phút đến vài giờ. Vui lòng kiên nhẫn chờ đợi." 
                        type="info" 
                        showIcon 
                        style={{ fontSize: 'clamp(12px, 3vw, 14px)' }}
                      />
                    </>
                  ) : (
                    <>
                      <CheckCircleOutlined style={{ fontSize: 'clamp(32px, 8vw, 48px)', color: '#10b981', marginBottom: 12 }} />
                      <Title level={5} style={{ color: '#065f46', marginBottom: 8, fontSize: 'clamp(14px, 3.5vw, 16px)' }}>Hoàn thành!</Title>
                      <Text style={{ color: '#047857', display: 'block', marginBottom: 8, fontSize: 'clamp(12px, 3vw, 14px)' }}>{completionData.message}</Text>
                      <Text type='secondary' style={{ display: 'block', marginBottom: 12, fontSize: 'clamp(12px, 3vw, 14px)' }}>
                        Đã thu thập {completionData.totalImages} ảnh khuôn mặt
                      </Text>
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Button type='primary' icon={<EyeOutlined />} onClick={() => navigate('/student/attendance')} style={{ borderRadius: 8, width: '100%' }}>
                          Xem điểm danh
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={restart} style={{ borderRadius: 8, width: '100%' }}>
                          Đăng ký lại
                        </Button>
                      </Space>
                    </>
                  )}
                </div>
              </Card>
            )}
          </Space>
        </Col>
      </Row>
      </>
      )}
    </div>
  );
};

export default FaceRegisterPage;
