import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Space, Tag, Modal, 
  Form, Input, InputNumber, Select, message, 
  Popconfirm, Typography, Tooltip 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  ReloadOutlined, EnvironmentOutlined 
} from '@ant-design/icons';
import { getRoomsList, createRoom, updateRoom, deleteRoom, Room } from '../../apis/roomsAPIs/room';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const AdminRoomPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
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
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#1e293b' }}>
            <EnvironmentOutlined style={{ marginRight: 12 }} />
            Quản lý Phòng học
          </Title>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchRooms} disabled={loading}>
            Làm mới
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

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
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
    </div>
  );
};

export default AdminRoomPage;
