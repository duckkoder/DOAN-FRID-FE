import React, { useEffect, useMemo, useState } from "react";
import { App, Alert, Button, Modal, Select, Space, Table, Tag, Upload } from "antd";
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

import { createClass, type CreateClassRequest } from "@/apis/classesAPIs/teacherClass";
import { getCoursesList, type CourseListItem } from "@/apis/coursesAPIs/course";
import { getRoomsList, type Room } from "@/apis/roomsAPIs/room";

const { Dragger } = Upload;

type ImportRow = {
  row_number: number;
  class_name: string;
  course_code: string;
  description: string;
  day: string;
  periods: string;
  room: string;
  parsed_day?: number;
  parsed_periods?: number[];
  course_id?: string | null;
  is_valid: boolean;
  errors: string[];
};

type ImportResult = {
  successful: number;
  failed: number;
  errors: Array<{ className: string; error: string }>;
};

type TeacherClassImportModalProps = {
  open: boolean;
  teacherId: number | null;
  onCancel: () => void;
  onSuccess: () => void;
};

const headers = ["class_name", "course_code", "description", "day", "periods", "room"];
const friendlyHeaders = ["Tên lớp", "Mã học phần", "Mô tả", "Thứ", "Tiết học", "Phòng học"];
const headerLabels: Record<string, string> = {
  class_name: "Tên lớp",
  course_code: "Mã học phần",
  description: "Mô tả",
  day: "Thứ",
  periods: "Tiết học",
  room: "Phòng học",
};
const headerAliases: Record<string, keyof Pick<ImportRow, "class_name" | "course_code" | "description" | "day" | "periods" | "room">> = {
  class_name: "class_name",
  "ten lop": "class_name",
  "tên lớp": "class_name",
  course_code: "course_code",
  "ma hoc phan": "course_code",
  "mã học phần": "course_code",
  description: "description",
  "mo ta": "description",
  "mô tả": "description",
  day: "day",
  "thu": "day",
  "thứ": "day",
  periods: "periods",
  "tiet hoc": "periods",
  "tiết học": "periods",
  room: "room",
  "phong hoc": "room",
  "phòng học": "room",
};
const buildSampleRows = (courses: CourseListItem[], rooms: Room[]) => {
  const firstCourse = courses[0];
  const secondCourse = courses[1] || firstCourse;
  const firstRoom = rooms[0]?.name || "A101";
  const secondRoom = rooms[1]?.name || firstRoom;
  return [
    [`${firstCourse?.title || "Học phần"} - Nhóm 1`, firstCourse?.code || "", firstCourse ? `Lịch học ${firstCourse.title}` : "", "Thứ hai", "1-3", firstRoom],
    [`${firstCourse?.title || "Học phần"} - Nhóm 1`, firstCourse?.code || "", firstCourse ? `Lịch học ${firstCourse.title}` : "", "Thứ tư", "6,7,8", firstRoom],
    [`${secondCourse?.title || "Học phần"} - Nhóm 2`, secondCourse?.code || "", secondCourse ? `Lịch học ${secondCourse.title}` : "", "Thứ sáu", "4-5", secondRoom],
  ];
};

const dayMap: Record<string, number> = {
  monday: 0,
  mon: 0,
  "thu hai": 0,
  "thứ hai": 0,
  "2": 0,
  tuesday: 1,
  tue: 1,
  "thu ba": 1,
  "thứ ba": 1,
  "3": 1,
  wednesday: 2,
  wed: 2,
  "thu tu": 2,
  "thứ tư": 2,
  "4": 2,
  thursday: 3,
  thu: 3,
  "thu nam": 3,
  "thứ năm": 3,
  "5": 3,
  friday: 4,
  fri: 4,
  "thu sau": 4,
  "thứ sáu": 4,
  "6": 4,
  saturday: 5,
  sat: 5,
  "thu bay": 5,
  "thứ bảy": 5,
  "7": 5,
  sunday: 6,
  sun: 6,
  "chu nhat": 6,
  "chủ nhật": 6,
  "8": 6,
  "cn": 6,
};

