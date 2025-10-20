import React from "react";
import { Avatar } from "antd";
import { BellOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

type HeaderProps = {
  username?: string;
  role?: string;
};

const Header: React.FC<HeaderProps> = ({ username, role }) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    // Navigate to dashboard based on role
    switch (role) {
      case "admin":
        navigate("/admin");
        break;
      case "teacher":
        navigate("/teacher");
        break;
      case "student":
        navigate("/student");
        break;
      default:
        navigate("/");
    }
  };

  return (
    <div style={{
      width: "100%",
      background: "#fff",
      borderBottom: "1px solid #eaeaea",
      padding: "12px 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxSizing: "border-box"
    }}>
      <span 
        onClick={handleLogoClick}
        style={{ 
          fontSize: 28, 
          fontWeight: "bold", 
          color: "#2563eb",
          cursor: "pointer",
          userSelect: "none",
          transition: "opacity 0.2s ease"
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
      >
        RFIDentity
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <BellOutlined style={{ fontSize: 22, color: "#2563eb" }} />
        <Avatar src="https://randomuser.me/api/portraits/men/32.jpg" icon={<UserOutlined />} />
        <span style={{ fontWeight: 500 }}>{username || "User"}</span>
      </div>
    </div>
  );
};

export default Header;