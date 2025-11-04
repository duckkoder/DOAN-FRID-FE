import React from "react";
import { Menu, Drawer } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  LogoutOutlined,
  RobotOutlined,
  CameraOutlined,
} from "@ant-design/icons";

type LeftBarItem = {
  key: string;
  label: string;
  path: string;
  action?: string;
};

type LeftBarSection = {
  label: string;
  items: LeftBarItem[];
};

type LeftBarProps = {
  sections: LeftBarSection[];
  onLogout?: () => void;
  isMobile?: boolean;
  visible?: boolean;
  onClose?: () => void;
};

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <DashboardOutlined />,
  teachers: <TeamOutlined />,
  students: <UserOutlined />,
  class: <CalendarOutlined />,
  classes: <CalendarOutlined />,
  report: <FileTextOutlined />,
  reports: <FileTextOutlined />,
  leave: <FileTextOutlined />,
  attendance: <CalendarOutlined />,
  registerFace: <CameraOutlined />,
  modalai: <RobotOutlined />,
  logout: <LogoutOutlined />,
};

const LeftBar: React.FC<LeftBarProps> = ({ sections, onLogout, isMobile = false, visible = true, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (item: LeftBarItem) => {
    if (item.action === "logout") {
      onLogout?.();
    } else {
      navigate(item.path);
    }
    // Close drawer on mobile after navigation
    if (isMobile && onClose) {
      onClose();
    }
  };

  const menuItems = sections.map((section, sectionIndex) => ({
    key: `section-${sectionIndex}`,
    label: section.label,
    type: "group" as const,
    children: section.items.map((item) => ({
      key: item.key,
      label: item.label,
      icon: iconMap[item.key] || <DashboardOutlined />,
      onClick: () => handleMenuClick(item),
      danger: item.action === "logout",
    })),
  }));

  const selectedKey = sections
    .flatMap((s) => s.items)
    .find((item) => location.pathname === item.path)?.key;

  const menuContent = (
    <>
      <style>
        {`
          /* Group title */
          .ant-menu-item-group-title {
            padding: 16px 24px 8px 24px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            color: #8c8c8c !important;
            margin-top: 8px !important;
          }

          /* Menu item base */
          .ant-menu-item {
            margin: 4px 12px !important;
            border-radius: 8px !important;
            padding: 10px 16px !important;
            height: auto !important;
            transition: all 0.2s ease !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          /* Icon và Text */
          .ant-menu-item .anticon {
            font-size: 16px !important;
            margin-right: 12px !important;
            transition: color 0.2s ease !important;
            flex-shrink: 0 !important;
          }

          .ant-menu-item .ant-menu-title-content {
            font-size: 14px !important;
            font-weight: 500 !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }

          /* Hover */
          .ant-menu-item:hover {
            background: #e6f4ff !important;
          }

          .ant-menu-item:hover .anticon {
            color: #1890ff !important;
          }

          .ant-menu-item:hover .ant-menu-title-content {
            color: #1890ff !important;
          }

          /* Selected/Active item */
          .ant-menu-item-selected {
            background: #1890ff !important;
            color: #ffffff !important;
          }

          .ant-menu-item-selected .anticon,
          .ant-menu-item-selected .ant-menu-title-content {
            color: #ffffff !important;
          }

          .ant-menu-item-selected::before {
            content: '' !important;
            position: absolute !important;
            left: 0 !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 4px !important;
            height: 20px !important;
            background: #ffffff !important;
            border-radius: 0 2px 2px 0 !important;
          }

          /* Logout hover */
          .ant-menu-item-danger:hover:not(.ant-menu-item-selected) {
            background: #fff1f0 !important;
            color: #ff4d4f !important;
          }

          .ant-menu-item-danger:hover:not(.ant-menu-item-selected) .anticon {
            color: #ff4d4f !important;
          }

          .ant-menu-item-danger:hover:not(.ant-menu-item-selected) .ant-menu-title-content {
            color: #ff4d4f !important;
          }

          /* Remove default styles */
          .ant-menu-inline {
            border-right: none !important;
          }

          .ant-menu-inline .ant-menu-item::after {
            border-right: none !important;
          }

          /* Scrollbar */
          .ant-menu-inline::-webkit-scrollbar {
            width: 6px;
          }

          .ant-menu-inline::-webkit-scrollbar-thumb {
            background: #d9d9d9;
            border-radius: 3px;
          }

          .ant-menu-inline::-webkit-scrollbar-thumb:hover {
            background: #bfbfbf;
          }
        `}
      </style>

      <Menu
        mode="inline"
        selectedKeys={selectedKey ? [selectedKey] : []}
        style={{ 
          height: "100%",
          borderRight: 0,
          background: "transparent",
          paddingTop: 8,
          paddingBottom: 8,
        }}
        items={menuItems}
      />
    </>
  );

  // Mobile: Render as Drawer
  if (isMobile) {
    return (
      <Drawer
        placement="left"
        onClose={onClose}
        open={visible}
        closable={false}
        width={280}
        styles={{
          body: { padding: 0 },
        }}
      >
        <div style={{ padding: "16px 0" }}>
          <div style={{ 
            padding: "0 24px 16px 24px", 
            borderBottom: "1px solid #e8e8e8",
            marginBottom: 8
          }}>
            <span style={{ 
              fontSize: 20, 
              fontWeight: "bold", 
              color: "#2563eb" 
            }}>
              Menu
            </span>
          </div>
          {menuContent}
        </div>
      </Drawer>
    );
  }

  // Desktop: Render as fixed sidebar
  return (
    <div
      style={{
        width: 260,
        minWidth: 260,
        maxWidth: 260,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid #e8e8e8",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {menuContent}
    </div>
  );
};

export default LeftBar;