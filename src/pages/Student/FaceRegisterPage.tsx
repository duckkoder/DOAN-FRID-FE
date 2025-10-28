import React, { useState, useEffect } from 'react';
import { Typography, Card, Button, Steps, Alert, Progress, Space, Row, Col, Tag, Spin, Badge, Statistic, Image } from 'antd';
import { CameraOutlined, CheckCircleOutlined, ReloadOutlined, SafetyCertificateOutlined, EyeOutlined, ArrowLeftOutlined, CloseCircleOutlined, LoadingOutlined, CheckOutlined, CloseOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb';
import { useFaceRegistration } from '../../hooks/useFaceRegistration';
import { useAuth } from '../../hooks/useAuth';
import { getMyRegistrationStatus } from '../../apis/faceRegistrationAPIs/faceRegistration';
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
    serverUrl: 'ws://localhost:8000',
    fps: 10,
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [initialStatus, setInitialStatus] = useState<FaceRegistrationStatus | null>(null);

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
        console.log('Initial registration status:', statusData);
      } catch (error) {
        console.error('Failed to check registration status:', error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    checkStatus();
  }, []);

  const steps = [
    {
      title: 'Chuẩn bị',
      description: 'Kết nối và khởi động camera',
      icon: <SafetyCertificateOutlined />,
    },
    {
      title: 'Thu thập dữ liệu',
      description: 'Thu thập ảnh khuôn mặt (14 bước)',
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
      setTimeout(() => {
        startStreaming();
      }, 500);
    }
  };

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)', padding: '32px 48px' }}>
      <Breadcrumb items={breadcrumbItems} />
      <div style={{ marginBottom: 32 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ borderRadius: 8, marginBottom: 16 }}>
          Quay lại
        </Button>
        <Title level={1} style={{ marginBottom: 8, color: '#2563eb', fontSize: 32, fontWeight: 700 }}>
          🔒 Face Registration
        </Title>
        <Text style={{ fontSize: 18, color: '#64748b', display: 'block' }}>
          Đăng ký khuôn mặt để sử dụng tính năng điểm danh tự động
        </Text>
      </div>

      {/* Loading Status */}
      {isLoadingStatus && (
        <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: 'none', textAlign: 'center', padding: '48px' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <Text type='secondary' style={{ display: 'block', marginTop: 16, fontSize: 16 }}>
            Đang kiểm tra trạng thái đăng ký...
          </Text>
        </Card>
      )}

      {/* Status Blocking UI - when student cannot register */}
      {!isLoadingStatus && initialStatus && !initialStatus.can_register && (
        <Card style={{ 
          borderRadius: 16, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
          border: 'none',
          background: initialStatus.status === 'approved' 
            ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' 
            : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
        }}>
          <div style={{ textAlign: 'center', padding: '32px' }}>
            {initialStatus.status === 'approved' ? (
              <>
                <CheckCircleOutlined style={{ fontSize: 64, color: '#10b981', marginBottom: 16 }} />
                <Title level={3} style={{ color: '#065f46', marginBottom: 8 }}>
                  Khuôn mặt đã được phê duyệt ✅
                </Title>
                <Text style={{ fontSize: 16, color: '#047857', display: 'block', marginBottom: 24 }}>
                  {initialStatus.message}
                </Text>
              </>
            ) : initialStatus.status === 'pending_admin_review' ? (
              <>
                <ClockCircleOutlined style={{ fontSize: 64, color: '#d97706', marginBottom: 16 }} />
                <Title level={3} style={{ color: '#92400e', marginBottom: 8 }}>
                  Đang chờ admin phê duyệt ⏳
                </Title>
                <Text style={{ fontSize: 16, color: '#b45309', display: 'block', marginBottom: 24 }}>
                  {initialStatus.message}
                </Text>
              </>
            ) : initialStatus.status === 'pending_student_review' ? (
              <>
                <ExclamationCircleOutlined style={{ fontSize: 64, color: '#f59e0b', marginBottom: 16 }} />
                <Title level={3} style={{ color: '#78350f', marginBottom: 8 }}>
                  Đang chờ xác nhận từ bạn 📸
                </Title>
                <Text style={{ fontSize: 16, color: '#92400e', display: 'block', marginBottom: 24 }}>
                  Bạn có một yêu cầu đang chờ xem lại ảnh. Vui lòng làm mới trang để tiếp tục.
                </Text>
              </>
            ) : (
              <>
                <ExclamationCircleOutlined style={{ fontSize: 64, color: '#6b7280', marginBottom: 16 }} />
                <Title level={3} style={{ color: '#374151', marginBottom: 8 }}>
                  Không thể đăng ký
                </Title>
                <Text style={{ fontSize: 16, color: '#4b5563', display: 'block', marginBottom: 24 }}>
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
                    <br />
                    <Text strong>ID: </Text>{initialStatus.registration_id || 'N/A'}
                  </div>
                }
                type="info" 
                showIcon 
                style={{ marginTop: 16, textAlign: 'left' }}
              />
            )}
            
            <Button 
              type="primary" 
              size="large" 
              onClick={() => navigate('/student')} 
              style={{ marginTop: 24, borderRadius: 8 }}
              icon={<ArrowLeftOutlined />}
            >
              Quay về Dashboard
            </Button>
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
      <Card style={{ borderRadius: 16, marginBottom: 32, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: 'none' }}>
        <Steps current={currentStep} size='small'>
          {steps.map((step, index) => (
            <Step key={index} title={step.title} description={step.description} icon={step.icon} />
          ))}
        </Steps>
      </Card>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: 'none', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0, color: '#374151' }}>📷 Camera Preview</Title>
              {getConnectionBadge()}
            </div>
            <div style={{ position: 'relative', width: '100%', maxWidth: 600, height: 450, margin: '0 auto', marginBottom: 24 }}>
              {isConnected && processedFrame ? (
                <>
                  <img src={processedFrame.image} alt='Processed frame' style={{ width: '100%', height: 450, borderRadius: 12, border: '3px solid #e5e7eb', background: '#222', objectFit: 'contain' }} />
                  <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0, 0, 0, 0.75)', color: 'white', padding: '12px 24px', borderRadius: 12, fontSize: 16, fontWeight: 600, maxWidth: '90%', textAlign: 'center' }}>
                    {processedFrame.instruction}
                  </div>
                  <div style={{ position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)' }}>
                    <Tag color={processedFrame.status === 'correct_pose' ? 'success' : 'warning'} style={{ fontSize: 14, padding: '4px 12px' }}>
                      {/* {processedFrame.status === 'correct_pose' ? '✅ Tư thế đúng' : '⏳ Điều chỉnh tư thế'} */}
                    </Tag>
                  </div>
                  {!processedFrame.faceDetected && (
                    <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
                      ⚠️ Không phát hiện khuôn mặt
                    </div>
                  )}
                </>
              ) : connectionStatus === 'connecting' ? (
                <div style={{ width: '100%', height: 450, background: '#f8fafc', border: '2px dashed #d1d5db', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
                  <Text type='secondary' style={{ fontSize: 16 }}>Đang kết nối WebSocket...</Text>
                </div>
              ) : (
                <div style={{ width: '100%', height: 450, background: '#f8fafc', border: '2px dashed #d1d5db', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <CameraOutlined style={{ fontSize: 48, color: '#9ca3af' }} />
                  <Text type='secondary'>Camera chưa được khởi động</Text>
                </div>
              )}
              <video ref={videoRef} style={{ display: 'none' }} autoPlay muted playsInline />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            {error && <Alert message='Lỗi' description={error} type='error' showIcon closable style={{ marginBottom: 16 }} />}
            <Space size='large'>
              {!isConnected ? (
                <Button type='primary' size='large' icon={<CameraOutlined />} onClick={handleStart} loading={connectionStatus === 'connecting'} style={{ borderRadius: 8 }}>
                  Bắt đầu
                </Button>
              ) : (
                <>
                  <Button type='primary' size='large' icon={<ReloadOutlined />} onClick={restart} disabled={isCompleted} style={{ borderRadius: 8 }}>
                    Làm lại
                  </Button>
                  <Button size='large' danger icon={<CloseCircleOutlined />} onClick={cancel} style={{ borderRadius: 8 }}>
                    Hủy
                  </Button>
                </>
              )}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Space direction='vertical' size='large' style={{ width: '100%' }}>
            {processedFrame && (
              <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: 'none' }}>
                <Title level={4} style={{ marginBottom: 16, color: '#374151' }}>📊 Tiến độ</Title>
                <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Bước {processedFrame.currentStep + 1} / {processedFrame.totalSteps}
                    </Text>
                    <Progress percent={processedFrame.progress} status={isCompleted ? 'success' : 'active'} strokeColor='#10b981' />
                  </div>
                  {processedFrame.poseAngles && (
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                      <Text type='secondary' strong style={{ display: 'block', marginBottom: 8 }}>Góc độ khuôn mặt:</Text>
                      <Row gutter={[8, 8]}>
                        <Col span={8}>
                          <Statistic title='Pitch' value={processedFrame.poseAngles.pitch.toFixed(1)} suffix='°' valueStyle={{ fontSize: 16 }} />
                        </Col>
                        <Col span={8}>
                          <Statistic title='Yaw' value={processedFrame.poseAngles.yaw.toFixed(1)} suffix='°' valueStyle={{ fontSize: 16 }} />
                        </Col>
                        <Col span={8}>
                          <Statistic title='Roll' value={processedFrame.poseAngles.roll.toFixed(1)} suffix='°' valueStyle={{ fontSize: 16 }} />
                        </Col>
                      </Row>
                    </div>
                  )}
                </Space>
              </Card>
            )}
            <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: 'none' }}>
              <Title level={4} style={{ marginBottom: 16, color: '#374151' }}>📋 Hướng dẫn</Title>
              <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                <Alert message='Lưu ý quan trọng' description='Hệ thống sẽ tự động thu thập 14 bước ảnh từ các góc độ khác nhau. Hãy làm theo hướng dẫn hiển thị trên màn hình.' type='info' showIcon />
                <div>
                  <Text strong>Các bước thực hiện:</Text>
                  <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                    <li>Đảm bảo ánh sáng đủ và khuôn mặt rõ ràng</li>
                    <li>Ngồi thẳng, giữ khuôn mặt trong khung hình</li>
                    <li>Làm theo hướng dẫn: nhìn thẳng, quay trái/phải, ngẩng/cúi</li>
                    <li>Giữ tư thế ổn định khi chỉ thị Tư thế đúng xuất hiện</li>
                    <li>Hệ thống sẽ tự động chụp ảnh và chuyển bước</li>
                  </ul>
                </div>
              </Space>
            </Card>
            
            {/* Preview Images for Student Review */}
            {isReviewing && previewImages.length > 0 && (
              <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: 'none', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <EyeOutlined style={{ fontSize: 48, color: '#d97706', marginBottom: 16 }} />
                  <Title level={4} style={{ color: '#92400e', marginBottom: 8 }}>Xem lại ảnh đã thu thập</Title>
                  <Text style={{ color: '#b45309', display: 'block', marginBottom: 16 }}>
                    Vui lòng kiểm tra {previewImages.length} ảnh khuôn mặt của bạn
                  </Text>
                  
                  {/* Preview Images Grid */}
                  <Row gutter={[8, 8]} style={{ marginBottom: 16, maxHeight: '400px', overflowY: 'auto' }}>
                    {previewImages.map((img, index) => (
                      <Col span={6} key={index}>
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
                  
                  <Space size="large">
                    <Button 
                      type="primary" 
                      size="large" 
                      icon={<CheckOutlined />} 
                      onClick={() => confirmImages(true)}
                      style={{ borderRadius: 8, background: '#10b981', borderColor: '#10b981' }}
                    >
                      Chấp nhận
                    </Button>
                    <Button 
                      size="large" 
                      danger 
                      icon={<CloseOutlined />} 
                      onClick={() => confirmImages(false)}
                      style={{ borderRadius: 8 }}
                    >
                      Từ chối & Thu thập lại
                    </Button>
                  </Space>
                </div>
              </Card>
            )}
            
            {/* Completion Card */}
            {isCompleted && completionData && (
              <Card style={{ 
                borderRadius: 16, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
                border: 'none', 
                background: registrationStatus === 'pending_admin_review' 
                  ? 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' 
                  : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
              }}>
                <div style={{ textAlign: 'center' }}>
                  {registrationStatus === 'pending_admin_review' ? (
                    <>
                      <LoadingOutlined style={{ fontSize: 48, color: '#7c3aed', marginBottom: 16 }} />
                      <Title level={4} style={{ color: '#5b21b6', marginBottom: 8 }}>Đang chờ duyệt!</Title>
                      <Text style={{ color: '#6d28d9', display: 'block', marginBottom: 8 }}>
                        Ảnh khuôn mặt của bạn đã được gửi và đang chờ admin phê duyệt.
                      </Text>
                      <Text type='secondary' style={{ display: 'block', marginBottom: 16 }}>
                        Bạn sẽ nhận được thông báo khi admin xem xét xong.
                      </Text>
                      <Alert 
                        message="Trạng thái: Đang chờ phê duyệt" 
                        description="Quá trình duyệt có thể mất vài phút đến vài giờ. Vui lòng kiên nhẫn chờ đợi." 
                        type="info" 
                        showIcon 
                      />
                    </>
                  ) : (
                    <>
                      <CheckCircleOutlined style={{ fontSize: 48, color: '#10b981', marginBottom: 16 }} />
                      <Title level={4} style={{ color: '#065f46', marginBottom: 8 }}>Hoàn thành!</Title>
                      <Text style={{ color: '#047857', display: 'block', marginBottom: 8 }}>{completionData.message}</Text>
                      <Text type='secondary' style={{ display: 'block', marginBottom: 16 }}>
                        Đã thu thập {completionData.totalImages} ảnh khuôn mặt
                      </Text>
                      <Space>
                        <Button type='primary' icon={<EyeOutlined />} onClick={() => navigate('/student/attendance')} style={{ borderRadius: 8 }}>
                          Xem điểm danh
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={restart} style={{ borderRadius: 8 }}>
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
