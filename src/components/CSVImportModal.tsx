import React, { useState } from 'react';
import { Modal, Upload, Table, Tag, Button, message, Space, Alert, Collapse } from 'antd';
import { InboxOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import axios from '../apis/axios';

const { Dragger } = Upload;

interface CSVRow {
  row_number: number;
  full_name: string;
  mssv?: string;  // For students
  email?: string;  // For teachers
  is_valid: boolean;
  errors: string[];
  [key: string]: any; // Additional fields
}

interface PreviewResponse {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  rows: CSVRow[];
  can_import: boolean;
}

interface ImportError {
  row: number;
  email: string;
  error: string;
}

interface ImportResult {
  success: boolean;
  total_attempted: number;
  successful: number;
  failed: number;
  errors: ImportError[];
  message: string;
}

interface CSVImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  type: 'student' | 'teacher';
}

const CSVImportModal: React.FC<CSVImportModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  type
}) => {
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleUpload = async (file: File) => {
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = type === 'student' 
        ? '/admin/students/import/preview' 
        : '/admin/teachers/import/preview';

      const response = await axios.post<PreviewResponse>(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPreviewData(response.data);

      if (response.data.invalid_rows > 0) {
        message.warning(
          `Có ${response.data.invalid_rows} dòng không hợp lệ. Sẽ chỉ import ${response.data.valid_rows} dòng hợp lệ.`
        );
      } else {
        message.success('Tất cả dữ liệu hợp lệ!');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Lỗi khi xử lý file CSV');
      setPreviewData(null);
    } finally {
      setLoading(false);
    }

    return false; // Prevent default upload
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.can_import) {
      message.error('Không có dữ liệu hợp lệ để import');
      return;
    }

    setImporting(true);

    try {
      const endpoint = type === 'student'
        ? '/admin/students/import/confirm'
        : '/admin/teachers/import/confirm';

      // Only send valid rows
      const validRows = previewData.rows
        .filter(row => row.is_valid)
        .map(row => {
          const { is_valid, errors, row_number, ...rest } = row;
          return rest;
        });

      const response = await axios.post<ImportResult>(endpoint, { rows: validRows });

      if (response.data.success) {
        message.success(response.data.message);
        setPreviewData(null);
        setImportResult(null);
        onSuccess();
      } else {
        // Có lỗi - hiển thị result để user xem
        setImportResult(response.data);
        message.warning(`Import hoàn tất với ${response.data.failed} lỗi`);
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Lỗi khi import dữ liệu');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setPreviewData(null);
    setImportResult(null);
    onCancel();
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv',
    beforeUpload: handleUpload,
    showUploadList: false,
  };

  const columns: ColumnsType<CSVRow> = [
    {
      title: 'Dòng',
      dataIndex: 'row_number',
      width: 70,
      fixed: 'left',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_valid',
      width: 100,
      fixed: 'left',
      render: (isValid: boolean) => (
        <Tag color={isValid ? 'success' : 'error'} icon={isValid ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {isValid ? 'Hợp lệ' : 'Lỗi'}
        </Tag>
      ),
    },
    {
      title: 'Họ tên',
      dataIndex: 'full_name',
      width: 200,
    },
    {
      title: type === 'student' ? 'MSSV' : 'Email',
      dataIndex: type === 'student' ? 'mssv' : 'email',
      width: 150,
      render: (value: string) => (
        <span>
          {value}
          {type === 'student' && <span style={{ color: '#999' }}>@sv1.dut.udn.vn</span>}
          {type === 'teacher' && <span style={{ color: '#999' }}>@dut.udn.vn</span>}
        </span>
      ),
    },
    ...(type === 'teacher' ? [{
      title: 'Mã GV',
      dataIndex: 'teacher_code',
      width: 120,
    }] : []),
    {
      title: 'SĐT',
      dataIndex: 'phone',
      width: 120,
    },
    {
      title: 'Khoa',
      dataIndex: 'department_name',
      width: 150,
    },
    ...(type === 'student' ? [
      {
        title: 'Niên khóa',
        dataIndex: 'academic_year',
        width: 100,
      },
      {
        title: 'Ngày sinh',
        dataIndex: 'date_of_birth',
        width: 120,
      },
    ] : []),
    ...(type === 'teacher' ? [{
      title: 'Chuyên ngành',
      dataIndex: 'specialization_name',
      width: 150,
    }] : []),
    {
      title: 'Lỗi',
      dataIndex: 'errors',
      width: 300,
      render: (errors: string[]) => (
        <Space direction="vertical" size="small">
          {errors.map((error, index) => (
            <Tag key={index} color="error">
              {error}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  const downloadTemplate = () => {
    if (type === 'student') {
      const template = 'full_name,mssv,password,phone,department_name,academic_year,date_of_birth\n' +
        'Nguyễn Văn A,102220001,Password123,0912345678,Công nghệ thông tin,2022,2004-01-15\n' +
        'Trần Thị B,102220002,Password123,0987654321,Điện tử viễn thông,2022,2004-05-20';
      
      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'student_template.csv';
      link.click();
    } else {
      const template = 'full_name,email,password,teacher_code,phone,department_name,specialization_name\n' +
        'Nguyễn Văn C,nguyenvanc,Password123,GV001,0912345678,Công nghệ thông tin,Khoa học máy tính\n' +
        'Trần Thị D,tranthid,Password123,GV002,0987654321,Điện tử viễn thông,Điện tử';
      
      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'teacher_template.csv';
      link.click();
    }
    message.success('Đã tải file mẫu');
  };

  return (
    <Modal
      title={`Nhập ${type === 'student' ? 'Sinh viên' : 'Giáo viên'} từ CSV`}
      open={visible}
      onCancel={handleClose}
      width={1200}
      footer={
        importResult ? [
          <Button key="close" type="primary" onClick={handleClose}>
            Đóng
          </Button>,
        ] : previewData ? [
          <Button key="back" onClick={handleClose}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleConfirmImport}
            disabled={!previewData.can_import}
            loading={importing}
          >
            Xác nhận import ({previewData.valid_rows} dòng)
          </Button>,
        ] : [
          <Button key="template" onClick={downloadTemplate}>
            Tải file mẫu
          </Button>,
          <Button key="cancel" onClick={handleClose}>
            Đóng
          </Button>,
        ]
      }
    >
      {importResult ? (
        <div>
          <Alert
            message={importResult.success ? "Import thành công!" : "Import hoàn tất với lỗi"}
            description={importResult.message}
            type={importResult.success ? 'success' : 'warning'}
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          {importResult.failed > 0 && (
            <Collapse defaultActiveKey={['errors']} style={{ marginBottom: 16 }}>
              <Collapse.Panel 
                header={`Chi tiết lỗi (${importResult.failed} dòng)`} 
                key="errors"
              >
                <Table
                  dataSource={importResult.errors}
                  rowKey={(record) => `error-${record.row}`}
                  pagination={false}
                  scroll={{ y: 300 }}
                  size="small"
                  columns={[
                    {
                      title: 'Dòng',
                      dataIndex: 'row',
                      width: 80,
                    },
                    {
                      title: 'Email',
                      dataIndex: 'email',
                      width: 200,
                    },
                    {
                      title: 'Lỗi',
                      dataIndex: 'error',
                      render: (error: string) => (
                        <Tag color="error">{error}</Tag>
                      ),
                    },
                  ]}
                />
              </Collapse.Panel>
            </Collapse>
          )}
          
          {importResult.successful > 0 && (
            <Alert
              message={`✅ Đã import thành công ${importResult.successful} ${type === 'student' ? 'sinh viên' : 'giáo viên'}`}
              type="success"
              showIcon
            />
          )}
        </div>
      ) : !previewData ? (
        <div>
          <Alert
            message="Hướng dẫn"
            description={
              <div>
                <p>1. Tải file mẫu bằng nút "Tải file mẫu" bên dưới</p>
                <p>2. Điền thông tin theo định dạng mẫu</p>
                <p>3. Kéo thả hoặc click để upload file CSV</p>
                <p>4. Kiểm tra dữ liệu và xác nhận import</p>
                <br />
                <p><strong>Lưu ý:</strong></p>
                <ul>
                  <li>{type === 'student' ? 'MSSV phải là 9 chữ số' : 'Email không bao gồm @dut.udn.vn'}</li>
                  <li>Mật khẩu phải có ít nhất 9 ký tự, bao gồm chữ hoa, chữ thường và số</li>
                  <li>Số điện thoại phải có 10 chữ số bắt đầu bằng 0</li>
                  <li>Tên khoa và chuyên ngành phải khớp chính xác với hệ thống</li>
                  <li>File phải có encoding UTF-8</li>
                </ul>
              </div>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />
          
          <Dragger {...uploadProps} disabled={loading}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Kéo thả file CSV vào đây hoặc click để chọn file
            </p>
            <p className="ant-upload-hint">
              Chỉ hỗ trợ file .csv với encoding UTF-8
            </p>
          </Dragger>
        </div>
      ) : (
        <div>
          <Alert
            message={
              previewData.invalid_rows === 0
                ? `Sẵn sàng import ${previewData.valid_rows} ${type === 'student' ? 'sinh viên' : 'giáo viên'}`
                : `Sẵn sàng import ${previewData.valid_rows} dòng hợp lệ (bỏ qua ${previewData.invalid_rows} dòng lỗi)`
            }
            type={previewData.invalid_rows === 0 ? 'success' : 'warning'}
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Table
            columns={columns}
            dataSource={previewData.rows}
            rowKey="row_number"
            pagination={false}
            scroll={{ x: 1500, y: 400 }}
            rowClassName={(record) => record.is_valid ? '' : 'error-row'}
            size="small"
          />
        </div>
      )}
    </Modal>
  );
};

export default CSVImportModal;
