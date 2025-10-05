import React from "react";
import { Menu } from "antd";
import { useNavigate } from "react-router-dom";
import {
  PieChartOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  BookOutlined,
  LogoutOutlined,
  BarChartOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <PieChartOutlined />,
  Attendance: <CheckCircleOutlined />,
  Absence: <FileTextOutlined />,
  Report: <BarChartOutlined />,
  Teacher: <TeamOutlined />,
  Student: <UserOutlined />,
  Subject: <BookOutlined />,
  Logout: <LogoutOutlined />
};

type Section = {
  label: string;
  items: { key: string; label: string; icon?: React.ReactNode; path?: string }[];
};

interface LeftBarProps {
  sections: Section[];
  onMenuClick?: (key: string, path?: string) => void;
}

const LeftBar: React.FC<LeftBarProps> = ({ sections, onMenuClick }) => {
  const navigate = useNavigate();

  const handleClick = (key: string, path?: string) => {
    if (path) {
      navigate(path);
    }
    onMenuClick?.(key, path);
  };

  return (
    <div style={{
      width: 240,
      background: "#fff",
      borderRight: "2px solid #a78bfa",
      minHeight: "100vh",
      paddingTop: 16,
      boxSizing: "border-box"
    }}>
      {sections.map((section, idx) => (
        <div key={section.label} style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#a78bfa",
            margin: "12px 0 8px 18px",
            letterSpacing: 1
          }}>
            {section.label.toUpperCase()}
          </div>
          <Menu
            mode="inline"
            style={{ border: "none", background: "transparent" }}
            selectable={false}
          >
            {section.items.map(item => (
              <Menu.Item
                key={item.key}
                icon={item.icon || iconMap[item.label] || <PieChartOutlined />}
                onClick={() => handleClick(item.key, item.path)}
                style={{ fontWeight: 500, color: "#2563eb", borderRadius: 8, margin: "2px 0" }}
              >
                {item.label}
              </Menu.Item>
            ))}
          </Menu>
        </div>
      ))}
    </div>
  );
};

export default LeftBar;