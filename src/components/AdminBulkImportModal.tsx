import React, { useMemo, useState } from "react";
import { App, Alert, Button, Modal, Space, Table, Tag, Upload } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import * as XLSX from "xlsx";

const { Dragger } = Upload;

export type AdminImportType = "department" | "specialization" | "room";

type ImportRow = {
  row_number: number;
  is_valid: boolean;
  errors: string[];
  [key: string]: any;
};

type ImportConfig = {
  title: string;
  fileName: string;
  headers: string[];
  sampleRows: string[][];
  required: string[];
};

type AdminBulkImportModalProps = {
  open: boolean;
  type: AdminImportType;
  departments?: Array<{ id: number; name: string; code: string }>;
  onCancel: () => void;
  onImportRow: (type: AdminImportType, row: Record<string, any>) => Promise<void>;
  onSuccess: () => void;
};

const configs: Record<AdminImportType, ImportConfig> = {
  department: {
    title: "Import Khoa",
    fileName: "mau_import_khoa",
    headers: ["name", "code", "description"],
    sampleRows: [
      ["Khoa Công nghệ thông tin", "CNTT", "Đào tạo các ngành công nghệ thông tin"],
      ["Khoa Điện tử Viễn thông", "DTVT", "Đào tạo điện tử và viễn thông"],
    ],
    required: ["name", "code"],
  },
  specialization: {
    title: "Import Chuyên ngành",
    fileName: "mau_import_chuyen_nganh",
    headers: ["name", "code", "department_code", "description"],
    sampleRows: [
      ["Khoa học máy tính", "KHMT", "CNTT", "Chuyên ngành khoa học máy tính"],
      ["Kỹ thuật phần mềm", "KTPM", "CNTT", "Chuyên ngành kỹ thuật phần mềm"],
    ],
    required: ["name", "code", "department_code"],
  },
  room: {
    title: "Import Phòng học",
    fileName: "mau_import_phong_hoc",
    headers: ["name", "capacity", "description", "status"],
    sampleRows: [
      ["A101", "60", "Phòng học tầng 1", "active"],
      ["LAB-1", "40", "Phòng thực hành", "active"],
    ],
    required: ["name", "capacity"],
  },
};

const normalizeCell = (value: unknown) => String(value ?? "").trim();

