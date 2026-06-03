import React, { useEffect, useMemo, useState } from 'react';
import { App, Modal, Upload, Table, Tag, Button, Space, Alert, Collapse, Select } from 'antd';
import { InboxOutlined, CheckCircleOutlined, CloseCircleOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import axios from '../apis/axios';
import { getDepartments, type DepartmentResponse } from '../apis/departmentAPIs/department';
import { getSpecializations, type SpecializationResponse } from '../apis/departmentAPIs/specialization';

const { Dragger } = Upload;

const normalizeKey = (value: string) => (
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
);

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
  const { message } = App.useApp();
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationResponse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const templates = {
    student: {
      fileName: 'mau_import_sinh_vien',
      headers: ['full_name', 'mssv', 'password', 'phone', 'department_name', 'academic_year', 'date_of_birth'],
      rows: [
        ['Nguyen Van A', '102220001', 'Password123', '0912345678', 'Information Technology', '2022', '2004-01-15'],
        ['Tran Thi B', '102220002', 'Password123', '0987654321', 'Electronics & Telecommunications', '2022', '2004-05-20'],
      ],
    },
    teacher: {
      fileName: 'mau_import_giao_vien',
      headers: ['full_name', 'email', 'password', 'phone', 'department_name', 'specialization_name'],
      rows: [
        ['Nguyen Van A', 'nguyenvana', 'Password123', '0912345678', 'Information Technology', 'Computer Science'],
        ['Tran Thi B', 'tranthib', 'Password123', '0987654321', 'Electronics & Telecommunications', 'Electronics'],
      ],
    },
  };

  const selectedTemplate = templates[type];

  const departmentOptions = useMemo(() => (
    departments.map(department => ({
      label: `${department.name} (${department.code})`,
      value: department.name,
    }))
  ), [departments]);

  const specializationOptions = useMemo(() => (
    specializations.map(specialization => ({
      label: `${specialization.name} (${specialization.code})`,
      value: specialization.name,
    }))
  ), [specializations]);

  const departmentMap = useMemo(() => {
    const map = new Map<string, DepartmentResponse>();
    departments.forEach(department => {
      map.set(normalizeKey(department.name), department);
      map.set(normalizeKey(department.code), department);
    });
    return map;
  }, [departments]);

  const specializationMap = useMemo(() => {
    const map = new Map<string, SpecializationResponse>();
    specializations.forEach(specialization => {
      map.set(normalizeKey(specialization.name), specialization);
      map.set(normalizeKey(specialization.code), specialization);
    });
    return map;
  }, [specializations]);

  const loadCatalogs = async () => {
    if (departments.length > 0 && specializations.length > 0) {
      return { nextDepartments: departments, nextSpecializations: specializations };
    }

    setCatalogLoading(true);
    try {
      const [nextDepartments, nextSpecializations] = await Promise.all([
        getDepartments(0, 500),
        getSpecializations(undefined, 0, 500),
      ]);
      setDepartments(nextDepartments);
      setSpecializations(nextSpecializations);
      return { nextDepartments, nextSpecializations };
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    loadCatalogs().catch(() => {
      message.error("Không thể tải danh sách khoa/chuyên ngành");
    });
  }, [visible]);

  const buildTemplateRows = (
    availableDepartments: DepartmentResponse[] = departments,
    availableSpecializations: SpecializationResponse[] = specializations,
  ) => {
    const firstDepartment = availableDepartments[0]?.name || "";
    const secondDepartment = availableDepartments[1]?.name || "";
    const firstSpecialization = availableSpecializations[0]?.name || "";
    const secondSpecialization = availableSpecializations[1]?.name || "";

    if (type === "student") {
      return [
        ['Nguyen Van A', '102220001', 'Password123', '0912345678', firstDepartment, '2022', '2004-01-15'],
        ['Tran Thi B', '102220002', 'Password123', '0987654321', secondDepartment, '2022', '2004-05-20'],
        ['Le Van C', '102220003', 'Password123', '0900000000', '', '2023', '2005-03-10'],
      ];
    }

    return [
      ['Nguyen Van A', 'nguyenvana', 'Password123', '0912345678', firstDepartment, firstSpecialization],
      ['Tran Thi B', 'tranthib', 'Password123', '0987654321', secondDepartment, secondSpecialization],
      ['Le Van C', 'levanc', 'Password123', '0900000000', '', ''],
    ];
  };

  const buildCsvContent = () => {
    const rows = [selectedTemplate.headers, ...buildTemplateRows()];
    return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const convertExcelToCsvFile = async (file: File): Promise<File> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error('File Excel không có sheet dữ liệu');
    }

    const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
    return new File([csvContent], `${type}_import.csv`, { type: 'text/csv;charset=utf-8' });
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    
    try {
      const isExcelFile = /\.(xlsx|xls)$/i.test(file.name);
      const uploadFile = isExcelFile ? await convertExcelToCsvFile(file) : file;
      const formData = new FormData();
      formData.append('file', uploadFile);

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
      message.error(error.response?.data?.detail || 'Không thể xử lý file import');
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
    accept: '.csv,.xlsx,.xls',
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
      title: 'Department (optional)',
      dataIndex: 'department_name',
      width: 240,
      render: (value: string, record) => (
        <Select
          allowClear
          showSearch
          placeholder="Không bắt buộc"
          value={value || undefined}
          options={departmentOptions}
          optionFilterProp="label"
          loading={catalogLoading}
          style={{ width: "100%" }}
          status={(record.errors || []).some(error => normalizeKey(error).includes("khoa") || normalizeKey(error).includes("department")) ? "error" : undefined}
          onChange={(nextValue) => updatePreviewCatalogField(record.row_number, "department_name", nextValue)}
        />
      ),
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
      title: 'Specialization (optional)',
      dataIndex: 'specialization_name',
      width: 250,
      render: (value: string, record: CSVRow) => (
        <Select
          allowClear
          showSearch
          placeholder="Không bắt buộc"
          value={value || undefined}
          options={specializationOptions}
          optionFilterProp="label"
          loading={catalogLoading}
          style={{ width: "100%" }}
          status={(record.errors || []).some(error => normalizeKey(error).includes("chuyen nganh") || normalizeKey(error).includes("specialization")) ? "error" : undefined}
          onChange={(nextValue) => updatePreviewCatalogField(record.row_number, "specialization_name", nextValue)}
        />
      ),
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

  const downloadTemplate = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    const { nextDepartments, nextSpecializations } = await loadCatalogs();
    const link = document.createElement('a');
    const templateRows = buildTemplateRows(nextDepartments, nextSpecializations);

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.aoa_to_sheet([selectedTemplate.headers, ...templateRows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Import');
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
          ['field', 'required', 'note'],
          ['full_name', 'yes', 'Họ tên người dùng'],
          [type === 'student' ? 'mssv' : 'email', 'yes', type === 'student' ? 'MSSV 9 chữ số' : 'Chỉ nhập phần trước @dut.udn.vn'],
          ['password', 'yes', 'Tối thiểu 8 ký tự, có chữ hoa, chữ thường và số'],
          ['phone', 'yes', '10 chữ số, bắt đầu bằng 0'],
          ['department_name', 'no', 'Không bắt buộc. Nếu nhập, chọn đúng tên trong sheet Departments.'],
          ...(type === 'teacher' ? [['specialization_name', 'no', 'Không bắt buộc. Nếu nhập, chọn đúng tên trong sheet Specializations.']] : []),
          ...(type === 'student' ? [
            ['academic_year', 'no', 'Không bắt buộc'],
            ['date_of_birth', 'no', 'Không bắt buộc, định dạng YYYY-MM-DD'],
          ] : []),
        ]),
        'Rules'
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
          ['department_name', 'code'],
          ...nextDepartments.map(department => [department.name, department.code]),
        ]),
        'Departments'
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
          ['specialization_name', 'code', 'department_id'],
          ...nextSpecializations.map(specialization => [specialization.name, specialization.code, specialization.department_id]),
        ]),
        'Specializations'
      );
      XLSX.writeFile(workbook, `${selectedTemplate.fileName}.xlsx`);
      message.success('Đã tải file mẫu Excel');
      return;
    }

    const rows = [selectedTemplate.headers, ...templateRows];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedTemplate.fileName}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    message.success('Đã tải file mẫu CSV');
  };

  const recomputePreviewSummary = (nextRows: CSVRow[]): PreviewResponse | null => {
    if (!previewData) return null;
    const validRows = nextRows.filter(row => row.is_valid).length;
    return {
      ...previewData,
      rows: nextRows,
      valid_rows: validRows,
      invalid_rows: nextRows.length - validRows,
      can_import: validRows > 0,
    };
  };

  const updatePreviewCatalogField = (rowNumber: number, field: "department_name" | "specialization_name", value?: string) => {
    if (!previewData) return;

    const nextRows = previewData.rows.map(row => {
      if (row.row_number !== rowNumber) return row;

      const nextErrors = (row.errors || []).filter(error => {
        const normalized = normalizeKey(error);
        if (field === "department_name") return !normalized.includes("khoa") && !normalized.includes("department");
        return !normalized.includes("chuyen nganh") && !normalized.includes("specialization");
      });

      const normalizedValue = normalizeKey(value || "");
      if (field === "department_name" && normalizedValue && !departmentMap.has(normalizedValue)) {
        nextErrors.push(`Khoa '${value}' không tồn tại trong hệ thống`);
      }
      if (field === "specialization_name" && normalizedValue && !specializationMap.has(normalizedValue)) {
        nextErrors.push(`Chuyên ngành '${value}' không tồn tại trong hệ thống`);
      }

      return {
        ...row,
        [field]: value || "",
        errors: nextErrors,
        is_valid: nextErrors.length === 0,
      };
    });

    const nextPreview = recomputePreviewSummary(nextRows);
    if (nextPreview) setPreviewData(nextPreview);
  };

  return (
    <Modal
      title={`Import ${type === 'student' ? 'Sinh viên' : 'Giáo viên'}`}
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
          <Button key="template" icon={<FileExcelOutlined />} onClick={() => downloadTemplate('xlsx')}>
            Tải mẫu Excel
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
            message="Hướng dẫn import"
            description={
              <div>
                <p>1. Tải file mẫu, điền dữ liệu theo đúng tên cột.</p>
                <p>2. Upload file CSV hoặc Excel (.xlsx/.xls).</p>
                <p>3. Kiểm tra dữ liệu preview rồi xác nhận import.</p>
                <br />
                <p><strong>Các cột cần có:</strong> {selectedTemplate.headers.join(', ')}</p>
                <p><strong>Lưu ý:</strong></p>
                <ul>
                  <li>{type === 'student' ? 'MSSV phải có 9 chữ số' : 'Email chỉ nhập phần trước domain, không nhập @dut.udn.vn'}</li>
                  <li>Mật khẩu tối thiểu 8 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số. Ví dụ: Password123.</li>
                  <li>Số điện thoại gồm 10 chữ số và bắt đầu bằng 0.</li>
                  <li>Khoa và chuyên ngành không bắt buộc. Có thể để trống trong file hoặc xóa giá trị ở preview.</li>
                  <li>Nếu nhập khoa/chuyên ngành, giá trị phải trùng với dữ liệu đang có trong hệ thống. Có thể sửa bằng dropdown ở bảng preview.</li>
                </ul>
                <Alert
                  type={departments.length > 0 ? "success" : "warning"}
                  showIcon
                  style={{ marginTop: 12 }}
                  message={departments.length > 0 ? `Đã tải ${departments.length} khoa và ${specializations.length} chuyên ngành` : "Chưa tải được danh sách khoa/chuyên ngành"}
                  description={departments.length > 0 ? (
                    <Space wrap size={[6, 6]}>
                      {departments.slice(0, 10).map(department => <Tag key={department.id}>{department.name}</Tag>)}
                      {departments.length > 10 && <Tag>+{departments.length - 10} khoa khác</Tag>}
                    </Space>
                  ) : "File vẫn có thể để trống khoa/chuyên ngành. Nếu muốn chọn giá trị, kiểm tra lại danh mục khoa/chuyên ngành trước khi import."}
                />
                <Space wrap style={{ marginTop: 8 }}>
                  <Button type="primary" icon={<FileExcelOutlined />} onClick={() => downloadTemplate('xlsx')}>
                    Tải mẫu Excel
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate('csv')}>
                    Tải mẫu CSV
                  </Button>
                </Space>
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
              Kéo thả file import vào đây hoặc bấm để chọn file
            </p>
            <p className="ant-upload-hint">
              Hỗ trợ .csv, .xlsx và .xls. File Excel sẽ được đọc từ sheet đầu tiên.
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
