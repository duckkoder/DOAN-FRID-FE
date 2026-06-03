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
      fileName: 'mau_tao_sinh_vien_hang_loat',
      headers: ['full_name', 'mssv', 'password', 'phone', 'department_name', 'academic_year', 'date_of_birth'],
      displayHeaders: ['Họ và tên', 'Mã sinh viên', 'Mật khẩu', 'Số điện thoại', 'Khoa', 'Khóa học', 'Ngày sinh'],
      rows: [
        ['Nguyen Van A', '102220001', 'Password123', '0912345678', 'Information Technology', '2022', '2004-01-15'],
        ['Tran Thi B', '102220002', 'Password123', '0987654321', 'Electronics & Telecommunications', '2022', '2004-05-20'],
      ],
    },
    teacher: {
      fileName: 'mau_tao_giao_vien_hang_loat',
      headers: ['full_name', 'email', 'password', 'phone', 'department_name', 'specialization_name'],
      displayHeaders: ['Họ và tên', 'Tên email', 'Mật khẩu', 'Số điện thoại', 'Khoa', 'Chuyên ngành'],
      rows: [
        ['Nguyen Van A', 'nguyenvana', 'Password123', '0912345678', 'Information Technology', 'Computer Science'],
        ['Tran Thi B', 'tranthib', 'Password123', '0987654321', 'Electronics & Telecommunications', 'Electronics'],
      ],
    },
  };

  const selectedTemplate = templates[type];
  const headerAliases = useMemo(() => {
    const aliases = new Map<string, string>();
    selectedTemplate.headers.forEach((header, index) => {
      aliases.set(normalizeKey(header), header);
      aliases.set(normalizeKey(selectedTemplate.displayHeaders[index]), header);
    });
    aliases.set("ho va ten", "full_name");
    aliases.set("họ và tên", "full_name");
    aliases.set("ma sinh vien", "mssv");
    aliases.set("mã sinh viên", "mssv");
    aliases.set("ten email", "email");
    aliases.set("tên email", "email");
    aliases.set("mat khau", "password");
    aliases.set("mật khẩu", "password");
    aliases.set("so dien thoai", "phone");
    aliases.set("số điện thoại", "phone");
    aliases.set("khoa", "department_name");
    aliases.set("chuyen nganh", "specialization_name");
    aliases.set("chuyên ngành", "specialization_name");
    aliases.set("khoa hoc", "academic_year");
    aliases.set("khóa học", "academic_year");
    aliases.set("ngay sinh", "date_of_birth");
    aliases.set("ngày sinh", "date_of_birth");
    return aliases;
  }, [selectedTemplate]);

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
    const rows = [selectedTemplate.displayHeaders, ...buildTemplateRows()];
    return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const convertToBackendCsvFile = async (file: File): Promise<File> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error('File không có sheet dữ liệu');
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[firstSheetName], { defval: "" });
    const normalizedRows = rawRows.map((row) => {
      const normalized: Record<string, any> = {};
      Object.entries(row).forEach(([key, value]) => {
        const mappedKey = headerAliases.get(normalizeKey(key));
        if (mappedKey) normalized[mappedKey] = value;
      });
      return normalized;
    });
    const worksheet = XLSX.utils.json_to_sheet(normalizedRows, { header: selectedTemplate.headers });
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    return new File([csvContent], `${type}_bulk_create.csv`, { type: 'text/csv;charset=utf-8' });
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    
    try {
      const uploadFile = await convertToBackendCsvFile(file);
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
          `Có ${response.data.invalid_rows} dòng cần sửa. Có thể tạo trước ${response.data.valid_rows} dòng hợp lệ.`
        );
      } else {
        message.success('File hợp lệ, có thể tạo tài khoản');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Không thể xử lý file danh sách');
      setPreviewData(null);
    } finally {
      setLoading(false);
    }

    return false; // Prevent default upload
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.can_import) {
      message.error('Chưa có dữ liệu hợp lệ để tạo tài khoản');
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
        message.warning(`Đã tạo xong, còn ${response.data.failed} dòng lỗi`);
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Không thể tạo tài khoản từ file');
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
      title: 'Dòng',
      dataIndex: 'row_number',
      width: 70,
      fixed: 'left',
    },
    {
      title: 'Tình trạng',
      dataIndex: 'is_valid',
      width: 100,
      fixed: 'left',
      render: (isValid: boolean) => (
        <Tag color={isValid ? 'success' : 'error'} icon={isValid ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {isValid ? 'Hợp lệ' : 'Cần sửa'}
        </Tag>
      ),
    },
    {
      title: 'Họ và tên',
      dataIndex: 'full_name',
      width: 200,
    },
    {
      title: type === 'student' ? 'Mã sinh viên' : 'Tên email',
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
      title: 'Số điện thoại',
      dataIndex: 'phone',
      width: 120,
    },
    {
      title: 'Khoa (không bắt buộc)',
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
        title: 'Khóa học',
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
      title: 'Chuyên ngành (không bắt buộc)',
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
      title: 'Cần kiểm tra',
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
      const worksheet = XLSX.utils.aoa_to_sheet([selectedTemplate.displayHeaders, ...templateRows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, type === 'student' ? 'Danh sách sinh viên' : 'Danh sách giáo viên');
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
          ['Thông tin', 'Bắt buộc', 'Ghi chú'],
          ['Họ và tên', 'Có', 'Họ tên đầy đủ'],
          [type === 'student' ? 'Mã sinh viên' : 'Tên email', 'Có', type === 'student' ? 'MSSV 9 chữ số' : 'Chỉ nhập phần trước @dut.udn.vn'],
          ['Mật khẩu', 'Có', 'Tối thiểu 8 ký tự, có chữ hoa, chữ thường và số'],
          ['Số điện thoại', 'Có', '10 chữ số, bắt đầu bằng 0'],
          ['Khoa', 'Không', 'Nếu nhập, chọn đúng tên trong sheet Khoa.'],
          ...(type === 'teacher' ? [['Chuyên ngành', 'Không', 'Nếu nhập, chọn đúng tên trong sheet Chuyên ngành.']] : []),
          ...(type === 'student' ? [
            ['Khóa học', 'Không', 'Ví dụ: 2022'],
            ['Ngày sinh', 'Không', 'Định dạng YYYY-MM-DD'],
          ] : []),
        ]),
        'Hướng dẫn'
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
          ['Khoa', 'Mã khoa'],
          ...nextDepartments.map(department => [department.name, department.code]),
        ]),
        'Khoa'
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
          ['Chuyên ngành', 'Mã chuyên ngành', 'Mã khoa liên kết'],
          ...nextSpecializations.map(specialization => [specialization.name, specialization.code, specialization.department_id]),
        ]),
        'Chuyên ngành'
      );
      XLSX.writeFile(workbook, `${selectedTemplate.fileName}.xlsx`);
      message.success('Đã tải file mẫu Excel');
      return;
    }

    const rows = [selectedTemplate.displayHeaders, ...templateRows];
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
      title={`Tạo ${type === 'student' ? 'sinh viên' : 'giáo viên'} hàng loạt`}
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
            Tạo {previewData.valid_rows} tài khoản
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
            message={importResult.success ? "Tạo tài khoản thành công" : "Đã tạo xong, còn một số dòng lỗi"}
            description={importResult.message}
            type={importResult.success ? 'success' : 'warning'}
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          {importResult.failed > 0 && (
            <Collapse defaultActiveKey={['errors']} style={{ marginBottom: 16 }}>
              <Collapse.Panel 
                header={`Dòng cần kiểm tra (${importResult.failed})`} 
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
              message={`Đã tạo ${importResult.successful} ${type === 'student' ? 'sinh viên' : 'giáo viên'}`}
              type="success"
              showIcon
            />
          )}
        </div>
      ) : !previewData ? (
        <div>
          <Alert
            message={`Tạo ${type === 'student' ? 'sinh viên' : 'giáo viên'} từ file`}
            description={
              <div>
                <p>1. Tải file mẫu, điền danh sách theo các cột có sẵn.</p>
                <p>2. Upload file CSV hoặc Excel (.xlsx/.xls).</p>
                <p>3. Kiểm tra bảng xem trước rồi bấm tạo tài khoản.</p>
                <br />
                <p><strong>Các thông tin cần điền:</strong> Họ tên, {type === 'student' ? 'mã sinh viên' : 'tên email'}, mật khẩu, số điện thoại; khoa/chuyên ngành có thể để trống.</p>
                <p><strong>Lưu ý:</strong></p>
                <ul>
                  <li>{type === 'student' ? 'MSSV phải có 9 chữ số' : 'Email chỉ nhập phần trước domain, không nhập @dut.udn.vn'}</li>
                  <li>Mật khẩu tối thiểu 8 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số. Ví dụ: Password123.</li>
                  <li>Số điện thoại gồm 10 chữ số và bắt đầu bằng 0.</li>
                  <li>Khoa và chuyên ngành không bắt buộc. Có thể để trống trong file hoặc xóa giá trị ở preview.</li>
                  <li>Nếu nhập khoa/chuyên ngành, chọn đúng tên đang có trong danh mục. Có thể sửa nhanh bằng danh sách chọn ở bảng xem trước.</li>
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
                  ) : "File vẫn có thể để trống khoa/chuyên ngành. Nếu muốn chọn giá trị, kiểm tra lại danh mục khoa/chuyên ngành trước khi tạo tài khoản."}
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
              Kéo thả file danh sách vào đây hoặc bấm để chọn file
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
                ? `Sẵn sàng tạo ${previewData.valid_rows} ${type === 'student' ? 'sinh viên' : 'giáo viên'}`
                : `Có thể tạo ${previewData.valid_rows} dòng hợp lệ, bỏ qua ${previewData.invalid_rows} dòng cần sửa`
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