const AdminBulkImportModal: React.FC<AdminBulkImportModalProps> = ({
  open,
  type,
  departments = [],
  onCancel,
  onImportRow,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ successful: number; failed: number; errors: Array<{ row: number; error: string }> } | null>(null);

  const config = configs[type];
  const validRows = rows.filter((row) => row.is_valid);

  const departmentMap = useMemo(() => {
    const map = new Map<string, number>();
    departments.forEach((department) => {
      map.set(department.code.toLowerCase(), department.id);
      map.set(department.name.toLowerCase(), department.id);
    });
    return map;
  }, [departments]);

  const reset = () => {
    setRows([]);
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onCancel();
  };

  const validateRow = (raw: Record<string, any>, rowNumber: number): ImportRow => {
    const row: ImportRow = { row_number: rowNumber, is_valid: true, errors: [] };

    config.headers.forEach((header) => {
      row[header] = normalizeCell(raw[header]);
    });

    config.required.forEach((field) => {
      if (!row[field]) {
        row.is_valid = false;
        row.errors.push(`${field} không được để trống`);
      }
    });

    if (type === "room") {
      const capacity = Number(row.capacity);
      if (!Number.isInteger(capacity) || capacity < 1) {
        row.is_valid = false;
        row.errors.push("capacity phải là số nguyên lớn hơn 0");
      }
      if (row.status && !["active", "inactive"].includes(String(row.status).toLowerCase())) {
        row.is_valid = false;
        row.errors.push("status chỉ nhận active hoặc inactive");
      }
      row.status = row.status || "active";
    }

    if (type === "specialization" && row.department_code) {
      const departmentId = departmentMap.get(String(row.department_code).toLowerCase());
      if (!departmentId) {
        row.is_valid = false;
        row.errors.push("department_code không khớp mã hoặc tên khoa trong hệ thống");
      } else {
        row.department_id = departmentId;
      }
    }

    return row;
  };

  const parseFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("File không có sheet dữ liệu");

    const sheetRows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], {
      defval: "",
    });

    return sheetRows.map((row, index) => validateRow(row, index + 2));
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    setResult(null);
    try {
      const parsedRows = await parseFile(file);
      setRows(parsedRows);
      const invalidCount = parsedRows.filter((row) => !row.is_valid).length;
      if (invalidCount > 0) {
        message.warning(`Có ${invalidCount} dòng lỗi, kiểm tra lại trước khi import`);
      } else {
        message.success("File hợp lệ, có thể import");
      }
    } catch (error: any) {
      message.error(error?.message || "Không thể đọc file import");
      setRows([]);
    } finally {
      setLoading(false);
    }
    return false;
  };

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    accept: ".csv,.xlsx,.xls",
    beforeUpload: handleUpload,
    showUploadList: false,
  };

  const downloadTemplate = (format: "xlsx" | "csv") => {
    const data = [config.headers, ...config.sampleRows];
    if (format === "xlsx") {
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Import");
      XLSX.writeFile(workbook, `${config.fileName}.xlsx`);
      message.success("Đã tải file mẫu Excel");
      return;
    }

    const csv = data.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${config.fileName}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    message.success("Đã tải file mẫu CSV");
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    const errors: Array<{ row: number; error: string }> = [];
    let successful = 0;

    for (const row of validRows) {
      try {
        await onImportRow(type, row);
        successful += 1;
      } catch (error: any) {
        errors.push({
          row: row.row_number,
          error: error?.response?.data?.detail || error?.message || "Import thất bại",
        });
      }
    }

    setImporting(false);
    setResult({ successful, failed: errors.length, errors });
    if (successful > 0) onSuccess();
    if (errors.length > 0) {
      message.warning(`Import xong ${successful} dòng, lỗi ${errors.length} dòng`);
    } else {
      message.success(`Import thành công ${successful} dòng`);
      handleClose();
    }
  };

  const columns: ColumnsType<ImportRow> = [
    { title: "Dòng", dataIndex: "row_number", width: 70, fixed: "left" },
    {
      title: "Trạng thái",
      dataIndex: "is_valid",
      width: 120,
      fixed: "left",
      render: (isValid: boolean) => (
        <Tag color={isValid ? "success" : "error"} icon={isValid ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {isValid ? "Hợp lệ" : "Lỗi"}
        </Tag>
      ),
    },
    ...config.headers.map((header) => ({
      title: header,
      dataIndex: header,
      width: 180,
    })),
    {
      title: "Lỗi",
      dataIndex: "errors",
      width: 280,
      render: (errors: string[]) => (
        <Space direction="vertical" size={4}>
          {errors.map((error) => (
            <Tag key={error} color="error">
              {error}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={config.title}
      open={open}
      onCancel={handleClose}
      width={1100}
      footer={
        rows.length > 0
          ? [
              <Button key="cancel" onClick={handleClose}>
                Đóng
              </Button>,
              <Button key="submit" type="primary" loading={importing} disabled={validRows.length === 0} onClick={handleConfirmImport}>
                Import {validRows.length} dòng hợp lệ
              </Button>,
            ]
          : [
              <Button key="xlsx" icon={<FileExcelOutlined />} onClick={() => downloadTemplate("xlsx")}>
                Tải mẫu Excel
              </Button>,
              <Button key="csv" icon={<DownloadOutlined />} onClick={() => downloadTemplate("csv")}>
                Tải mẫu CSV
              </Button>,
              <Button key="close" onClick={handleClose}>
                Đóng
              </Button>,
            ]
      }
    >
      {rows.length === 0 ? (
        <div>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Hướng dẫn import"
            description={
              <div>
                <p>Các cột cần có: {config.headers.join(", ")}</p>
                <p>Hỗ trợ CSV, XLSX và XLS. File Excel sẽ đọc sheet đầu tiên.</p>
                <Space wrap>
                  <Button type="primary" icon={<FileExcelOutlined />} onClick={() => downloadTemplate("xlsx")}>
                    Tải mẫu Excel
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate("csv")}>
                    Tải mẫu CSV
                  </Button>
                </Space>
              </div>
            }
          />
          <Dragger {...uploadProps} disabled={loading}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Kéo thả file import vào đây hoặc bấm để chọn file</p>
            <p className="ant-upload-hint">Kiểm tra preview trước khi xác nhận import.</p>
          </Dragger>
        </div>
      ) : (
        <div>
          <Alert
            type={validRows.length === rows.length ? "success" : "warning"}
            showIcon
            style={{ marginBottom: 16 }}
            message={`${validRows.length}/${rows.length} dòng hợp lệ`}
          />
          {result && (
            <Alert
              type={result.failed > 0 ? "warning" : "success"}
              showIcon
              style={{ marginBottom: 16 }}
              message={`Đã import ${result.successful} dòng, lỗi ${result.failed} dòng`}
              description={result.errors.map((error) => `Dòng ${error.row}: ${error.error}`).join("; ")}
            />
          )}
          <Table columns={columns} dataSource={rows} rowKey="row_number" pagination={false} scroll={{ x: 1200, y: 420 }} size="small" />
        </div>
      )}
    </Modal>
  );
};

export default AdminBulkImportModal;
