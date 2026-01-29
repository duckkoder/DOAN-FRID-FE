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
          `There are ${response.data.invalid_rows} invalid rows. Only ${response.data.valid_rows} valid rows will be imported.`
        );
      } else {
        message.success('All data is valid!');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error processing CSV file');
      setPreviewData(null);
    } finally {
      setLoading(false);
    }

    return false; // Prevent default upload
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.can_import) {
      message.error('No valid data to import');
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
        // Has errors - display result for user to review
        setImportResult(response.data);
        message.warning(`Import completed with ${response.data.failed} errors`);
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Error importing data');
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
      title: 'Row',
      dataIndex: 'row_number',
      width: 70,
      fixed: 'left',
    },
    {
      title: 'Status',
      dataIndex: 'is_valid',
      width: 100,
      fixed: 'left',
      render: (isValid: boolean) => (
        <Tag color={isValid ? 'success' : 'error'} icon={isValid ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {isValid ? 'Valid' : 'Error'}
        </Tag>
      ),
    },
    {
      title: 'Full Name',
      dataIndex: 'full_name',
      width: 200,
    },
    {
      title: type === 'student' ? 'Student ID' : 'Email',
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
    {
      title: 'Phone',
      dataIndex: 'phone',
      width: 120,
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      width: 150,
    },
    ...(type === 'student' ? [
      {
        title: 'Academic Year',
        dataIndex: 'academic_year',
        width: 100,
      },
      {
        title: 'Date of Birth',
        dataIndex: 'date_of_birth',
        width: 120,
      },
    ] : []),
    ...(type === 'teacher' ? [{
      title: 'Specialization',
      dataIndex: 'specialization_name',
      width: 150,
    }] : []),
    {
      title: 'Errors',
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
        'John Doe,102220001,Password123,0912345678,Information Technology,2022,2004-01-15\n' +
        'Jane Smith,102220002,Password123,0987654321,Electronics & Telecommunications,2022,2004-05-20';
      
      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'student_template.csv';
      link.click();
    } else {
      const template = 'full_name,email,password,phone,department_name,specialization_name\n' +
        'John Doe,johndoe,Password123,0912345678,Information Technology,Computer Science\n' +
        'Jane Smith,janesmith,Password123,0987654321,Electronics & Telecommunications,Electronics';
      
      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'teacher_template.csv';
      link.click();
    }
    message.success('Template file downloaded');
  };

  return (
    <Modal
      title={`Import ${type === 'student' ? 'Students' : 'Teachers'} from CSV`}
      open={visible}
      onCancel={handleClose}
      width={1200}
      footer={
        importResult ? [
          <Button key="close" type="primary" onClick={handleClose}>
            Close
          </Button>,
        ] : previewData ? [
          <Button key="back" onClick={handleClose}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleConfirmImport}
            disabled={!previewData.can_import}
            loading={importing}
          >
            Confirm Import ({previewData.valid_rows} rows)
          </Button>,
        ] : [
          <Button key="template" onClick={downloadTemplate}>
            Download Template
          </Button>,
          <Button key="cancel" onClick={handleClose}>
            Close
          </Button>,
        ]
      }
    >
      {importResult ? (
        <div>
          <Alert
            message={importResult.success ? "Import successful!" : "Import completed with errors"}
            description={importResult.message}
            type={importResult.success ? 'success' : 'warning'}
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          {importResult.failed > 0 && (
            <Collapse defaultActiveKey={['errors']} style={{ marginBottom: 16 }}>
              <Collapse.Panel 
                header={`Error details (${importResult.failed} rows)`} 
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
                      title: 'Row',
                      dataIndex: 'row',
                      width: 80,
                    },
                    {
                      title: 'Email',
                      dataIndex: 'email',
                      width: 200,
                    },
                    {
                      title: 'Error',
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
              message={`✅ Successfully imported ${importResult.successful} ${type === 'student' ? 'students' : 'teachers'}`}
              type="success"
              showIcon
            />
          )}
        </div>
      ) : !previewData ? (
        <div>
          <Alert
            message="Instructions"
            description={
              <div>
                <p>1. Download the template file using the "Download Template" button below</p>
                <p>2. Fill in the information according to the template format</p>
                <p>3. Drag and drop or click to upload the CSV file</p>
                <p>4. Review the data and confirm import</p>
                <br />
                <p><strong>Notes:</strong></p>
                <ul>
                  <li>{type === 'student' ? 'Student ID must be 9 digits' : 'Email should not include @dut.udn.vn'}</li>
                  <li>Password must have at least 9 characters, including uppercase, lowercase and numbers</li>
                  <li>Phone number must have 10 digits starting with 0</li>
                  <li>Department and specialization names must match exactly with the system</li>
                  <li>File must have UTF-8 encoding</li>
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
              Drag and drop CSV file here or click to select file
            </p>
            <p className="ant-upload-hint">
              Only .csv files with UTF-8 encoding are supported
            </p>
          </Dragger>
        </div>
      ) : (
        <div>
          <Alert
            message={
              previewData.invalid_rows === 0
                ? `Ready to import ${previewData.valid_rows} ${type === 'student' ? 'students' : 'teachers'}`
                : `Ready to import ${previewData.valid_rows} valid rows (skipping ${previewData.invalid_rows} error rows)`
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
