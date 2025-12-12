import React, { useState } from "react";
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Table, 
  Select,
  DatePicker,
  Button,
  Statistic,
  Progress,
  Space,
  Tag
} from "antd";
import { 
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  CalendarOutlined,
  UserOutlined
} from "@ant-design/icons";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Breadcrumb from "../../components/Breadcrumb";
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface StudentAttendance {
  id: string;
  studentName: string;
  studentId: string;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
}

interface ClassReport {
  subject: string;
  totalStudents: number;
  averageAttendance: number;
  sessionsCount: number;
}

const TeacherReportPage: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [dateRange, setDateRange] = useState<any>(null);

  // Dữ liệu mẫu môn học
  const subjects = [
    { value: 'java', label: 'Advanced Java Programming' },
    { value: 'database', label: 'Database Design' },
    { value: 'web', label: 'Web Development' },
    { value: 'ai', label: 'Artificial Intelligence' }
  ];

  // Dữ liệu mẫu học sinh
  const studentsData: StudentAttendance[] = [
    {
      id: "1",
      studentName: "Nguyễn Văn An",
      studentId: "SV001",
      totalSessions: 20,
      presentCount: 19,
      absentCount: 1,
      lateCount: 2,
      attendanceRate: 95
    },
    {
      id: "2",
      studentName: "Trần Thị Bình",
      studentId: "SV002", 
      totalSessions: 20,
      presentCount: 17,
      absentCount: 2,
      lateCount: 1,
      attendanceRate: 85
    },
    {
      id: "3",
      studentName: "Lê Văn Cường",
      studentId: "SV003",
      totalSessions: 20,
      presentCount: 18,
      absentCount: 1,
      lateCount: 1,
      attendanceRate: 90
    },
    {
      id: "4",
      studentName: "Phạm Thị Dung",
      studentId: "SV004",
      totalSessions: 20,
      presentCount: 16,
      absentCount: 3,
      lateCount: 1,
      attendanceRate: 80
    },
    {
      id: "5",
      studentName: "Hoàng Văn Em",
      studentId: "SV005",
      totalSessions: 20,
      presentCount: 20,
      absentCount: 0,
      lateCount: 0,
      attendanceRate: 100
    }
  ];

  // Dữ liệu mẫu báo cáo theo lớp
  const classReports: ClassReport[] = [
    {
      subject: "Advanced Java Programming",
      totalStudents: 45,
      averageAttendance: 92,
      sessionsCount: 20
    },
    {
      subject: "Database Design", 
      totalStudents: 38,
      averageAttendance: 88,
      sessionsCount: 16
    },
    {
      subject: "Web Development",
      totalStudents: 42,
      averageAttendance: 85,
      sessionsCount: 18
    },
    {
      subject: "Artificial Intelligence",
      totalStudents: 35,
      averageAttendance: 90,
      sessionsCount: 14
    }
  ];

  // Dữ liệu cho biểu đồ
  const attendanceDistribution = [
    { name: 'Xuất sắc (95-100%)', value: 2, color: '#10b981' },
    { name: 'Tốt (85-94%)', value: 2, color: '#3b82f6' },
    { name: 'Trung bình (75-84%)', value: 1, color: '#f59e42' },
    { name: 'Yếu (<75%)', value: 0, color: '#ef4444' }
  ];

  const weeklyTrend = [
    { week: 'Tuần 1', attendance: 95 },
    { week: 'Tuần 2', attendance: 88 },
    { week: 'Tuần 3', attendance: 92 },
    { week: 'Tuần 4', attendance: 87 },
    { week: 'Tuần 5', attendance: 94 },
    { week: 'Tuần 6', attendance: 89 }
  ];

  const breadcrumbItems = [
    { title: "Dashboard", href: "/teacher" },
    { title: "Attendance Report" }
  ];

  // Thống kê tổng quan
  const totalStudents = studentsData.length;
  const avgAttendance = (studentsData.reduce((sum, student) => sum + student.attendanceRate, 0) / totalStudents).toFixed(1);
  const excellentStudents = studentsData.filter(s => s.attendanceRate >= 95).length;
  const lowAttendanceStudents = studentsData.filter(s => s.attendanceRate < 75).length;

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return '#10b981';
    if (rate >= 85) return '#3b82f6';
    if (rate >= 75) return '#f59e42';
    return '#ef4444';
  };

  const getAttendanceStatus = (rate: number) => {
    if (rate >= 95) return 'Xuất sắc';
    if (rate >= 85) return 'Tốt';
    if (rate >= 75) return 'Trung bình';
    return 'Yếu';
  };

  const handleExportExcel = () => {
    
    // Implement Excel export logic
  };

  const handleExportPDF = () => {
    
    // Implement PDF export logic
  };

  const studentColumns = [
    {
      title: 'Học sinh',
      key: 'student',
      render: (record: StudentAttendance) => (
        <div>
          <Text strong>{record.studentName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.studentId}
          </Text>
        </div>
      )
    },
    {
      title: 'Tổng buổi',
      dataIndex: 'totalSessions',
      key: 'totalSessions',
      align: 'center' as const
    },
    {
      title: 'Có mặt',
      dataIndex: 'presentCount',
      key: 'presentCount',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="#10b981">{count}</Tag>
      )
    },
    {
      title: 'Vắng',
      dataIndex: 'absentCount',
      key: 'absentCount',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="#ef4444">{count}</Tag>
      )
    },
    {
      title: 'Muộn',
      dataIndex: 'lateCount',
      key: 'lateCount',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="#f59e42">{count}</Tag>
      )
    },
    {
      title: 'Tỷ lệ',
      dataIndex: 'attendanceRate',
      key: 'attendanceRate',
      align: 'center' as const,
      render: (rate: number) => (
        <div>
          <Progress 
            percent={rate} 
            size="small"
            strokeColor={getAttendanceColor(rate)}
            showInfo={false}
            style={{ width: 60 }}
          />
          <br />
          <Text style={{ color: getAttendanceColor(rate), fontWeight: 600 }}>
            {rate}%
          </Text>
        </div>
      )
    },
    {
      title: 'Xếp loại',
      dataIndex: 'attendanceRate',
      key: 'status',
      render: (rate: number) => (
        <Tag color={getAttendanceColor(rate)}>
          {getAttendanceStatus(rate)}
        </Tag>
      )
    }
  ];

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)", 
      padding: "32px 48px" 
    }}>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 32 
      }}>
        <div>
          <Title level={1} style={{ 
            marginBottom: 8, 
            color: "#2563eb",
            fontSize: 36,
            fontWeight: 700
          }}>
            📊 Attendance Report
          </Title>
          <Text style={{ 
            fontSize: 18, 
            color: "#64748b"
          }}>
            Báo cáo tổng hợp và thống kê điểm danh của lớp học
          </Text>
        </div>
        
        <Space>
          <Button 
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            style={{ borderRadius: 8 }}
          >
            Export Excel
          </Button>
          <Button 
            icon={<FilePdfOutlined />}
            onClick={handleExportPDF}
            style={{ borderRadius: 8 }}
          >
            Export PDF
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card style={{
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none",
        marginBottom: 24
      }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>Môn học:</Text>
            <Select
              value={selectedSubject}
              onChange={setSelectedSubject}
              style={{ width: '100%' }}
              size="large"
            >
              <Select.Option value="all">Tất cả môn học</Select.Option>
              {subjects.map(subject => (
                <Select.Option key={subject.value} value={subject.value}>
                  {subject.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={10}>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>Thời gian:</Text>
            <RangePicker 
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              size="large"
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Button 
              type="primary"
              style={{ width: '100%', marginTop: 32 }}
              size="large"
            >
              Lọc báo cáo
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Statistics Overview */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Tổng học sinh"
              value={totalStudents}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#2563eb', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Điểm danh trung bình"
              value={avgAttendance}
              suffix="%"
              valueStyle={{ color: '#10b981', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Học sinh xuất sắc"
              value={excellentStudents}
              valueStyle={{ color: '#f59e42', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Statistic
              title="Cần quan tâm"
              value={lowAttendanceStudents}
              valueStyle={{ color: '#ef4444', fontSize: 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        {/* Attendance Distribution */}
        <Col xs={24} lg={12}>
          <Card style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none",
            height: 400
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
              📈 Phân bố điểm danh
            </Title>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={attendanceDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Weekly Trend */}
        <Col xs={24} lg={12}>
          <Card style={{
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "none",
            height: 400
          }}>
            <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
              📉 Xu hướng theo tuần
            </Title>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[70, 100]} />
                <Tooltip />
                <Bar dataKey="attendance" fill="#3b82f6" name="Tỷ lệ điểm danh (%)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Class Reports Summary */}
      <Card style={{
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none",
        marginBottom: 24
      }}>
        <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
          📚 Tổng quan theo môn học
        </Title>
        <Row gutter={[16, 16]}>
          {classReports.map((report, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card size="small" style={{ background: '#f8fafc' }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  {report.subject}
                </Text>
                <Space direction="vertical" size={4}>
                  <Text type="secondary">
                    👥 {report.totalStudents} học sinh
                  </Text>
                  <Text type="secondary">
                    📅 {report.sessionsCount} buổi học
                  </Text>
                  <Progress 
                    percent={report.averageAttendance} 
                    strokeColor={getAttendanceColor(report.averageAttendance)}
                    size="small"
                  />
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Detailed Student Report */}
      <Card style={{
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "none"
      }}>
        <Title level={4} style={{ marginBottom: 16, color: "#374151" }}>
          👥 Chi tiết điểm danh học sinh
        </Title>
        <Table
          dataSource={studentsData}
          columns={studentColumns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} của ${total} học sinh`
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default TeacherReportPage;