const normalizeCell = (value: unknown) => String(value ?? "").trim();

const normalizeKey = (value: string) => (
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
);

const normalizeImportRow = (raw: Record<string, any>) => {
  const normalized: Record<string, any> = {};
  Object.entries(raw).forEach(([key, value]) => {
    const mappedKey = headerAliases[normalizeKey(key)] || headerAliases[key];
    if (mappedKey) normalized[mappedKey] = value;
  });
  return normalized;
};

const parseDay = (value: string) => {
  const key = normalizeKey(value);
  if (key in dayMap) return dayMap[key];
  const direct = Number(value);
  if (Number.isInteger(direct) && direct >= 0 && direct <= 6) return direct;
  return null;
};

const parsePeriods = (value: string) => {
  const periods = new Set<number>();
  const chunks = value.split(/[;,]/).map(item => item.trim()).filter(Boolean);

  chunks.forEach((chunk) => {
    const range = chunk.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let period = start; period <= end; period += 1) periods.add(period);
      return;
    }

    const single = Number(chunk);
    if (Number.isInteger(single)) periods.add(single);
  });

  return Array.from(periods).sort((a, b) => a - b);
};

const getErrorDetail = (error: any) => (
  error?.response?.data?.detail || error?.message || "Tạo lớp thất bại"
);

