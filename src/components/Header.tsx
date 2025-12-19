import React, { useState } from "react";
import { Avatar } from "antd";
import { BellOutlined, UserOutlined, MenuOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import avatarDefault from "@/assets/avtDefault.png";
type HeaderProps = {
  username?: string;
  role?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
};



const Header: React.FC<HeaderProps> = ({ username, role, onMenuClick, showMenuButton = false }) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const user = useAuth().user;
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .header-container {
              padding: 12px 16px !important;
            }
            
            .header-logo {
              font-size: 20px !important;
            }
            
            .header-username {
              display: none !important;
            }
            
            .header-actions {
              gap: 12px !important;
            }
          }
          
          @media (max-width: 480px) {
            .header-logo {
              font-size: 18px !important;
            }
            
            .header-bell {
              font-size: 18px !important;
            }
            
            .header-avatar {
              width: 32px !important;
              height: 32px !important;
            }
          }
        `}
      </style>
      <div 
        className="header-container"
        style={{
          width: "100%",
          background: "#fff",
          borderBottom: "1px solid #eaeaea",
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
          position: "sticky",
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {showMenuButton && isMobile && (
            <MenuOutlined 
              onClick={onMenuClick}
              style={{ 
                fontSize: 20, 
                color: "#2563eb", 
                cursor: "pointer",
                padding: "8px"
              }} 
            />
          )}
          <span 
            onClick={handleLogoClick}
            className="header-logo"
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
            RFID
          </span>
        </div>
        <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <BellOutlined className="header-bell" style={{ fontSize: 22, color: "#2563eb", cursor: "pointer" }} />
          <Avatar 
            className="header-avatar"
            src= {user?.avatar_url || avatarDefault}
            icon={<UserOutlined />} 
          />
          <span className="header-username" style={{ fontWeight: 500 }}>{user?.full_name || "User"}</span>
        </div>
      </div>
    </>
  );
};

export default Header;