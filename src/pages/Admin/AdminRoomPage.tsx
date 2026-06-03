import React, { useState, useEffect } from 'react';
import { 
  App,
  Card, Table, Button, Space, Tag, Modal, 
  Form, Input, InputNumber, Select, 
  Popconfirm, Typography, Tooltip 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  ReloadOutlined, EnvironmentOutlined, UploadOutlined
} from '@ant-design/icons';
import { getRoomsList, createRoom, updateRoom, deleteRoom } from '../../apis/roomsAPIs/room';
import type { Room } from '../../apis/roomsAPIs/room';
import Breadcrumb from "@/components/Breadcrumb";
import AdminBulkImportModal, { type AdminImportType } from "@/components/AdminBulkImportModal";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  padding: '32px 48px',
  background: 'linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)',
};

const panelStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
};

const headerIconStyle: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 16,
  background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 12px 28px rgba(37, 99, 235, 0.16)',
};

const AdminRoomPage: React.FC = () => {
  const { message } = App.useApp();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [form] = Form.useForm();

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await getRoomsList(false); // Fetch all rooms
      setRooms(data);
    } catch (error) {
      console.error('Failed to fetch rooms', error);
      message.error('Lỗi khi tải danh sách phòng học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenModal = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      form.setFieldsValue(room);
    } else {
      setEditingRoom(null);
      form.resetFields();
      form.setFieldsValue({ status: 'active', capacity: 50 });
    }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingRoom(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      if (editingRoom) {
        await updateRoom(editingRoom.id, values);
        message.success('Cập nhật phòng học thành công');
      } else {
        await createRoom(values);
        message.success('Thêm phòng học mới thành công');
      }
      
      handleCloseModal();
      fetchRooms();
    } catch (error: any) {
      console.error('Submit error:', error);
      if (error.response?.data?.detail) {
        message.error(`Lỗi: ${error.response.data.detail}`);
      } else {
        message.error('Vui lòng kiểm tra lại thông tin nhập');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRoom(id);
      message.success('Đã vô hiệu hóa phòng học');
      fetchRooms();
    } catch (error) {
      console.error('Delete error', error);
      message.error('Lỗi khi xóa phòng học');
    }
  };

  const handleImportRow = async (type: AdminImportType, row: Record<string, any>) => {
    if (type !== 'room') return;
    await createRoom({
      name: row.name,
      capacity: Number(row.capacity),
      description: row.description || undefined,
      status: (row.status || 'active').toLowerCase(),
    });
  };

  const columns = [
    {
      title: 'Tên phòng',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong style={{ color: '#0369a1' }}>{text}</strong>,
    },
    {
      title: 'Sức chứa (người)',
      dataIndex: 'capacity',
      key: 'capacity',
      align: 'center' as const,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string | null) => text || <span style={{ color: '#9ca3af' }}>Không có</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? 'Hoạt động' : 'Đã khóa'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: Room) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa">
            <Button 
              type="text" 
              icon={<EditOutlined style={{ color: '#1890ff' }} />} 
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          {record.status === 'active' && (
            <Tooltip title="Vô hiệu hóa (Soft Delete)">
              <Popconfirm
                title="Vô hiệu hóa phòng học này?"
                description="Phòng học sẽ không thể được chọn khi tạo lớp mới."
                onConfirm={() => handleDelete(record.id)}
                okText="Đồng ý"
                cancelText="Hủy"
              >
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />} 
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={pageStyle}>
      <Breadcrumb
        items={[
          { title: 'Trang chủ', href: '/admin' },
          { title: 'Quản lý Phòng học' },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 18, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <Space align="center" size={14}>
          <div style={headerIconStyle}>
            <EnvironmentOutlined style={{ fontSize: 26, color: '#2563eb' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1d4ed8', fontWeight: 800 }}>
              Quản lý Phòng học
            </Title>
            <Text type="secondary" style={{ fontSize: 15 }}>
              Quản lý sức chứa, mô tả và trạng thái sử dụng của phòng học
            </Text>
          </div>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchRooms} disabled={loading}>
            Làm mới
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setIsImportModalOpen(true)}>
            Import phòng
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => handleOpenModal()}
          >
            Thêm Phòng Mới
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={panelStyle}>
        <Table 
          columns={columns} 
          dataSource={rooms} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRoom ? 'Chỉnh sửa Phòng học' : 'Thêm Phòng học mới'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={submitting}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên phòng"
            rules={[
              { required: true, message: 'Vui lòng nhập tên phòng' },
              { max: 50, message: 'Tên phòng không được vượt quá 50 ký tự' }
            ]}
          >
            <Input placeholder="VD: A101, LAB-1..." />
          </Form.Item>
          
          <Form.Item
            name="capacity"
            label="Sức chứa (số sinh viên)"
            rules={[
              { required: true, message: 'Vui lòng nhập sức chứa' },
            ]}
          >
            <InputNumber min={1} max={500} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả / Ghi chú"
            rules={[
              { max: 255, message: 'Mô tả không được vượt quá 255 ký tự' }
            ]}
          >
            <TextArea rows={3} placeholder="Mô tả thêm về thiết bị, vị trí..." />
          </Form.Item>

          {editingRoom && (
            <Form.Item
              name="status"
              label="Trạng thái"
            >
              <Select>
                <Option value="active">Hoạt động</Option>
                <Option value="inactive">Đã khóa</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
      <AdminBulkImportModal
        open={isImportModalOpen}
        type="room"
        onCancel={() => setIsImportModalOpen(false)}
        onImportRow={handleImportRow}
        onSuccess={fetchRooms}
      />
    </div>
  );
};

export default AdminRoomPage;