const TeacherClassImportModal: React.FC<TeacherClassImportModalProps> = ({
  open,
  teacherId,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const courseMap = useMemo(() => {
    const map = new Map<string, CourseListItem>();
    courses.forEach((course) => {
      map.set(normalizeKey(course.code), course);
      map.set(normalizeKey(course.title), course);
      map.set(normalizeKey(course.id), course);
    });
    return map;
  }, [courses]);

  const roomMap = useMemo(() => {
    const map = new Map<string, Room>();
    rooms.forEach((room) => map.set(normalizeKey(room.name), room));
    return map;
  }, [rooms]);

  const roomOptions = useMemo(() => (
    rooms.map(room => ({
      label: `${room.name}${room.capacity ? ` (${room.capacity} chỗ)` : ""}`,
      value: room.name,
    }))
  ), [rooms]);

  const validRows = rows.filter(row => row.is_valid);
  const canCreateClasses = courses.length > 0 && rooms.length > 0 && validRows.length > 0;

  const reset = () => {
    setRows([]);
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onCancel();
  };

  const ensureLookups = async () => {
    const [courseResponse, roomResponse] = await Promise.all([
      courses.length ? Promise.resolve(null) : getCoursesList(),
      rooms.length ? Promise.resolve(null) : getRoomsList(true),
    ]);

    const nextCourses = courseResponse?.success ? courseResponse.data.courses : courses;
    const nextRooms = roomResponse || rooms;
    setCourses(nextCourses);
    setRooms(nextRooms);
    return { nextCourses, nextRooms };
  };

  useEffect(() => {
    if (!open) return;
    ensureLookups().catch(() => {
      message.error("Không thể tải danh sách học phần/phòng học");
    });
  }, [open]);

  const validateRow = (
    raw: Record<string, any>,
    rowNumber: number,
    availableCourses: CourseListItem[],
    availableRooms: Room[],
  ): ImportRow => {
    const row: ImportRow = {
      row_number: rowNumber,
      class_name: normalizeCell(raw.class_name),
      course_code: normalizeCell(raw.course_code),
      description: normalizeCell(raw.description),
      day: normalizeCell(raw.day),
      periods: normalizeCell(raw.periods),
      room: normalizeCell(raw.room),
      is_valid: true,
      errors: [],
    };

    const localCourseMap = new Map<string, CourseListItem>();
    availableCourses.forEach((course) => {
      localCourseMap.set(normalizeKey(course.code), course);
      localCourseMap.set(normalizeKey(course.title), course);
      localCourseMap.set(normalizeKey(course.id), course);
    });

    const localRoomMap = new Map<string, Room>();
    availableRooms.forEach((room) => localRoomMap.set(normalizeKey(room.name), room));

    if (!row.class_name) row.errors.push("Tên lớp không được để trống");
    if (!row.course_code) row.errors.push("Mã học phần không được để trống");
    if (!row.day) row.errors.push("Thứ không được để trống");
    if (!row.periods) row.errors.push("Tiết học không được để trống");
    if (!row.room) row.errors.push("Phòng học không được để trống");

    const parsedDay = parseDay(row.day);
    if (parsedDay === null) {
      row.errors.push("Thứ phải nhập từ 2-8 hoặc ghi bằng chữ, ví dụ Thứ hai, Thứ ba, Chủ nhật");
    } else {
      row.parsed_day = parsedDay;
    }

    const parsedPeriods = parsePeriods(row.periods);
    if (parsedPeriods.length === 0 || parsedPeriods.some(period => period < 1 || period > 10)) {
      row.errors.push("Tiết học phải nằm trong tiết 1-10, ví dụ 1-3 hoặc 1,2,3");
    } else {
      row.parsed_periods = parsedPeriods;
    }

    if (row.course_code) {
      const course = localCourseMap.get(normalizeKey(row.course_code));
      if (!course) {
        row.errors.push("Mã học phần không khớp học phần hiện có");
      } else {
        row.course_id = course.id;
        row.course_code = course.code;
      }
    }

    const room = localRoomMap.get(normalizeKey(row.room));
    if (!room) {
      row.errors.push("Phòng học không có trong danh sách phòng đang sử dụng");
    } else {
      row.room = room.name;
    }

    row.is_valid = row.errors.length === 0;
    return row;
  };

  const updateRowRoom = (rowNumber: number, roomName: string) => {
    setRows(prev => prev.map(row => (
      row.row_number === rowNumber
        ? validateRow({ ...row, room: roomName }, row.row_number, courses, rooms)
        : row
    )));
  };

  const parseFile = async (file: File) => {
    const { nextCourses, nextRooms } = await ensureLookups();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("File không có sheet dữ liệu");

    const sheetRows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], {
      defval: "",
    });

    return sheetRows.map((row, index) => validateRow(normalizeImportRow(row), index + 2, nextCourses, nextRooms));
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    setResult(null);
    try {
      const lookups = await ensureLookups();
      if (lookups.nextCourses.length === 0) {
        message.error("Chưa có học phần nào. Cần tạo học phần trước khi tạo lớp hàng loạt.");
        setRows([]);
        return false;
      }
      if (lookups.nextRooms.length === 0) {
        message.error("Chưa có phòng học đang sử dụng. Cần tạo phòng học trước khi tạo lớp hàng loạt.");
        setRows([]);
        return false;
      }
      const parsedRows = await parseFile(file);
      setRows(parsedRows);
      const invalidCount = parsedRows.filter(row => !row.is_valid).length;
      if (invalidCount > 0) {
        message.warning(`Có ${invalidCount} dòng cần sửa trước khi tạo lớp`);
      } else {
        message.success("File hợp lệ, có thể tạo lớp");
      }
    } catch (error: any) {
      message.error(error?.message || "Không thể đọc file tạo lớp");
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

  const downloadTemplate = async (format: "xlsx" | "csv") => {
    const { nextCourses, nextRooms } = await ensureLookups();
    const data = [friendlyHeaders, ...buildSampleRows(nextCourses, nextRooms)];
    if (format === "xlsx") {
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách lớp");
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
          ["Mã học phần", "Tên học phần"],
          ...nextCourses.map(course => [course.code, course.title]),
        ]),
        "Học phần"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
          ["Phòng học", "Sức chứa", "Mô tả"],
          ...nextRooms.map(room => [room.name, room.capacity, room.description || ""]),
        ]),
        "Phòng học"
      );
      XLSX.writeFile(workbook, "mau_tao_lop_hoc_hang_loat.xlsx");
      message.success("Đã tải file mẫu Excel");
      return;
    }

    const csv = data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mau_tao_lop_hoc_hang_loat.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    message.success("Đã tải file mẫu CSV");
  };

  const buildClassPayloads = () => {
    const grouped = new Map<string, { rows: ImportRow[]; courseId: string | null; description: string }>();

    validRows.forEach((row) => {
      const key = `${row.class_name}|${row.course_id || ""}|${row.description}`;
      const current = grouped.get(key) || { rows: [], courseId: row.course_id || null, description: row.description };
      current.rows.push(row);
      grouped.set(key, current);
    });

    return Array.from(grouped.entries()).map(([key, group]) => {
      const [rawName] = key.split("|");
      const firstRow = group.rows[0];
      const course = firstRow.course_code ? courseMap.get(normalizeKey(firstRow.course_code)) : null;
      const className = course?.code && !rawName.startsWith(`${course.code} - `)
        ? `${course.code} - ${rawName}`
        : rawName;

      return {
        displayName: className,
        payload: {
          class_name: className,
          teacher_id: teacherId,
          course_id: group.courseId,
          description: group.description || null,
          schedule: {
            schedules: group.rows.map(row => ({
              day: row.parsed_day as number,
              periods: row.parsed_periods as number[],
              location: row.room,
            })),
          },
        } as CreateClassRequest,
      };
    });
  };

  const handleConfirmImport = async () => {
    if (!teacherId) {
      message.error("Không tìm thấy thông tin giáo viên");
      return;
    }
    if (courses.length === 0) {
      message.error("Chưa có học phần nào. Cần tạo học phần trước khi tạo lớp hàng loạt.");
      return;
    }
    if (rooms.length === 0) {
      message.error("Chưa có phòng học đang sử dụng. Cần tạo phòng học trước khi tạo lớp hàng loạt.");
      return;
    }
    if (validRows.length === 0) {
      message.error("Chưa có dòng hợp lệ để tạo lớp");
      return;
    }

    setImporting(true);
    const errors: ImportResult["errors"] = [];
    let successful = 0;

    for (const item of buildClassPayloads()) {
      try {
        await createClass(item.payload);
        successful += 1;
      } catch (error: any) {
        errors.push({ className: item.displayName, error: getErrorDetail(error) });
      }
    }

    setImporting(false);
    setResult({ successful, failed: errors.length, errors });
    if (successful > 0) onSuccess();
    if (errors.length > 0) {
      message.warning(`Đã tạo ${successful} lớp, còn ${errors.length} lớp chưa tạo được`);
    } else {
      message.success(`Đã tạo thành công ${successful} lớp`);
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
    ...headers.map(header => ({
      title: headerLabels[header] || header,
      dataIndex: header,
      width: header === "room" ? 230 : 170,
      render: (value: string, row: ImportRow) => (
        header === "room" ? (
          <Select
            showSearch
            placeholder="Chọn phòng học"
            value={value || undefined}
            options={roomOptions}
            optionFilterProp="label"
            style={{ width: "100%" }}
            status={row.errors.some(error => normalizeKey(error).includes("phong hoc")) ? "error" : undefined}
            onChange={(roomName) => updateRowRoom(row.row_number, roomName)}
          />
        ) : value
      ),
    })),
    {
      title: "Lỗi",
      dataIndex: "errors",
      width: 280,
      render: (errors: string[]) => errors?.length ? (
        <Space direction="vertical" size={2}>{errors.map(error => <Tag color="error" key={error}>{error}</Tag>)}</Space>
      ) : <Tag color="success">OK</Tag>,
    },
  ];

  return (
    <Modal
      title="Tạo lớp học hàng loạt"
      open={open}
      onCancel={handleClose}
      width={1080}
      destroyOnClose
      footer={[
        <Button key="csv" icon={<DownloadOutlined />} onClick={() => downloadTemplate("csv")}>Tải mẫu CSV</Button>,
        <Button key="xlsx" icon={<FileExcelOutlined />} onClick={() => downloadTemplate("xlsx")}>Tải mẫu Excel</Button>,
        <Button key="cancel" onClick={handleClose}>Đóng</Button>,
        <Button
          key="create"
          type="primary"
          loading={importing}
          disabled={!canCreateClasses}
          onClick={handleConfirmImport}
        >
          Tạo {buildClassPayloads().length || 0} lớp
        </Button>,
      ]}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="Một dòng trong file là một buổi học. Các dòng cùng tên lớp và mã học phần sẽ được gộp thành một lớp có nhiều buổi."
          description="Mã học phần là bắt buộc và phải khớp học phần đang có. Cột Thứ nên nhập 2-8 hoặc ghi bằng chữ như Thứ hai, Thứ ba, Chủ nhật; hệ thống sẽ tự chuyển về lịch nội bộ. Cột Tiết học nhận dạng 1-3 hoặc 1,2,3."
        />

        <Alert
          type={courses.length > 0 ? "success" : "warning"}
          showIcon
          message={courses.length > 0 ? `Đã tải ${courses.length} học phần` : "Chưa có học phần để tạo lớp"}
          description={courses.length > 0 ? (
            <Space wrap size={[6, 6]}>
              {courses.slice(0, 12).map(course => <Tag key={course.id}>{course.code} - {course.title}</Tag>)}
              {courses.length > 12 && <Tag>+{courses.length - 12} học phần khác</Tag>}
            </Space>
          ) : "Cần tạo học phần trước. File mẫu vẫn tải được nhưng chưa thể tạo lớp khi danh sách học phần trống."}
        />

        <Alert
          type={rooms.length > 0 ? "success" : "warning"}
          showIcon
          message={rooms.length > 0 ? `Đã tải ${rooms.length} phòng học đang sử dụng` : "Chưa tải được danh sách phòng học"}
          description={rooms.length > 0 ? (
            <Space wrap size={[6, 6]}>
              {rooms.slice(0, 18).map(room => <Tag key={room.id}>{room.name}</Tag>)}
              {rooms.length > 18 && <Tag>+{rooms.length - 18} phòng khác</Tag>}
            </Space>
          ) : "Cột Phòng học chỉ nhận phòng đang có trong danh sách phòng học. Đóng mở lại cửa sổ này hoặc kiểm tra danh mục phòng học nếu danh sách trống."}
        />

        <Dragger {...uploadProps} disabled={loading || courses.length === 0 || rooms.length === 0} style={{ padding: 18 }}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Kéo thả file danh sách lớp vào đây hoặc bấm để chọn file</p>
          <p className="ant-upload-hint">Hỗ trợ .xlsx, .xls, .csv</p>
        </Dragger>

        {rows.length > 0 && (
          <Table<ImportRow>
            rowKey="row_number"
            columns={columns}
            dataSource={rows}
            loading={loading}
            pagination={{ pageSize: 6, showSizeChanger: false }}
            scroll={{ x: 1180 }}
            size="small"
          />
        )}

        {result && (
          <Alert
            type={result.failed ? "warning" : "success"}
            showIcon
            message={`Đã tạo ${result.successful} lớp, còn ${result.failed} lớp chưa tạo được`}
            description={result.errors.length > 0 ? (
              <Space direction="vertical" size={4}>
                {result.errors.map(item => (
                  <span key={`${item.className}-${item.error}`}>
                    <strong>{item.className}:</strong> {item.error}
                  </span>
                ))}
              </Space>
            ) : undefined}
          />
        )}
      </Space>
    </Modal>
  );
};

export default TeacherClassImportModal;
